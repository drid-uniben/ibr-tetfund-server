import Agenda, { Job } from 'agenda'; // Import Job type
import { generateAIReviewForProposal } from '../Review_System/controllers/aiScoring.controller';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config(); // Load environment variables

const mongoConnectionString = process.env.MONGODB_URI;

if (!mongoConnectionString) {
  throw new Error('MONGODB_URI environment variable is not set.');
}

const agenda = new Agenda({
  db: { address: mongoConnectionString, collection: 'agendaJobs' },
});

// Define interface for AI Review job data
interface AIReviewJobData {
  proposalId: string;
  attempt?: number;
}

// Define the job for generating AI reviews
agenda.define('generate AI review', async (job: Job<AIReviewJobData>) => {
  // Type the job parameter
  const { proposalId, attempt } = job.attrs.data;
  if (proposalId) {
    await generateAIReviewForProposal(proposalId, attempt ?? 0);
    logger.info(`AI review generated for proposal ${proposalId}`);
  } else {
    logger.error(
      'Agenda job "generate AI review" received without proposalId.'
    );
    // Optionally handle this error, e.g., mark job as failed
  }
});

export default agenda;
