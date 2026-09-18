import { getBypassReviewerIds, isBypassReviewer } from '../config/bypassReviewers';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../config/agenda', () => ({
  __esModule: true,
  default: { now: jest.fn() },
}));
jest.mock('../services/email.service', () => ({
  __esModule: true,
  default: { sendAiReviewFailureEmail: jest.fn() },
}));
jest.mock('uniben-ai-proposal-review-cli', () => ({ reviewProposal: jest.fn() }), {
  virtual: true,
});
jest.mock('../Review_System/models/review.model', () => {
  const actual = jest.requireActual('../Review_System/models/review.model');
  return {
    __esModule: true,
    ReviewType: actual.ReviewType,
    ReviewStatus: actual.ReviewStatus,
    default: { findOne: jest.fn(), find: jest.fn(), exists: jest.fn() },
  };
});
jest.mock('../Proposal_Submission/models/proposal.model', () => {
  const actual = jest.requireActual('../Proposal_Submission/models/proposal.model');
  return {
    __esModule: true,
    ProposalStatus: actual.ProposalStatus,
    SubmitterType: actual.SubmitterType,
    default: { findById: jest.fn() },
  };
});
jest.mock('../Review_System/models/award.model', () => {
  const actual = jest.requireActual('../Review_System/models/award.model');
  const AwardMock: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
  }));
  AwardMock.findOne = jest.fn();
  return { __esModule: true, AwardStatus: actual.AwardStatus, default: AwardMock };
});
jest.mock('../Review_System/controllers/reconciliation.controller', () => ({
  __esModule: true,
  default: {
    checkReviewDiscrepancies: jest.fn(),
    getDiscrepancyDetails: jest.fn(),
    processReconciliationReview: jest.fn(),
  },
}));

import Review from '../Review_System/models/review.model';
import Proposal from '../Proposal_Submission/models/proposal.model';
import Award from '../Review_System/models/award.model';
import reconciliationController from '../Review_System/controllers/reconciliation.controller';
import reviewController from '../Review_System/controllers/review.controller';
import { generateAIReviewForProposal } from '../Review_System/controllers/aiScoring.controller';

const SOLO_ID = '68557cdbc6540899e1dc934f';

const runSubmit = (): Promise<{ status: number; body: any }> =>
  new Promise((resolve, reject) => {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((body: any) =>
        resolve({ status: res.status.mock.calls[0][0], body })
      ),
    };
    (reviewController.submitReview as any)(
      {
        user: { id: SOLO_ID, role: 'reviewer' },
        params: { id: 'review1' },
        body: { scores: { methodology: 12 }, comments: 'ok' },
      },
      res,
      (err: unknown) => reject(err)
    );
  });

describe('bypass reviewer config', () => {
  afterEach(() => delete process.env.BYPASS_REVIEWER_IDS);

  it('recognises the hardcoded id', () => {
    expect(isBypassReviewer(SOLO_ID)).toBe(true);
    expect(isBypassReviewer('aaaaaaaaaaaaaaaaaaaaaaaa')).toBe(false);
    expect(isBypassReviewer(null)).toBe(false);
  });

  it('merges ids from BYPASS_REVIEWER_IDS and ignores malformed ones', () => {
    process.env.BYPASS_REVIEWER_IDS = ` bbbbbbbbbbbbbbbbbbbbbbbb , not-an-id, ${SOLO_ID}`;
    const ids = getBypassReviewerIds();
    expect(ids).toEqual([SOLO_ID, 'bbbbbbbbbbbbbbbbbbbbbbbb']);
    expect(isBypassReviewer('bbbbbbbbbbbbbbbbbbbbbbbb')).toBe(true);
  });
});

describe('submitReview - solo reviewer', () => {
  const proposalDoc: any = {
    _id: 'p1',
    submitter: 's1',
    estimatedBudget: 500000,
    status: 'under_review',
    reviewStatus: 'pending',
    save: jest.fn().mockResolvedValue(undefined),
  };

  const makeReview = (isSoloReview: boolean) => ({
    _id: 'review1',
    proposal: 'p1',
    reviewer: SOLO_ID,
    reviewType: 'human',
    status: 'in_progress',
    isSoloReview,
    totalScore: 82,
    save: jest.fn().mockResolvedValue(undefined),
  });

  it('finalises straight to decision stage with no discrepancy check', async () => {
    (Review.findOne as jest.Mock).mockResolvedValue(makeReview(true));
    (Proposal.findById as jest.Mock).mockResolvedValue(proposalDoc);
    (Award.findOne as jest.Mock).mockResolvedValue(null);

    const { status, body } = await runSubmit();

    expect(status).toBe(200);
    expect(body.data.soloReview).toBe(true);
    expect(body.data.finalScore).toBe(82);
    expect(proposalDoc.reviewStatus).toBe('reviewed');
    expect(Award).toHaveBeenCalledWith(
      expect.objectContaining({ finalScore: 82, status: 'pending', fundingAmount: 500000 })
    );
    expect(Review.find).not.toHaveBeenCalled(); // never looked for other reviews
    expect(reconciliationController.checkReviewDiscrepancies).not.toHaveBeenCalled();
    expect(reconciliationController.getDiscrepancyDetails).not.toHaveBeenCalled();
  });

  it('updates a pending award instead of duplicating it', async () => {
    const existingAward: any = {
      status: 'pending',
      finalScore: 10,
      save: jest.fn().mockResolvedValue(undefined),
    };
    (Review.findOne as jest.Mock).mockResolvedValue(makeReview(true));
    (Proposal.findById as jest.Mock).mockResolvedValue(proposalDoc);
    (Award.findOne as jest.Mock).mockResolvedValue(existingAward);

    await runSubmit();

    expect(existingAward.finalScore).toBe(82);
    expect(existingAward.save).toHaveBeenCalled();
    expect(Award).not.toHaveBeenCalled();
  });

  it('non-solo reviews still use the normal discrepancy flow', async () => {
    (Review.findOne as jest.Mock).mockResolvedValue(makeReview(false));
    (Review.find as jest.Mock).mockResolvedValue([
      { status: 'completed', reviewType: 'human' },
      { status: 'completed', reviewType: 'ai' },
    ]);
    (reconciliationController.getDiscrepancyDetails as jest.Mock).mockResolvedValue({
      criteriaDiscrepancies: [],
      overallDiscrepancy: { avg: 80 },
    });
    (reconciliationController.checkReviewDiscrepancies as jest.Mock).mockResolvedValue({
      hasDiscrepancy: true,
    });
    // no existing reconciliation
    (Review.findOne as jest.Mock)
      .mockResolvedValueOnce(makeReview(false))
      .mockResolvedValueOnce(null);

    const { body } = await runSubmit();

    expect(body.data.soloReview).toBeUndefined();
    expect(reconciliationController.checkReviewDiscrepancies).toHaveBeenCalledWith('p1');
  });
});

describe('AI review guard', () => {
  it('skips AI generation when the proposal has a solo review', async () => {
    (Proposal.findById as jest.Mock).mockResolvedValue({ _id: 'p1' });
    (Review.exists as jest.Mock).mockResolvedValue({ _id: 'r1' });

    const result = await generateAIReviewForProposal('p1');

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/skipped/i);
    expect(Review.findOne).not.toHaveBeenCalled();
  });
});
