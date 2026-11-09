import { commonStyles, submissionConfirmationFooter } from './styles';

// Fixed deadline for the physical final submission. The portal's digital
// final-submission window is deliberately kept closed, so this date is not
// read from the window settings.
const FINAL_SUBMISSION_DEADLINE_TEXT = 'Friday, 13th November 2026';

/**
 * Sent in notify mode 'submission_open'. Reminds approved researchers to
 * submit their final documents physically at the DRID office by the deadline.
 * No digital copy is expected.
 */
export const finalSubmissionOpenTemplate = (
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
        <h1>Final Submission Deadline: ${FINAL_SUBMISSION_DEADLINE_TEXT}</h1>
    </div>

    <div class="content">
        <p>Dear ${name},</p>
        <p>This is a reminder about the final submission for your approved full proposal "<strong>${projectTitle}</strong>".</p>
        <p>The deadline for submitting the final documents is <strong>${FINAL_SUBMISSION_DEADLINE_TEXT}</strong>.</p>
        <p>
            There is no need for a digital copy this time. The final documents are to be submitted
            <strong>physically only</strong>, at the Directorate of Research, Innovation and Development (DRID) office.
        </p>
        <p>Please log in to your dashboard and read the review comments on your approved proposal. They contain the requirements and the resources you need for the final documents.</p>
        <p>DRID is located on the first floor of the Professor Lilian Salami Building (Medical Complex). As you walk down the hallway, it is the second office on your right.</p>
        <p>
            Please do not mind seeing "Final Submission Deadline Passed" on your dashboard.
            The deadline for submitting the final documents is ${FINAL_SUBMISSION_DEADLINE_TEXT},
            and you are no longer expected to submit a digital copy. We set the start date of the
            digital submission window to the end of this month so that digital submission would
            show as closed for everyone.
        </p>

        <a href="${loginUrl}" class="button">Log In and Read Review Comments</a>
    </div>

    ${submissionConfirmationFooter}
</body>
</html>
`;
