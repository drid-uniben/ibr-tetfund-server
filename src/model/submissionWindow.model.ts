import mongoose, { Document, Schema, Types } from 'mongoose';

// The four submission phases an admin can control.
export const SubmissionPhase = {
  STAFF_CONCEPT: 'staff_concept',
  MASTERS_CONCEPT: 'masters_concept',
  FULL_PROPOSAL: 'full_proposal',
  FINAL_SUBMISSION: 'final_submission',
} as const;

export type SubmissionPhase =
  (typeof SubmissionPhase)[keyof typeof SubmissionPhase];

export const SUBMISSION_PHASES = Object.values(
  SubmissionPhase
) as SubmissionPhase[];

export interface ISubmissionWindow extends Document {
  phase: SubmissionPhase;
  opensAt?: Date | null;
  closesAt?: Date | null;
  isManuallyClosed: boolean;
  note?: string | null;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionWindowSchema: Schema<ISubmissionWindow> = new Schema(
  {
    phase: {
      type: String,
      enum: SUBMISSION_PHASES,
      required: [true, 'Submission phase is required'],
      unique: true,
    },
    opensAt: {
      type: Date,
      default: null,
    },
    closesAt: {
      type: Date,
      default: null,
    },
    isManuallyClosed: {
      type: Boolean,
      default: false,
    },
    note: {
      type: String,
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const SubmissionWindow = mongoose.model<ISubmissionWindow>(
  'SubmissionWindow',
  SubmissionWindowSchema,
  'SubmissionWindows'
);

/**
 * Pure helper: is a submission window currently open?
 *
 * Defaults to OPEN when the window is unconfigured (null) so that nothing
 * breaks before an admin has configured a phase.
 */
export const isWindowOpen = (
  win: {
    opensAt?: Date | null;
    closesAt?: Date | null;
    isManuallyClosed?: boolean;
  } | null,
  now: Date = new Date()
): boolean => {
  // Default OPEN when unconfigured.
  if (!win) {
    return true;
  }

  if (win.isManuallyClosed) {
    return false;
  }

  if (win.opensAt && now < new Date(win.opensAt)) {
    return false;
  }

  if (win.closesAt && now > new Date(win.closesAt)) {
    return false;
  }

  return true;
};

export interface IResolvedWindow {
  phase: SubmissionPhase;
  opensAt: Date | null;
  closesAt: Date | null;
  isManuallyClosed: boolean;
  note: string | null;
  isOpen: boolean;
}

/**
 * Fetch the stored window for a phase (or null) and return a normalized
 * resolution with defaults filled in for a missing row (default OPEN).
 */
export const resolveWindow = async (
  phase: SubmissionPhase,
  now: Date = new Date()
): Promise<IResolvedWindow> => {
  const win = await SubmissionWindow.findOne({ phase });

  const opensAt = win?.opensAt ?? null;
  const closesAt = win?.closesAt ?? null;
  const isManuallyClosed = win?.isManuallyClosed ?? false;
  const note = win?.note ?? null;

  return {
    phase,
    opensAt,
    closesAt,
    isManuallyClosed,
    note,
    isOpen: isWindowOpen({ opensAt, closesAt, isManuallyClosed }, now),
  };
};

export default SubmissionWindow;
