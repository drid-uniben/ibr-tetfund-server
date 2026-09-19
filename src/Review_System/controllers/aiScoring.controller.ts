import Review, {
  ReviewStatus,
  ReviewType,
  IScore,
} from '../models/review.model';
import Proposal, {
  SubmitterType,
} from '../../Proposal_Submission/models/proposal.model';
import { NotFoundError } from '../../utils/customErrors';
import logger from '../../utils/logger';
import emailService from '../../services/email.service'; // Import emailService
import { reviewProposal } from 'uniben-ai-proposal-review-cli'; // Import the reviewProposal function
import agenda from '../../config/agenda'; // Import the agenda instance
import path from 'path';
import { getUploadsDir } from '../../utils/uploadsPath';

// Maximum number of times a failed AI review job will be automatically retried.
const MAX_AI_REVIEW_ATTEMPTS = 3;

// Generate AI review for a proposal
export const generateAIReviewForProposal = async (
  proposalId: string,
  attempt = 0
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    // Check if proposal exists
    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      throw new NotFoundError('Proposal not found');
    }

    // Solo (bypass) reviewer proposals never get an AI review. This also
    // covers jobs that were queued/retried before the solo assignment.
    const soloReviewExists = await Review.exists({
      proposal: proposalId,
      reviewType: ReviewType.HUMAN,
      isSoloReview: true,
    });

    if (soloReviewExists) {
      logger.info(
        `Skipping AI review for proposal ${proposalId}: assigned to a solo reviewer`
      );
      return {
        success: true,
        message: 'AI review skipped: proposal is under a solo reviewer',
      };
    }

    // Check if AI review already exists
    const existingAIReview = await Review.findOne({
      proposal: proposalId,
      reviewType: ReviewType.AI,
    });

    if (existingAIReview) {
      return {
        success: true,
        message: 'AI review already exists for this proposal',
        data: existingAIReview,
      };
    }

    // Create a new AI review
    const aiReview = new Review({
      proposal: proposalId,
      reviewer: null, // null for AI review
      reviewType: ReviewType.AI,
      status: ReviewStatus.IN_PROGRESS,
      dueDate: new Date(), // AI review due immediately
    });

    await aiReview.save();

    // Generate AI scores and update the review
    await generateAIReviewScores(String(aiReview._id));

    // Fetch the updated review
    const completedAIReview = await Review.findById(aiReview._id);

    return {
      success: true,
      message: 'AI review generated successfully',
      data: completedAIReview,
    };
  } catch (error: any) {
    // Catch errors during the process
    logger.error(
      `Error generating AI review for proposal ${proposalId}:`,
      error
    );

    if (attempt < MAX_AI_REVIEW_ATTEMPTS) {
      await agenda.now('generate AI review', {
        proposalId: proposalId,
        attempt: attempt + 1,
      });
      logger.info(
        `Dispatched failed AI review job for proposal ${proposalId} to Agenda (attempt ${attempt + 1} of ${MAX_AI_REVIEW_ATTEMPTS})`
      );

      return {
        success: false,
        message: `Failed to generate AI review for proposal ${proposalId}: ${error.message || 'Unknown error'}`,
      };
    }

    logger.error(
      `Exhausted ${MAX_AI_REVIEW_ATTEMPTS} retry attempts for AI review of proposal ${proposalId}. Not re-dispatching.`
    );

    const supportEmail = process.env.SUPPORT_EMAIL;
    if (supportEmail) {
      try {
        await emailService.sendAiReviewFailureEmail(
          supportEmail,
          proposalId,
          error.message || 'No error message available'
        );
        logger.info(
          `Sent AI review failure notification email to ${supportEmail} for proposal ${proposalId}`
        );
      } catch (emailError: any) {
        logger.error(
          `Failed to send AI review failure notification email for proposal ${proposalId}:`,
          emailError
        );
      }
    } else {
      logger.warn(
        `SUPPORT_EMAIL not set. Could not send AI review failure notification for proposal ${proposalId}.`
      );
    }

    return {
      success: false,
      message: `Failed to generate AI review for proposal ${proposalId}: ${error.message || 'Unknown error'}`,
      // Removed the 'error' property as it's not in the return type
    };
  }
};

// Generate AI review scores for a specific review
const generateAIReviewScores = async (reviewId: string): Promise<void> => {
  const review = await Review.findById(reviewId).populate('proposal');
  if (!review || review.reviewType !== ReviewType.AI || !review.proposal) {
    throw new NotFoundError('AI Review or associated proposal not found');
  }

  // Explicitly type the populated proposal
  const proposal = review.proposal as typeof Proposal.prototype;

  let evaluationResult;

  // Determine input based on submitter type
  if (proposal.submitterType === SubmitterType.STAFF) {
    // For staff, construct formatted text input
    const staffTextInput = `
Proposal Title:
${proposal.projectTitle || ''}

Problem Statement:
${proposal.problemStatement || ''}

Objectives:
${proposal.objectives || ''}

Methodology:
${proposal.methodology || ''}

Expected Outcomes:
${proposal.expectedOutcomes || ''}

Work Plan:
${proposal.workPlan || ''}

Estimated Budget:
${proposal.estimatedBudget || ''}
`;
    evaluationResult = await reviewProposal(staffTextInput, '-t');
  } else if (proposal.submitterType === SubmitterType.MASTER_STUDENT) {
    // For master students, use the file path
    if (!proposal.docFile) {
      throw new Error('Proposal file path not found for master student');
    }
    // Extract file name from the URL and construct the absolute path
    const fileName = proposal.docFile.split('/').pop();
    const filePath = path.join(getUploadsDir(), fileName as string);
    evaluationResult = await reviewProposal(filePath, '-f');
  } else {
    throw new Error(`Unknown submitter type: ${proposal.submitterType}`);
  }

  // TODO: 'uniben-ai-proposal-review-cli' still evaluates against the OLD
  // 10-criteria rubric and has no concept of the new 8-criteria one (it lives
  // in a separate repo: unibeninterns/proposal-cli). Until that package is
  // updated to score the new rubric directly, this is a best-effort bridge:
  // - methodology, feasibility, budget, team map straight across (same concept)
  // - clarity -> backgroundAndProblemStatement (closest available signal)
  // - outcomes -> expectedOutcomesAndImpact
  // - relevance + originality are averaged into relevanceAndOriginality
  // - literatureReview and sustainability have no home in the new rubric and are dropped
  // - researchObjectives has NO corresponding signal from the package at all;
  //   it reuses the clarity score as a proxy. This is a real gap, not a
  //   judgment call - flag AI-generated reviews for human spot-checking on
  //   this criterion until the package is updated.
  const scale = (raw: number, oldMax: number, newMax: number): number =>
    Math.round((raw / oldMax) * newMax);

  const mappedScores: IScore = {
    backgroundAndProblemStatement: scale(
      evaluationResult.scores.clarity,
      10,
      15
    ),
    researchObjectives: scale(evaluationResult.scores.clarity, 10, 10), // proxy, see TODO above
    methodology: scale(evaluationResult.scores.methodology, 15, 20),
    expectedOutcomesAndImpact: scale(evaluationResult.scores.outcomes, 5, 15),
    workPlanAndFeasibility: evaluationResult.scores.feasibility,
    estimatedBudget: evaluationResult.scores.budget,
    capacityOfLeadResearcherAndTeam: evaluationResult.scores.team,
    relevanceAndOriginality: scale(
      evaluationResult.scores.relevance + evaluationResult.scores.originality,
      25,
      10
    ),
  };

  // Update review with mapped AI scores and comment
  review.scores = mappedScores;
  review.comments = evaluationResult.comment;
  review.status = ReviewStatus.COMPLETED;
  review.completedAt = new Date();

  await review.save();

  logger.info(`Generated AI review for proposal ${review.proposal._id}`);
};
