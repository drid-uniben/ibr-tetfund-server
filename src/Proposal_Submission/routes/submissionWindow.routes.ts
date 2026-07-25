import { Router } from 'express';
import submissionWindowController from '../controllers/submissionWindow.controller';
import { rateLimiter } from '../../middleware/auth.middleware';

const router = Router();

// Light rate limiting for the public, read-only window status endpoints.
const publicRateLimiter = rateLimiter(120, 60 * 1000); // 120 requests per minute

router.get(
  '/',
  publicRateLimiter,
  submissionWindowController.getPublicWindows
);
router.get(
  '/:phase',
  publicRateLimiter,
  submissionWindowController.getPublicWindow
);

export default router;
