// src/Review_System/routes/review.routes.ts
import { Router } from 'express';
import reviewController from '../controllers/review.controller';
import { authenticateReviewerToken } from '../../middleware/auth.middleware';
import validateRequest from '../../middleware/validateRequest';
import { z } from 'zod';

const router = Router();

// Validation schemas
const reviewIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid review ID format'),
  }),
});

const submitReviewSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid review ID format'),
  }),
  body: z.object({
    scores: z.object({
      backgroundAndProblemStatement: z.number().min(0).max(15),
      researchObjectives: z.number().min(0).max(10),
      methodology: z.number().min(0).max(20),
      expectedOutcomesAndImpact: z.number().min(0).max(15),
      workPlanAndFeasibility: z.number().min(0).max(10),
      estimatedBudget: z.number().min(0).max(10),
      capacityOfLeadResearcherAndTeam: z.number().min(0).max(10),
      relevanceAndOriginality: z.number().min(0).max(10),
    }),
    comments: z.string(),
  }),
});

const saveProgressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid review ID format'),
  }),
  body: z.object({
    scores: z
      .object({
        backgroundAndProblemStatement: z.number().min(0).max(15).optional(),
        researchObjectives: z.number().min(0).max(10).optional(),
        methodology: z.number().min(0).max(20).optional(),
        expectedOutcomesAndImpact: z.number().min(0).max(15).optional(),
        workPlanAndFeasibility: z.number().min(0).max(10).optional(),
        estimatedBudget: z.number().min(0).max(10).optional(),
        capacityOfLeadResearcherAndTeam: z.number().min(0).max(10).optional(),
        relevanceAndOriginality: z.number().min(0).max(10).optional(),
      })
      .optional(),
    comments: z.string().optional(),
  }),
});

// Reviewer routes
router.get(
  '/assignments',
  authenticateReviewerToken,
  reviewController.getReviewerAssignments
);
router.get(
  '/statistics',
  authenticateReviewerToken,
  reviewController.getReviewerStatistics
);
router.get(
  '/:id',
  authenticateReviewerToken,
  validateRequest(reviewIdSchema),
  reviewController.getReviewById
);
router.post(
  '/:id/submit',
  authenticateReviewerToken,
  validateRequest(submitReviewSchema),
  reviewController.submitReview
);
router.patch(
  '/:id/save-progress',
  authenticateReviewerToken,
  validateRequest(saveProgressSchema),
  reviewController.saveReviewProgress
);

export default router;
