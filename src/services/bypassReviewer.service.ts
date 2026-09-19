import User, { UserRole } from '../model/user.model';
import Review, { ReviewStatus, ReviewType } from '../Review_System/models/review.model';
import { getBypassReviewerIds } from '../config/bypassReviewers';
import logger from '../utils/logger';

export interface IEligibleBypassReviewer {
  _id: unknown;
  name: string;
  email: string;
  academicTitle?: string;
  phoneNumber?: string;
  facultyTitle: string;
  departmentTitle: string;
  totalReviewsCount: number;
  pendingReviewsCount: number;
  completedReviewsCount: number;
  discrepancyCount: number;
  lastLogin?: Date;
  createdAt: Date;
  completionRate: number;
  isSpecialReviewer: true;
}

export interface IUnavailableBypassReviewer {
  id: string;
  reason: string;
}

/**
 * Which configured bypass (solo) reviewers can take this proposal?
 *
 * Deliberately independent of the proposal's faculty / review cluster:
 * bypass reviewers are not cluster-bound, so a proposal from a faculty that
 * has no cluster (e.g. Faculty of Computing) must still be assignable to them.
 *
 * `unavailable` explains why each configured ID was left out, so the UI can
 * say something more useful than "none available".
 */
export const findBypassReviewersForProposal = async (
  proposalId: string
): Promise<{
  eligible: IEligibleBypassReviewer[];
  unavailable: IUnavailableBypassReviewer[];
}> => {
  const bypassIds = getBypassReviewerIds();
  const eligible: IEligibleBypassReviewer[] = [];
  const unavailable: IUnavailableBypassReviewer[] = [];

  if (bypassIds.length === 0) {
    return { eligible, unavailable };
  }

  const assignedIds = new Set(
    (await Review.find({ proposal: proposalId }).distinct('reviewer'))
      .filter((id) => id !== null)
      .map((id) => id.toString())
  );

  const users = await User.find({ _id: { $in: bypassIds } });
  const usersById = new Map(users.map((u: any) => [u._id.toString(), u]));

  for (const id of bypassIds) {
    const user = usersById.get(id);

    let reason: string | null = null;
    if (!user) {
      reason = 'No user with this ID exists in this database';
    } else if (user.role !== UserRole.REVIEWER) {
      reason = 'User is not a reviewer';
    } else if (!user.isActive) {
      reason = 'Reviewer account is inactive';
    } else if (!['accepted', 'added'].includes(user.invitationStatus)) {
      reason = `Invitation status is "${user.invitationStatus}"`;
    } else if (assignedIds.has(id)) {
      reason = 'Already assigned to this proposal';
    }

    if (reason || !user) {
      unavailable.push({ id, reason: reason as string });
      logger.warn(`Bypass reviewer ${id} not offered for proposal ${proposalId}: ${reason}`);
      continue;
    }

    const reviews = await Review.find({ reviewer: id });
    const totalReviewsCount = reviews.length;
    const completedReviewsCount = reviews.filter(
      (r) => r.status === ReviewStatus.COMPLETED
    ).length;

    eligible.push({
      _id: user._id,
      name: user.name,
      email: user.email,
      academicTitle: user.academicTitle,
      phoneNumber: user.phoneNumber,
      // faculty/department are title strings on the user (Option A).
      facultyTitle: user.faculty || 'Unknown',
      departmentTitle: user.department || 'Unknown',
      totalReviewsCount,
      pendingReviewsCount: reviews.filter(
        (r) => r.status !== ReviewStatus.COMPLETED
      ).length,
      completedReviewsCount,
      discrepancyCount: reviews.filter(
        (r) => r.reviewType === ReviewType.RECONCILIATION
      ).length,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      completionRate: totalReviewsCount > 0 ? Math.round((completedReviewsCount / totalReviewsCount) * 100) : 0,
      isSpecialReviewer: true, // Flag to identify this user in frontend
    });
  }

  return { eligible, unavailable };
};
