import { commonStyles, submissionConfirmationFooter } from './styles';
import { ProposalStatus } from '../../Proposal_Submission/models/proposal.model';

export const fullProposalStatusUpdateTemplate = (
  name: string,
  projectTitle: string,
  status: ProposalStatus,
  feedbackComments?: string,
  finalSubmissionDeadline?: Date | null
): string => {
  let subjectLine = '';
  let bodyContent = '';

  const formattedDeadline = finalSubmissionDeadline
    ? new Date(finalSubmissionDeadline).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (status === ProposalStatus.APPROVED) {
    subjectLine =
      'Congratulations! Your Full Proposal Has Been Shortlisted And Approved';
    bodyContent = `
        <p>Dear ${name},</p>
        <p>We are pleased to inform you that your full proposal "<strong>${projectTitle}</strong>" has been approved.</p>
        <p>Your concept note has been shortlisted for the TETFund Institutional-Based Research (IBR) Grant.</p>
    `;
    bodyContent += `
        <p>You will receive further information from the directorate soon${
          formattedDeadline
            ? `, including final submission requirements due on or before <strong>${formattedDeadline}</strong>`
            : ''
        }. Login into your dashboard and click on view details for the approved proposal to view the next steps.</p>
    `;
  } else if (status === ProposalStatus.REJECTED) {
    subjectLine = 'Update on Your Full Proposal Submission: Decision Made';
    bodyContent = `
        <p>Dear ${name},</p>
        <p>We regret to inform you that your full proposal "<strong>${projectTitle}</strong>" was not shortlisted for funding at this time.</p>
    `;
    if (feedbackComments) {
      bodyContent += `
        <div class="feedback">
            <p><strong>Feedback from the review committee:</strong></p>
            <p>${feedbackComments}</p>
        </div>
      `;
    }
    bodyContent += `
        <p>We appreciate the time and effort you put into your proposal.</p>
        <p>While it wasn't shortlisted this time, we encourage you to consider the feedback and apply again in the future.</p>
        <p>You can log into your dashboard at any time using your credentials to review this feedback again.</p>
      `;
  } else {
    subjectLine = 'Update on your Proposal Submission';
    bodyContent = `
        <p>Dear ${name},</p>
        <p>This is an update regarding your proposal "<strong>${projectTitle}</strong>". Its current status is: <strong>${status}</strong>.</p>
        <p>Login into your dashboard using your credentials for more details.</p>
    `;
  }

  return `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
        .feedback {
            background-color: #f0f0f0;
            border-left: 4px solid #ccc;
            margin: 10px 0;
            padding: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${subjectLine}</h1>
    </div>
    
    <div class="content">
        ${bodyContent}
    </div>
    
    ${submissionConfirmationFooter}
</body>
</html>
`;
};
