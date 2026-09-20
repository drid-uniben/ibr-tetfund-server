/**
 * Bypass ("solo") reviewers.
 *
 * A bypass reviewer:
 *  - skips the faculty-cluster eligibility checks when an admin picks them
 *  - when assigned to a proposal, is the ONLY reviewer for it:
 *      * no AI review is generated (and any queued AI job is skipped)
 *      * no discrepancy check / reconciliation
 *      * their single submitted review finalises the proposal and moves it
 *        to the first decision page (reviewStatus = 'reviewed')
 *
 * Add as many Mongo user _ids as you like. The user must still be a
 * REVIEWER, active, and have invitationStatus 'accepted' | 'added'.
 *
 * DB ids differ between staging and production, so you can also supply
 * extra ids via the BYPASS_REVIEWER_IDS env var (comma-separated).
 */
const HARDCODED_BYPASS_REVIEWER_IDS: readonly string[] = [
  '6aafdcfb4b8f6a339bc76b2a',
  '6aafe37de1aa786761dfb9c4',
  // '<another reviewer _id>',
];

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const getBypassReviewerIds = (): string[] => {
  const fromEnv = (process.env.BYPASS_REVIEWER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...HARDCODED_BYPASS_REVIEWER_IDS, ...fromEnv])
  ).filter((id) => OBJECT_ID_REGEX.test(id));
};

export const isBypassReviewer = (
  id?: string | { toString(): string } | null
): boolean => {
  if (!id) return false;
  return getBypassReviewerIds().includes(id.toString());
};
