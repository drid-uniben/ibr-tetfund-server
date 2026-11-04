import { commonStyles, submissionConfirmationFooter } from './styles';

/**
 * Sent when the 'final_submission' window opens, asking approved researchers
 * to log in and submit their final documents before the deadline.
 */
export const finalSubmissionOpenTemplate = (
  name: string,
  projectTitle: string,
  loginUrl: string,
  finalSubmissionDeadline?: Date | null
): string => {
  let deadlineLine =
    '<p>The submission deadline is shown on your dashboard. Submissions cannot be made after the deadline.</p>';

  if (finalSubmissionDeadline) {
    const formattedDeadline = new Date(finalSubmissionDeadline).toLocaleDateString(
      'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' }
    );
    deadlineLine = `<p>The deadline for the final submission is <strong>${formattedDeadline}</strong>. Submissions cannot be made after the deadline.</p>`;
  }

  return `
<html>
<head>
    <style type="text/css">
        ${commonStyles}
    </style>
</head>
<body>
    <div class="header">
        <h1>Final Submission Is Now Open</h1>
    </div>

    <div class="content">
        <p>Dear ${name},</p>
        <p>The final submission for your approved full proposal "<strong>${projectTitle}</strong>" is now open.</p>
        ${deadlineLine}
        <p>To submit, please:</p>
        <ol>
            <li>Log in to your dashboard.</li>
            <li>Open the approved proposal and go to the final submission page.</li>
            <li>Upload your final documents, prepared in the TETFund format linked in your review feedback.</li>
        </ol>
        <p>Please remember to also submit the physical documents at the DRID office.</p>

        <a href="${loginUrl}" class="button">Log In and Submit</a>
    </div>

    ${submissionConfirmationFooter}
</body>
</html>
`;
};
