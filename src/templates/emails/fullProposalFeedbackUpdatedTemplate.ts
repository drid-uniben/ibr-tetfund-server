import { commonStyles, submissionConfirmationFooter } from './styles';

/**
 * Sent when the review feedback on an approved full proposal has been updated
 * (for example, with the link to the TETFund final submission format).
 */
export const fullProposalFeedbackUpdatedTemplate = (
  name: string,
  projectTitle: string,
  loginUrl: string
): string => `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>Your Review Feedback Has Been Updated</h1>
    </div>

    <div class="content">
        <p>Dear ${name},</p>
        <p>The review feedback on your approved full proposal "<strong>${projectTitle}</strong>" has been updated on the research portal.</p>
        <p>The updated feedback now includes a link to the TETFund format required for the final submission, together with additional information about the next stage.</p>
        <p>Please log in to your dashboard, open the approved proposal and read the full review feedback.</p>
        <p>The final submission is not open yet. You will be notified by email when it opens, together with the submission deadline. Please use this time to gather the necessary documents.</p>

        <a href="${loginUrl}" class="button">Log In to Your Dashboard</a>
    </div>

    ${submissionConfirmationFooter}
</body>
</html>
`;
