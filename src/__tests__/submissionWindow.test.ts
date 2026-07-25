import {
  isWindowOpen,
  SubmissionPhase,
  SUBMISSION_PHASES,
} from '../model/submissionWindow.model';

describe('isWindowOpen', () => {
  const now = new Date('2026-07-24T12:00:00.000Z');

  it('defaults to OPEN when the window is null (unconfigured)', () => {
    expect(isWindowOpen(null, now)).toBe(true);
  });

  it('defaults to OPEN when the window is undefined', () => {
    expect(isWindowOpen(undefined as any, now)).toBe(true);
  });

  it('is CLOSED when manually closed', () => {
    expect(isWindowOpen({ isManuallyClosed: true }, now)).toBe(false);
  });

  it('is CLOSED before opensAt', () => {
    expect(
      isWindowOpen({ opensAt: new Date('2026-07-25T00:00:00.000Z') }, now)
    ).toBe(false);
  });

  it('is CLOSED after closesAt', () => {
    expect(
      isWindowOpen({ closesAt: new Date('2026-07-23T00:00:00.000Z') }, now)
    ).toBe(false);
  });

  it('is OPEN when now is within [opensAt, closesAt]', () => {
    expect(
      isWindowOpen(
        {
          opensAt: new Date('2026-07-20T00:00:00.000Z'),
          closesAt: new Date('2026-07-31T00:00:00.000Z'),
        },
        now
      )
    ).toBe(true);
  });

  it('is OPEN when no dates are set and not manually closed', () => {
    expect(isWindowOpen({ isManuallyClosed: false }, now)).toBe(true);
    expect(isWindowOpen({}, now)).toBe(true);
  });

  it('manual close overrides an otherwise-open date range', () => {
    expect(
      isWindowOpen(
        {
          opensAt: new Date('2026-07-20T00:00:00.000Z'),
          closesAt: new Date('2026-07-31T00:00:00.000Z'),
          isManuallyClosed: true,
        },
        now
      )
    ).toBe(false);
  });

  it('is OPEN exactly at opensAt and closesAt boundaries', () => {
    const opensAt = new Date('2026-07-24T12:00:00.000Z');
    const closesAt = new Date('2026-07-24T12:00:00.000Z');
    expect(isWindowOpen({ opensAt }, now)).toBe(true);
    expect(isWindowOpen({ closesAt }, now)).toBe(true);
  });
});

describe('SubmissionPhase enum', () => {
  it('exposes exactly the four expected phase values', () => {
    expect(SUBMISSION_PHASES).toEqual([
      'staff_concept',
      'masters_concept',
      'full_proposal',
      'final_submission',
    ]);
    expect(SubmissionPhase.STAFF_CONCEPT).toBe('staff_concept');
    expect(SubmissionPhase.MASTERS_CONCEPT).toBe('masters_concept');
    expect(SubmissionPhase.FULL_PROPOSAL).toBe('full_proposal');
    expect(SubmissionPhase.FINAL_SUBMISSION).toBe('final_submission');
  });
});
