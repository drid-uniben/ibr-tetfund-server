import mongoose, { Document, Schema, Types } from 'mongoose';

export const ReviewType = {
  HUMAN: 'human',
  AI: 'ai',
  RECONCILIATION: 'reconciliation',
} as const;

export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReviewStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export interface IScore {
  backgroundAndProblemStatement: number;
  researchObjectives: number;
  methodology: number;
  expectedOutcomesAndImpact: number;
  workPlanAndFeasibility: number;
  estimatedBudget: number;
  capacityOfLeadResearcherAndTeam: number;
  relevanceAndOriginality: number;
}

export interface IReview extends Document {
  proposal: Types.ObjectId;
  reviewer: Types.ObjectId | null; // null for AI reviews
  reviewType: ReviewType;
  scores: IScore;
  comments: string;
  totalScore: number;
  status: ReviewStatus;
  // true when this is the only review for the proposal (bypass/solo reviewer):
  // no AI review, no discrepancy check, submitting it finalises the proposal
  isSoloReview: boolean;
  dueDate: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema<IReview> = new Schema(
  {
    proposal: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      required: [true, 'Proposal reference is required'],
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for AI reviews
    },
    reviewType: {
      type: String,
      enum: Object.values(ReviewType),
      required: [true, 'Review type is required'],
    },
    scores: {
      backgroundAndProblemStatement: {
        type: Number,
        min: 0,
        max: 15,
        default: 0,
      },
      researchObjectives: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      methodology: {
        type: Number,
        min: 0,
        max: 20,
        default: 0,
      },
      expectedOutcomesAndImpact: {
        type: Number,
        min: 0,
        max: 15,
        default: 0,
      },
      workPlanAndFeasibility: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      estimatedBudget: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      capacityOfLeadResearcherAndTeam: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      relevanceAndOriginality: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
    },
    comments: {
      type: String,
      default: '',
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.IN_PROGRESS,
    },
    isSoloReview: {
      type: Boolean,
      default: false,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    completedAt: {
      type: Date,
    },
    createdAt: Date,
    updatedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Calculate total score before saving
ReviewSchema.pre<IReview>('save', function (next) {
  const scores = this.scores;
  if (scores) {
    this.totalScore =
      (scores.backgroundAndProblemStatement || 0) +
      (scores.researchObjectives || 0) +
      (scores.methodology || 0) +
      (scores.expectedOutcomesAndImpact || 0) +
      (scores.workPlanAndFeasibility || 0) +
      (scores.estimatedBudget || 0) +
      (scores.capacityOfLeadResearcherAndTeam || 0) +
      (scores.relevanceAndOriginality || 0);
  }
  next();
});

export default mongoose.model<IReview>('Review', ReviewSchema, 'Reviews');
