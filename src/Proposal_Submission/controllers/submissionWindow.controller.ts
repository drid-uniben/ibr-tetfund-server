import { Request, Response } from 'express';
import SubmissionWindow, {
  SubmissionPhase,
  SUBMISSION_PHASES,
  resolveWindow,
} from '../../model/submissionWindow.model';
import asyncHandler from '../../utils/asyncHandler';
import logger from '../../utils/logger';

const isValidPhase = (phase: string): phase is SubmissionPhase =>
  (SUBMISSION_PHASES as string[]).includes(phase);

class SubmissionWindowController {
  // Public: return all 4 phases (public-safe fields only)
  getPublicWindows = asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const windows = await Promise.all(
        SUBMISSION_PHASES.map((phase) => resolveWindow(phase))
      );

      res.status(200).json({
        success: true,
        data: windows.map((w) => ({
          phase: w.phase,
          opensAt: w.opensAt,
          closesAt: w.closesAt,
          isOpen: w.isOpen,
          note: w.note,
        })),
      });
    }
  );

  // Public: return a single phase (public-safe fields only)
  getPublicWindow = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const phase = req.params.phase as string;

      if (!isValidPhase(phase)) {
        res.status(400).json({
          success: false,
          message: 'Invalid submission phase',
        });
        return;
      }

      const w = await resolveWindow(phase);

      res.status(200).json({
        success: true,
        data: {
          phase: w.phase,
          opensAt: w.opensAt,
          closesAt: w.closesAt,
          isOpen: w.isOpen,
          note: w.note,
        },
      });
    }
  );

  // Admin: list all 4 resolved windows (includes admin-only fields)
  listWindows = asyncHandler(
    async (_req: Request, res: Response): Promise<void> => {
      const resolved = await Promise.all(
        SUBMISSION_PHASES.map((phase) => resolveWindow(phase))
      );

      // Fetch stored rows to expose updatedAt where present.
      const rows = await SubmissionWindow.find({
        phase: { $in: SUBMISSION_PHASES },
      });
      const updatedAtByPhase = new Map(rows.map((r) => [r.phase, r.updatedAt]));

      res.status(200).json({
        success: true,
        data: resolved.map((w) => ({
          phase: w.phase,
          opensAt: w.opensAt,
          closesAt: w.closesAt,
          isOpen: w.isOpen,
          isManuallyClosed: w.isManuallyClosed,
          note: w.note,
          updatedAt: updatedAtByPhase.get(w.phase) ?? null,
        })),
      });
    }
  );

  // Admin: upsert a window for a phase
  upsertWindow = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const phase = req.params.phase as string;

      if (!isValidPhase(phase)) {
        res.status(400).json({
          success: false,
          message: 'Invalid submission phase',
        });
        return;
      }

      const { opensAt, closesAt, isManuallyClosed, note } = req.body as {
        opensAt?: string | null;
        closesAt?: string | null;
        isManuallyClosed?: boolean;
        note?: string | null;
      };

      const parsedOpensAt =
        opensAt === null || opensAt === undefined ? null : new Date(opensAt);
      const parsedClosesAt =
        closesAt === null || closesAt === undefined ? null : new Date(closesAt);

      if (parsedOpensAt && isNaN(parsedOpensAt.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid opensAt date',
        });
        return;
      }

      if (parsedClosesAt && isNaN(parsedClosesAt.getTime())) {
        res.status(400).json({
          success: false,
          message: 'Invalid closesAt date',
        });
        return;
      }

      if (parsedOpensAt && parsedClosesAt && parsedClosesAt < parsedOpensAt) {
        res.status(400).json({
          success: false,
          message: 'closesAt must be on or after opensAt',
        });
        return;
      }

      const update: Record<string, unknown> = {
        phase,
        updatedBy: (req as any).user._id,
      };

      // Only set fields that were provided in the body.
      if (opensAt !== undefined) update.opensAt = parsedOpensAt;
      if (closesAt !== undefined) update.closesAt = parsedClosesAt;
      if (isManuallyClosed !== undefined) {
        update.isManuallyClosed = !!isManuallyClosed;
      }
      if (note !== undefined) update.note = note;

      await SubmissionWindow.findOneAndUpdate({ phase }, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      const resolved = await resolveWindow(phase);

      logger.info(`Submission window for phase "${phase}" updated`);

      res.status(200).json({
        success: true,
        message: 'Submission window updated',
        data: resolved,
      });
    }
  );
}

export default new SubmissionWindowController();
