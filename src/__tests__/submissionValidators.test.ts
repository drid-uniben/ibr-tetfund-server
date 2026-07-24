import {
  staffProposalSchema,
  masterStudentProposalSchema,
} from '../validators/submission.validators';
import { academicUnits } from '../utils/facultyContent';

const validStaffBody = {
  fullName: 'Ada Lovelace',
  academicTitle: 'Professor',
  faculty: 'Faculty of Physical Sciences',
  department: 'Department of Computer Science',
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
    const { department, ...rest } = validStaffBody;
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
  const validMasterBody = {
    fullName: 'Grace Hopper',
    matricNumber: 'PG/2024/001',
    programme: 'MSc Computer Science',
    faculty: 'Faculty of Physical Sciences',
    department: 'Department of Computer Science',
    email: 'grace@physci.uniben.edu',
    phoneNumber: '08087654321',
    projectTitle: 'Compilers for the masses',
    problemStatement: 'The problem statement is described here.',
    objectivesOutcomes: 'The objectives and outcomes are described.',
    researchApproach: 'The research approach is described here.',
    innovationNovelty: 'The innovation novelty is described here.',
    innovationContribution: 'The innovation contribution is described.',
    interdisciplinaryRelevance: 'The interdisciplinary relevance here.',
    implementationPlan: 'The implementation plan is described here.',
    estimatedBudget: 250000,
  };

  it('accepts a valid master-student submission', () => {
    const result = masterStudentProposalSchema.safeParse({
      body: validMasterBody,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid faculty', () => {
    const result = masterStudentProposalSchema.safeParse({
      body: { ...validMasterBody, faculty: 'Not A Faculty' },
    });
    expect(result.success).toBe(false);
  });
});
