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
    default: { find: jest.fn(), aggregate: jest.fn() },
  };
});
jest.mock('../Proposal_Submission/models/proposal.model', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));

import User from '../model/user.model';
import Review from '../Review_System/models/review.model';
import Proposal from '../Proposal_Submission/models/proposal.model';
import assignReviewController from '../Review_System/controllers/assignReview.controller';

// Runs the real auto-assign controller up to the reviewer query and returns
// the faculty regex it searched reviewers with (or the 400 it answered with).
const autoAssign = (faculty: string): Promise<{ status: number; regex?: RegExp; body?: any }> =>
  new Promise((resolve, reject) => {
    (Proposal.findById as jest.Mock).mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'p1', submitter: { faculty } }),
    });
    (Review.find as jest.Mock).mockResolvedValue([]);
    (User.aggregate as jest.Mock).mockImplementation(async (pipeline: any[]) => {
      resolve({ status: 200, regex: pipeline[0].$match.faculty.$regex });
      return [];
    });

    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((body: any) => resolve({ status: res.status.mock.calls[0][0], body })),
    };
    (assignReviewController.assignReviewers as any)(
      { params: { proposalId: 'p1' } },
      res,
      (err: unknown) => reject(err)
    );
  });

describe('auto-assign for the units that used to have no cluster', () => {
  it.each([
    ['Faculty of Computing', 'Faculty of Engineering'],
    ['Faculty of Computing', 'Faculty of Physical Sciences'],
    ['Faculty of Nursing Sciences', 'Faculty of Pharmacy'],
    ['Faculty of Media and Communication Studies', 'Faculty of Arts'],
    ['Centre for Entrepreneurship Development', 'Faculty of Management Sciences'],
    ['Faculty of Science Laboratory Technology', 'Faculty of Life Sciences'],
    ['Institute of Public Administration and Health Services Management (IPAHSM)', 'Faculty of Social Sciences'],
  ])('%s proposal is offered %s reviewers', async (submitterFaculty, reviewerFaculty) => {
    const { status, regex, body } = await autoAssign(submitterFaculty);

    expect(body).toBeUndefined(); // no 400 "Could not determine a matching faculty"
    expect(status).toBe(200);
    expect(regex?.test(reviewerFaculty)).toBe(true);
  });

  it('never offers a reviewer from the submitter\'s own faculty', async () => {
    const { regex } = await autoAssign('Faculty of Computing');
    expect(regex?.test('Faculty of Computing')).toBe(false);
  });

  it('still refuses a faculty that is in no cluster', async () => {
    const { status, body } = await autoAssign('Faculty of Underwater Basket Weaving');
    expect(status).toBe(400);
    expect(body.message).toMatch(/Could not determine a matching faculty/);
  });
});
