import { Request, Response } from 'express';
import Proposal from '../../Proposal_Submission/models/proposal.model';
import FullProposal from '../../researchers/models/fullProposal.model';
import { UnauthorizedError } from '../../utils/customErrors';
import asyncHandler from '../../utils/asyncHandler';
import logger from '../../utils/logger';
import { PipelineStage } from 'mongoose';

interface AdminAuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
  };
}

class AnalyticsController {
  // Stage 1: Faculties with proposal submissions
  getFacultiesWithSubmissions = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        logger.warn(
          `Unauthorized access attempt by user ${user.id} to getFacultiesWithSubmissions`
        );
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const pipeline = [
        // Match proposals ready for statistics
        {
          $match: {
            reviewStatus: { $in: ['reviewed'] },
            isArchived: { $ne: true },
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
        { $unwind: '$submitterDetails' },
        // faculty is stored as a title string on the user (Option A) — group
        // on it directly rather than joining a faculties collection.
        { $match: { 'submitterDetails.faculty': { $nin: [null, ''] } } },
        {
          $group: {
            _id: '$submitterDetails.faculty',
            facultyName: { $first: '$submitterDetails.faculty' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ];

      const result = await Proposal.aggregate(pipeline as PipelineStage[]);
      logger.info(
        `Admin ${user.id} retrieved faculties with proposal submissions`
      );
      res.status(200).json({ success: true, data: result });
    }
  );

  // Stage 2: Faculties with approved awards
  getFacultiesWithApprovedAwards = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        logger.warn(
          `Unauthorized access attempt by user ${user.id} to getFacultiesWithApprovedAwards`
        );
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const pipeline = [
        {
          $lookup: {
            from: 'awards',
            localField: '_id',
            foreignField: 'proposal',
            as: 'awardDetails',
          },
        },
        { $unwind: '$awardDetails' },
        { $match: { 'awardDetails.status': 'approved' } },
        {
          $lookup: {
            from: 'Users_2',
            localField: 'submitter',
            foreignField: '_id',
            as: 'submitterDetails',
          },
        },
        { $unwind: '$submitterDetails' },
        // faculty is stored as a title string on the user (Option A) — group
        // on it directly rather than joining a faculties collection.
        { $match: { 'submitterDetails.faculty': { $nin: [null, ''] } } },
        {
          $group: {
            _id: '$submitterDetails.faculty',
            facultyName: { $first: '$submitterDetails.faculty' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ];

      const result = await Proposal.aggregate(pipeline as PipelineStage[]);
      logger.info(`Admin ${user.id} retrieved faculties with approved awards`);
      res.status(200).json({ success: true, data: result });
    }
  );

  // Stage 3: Faculties with approved full proposals
  getFacultiesWithApprovedFullProposals = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const user = (req as AdminAuthenticatedRequest).user;
      if (user.role !== 'admin') {
        logger.warn(
          `Unauthorized access attempt by user ${user.id} to getFacultiesWithApprovedFullProposals`
        );
        throw new UnauthorizedError(
          'You do not have permission to access this resource'
        );
      }

      const pipeline = [
        { $match: { status: 'approved' } }, // Use string instead of FullProposalStatus.APPROVED
        {
          $lookup: {
            from: 'Users_2',
            localField: 'submitter',
            foreignField: '_id',
            as: 'submitterDetails',
          },
        },
        { $unwind: '$submitterDetails' },
        // faculty is stored as a title string on the user (Option A) — group
        // on it directly rather than joining a faculties collection.
        { $match: { 'submitterDetails.faculty': { $nin: [null, ''] } } },
        {
          $group: {
            _id: '$submitterDetails.faculty',
            facultyName: { $first: '$submitterDetails.faculty' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ];

      const result = await FullProposal.aggregate(pipeline as PipelineStage[]);
      logger.info(
        `Admin ${user.id} retrieved faculties with approved full proposals`
      );
      res.status(200).json({ success: true, data: result });
    }
  );
}

export default new AnalyticsController();
