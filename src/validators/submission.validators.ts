import { z } from 'zod';
import { isValidUnit, isValidUnitDepartment } from '../utils/facultyContent';

// Faculty/department are stored as canonical title strings (not ObjectIds).
const facultyValidator = z
  .string()
  .refine((v) => isValidUnit(v), { message: 'Invalid faculty selected' });

// Common validators
const emailValidator = z
  .string()
  .email({ message: 'Invalid email address' })
  .regex(/^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)*uniben\.edu$/i, {
    message: 'Please provide a valid UNIBEN email address',
  });

const alternativeEmailValidator = z
  .string()
  .email({ message: 'Invalid alternative email address' })
  .optional();

const phoneValidator = z
  .string()
  .min(10, { message: 'Phone number must be at least 10 digits' })
  .max(15, { message: 'Phone number must not exceed 15 digits' });

// Co-investigator schema
const coInvestigatorSchema = z.object({
  name: z.string().min(2, { message: 'Co-investigator name is required' }),
  department: z.string().optional(),
  faculty: z.string().optional(),
});

// Shared cross-field check: department must be valid for the chosen faculty
// (a department is optional only when the chosen unit lists none).
const departmentMatchesFaculty = (data: {
  faculty: string;
  department?: string;
}): boolean => isValidUnitDepartment(data.faculty, data.department);

const departmentMatchIssue = {
  message: 'Invalid department selected for the chosen faculty',
  path: ['department'],
};

// Staff proposal validation schema
export const staffProposalSchema = z.object({
  body: z
    .object({
      fullName: z
        .string()
        .min(2, { message: 'Full name must be at least 2 characters' }),
      academicTitle: z
        .string()
        .min(2, { message: 'Academic title is required' }),
      department: z.string().optional(),
      faculty: facultyValidator,
      email: emailValidator,
      alternativeEmail: alternativeEmailValidator,
      phoneNumber: phoneValidator,
      projectTitle: z
        .string()
        .min(5, { message: 'Project title must be at least 5 characters' }),
      backgroundProblem: z
        .string()
        .min(10, { message: 'Background problem statement is required' })
        .refine((v) => v.trim().split(/\s+/).filter(Boolean).length <= 200, {
          message: 'Background problem statement must not exceed 200 words',
        }),
      researchObjectives: z
        .string()
        .min(10, { message: 'Research objectives are required' }),
      methodologyOverview: z
        .string()
        .min(10, { message: 'Methodology overview is required' })
        .refine((v) => v.trim().split(/\s+/).filter(Boolean).length <= 250, {
          message: 'Methodology overview must not exceed 250 words',
        }),
      expectedOutcomes: z
        .string()
        .min(10, { message: 'Expected outcomes are required' }),
      workPlan: z.string().min(10, { message: 'Work plan is required' }),
      estimatedBudget: z
        .union([z.string(), z.number()])
        .transform((value) => parseFloat(value.toString())),
      // In multipart requests coInvestigators arrives as a JSON-encoded
      // string (the controller JSON.parses it after validation); it may
      // also arrive as an already-parsed array. Accept both shapes here
      // and defer structural validation of parsed entries to the
      // controller, since we cannot safely JSON.parse inside the schema.
      coInvestigators: z
        .union([z.string(), z.array(coInvestigatorSchema)])
        .optional(),
    })
    .refine(departmentMatchesFaculty, departmentMatchIssue),
});

// Master student proposal validation schema
//
// NOTE: the master-student submission form/controller only ever sends
// fullName, email, alternativeEmail (optional) and phoneNumber plus a
// docFile upload (see submit.controller.ts#submitMasterStudentProposal).
// This schema is intentionally reconciled to match that real payload —
// it previously demanded many fields (matricNumber, programme, faculty,
// projectTitle, etc.) that are never submitted, which would have
// rejected every real master-student submission if wired up as-is.
export const masterStudentProposalSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .min(2, { message: 'Full name must be at least 2 characters' }),
    email: emailValidator,
    alternativeEmail: alternativeEmailValidator,
    phoneNumber: phoneValidator,
  }),
});

// Export inferred types
export type StaffProposalInput = z.infer<typeof staffProposalSchema>;
export type MasterStudentProposalInput = z.infer<
  typeof masterStudentProposalSchema
>;
export type CoInvestigator = z.infer<typeof coInvestigatorSchema>;
