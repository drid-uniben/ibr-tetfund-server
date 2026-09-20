jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../config/agenda', () => ({ __esModule: true, default: { now: jest.fn() } }));
jest.mock('../services/email.service', () => ({ __esModule: true, default: {} }));
jest.mock('../Review_System/models/review.model', () => {
  const actual = jest.requireActual('../Review_System/models/review.model');
  return {
    __esModule: true,
    ReviewType: actual.ReviewType,
    ReviewStatus: actual.ReviewStatus,
    default: { find: jest.fn(), findOne: jest.fn(), exists: jest.fn() },
  };
});
jest.mock('../model/user.model', () => {
  const actual = jest.requireActual('../model/user.model');
  return {
    __esModule: true,
    UserRole: actual.UserRole,
    default: { find: jest.fn(), findById: jest.fn(), aggregate: jest.fn() },
  };
});
jest.mock('../Proposal_Submission/models/proposal.model', () => {
  const actual = jest.requireActual('../Proposal_Submission/models/proposal.model');
  return {
    __esModule: true,
    ProposalStatus: actual.ProposalStatus,
    default: { findById: jest.fn() },
  };
});

import User from '../model/user.model';
import Review from '../Review_System/models/review.model';
import Proposal from '../Proposal_Submission/models/proposal.model';
import { findBypassReviewersForProposal } from '../services/bypassReviewer.service';
import reassignController from '../Review_System/controllers/reAssignReviewer.controller';

const SOLO_ID = '6aad151852aeaa4b64d0060f';
const OTHER_ID = '68557cdbc6540899e1dc934f';

const soloUser = (over: any = {}) => ({
  _id: { toString: () => SOLO_ID },
  name: 'Solo Reviewer',
  email: 'solo@uniben.edu',
  role: 'reviewer',
  isActive: true,
  invitationStatus: 'accepted',
  faculty: 'Faculty of Law',
  department: 'Dept',
  ...over,
});

const mockReviews = (assignedToProposal: string[] = []) => {
  (Review.find as jest.Mock).mockImplementation((query: any) => {
    if (query.proposal) {
      return {
        distinct: jest
          .fn()
          .mockResolvedValue(assignedToProposal.map((id) => ({ toString: () => id }))),
      };
    }
    return Promise.resolve([{ status: 'completed', reviewType: 'human' }]);
  });
};

describe('findBypassReviewersForProposal', () => {
  beforeEach(() => {
    delete process.env.BYPASS_REVIEWER_IDS;
    process.env.BYPASS_REVIEWER_IDS = SOLO_ID;
  });
  afterEach(() => delete process.env.BYPASS_REVIEWER_IDS);

  it('returns the solo reviewer with stats', async () => {
    mockReviews();
    (User.find as jest.Mock).mockResolvedValue([soloUser()]);

    const { eligible, unavailable } = await findBypassReviewersForProposal('p1');

    expect(eligible).toHaveLength(1);
    expect(eligible[0]).toMatchObject({ name: 'Solo Reviewer', isSpecialReviewer: true, completionRate: 100 });
    expect(unavailable.find((u) => u.id === SOLO_ID)).toBeUndefined();
  });

  it.each([
    ['not in this database', null, /No user with this ID/],
    ['inactive', soloUser({ isActive: false }), /inactive/],
    ['invitation pending', soloUser({ invitationStatus: 'pending' }), /Invitation status is "pending"/],
    ['not a reviewer', soloUser({ role: 'admin' }), /not a reviewer/],
  ])('explains why it is unavailable: %s', async (_label, user, reason) => {
    mockReviews();
    (User.find as jest.Mock).mockResolvedValue(user ? [user] : []);

    const { eligible, unavailable } = await findBypassReviewersForProposal('p1');

    expect(eligible.filter((e: any) => e._id.toString() === SOLO_ID)).toHaveLength(0);
    expect(unavailable.find((u) => u.id === SOLO_ID)?.reason).toMatch(reason);
  });

  it('excludes a reviewer already on this proposal, with a reason', async () => {
    mockReviews([SOLO_ID]);
    (User.find as jest.Mock).mockResolvedValue([soloUser()]);

    const { eligible, unavailable } = await findBypassReviewersForProposal('p1');

    expect(eligible).toHaveLength(0);
    expect(unavailable.find((u) => u.id === SOLO_ID)?.reason).toMatch(/Already assigned/);
  });

  it('supports multiple configured ids', async () => {
    process.env.BYPASS_REVIEWER_IDS = `${SOLO_ID},${OTHER_ID}`;
    mockReviews();
    (User.find as jest.Mock).mockResolvedValue([
      soloUser(),
      soloUser({ _id: { toString: () => OTHER_ID }, name: 'Second' }),
    ]);

    const { eligible } = await findBypassReviewersForProposal('p1');
    expect(eligible.map((e) => e.name).sort()).toEqual(['Second', 'Solo Reviewer']);
  });
});

describe('getEligibleReviewers for a faculty with no cluster', () => {
  // every real UNIBEN unit now has a cluster (see reviewClusters.test.ts); this
  // covers a future unit that hasn't been added yet, and submitters with no faculty.
  const run = (faculty: unknown): Promise<any> =>
    new Promise((resolve, reject) => {
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn((body: any) => resolve({ status: res.status.mock.calls[0]?.[0], body })),
      };
      (Proposal.findById as jest.Mock).mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'p1',
          projectTitle: 'Some project',
          submitter: { faculty },
        }),
      });
      (reassignController.getEligibleReviewers as any)(
        { params: { proposalId: 'p1' } },
        res,
        (err: unknown) => reject(err)
      );
    });

  beforeEach(() => {
    process.env.BYPASS_REVIEWER_IDS = SOLO_ID;
    mockReviews();
    (User.find as jest.Mock).mockResolvedValue([soloUser()]);
  });
  afterEach(() => delete process.env.BYPASS_REVIEWER_IDS);

  it.each([['Faculty of Underwater Basket Weaving'], [undefined]])(
    'still returns the solo reviewer for faculty = %s',
    async (faculty) => {
      const { status, body } = await run(faculty);

      expect(status).toBe(200);
      expect(body.data.eligibleReviewers).toHaveLength(1);
      expect(body.data.eligibleReviewers[0].isSpecialReviewer).toBe(true);
      expect(body.data.proposalInfo.cluster).toEqual([]);
      expect(User.aggregate).not.toHaveBeenCalled();
    }
  );
});
