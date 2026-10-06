/* eslint-disable max-lines */
import { Request, Response } from 'express';
import FullProposal, {
  FullProposalStatus,
} from '../../researchers/models/fullProposal.model';
import Award, { AwardStatus } from '../../Review_System/models/award.model';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/customErrors';
import asyncHandler from '../../utils/asyncHandler';
import logger from '../../utils/logger';
import { IUser } from '../../model/user.model';
import emailService from '../../services/email.service';
import { resolveWindow } from '../../model/submissionWindow.model';
import {
  EXPORT_SORTS,
  EXPORT_THEN_BY,
  ExportEntry,
  ExportSort,
  ExportThenBy,
  buildFullProposalsDocx,
  parseExportFields,
  resolveFunding,
} from '../../utils/fullProposalDocx';

// Define a generic response interface for admin controller
interface IAdminResponse {
  success: boolean;
  message?: string;
  data?: any;
  count?: number;
  total?: number;
  totalPages?: number;
  currentPage?: number;
  statistics?: {
    totalFullProposals: number;
    pendingDecisions: number;
    approved: number;
    rejected: number;
    approvedBudget: number;
    submittedThisMonth: number;
    nearingDeadline: number;
  };
}

interface AdminAuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

class FullProposalDecisionsController {
  // Get all full proposals for decision making
  getAllFullProposals = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const {
        page = 1,
        limit = 10,
        sort = 'score',
        order = 'desc',
        faculty,
        status,
        search, // Free-text match on project title / submitter name
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build aggregation pipeline for statistics
      const statisticsPipeline: any[] = [
        // First lookup the original proposal
        {
          $lookup: {
            from: 'Proposals',
            localField: 'proposal',
            foreignField: '_id',
            as: 'proposalDetails',
          },
        },
        {
          $unwind: '$proposalDetails',
        },
        // Lookup award details to ensure only approved awards are included
        {
          $lookup: {
            from: 'awards',
            localField: 'proposal',
            foreignField: 'proposal',
            as: 'awardDetails',
          },
        },
        {
          $unwind: '$awardDetails',
        },
        // Only include full proposals where the award is approved
        {
          $match: {
            'awardDetails.status': AwardStatus.APPROVED,
          },
        },
        // Lookup submitter details
        {
          $lookup: {
            from: 'Users_2',
            localField: 'submitter',
            foreignField: '_id',
            as: 'submitterDetails',
          },
        },
        {
          $unwind: '$submitterDetails',
        },
        // faculty is a title string on the user (Option A); synthesize the
        // previous facultyDetails shape so downstream stages are unchanged.
        {
          $addFields: {
            facultyDetails: {
              _id: '$submitterDetails.faculty',
              title: '$submitterDetails.faculty',
            },
          },
        },
        // Apply faculty filter if provided
        ...(faculty ? [
          {
            $match: {
              'facultyDetails._id': faculty as string,
            },
          },
        ] : []),
        // Apply status filter if provided
        ...(status ? [
          {
            $match: {
              status: status as string,
            },
          },
        ] : []),
        // Calculate statistics
        {
          $group: {
            _id: null,
            totalFullProposals: { $sum: 1 },
            pendingDecisions: {
              $sum: {
                $cond: [
                  { $eq: ['$status', FullProposalStatus.SUBMITTED] },
                  1,
                  0,
                ],
              },
            },
            approved: {
              $sum: {
                $cond: [
                  { $eq: ['$status', FullProposalStatus.APPROVED] },
                  1,
                  0,
                ],
              },
            },
            rejected: {
              $sum: {
                $cond: [
                  { $eq: ['$status', FullProposalStatus.REJECTED] },
                  1,
                  0,
                ],
              },
            },
            approvedBudget: {
              $sum: {
                $cond: [
                  { $eq: ['$status', FullProposalStatus.APPROVED] },
                  { $ifNull: ['$awardDetails.fundingAmount', 0] },
                  0,
                ],
              },
            },
            submittedThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$submittedAt',
                      new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        1
                      ),
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            nearingDeadline: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', FullProposalStatus.SUBMITTED] },
                      {
                        $lte: [
                          '$deadline',
                          new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)), // 7 days from now
                        ],
                      },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ];

      // Build main data pipeline
      const dataPipeline: any[] = [
        // Lookup the original proposal
        {
          $lookup: {
            from: 'Proposals',
            localField: 'proposal',
            foreignField: '_id',
            as: 'proposalDetails',
          },
        },
        {
          $unwind: '$proposalDetails',
        },
        // Lookup award details to ensure only approved awards are included
        {
          $lookup: {
            from: 'awards',
            localField: 'proposal',
            foreignField: 'proposal',
            as: 'awardDetails',
          },
        },
        {
          $unwind: '$awardDetails',
        },
        // Only include full proposals where the award is approved
        {
          $match: {
            'awardDetails.status': AwardStatus.APPROVED,
          },
        },
        // Lookup submitter details
        {
          $lookup: {
            from: 'Users_2',
            localField: 'submitter',
            foreignField: '_id',
            as: 'submitterDetails',
          },
        },
        {
          $unwind: '$submitterDetails',
        },
        // faculty is a title string on the user (Option A); synthesize the
        // previous facultyDetails shape so downstream stages are unchanged.
        {
          $addFields: {
            facultyDetails: {
              _id: '$submitterDetails.faculty',
              title: '$submitterDetails.faculty',
            },
          },
        },
        // department is a title string on the user (Option A); synthesize the
        // previous departmentDetails shape so downstream stages are unchanged.
        {
          $addFields: {
            departmentDetails: {
              _id: '$submitterDetails.department',
              title: '$submitterDetails.department',
            },
          },
        },
      ];

      // Apply faculty filter if provided
      if (faculty) {
        dataPipeline.push({
          $match: {
            'facultyDetails._id': faculty as string,
          },
        });
      }

      // Apply status filter if provided (server-side, against full dataset)
      if (status && status !== 'all') {
        dataPipeline.push({
          $match: {
            status: status as string,
          },
        });
      }

      // Apply search filter if provided (server-side, against full dataset)
      if (search) {
        const escapedSearch = (search as string).replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );
        dataPipeline.push({
          $match: {
            $or: [
              { 'proposalDetails.projectTitle': { $regex: escapedSearch, $options: 'i' } },
              {
                'submitterDetails.name': {
                  $regex: escapedSearch,
                  $options: 'i',
                },
              },
            ],
          },
        });
      }

      // Add projection to clean up response
      dataPipeline.push({
        $project: {
          docFile: 1,
          status: 1,
          score: 1,
          submittedAt: 1,
          deadline: 1,
          reviewedAt: 1,
          reviewComments: 1,
          draftReviewComments: 1,
          draftFundingAmount: 1,
          draftReviewedAt: 1,
          lastNotifiedAt: 1,
          notificationCount: 1,
          createdAt: 1,
          updatedAt: 1,
          originalProposal: {
            _id: '$proposalDetails._id',
            projectTitle: '$proposalDetails.projectTitle',
            estimatedBudget: '$proposalDetails.estimatedBudget',
          },
          award: {
            fundingAmount: '$awardDetails.fundingAmount',
            approvedAt: '$awardDetails.approvedAt',
          },
          submitter: {
            name: '$submitterDetails.name',
            email: '$submitterDetails.email',
            userType: '$submitterDetails.userType',
            phoneNumber: '$submitterDetails.phoneNumber',
            alternativeEmail: '$submitterDetails.alternativeEmail',
          },
          faculty: {
            _id: '$facultyDetails._id',
            title: '$facultyDetails.title',
            code: '$facultyDetails.code',
          },
          department: {
            title: '$departmentDetails.title',
            code: '$departmentDetails.code',
          },
        },
      });

      // Count total documents for pagination
      const countPipeline = [...dataPipeline, { $count: 'total' }];

      // Add sorting
      let sortObj: Record<string, 1 | -1> = {};

      if (sort === 'title') {
        sortObj = { 'originalProposal.projectTitle': order === 'asc' ? 1 : -1 };
      } else if (sort === 'deadline') {
        sortObj = { deadline: order === 'asc' ? 1 : -1 };
      } else if (sort === 'score') {
        sortObj = {
          score: order === 'asc' ? 1 : -1,
          submittedAt: -1,
        };
      } else {
        sortObj[sort as string] = order === 'asc' ? 1 : -1;
      }
      // Deterministic tiebreaker: guarantees stable ordering across page loads.
      sortObj._id = 1;

      dataPipeline.push({ $sort: sortObj });

      // Add pagination
      dataPipeline.push({ $skip: skip }, { $limit: limitNum });

      // Execute all aggregations
      const [statisticsResult, fullProposals, totalResult] = await Promise.all([
        FullProposal.aggregate(statisticsPipeline),
        FullProposal.aggregate(dataPipeline),
        FullProposal.aggregate(countPipeline),
      ]);

      const statistics = statisticsResult[0] || {
        totalFullProposals: 0,
        pendingDecisions: 0,
        approved: 0,
        rejected: 0,
        approvedBudget: 0,
        submittedThisMonth: 0,
        nearingDeadline: 0,
      };

      const totalProposals = totalResult[0]?.total || 0;

      logger.info(
        `Admin ${user.id} retrieved full proposals list for decision${
          faculty ? ` filtered by faculty: ${faculty}` : ''
        }${status ? ` with status: ${status}` : ''}`
      );

      res.status(200).json({
        success: true,
        count: fullProposals.length,
        total: totalProposals,
        totalPages: Math.ceil(totalProposals / limitNum),
        currentPage: pageNum,
        data: fullProposals,
        statistics,
      });
    }
  );

  // Assign score to full proposal
  assignFullProposalScore = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;
      const { score } = req.body;

      // Validate score
      if (!score || score < 1 || score > 100) {
        throw new Error('Score must be between 1 and 100');
      }

      const fullProposal = await FullProposal.findById(id);

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      // Check if the original proposal has an approved award
      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });

      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      // Update the full proposal with score
      fullProposal.score = score;
      await fullProposal.save();

      logger.info(
        `Admin ${user.id} assigned score ${score} to full proposal ${id}`
      );

      res.status(200).json({
        success: true,
        message: 'Full proposal score assigned successfully',
        data: fullProposal,
      });
    }
  );

  editFullProposalScore = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;
      const { score } = req.body;

      // Validate score
      if (!score || score < 1 || score > 100) {
        throw new Error('Score must be between 1 and 100');
      }

      const fullProposal = await FullProposal.findById(id);

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      // Ensure a score was previously assigned
      if (fullProposal.score === undefined || fullProposal.score === null) {
        throw new Error('No score has been assigned yet to edit');
      }

      // Check if the original proposal has an approved award
      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });

      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      // Update the score
      fullProposal.score = score;
      await fullProposal.save();

      logger.info(
        `Admin ${user.id} edited score to ${score} for full proposal ${id}`
      );

      res.status(200).json({
        success: true,
        message: 'Full proposal score edited successfully',
        data: fullProposal,
      });
    }
  );

  // Save the admin's working review (score, comments, budget) before a final
  // decision. Stored separately from reviewComments / Award.fundingAmount so
  // nothing reaches the researcher until a decision is made and notified.
  saveDraftReview = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;
      const { score, reviewComments, fundingAmount } = req.body;

      const set: Record<string, unknown> = {};
      const unset: Record<string, 1> = {};

      if (score !== undefined) {
        const parsedScore = Number(score);
        if (!Number.isFinite(parsedScore) || parsedScore < 1 || parsedScore > 100) {
          throw new BadRequestError('Score must be between 1 and 100');
        }
        set.score = parsedScore;
      }

      if (reviewComments !== undefined) {
        if (typeof reviewComments !== 'string') {
          throw new BadRequestError('Review comments must be text');
        }
        if (reviewComments.trim()) {
          set.draftReviewComments = reviewComments.trim();
        } else {
          unset.draftReviewComments = 1;
        }
      }

      if (fundingAmount !== undefined) {
        if (fundingAmount === null || fundingAmount === '') {
          unset.draftFundingAmount = 1;
        } else {
          const parsedFunding = Number(fundingAmount);
          if (!Number.isFinite(parsedFunding) || parsedFunding <= 0) {
            throw new BadRequestError('Funding amount must be a positive number');
          }
          set.draftFundingAmount = parsedFunding;
        }
      }

      if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
        throw new BadRequestError(
          'Provide a score, review comments or funding amount to save'
        );
      }

      const fullProposal = await FullProposal.findById(id);
      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });
      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      set.draftReviewedAt = new Date();

      // Conditional on the proposal still being undecided, so a stale save
      // from a second admin can never overwrite a decision that was just made.
      const updated = await FullProposal.findOneAndUpdate(
        {
          _id: id,
          status: {
            $in: [FullProposalStatus.SUBMITTED, FullProposalStatus.UNDER_REVIEW],
          },
        },
        {
          $set: set,
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new BadRequestError(
          'A decision has already been made on this full proposal; the review can no longer be edited'
        );
      }

      logger.info(`Admin ${user.id} saved draft review for full proposal ${id}`);

      res.status(200).json({
        success: true,
        message: 'Review saved successfully',
        data: {
          score: updated.score,
          draftReviewComments: updated.draftReviewComments ?? '',
          draftFundingAmount: updated.draftFundingAmount ?? null,
          draftReviewedAt: updated.draftReviewedAt,
        },
      });
    }
  );

  // Update full proposal status (approve/reject with review comments)
  updateFullProposalStatus = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;
      const { status, reviewComments, fundingAmount, sendComments } = req.body;

      // Validate status
      if (!Object.values(FullProposalStatus).includes(status)) {
        throw new Error('Invalid status provided');
      }

      const fullProposal = await FullProposal.findById(id).populate('proposal');

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      // Check if score is assigned before allowing status update
      if (fullProposal.score === undefined || fullProposal.score === null) {
        throw new Error(
          'Score must be assigned before updating proposal status'
        );
      }

      // Find the associated award
      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });

      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      // Funding amount (approval only) must be a positive finite number.
      const hasFunding = fundingAmount !== undefined && fundingAmount !== null;
      const parsedFunding = hasFunding ? Number(fundingAmount) : undefined;
      if (
        status === FullProposalStatus.APPROVED &&
        parsedFunding !== undefined &&
        (!Number.isFinite(parsedFunding) || parsedFunding <= 0)
      ) {
        throw new BadRequestError('Funding amount must be a positive number');
      }

      const finalComments =
        typeof reviewComments === 'string' ? reviewComments.trim() : '';

      // A rejection may choose NOT to release comments, but only when a draft
      // review already exists (the comments are then kept for the export).
      // Without a draft, or without the flag, behaviour is unchanged: the
      // comments are released to the researcher.
      const hasDraft = Boolean(fullProposal.draftReviewComments?.trim());
      const releaseComments = !(
        status === FullProposalStatus.REJECTED &&
        hasDraft &&
        sendComments === false
      );

      // Update the full proposal
      fullProposal.status = status;
      fullProposal.reviewComments = releaseComments ? finalComments : '';
      if (finalComments) {
        // Keep the admin-side copy in sync with what was finally written
        fullProposal.draftReviewComments = finalComments;
      }
      fullProposal.reviewedAt = new Date();

      // If approving the full proposal, update the award funding amount
      if (
        status === FullProposalStatus.APPROVED &&
        parsedFunding !== undefined
      ) {
        award.fundingAmount = parsedFunding;
        fullProposal.draftFundingAmount = parsedFunding;
        await award.save();

        logger.info(
          `Admin ${user.id} updated funding amount to ${parsedFunding} for full proposal ${id}`
        );
      }

      await fullProposal.save();

      logger.info(
        `Admin ${user.id} updated full proposal ${id} status to ${status}${
          releaseComments ? '' : ' (review comments withheld from researcher)'
        }`
      );

      res.status(200).json({
        success: true,
        message: 'Full proposal status updated successfully',
        data: {
          ...fullProposal.toObject(),
          award: {
            fundingAmount: award.fundingAmount,
            approvedAt: award.approvedAt,
          },
        },
      });
    }
  );

  // Edit funding amount for approved full proposal
  editFullProposalFundingAmount = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;
      const { fundingAmount } = req.body;

      // Validate funding amount
      if (!fundingAmount || fundingAmount <= 0) {
        throw new Error('Funding amount must be a positive number');
      }

      const fullProposal = await FullProposal.findById(id);

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      // Only allow editing funding amount for approved full proposals
      if (fullProposal.status !== FullProposalStatus.APPROVED) {
        throw new UnauthorizedError(
          'Funding amount can only be edited for approved full proposals'
        );
      }

      // Find the associated award
      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });

      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      // Update the funding amount
      const previousAmount = award.fundingAmount;
      award.fundingAmount = fundingAmount;
      await award.save();

      logger.info(
        `Admin ${user.id} edited funding amount from ${previousAmount} to ${fundingAmount} for full proposal ${id}`
      );

      res.status(200).json({
        success: true,
        message: 'Funding amount updated successfully',
        data: {
          fullProposalId: fullProposal._id,
          previousAmount,
          newAmount: fundingAmount,
          updatedAt: new Date(),
        },
      });
    }
  );

  // Export reviewed full proposals to a single Word document.
  // "Reviewed" = has review comments (admin draft or released). Query:
  //   fields      csv of title,name,faculty,department,score,status,comments,funding,link (default: all)
  //   sort        title | name | score | submittedAt | faculty | faculty_department
  //   thenBy      title | name | score | submittedAt (ordering inside faculty groups)
  //   order       asc | desc
  //   faculty / department   csv filters (exact titles)
  //   status      all | submitted | approved | rejected
  //   includeUnreviewed=true  also include proposals without comments
  //   requireScore=true       only proposals that have a score
  exportFullProposalsDocx = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const query = req.query;

      const fields = parseExportFields(query.fields);
      if (fields.length === 0) {
        throw new BadRequestError('Select at least one field to export');
      }

      const sortRaw = typeof query.sort === 'string' ? query.sort : 'title';
      if (!(EXPORT_SORTS as readonly string[]).includes(sortRaw)) {
        throw new BadRequestError('Invalid sort option');
      }
      const sort = sortRaw as ExportSort;

      const thenByRaw = typeof query.thenBy === 'string' ? query.thenBy : 'title';
      if (!(EXPORT_THEN_BY as readonly string[]).includes(thenByRaw)) {
        throw new BadRequestError('Invalid secondary sort option');
      }
      const thenBy = thenByRaw as ExportThenBy;

      const defaultOrder =
        sort === 'score' || (sort.startsWith('faculty') && thenBy === 'score') ? 'desc' : 'asc';
      const order =
        query.order === 'asc' || query.order === 'desc' ? query.order : defaultOrder;

      const toList = (value: unknown): string[] =>
        (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
          .map((v) => String(v).trim())
          .filter(Boolean);
      const faculties = toList(query.faculty);
      const departments = toList(query.department);

      const status =
        typeof query.status === 'string' &&
        Object.values(FullProposalStatus).includes(query.status as never) ? query.status : undefined;

      const filters: Record<string, unknown>[] = [];
      if (faculties.length) {
        filters.push({ 'submitterDetails.faculty': { $in: faculties } });
      }
      if (departments.length) {
        filters.push({ 'submitterDetails.department': { $in: departments } });
      }
      if (status) {
        filters.push({ status });
      }
      if (query.includeUnreviewed !== 'true') {
        filters.push({
          $or: [
            { draftReviewComments: { $nin: [null, ''] } },
            { reviewComments: { $nin: [null, ''] } },
          ],
        });
      }
      if (query.requireScore === 'true') {
        filters.push({ score: { $exists: true, $ne: null } });
      }

      const pipeline: any[] = [
        {
          $lookup: {
            from: 'Proposals',
            localField: 'proposal',
            foreignField: '_id',
            as: 'proposalDetails',
          },
        },
        { $unwind: '$proposalDetails' },
        {
          $lookup: {
            from: 'awards',
            localField: 'proposal',
            foreignField: 'proposal',
            as: 'awardDetails',
          },
        },
        { $unwind: '$awardDetails' },
        { $match: { 'awardDetails.status': AwardStatus.APPROVED } },
        {
          $lookup: {
            from: 'Users_2',
            localField: 'submitter',
            foreignField: '_id',
            as: 'submitterDetails',
          },
        },
        { $unwind: '$submitterDetails' },
        ...(filters.length ? [{ $match: { $and: filters } }] : []),
        {
          $project: {
            status: 1,
            score: 1,
            submittedAt: 1,
            docFile: 1,
            reviewComments: 1,
            draftReviewComments: 1,
            draftFundingAmount: 1,
            title: '$proposalDetails.projectTitle',
            name: '$submitterDetails.name',
            faculty: '$submitterDetails.faculty',
            department: '$submitterDetails.department',
            awardAmount: '$awardDetails.fundingAmount',
          },
        },
      ];

      const rows = await FullProposal.aggregate(pipeline);

      if (rows.length === 0) {
        throw new NotFoundError(
          'No full proposals match the selected filters. Save review comments on the detail page first, or widen the filters.'
        );
      }

      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      const entries: ExportEntry[] = rows.map((row: any) => {
        const doc: string = row.docFile || '';
        let link = '';
        if (doc) {
          link = /^https?:\/\//i.test(doc) ? doc : `${baseUrl}/${doc.replace(/^\/+/, '')}`;
        }
        return {
          title: row.title || '',
          name: row.name || '',
          faculty: row.faculty || '',
          department: row.department || '',
          score: typeof row.score === 'number' ? row.score : null,
          status: row.status,
          comments: row.draftReviewComments || row.reviewComments || '',
          fundingAmount: resolveFunding(
            row.status,
            row.awardAmount,
            row.draftFundingAmount
          ),
          link,
          submittedAt: row.submittedAt ? new Date(row.submittedAt) : null,
        };
      });

      const buffer = await buildFullProposalsDocx(entries, {
        fields,
        sort,
        thenBy,
        order,
      });

      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="full-proposal-review-${stamp}.docx"`
      );
      res.status(200).send(buffer);

      logger.info(
        `Admin ${user.id} exported ${entries.length} full proposals to docx (sort: ${sort}, fields: ${fields.join(',')})`
      );
    }
  );

  // Get full proposal by ID
  getFullProposalById = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { id } = req.params;

      const fullProposal = await FullProposal.findById(id)
        .populate({
          path: 'proposal',
          select: 'projectTitle estimatedBudget submitterType',
        })
        .populate({
          path: 'submitter',
          select:
            'name email userType phoneNumber alternativeEmail faculty department',
        });

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      // Check if the original proposal has an approved award
      const award = await Award.findOne({
        proposal: fullProposal.proposal,
        status: AwardStatus.APPROVED,
      });

      if (!award) {
        throw new UnauthorizedError(
          'This full proposal is not associated with an approved award'
        );
      }

      logger.info(`Admin ${user.id} retrieved full proposal ${id}`);

      res.status(200).json({
        success: true,
        data: {
          ...fullProposal.toObject(),
          award: {
            fundingAmount: award.fundingAmount,
            approvedAt: award.approvedAt,
          },
        },
      });
    }
  );

  // Notify applicants about full proposal decision
  notifyFullProposalApplicants = asyncHandler(
    async (req: Request, res: Response<IAdminResponse>): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const { fullProposalId } = req.params;

      const fullProposal = await FullProposal.findById(fullProposalId)
        .populate({
          path: 'proposal',
          select: 'projectTitle',
        })
        .populate({
          path: 'submitter',
          select: 'email name faculty department',
        });

      if (!fullProposal) {
        throw new NotFoundError('Full proposal not found');
      }

      if (!fullProposal.submitter) {
        throw new Error('Submitter not found for notification');
      }

      const submitterUser = fullProposal.submitter as unknown as IUser;
      const proposalDetails = fullProposal.proposal as any;

      if (!submitterUser.email || !proposalDetails.projectTitle) {
        throw new Error(
          'Submitter email or proposal title not found for notification'
        );
      }

      // Dynamic final-submission deadline for the email, sourced from the
      // admin-configurable submission window rather than a stored/stale date.
      const finalSubmissionWindow = await resolveWindow('final_submission');

      // Send email notification about full proposal decision
      await emailService.sendFullProposalStatusUpdateEmail(
        submitterUser.email,
        submitterUser.name,
        proposalDetails.projectTitle,
        fullProposal.status,
        fullProposal.reviewComments,
        finalSubmissionWindow.closesAt
      );

      logger.info(
        `Admin ${user.id} notified applicant for full proposal ${fullProposalId}`
      );

      // Update notification tracking (mirrors the first decision flow)
      await FullProposal.findByIdAndUpdate(fullProposalId, {
        lastNotifiedAt: new Date(),
        $inc: { notificationCount: 1 },
      });

      res.status(200).json({
        success: true,
        message: 'Applicant notified successfully about full proposal decision',
      });
    }
  );
}

export default new FullProposalDecisionsController();
