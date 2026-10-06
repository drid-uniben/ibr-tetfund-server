import type { Request, Response } from 'express';
import FullProposal from '../researchers/models/fullProposal.model';
import Award from '../Review_System/models/award.model';
import controller from '../Review_System/controllers/finalDecisions_2.controller';

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../services/email.service', () => ({
  __esModule: true,
  default: { sendFullProposalStatusUpdateEmail: jest.fn() },
}));
jest.mock('../model/submissionWindow.model', () => ({
  __esModule: true,
  resolveWindow: jest.fn(),
}));
jest.mock('../researchers/models/fullProposal.model', () => {
  const actual = jest.requireActual('../researchers/models/fullProposal.model');
  return {
    __esModule: true,
    FullProposalStatus: actual.FullProposalStatus,
    default: {
      findById: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    },
  };
});
jest.mock('../Review_System/models/award.model', () => {
  const actual = jest.requireActual('../Review_System/models/award.model');
  return {
    __esModule: true,
    AwardStatus: actual.AwardStatus,
    default: { findOne: jest.fn() },
  };
});

const run = async (
  handler: (req: Request, res: Response, next: (e?: unknown) => void) => void,
  req: Partial<Request>
): Promise<{ res: any; error?: any }> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const fullReq = { user: { id: 'a1', role: 'admin' }, ...req } as Request;
  return new Promise((resolve) => {
    const next = (error?: unknown): void => resolve({ res, error });
    handler(fullReq, res, next);
    // Controllers resolve by calling res.json; poll the microtask queue.
    setImmediate(() => resolve({ res }));
  });
};

const makeProposal = (over: Record<string, unknown> = {}): any => ({
  _id: 'fp1',
  proposal: 'p1',
  status: 'submitted',
  score: 70,
  draftReviewComments: 'Draft comment',
  save: jest.fn().mockResolvedValue(undefined),
  toObject() {
    return { ...this };
  },
  populate: jest.fn(),
  ...over,
});

const mockFindById = (doc: any): void => {
  const q: any = Promise.resolve(doc);
  q.populate = jest.fn().mockResolvedValue(doc);
  (FullProposal.findById as jest.Mock).mockReturnValue(q);
};

describe('saveDraftReview', () => {
  beforeEach(() => {
    mockFindById(makeProposal());
    (Award.findOne as jest.Mock).mockResolvedValue({ fundingAmount: 100 });
  });

  it('saves score, comments and budget as admin-only draft fields', async () => {
    (FullProposal.findOneAndUpdate as jest.Mock).mockResolvedValue(
      makeProposal({ score: 85, draftReviewComments: 'ok', draftFundingAmount: 500 })
    );
    const { res, error } = await run(controller.saveDraftReview, {
      params: { id: 'fp1' },
      body: { score: 85, reviewComments: ' ok ', fundingAmount: 500 },
    });
    expect(error).toBeUndefined();
    const update = (FullProposal.findOneAndUpdate as jest.Mock).mock.calls[0][1];
    expect(update.$set).toMatchObject({
      score: 85,
      draftReviewComments: 'ok',
      draftFundingAmount: 500,
    });
    expect(update.$set).not.toHaveProperty('reviewComments');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('rejects an out-of-range score', async () => {
    const { error } = await run(controller.saveDraftReview, {
      params: { id: 'fp1' },
      body: { score: 101 },
    });
    expect(error).toBeDefined();
    expect(FullProposal.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refuses to edit once a decision exists', async () => {
    (FullProposal.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    const { error } = await run(controller.saveDraftReview, {
      params: { id: 'fp1' },
      body: { score: 50 },
    });
    expect(error).toBeDefined();
  });
});

describe('updateFullProposalStatus with a draft review', () => {
  it('withholds comments from the researcher when rejecting with sendComments=false', async () => {
    const doc = makeProposal();
    mockFindById(doc);
    (Award.findOne as jest.Mock).mockResolvedValue({
      fundingAmount: 100,
      save: jest.fn(),
    });
    await run(controller.updateFullProposalStatus, {
      params: { id: 'fp1' },
      body: { status: 'rejected', reviewComments: 'Edited', sendComments: false },
    });
    expect(doc.status).toBe('rejected');
    expect(doc.reviewComments).toBe('');
    expect(doc.draftReviewComments).toBe('Edited');
  });

  it('releases comments when rejecting with sendComments=true or omitted', async () => {
    const doc = makeProposal();
    mockFindById(doc);
    (Award.findOne as jest.Mock).mockResolvedValue({ fundingAmount: 100, save: jest.fn() });
    await run(controller.updateFullProposalStatus, {
      params: { id: 'fp1' },
      body: { status: 'rejected', reviewComments: 'Edited' },
    });
    expect(doc.reviewComments).toBe('Edited');
  });

  it('approves with the edited funding amount on the award and the draft', async () => {
    const doc = makeProposal();
    const award = { fundingAmount: 100, save: jest.fn() };
    mockFindById(doc);
    (Award.findOne as jest.Mock).mockResolvedValue(award);
    await run(controller.updateFullProposalStatus, {
      params: { id: 'fp1' },
      body: { status: 'approved', reviewComments: 'Good', fundingAmount: 750000 },
    });
    expect(award.fundingAmount).toBe(750000);
    expect(doc.draftFundingAmount).toBe(750000);
    expect(doc.reviewComments).toBe('Good');
  });

  it('rejects a non-positive funding amount on approval', async () => {
    mockFindById(makeProposal());
    (Award.findOne as jest.Mock).mockResolvedValue({ fundingAmount: 100, save: jest.fn() });
    const { error } = await run(controller.updateFullProposalStatus, {
      params: { id: 'fp1' },
      body: { status: 'approved', reviewComments: 'x', fundingAmount: -5 },
    });
    expect(error).toBeDefined();
  });
});
