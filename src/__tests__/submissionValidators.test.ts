import {
  staffProposalSchema,
  masterStudentProposalSchema,
} from '../validators/submission.validators';
import { academicUnits } from '../utils/facultyContent';

const validStaffBody = {
  fullName: 'Ada Lovelace',
  academicTitle: 'Professor',
  faculty: 'Faculty of Physical Sciences',
  department: 'Department of Chemistry',
  email: 'ada@physci.uniben.edu',
  phoneNumber: '08012345678',
  projectTitle: 'A study of analytical engines',
  backgroundProblem: 'The background problem is described here in detail.',
  researchObjectives: 'The objectives are stated here.',
  methodologyOverview: 'The methodology overview is described here.',
  expectedOutcomes: 'The expected outcomes are described here.',
  workPlan: 'The work plan is described here.',
  estimatedBudget: '500000',
};

describe('staffProposalSchema', () => {
  it('accepts a valid staff submission with a matching faculty/department', () => {
    const result = staffProposalSchema.safeParse({ body: validStaffBody });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown faculty', () => {
    const result = staffProposalSchema.safeParse({
      body: { ...validStaffBody, faculty: 'Faculty of Wizardry' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a department that does not belong to the chosen faculty', () => {
    const result = staffProposalSchema.safeParse({
      body: { ...validStaffBody, department: 'Department of Law' },
    });
    expect(result.success).toBe(false);
  });

  it('allows omitting the department when the unit lists none', () => {
    const emptyUnit = academicUnits.find((u) => u.departments.length === 0)!;
    const { department: _department, ...rest } = validStaffBody;
    const result = staffProposalSchema.safeParse({
      body: { ...rest, faculty: emptyUnit.title },
    });
    expect(result.success).toBe(true);
  });

  it('coerces estimatedBudget to a number', () => {
    const result = staffProposalSchema.safeParse({ body: validStaffBody });
    if (result.success) {
      expect(result.data.body.estimatedBudget).toBe(500000);
    } else {
      throw new Error('expected parse to succeed');
    }
  });
});

describe('masterStudentProposalSchema', () => {
  // The master-student form/controller only ever submits these fields
  // (fullName, email, alternativeEmail, phoneNumber) plus a docFile
  // upload — see submit.controller.ts#submitMasterStudentProposal.
  const validMasterBody = {
    fullName: 'Grace Hopper',
    email: 'grace@physci.uniben.edu',
    phoneNumber: '08087654321',
  };

  it('accepts a valid master-student submission', () => {
    const result = masterStudentProposalSchema.safeParse({
      body: validMasterBody,
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional alternativeEmail', () => {
    const result = masterStudentProposalSchema.safeParse({
      body: { ...validMasterBody, alternativeEmail: 'grace@gmail.com' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UNIBEN email', () => {
    const result = masterStudentProposalSchema.safeParse({
      body: { ...validMasterBody, email: 'grace@gmail.com' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing fullName', () => {
    const { fullName: _fullName, ...rest } = validMasterBody;
    const result = masterStudentProposalSchema.safeParse({ body: rest });
    expect(result.success).toBe(false);
  });
});
