import { Router, Request } from 'express';
import submitFullProposalController from '../controllers/submitFullProposal.controller';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import {
  rateLimiter,
  authenticateResearcherToken,
} from '../../middleware/auth.middleware';
import { getUploadsDir as getUploadsPath } from '../../utils/uploadsPath';

const router = Router();

// Configure multer for full proposal and final submissiondocument uploads
const storage = multer.diskStorage({
  destination: function (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, getUploadsPath());
  },
  filename: function (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    if (file.fieldname === 'docFile') {
      cb(
        null,
        `fullproposal-${Date.now()}-${path.basename(file.originalname)}`
      );
    } else {
      cb(
        null,
        `finalsubmission-${Date.now()}-${path.basename(file.originalname)}`
      );
    }
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Only allow PDF, DOC, DOCX files
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.')
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter,
});

const documentUpload = upload.fields([
  { name: 'docFile', maxCount: 1 },
  { name: 'finalSubmission', maxCount: 1 },
]);

// Apply rate limiting to submission endpoints
const submissionRateLimiter = rateLimiter(10, 60 * 60 * 1000); // 10 requests per hour

// Submit full proposal
router.post(
  '/submit-full-proposal',
  authenticateResearcherToken,
  submissionRateLimiter,
  documentUpload,
  submitFullProposalController.submitFullProposal
);

// Check if user can submit full proposal
router.get(
  '/can-submit/:proposalId',
  submitFullProposalController.canSubmitFullProposal
);

// Submit final submission
router.post(
  '/submit-final-submission',
  authenticateResearcherToken,
  submissionRateLimiter,
  documentUpload,
  submitFullProposalController.submitFinalSubmission
);

// Check if user can submit final submission
router.get(
  '/can-submit-final/:proposalId',
  submitFullProposalController.canSubmitFinalSubmission
);

export default router;
