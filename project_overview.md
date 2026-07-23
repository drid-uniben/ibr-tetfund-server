# Project Overview: DRID Server v2

This document provides a comprehensive overview of the DRID Server v2 project, a research submission management API for grants and research funding.

## 1. Project Purpose

The primary purpose of this project is to provide a robust and scalable API for managing research submissions, from initial proposal to final award. It handles user authentication, proposal submission, review processes, and administrative tasks.

## 2. Key Technologies

The project is built on the following technologies:

*   **Backend Framework:** Express.js
*   **Database:** MongoDB with Mongoose ODM
*   **Language:** TypeScript
*   **Authentication:** JSON Web Tokens (JWT)
*   **File Handling:** Multer for file uploads
*   **Job Scheduling:** Agenda
*   **Email Notifications:** Nodemailer
*   **API Documentation:** Swagger
*   **Validation:** Joi and Zod

## 3. Project Structure

The project follows a modular structure, with a clear separation of concerns. The main components are:

*   **`src/`**: The root directory for the source code.
    *   **`index.ts`**: The main entry point of the application.
    *   **`app.ts`**: The Express application setup.
    *   **`config/`**: Configuration files for services like Agenda.
    *   **`controllers/`**: Request handlers that interact with services and models.
    *   **`db/`**: Database connection and configuration.
    *   **`middleware/`**: Custom middleware for authentication, error handling, etc.
    *   **`models/`**: Mongoose models for database schemas.
    *   **`routes/`**: Express route definitions.
    *   **`services/`**: Business logic and interaction with external services.
    *   **`templates/`**: Email templates.
    *   **`utils/`**: Utility functions and helper classes.
    *   **`validators/`**: Data validation schemas.

## 4. High-Level Architecture

The application is designed with a classic Model-View-Controller (MVC) architecture, adapted for a headless API:

1.  **Routes (`routes/`)**: Define the API endpoints and link them to specific controller functions.
2.  **Middleware (`middleware/`)**: Intercept requests to perform tasks like authentication, validation, and error handling.
3.  **Controllers (`controllers/`)**: Handle the incoming requests, process the input, and call the appropriate services.
4.  **Services (`services/`)**: Contain the core business logic, interacting with the database models and external services.
5.  **Models (`models/`)**: Define the data structure and interact with the MongoDB database.

## 5. Application Entry Point (`src/index.ts`)

The application starts with `src/index.ts`, which is responsible for:

1.  **Initializing the Environment:** It validates the necessary environment variables using the `validateEnv` utility.
2.  **Database Connection:** It establishes a connection to the MongoDB database using the `connectDB` function from `src/db/database.ts`.
3.  **Starting the Server:** It imports the Express app from `src/app.ts` and starts it on the configured port.
4.  **Directory Setup:** It ensures that the necessary directories for file uploads are created.

## 6. Express Application Setup (`src/app.ts`)

The `src/app.ts` file is responsible for configuring the Express application. Its key responsibilities include:

*   **Middleware Configuration:** It sets up essential middleware for:
    *   **Security:** `helmet` and `cors`.
    *   **Performance:** `compression`.
    *   **Rate Limiting:** `express-rate-limit`.
    *   **Request Parsing:** `express.json`, `express.urlencoded`, and `cookie-parser`.
    *   **Logging:** `morgan`.
*   **Static File Serving:** It serves static files (like uploaded documents) from the `uploads` directory.
*   **API Documentation:** It integrates `swagger-ui-express` to serve API documentation from a `swagger.yaml` file.
*   **Routing:** It mounts the main router from `src/routes/index.ts` under the `/api/v2` prefix.
*   **Error Handling:** It uses custom middleware to handle 404 errors and other application errors.

## 7. Routing (`src/routes/`)

The `src/routes/` directory contains the route definitions for the application. The main router file, `src/routes/index.ts`, aggregates all the other route modules and mounts them under specific paths. The application's routes are organized as follows:

*   **/api/v2/submit**: Handles proposal submission.
*   **/api/v2/faculties**: Manages faculties.
*   **/api/v2/departments**: Manages departments.
*   **/api/v2/admin**: Provides administrative functionalities.
*   **/api/v2/auth**: Handles user authentication.
*   **/api/v2/**: Main route for researcher-specific actions.
*   **/api/v2/reviewer**: Routes for reviewers.
*   **/api/v2/reviewsys**: Routes for the review system.

## 8. Middleware (`src/middleware/`)

The `src/middleware/` directory contains functions that have access to the request and response objects, and the `next` function in the application’s request-response cycle. These functions are used to perform tasks such as authentication, error handling, and request validation.

### Authentication Middleware (`src/middleware/auth.middleware.ts`)

This middleware is responsible for authenticating and authorizing users. It provides several functions for different levels of access control:

*   **Role-Based Authentication:** It includes middleware to verify that a user has a specific role (e.g., `admin`, `researcher`, `reviewer`).
*   **Token Verification:** It verifies the authenticity of JWTs and attaches the user object to the request.
*   **Rate Limiting:** It provides a simple in-memory rate limiter to protect against brute-force attacks.

### Error Handling Middleware (`src/middleware/errorHandler.ts`)

This is a centralized error handling middleware that catches and processes all errors that occur in the application. Its key features include:

*   **Specific Error Handling:** It identifies and handles specific types of errors, such as database errors (duplicate keys, validation errors), file upload errors, and JWT errors.
*   **Consistent Error Responses:** It formats error responses in a consistent and predictable way.
*   **Environment-Specific Details:** It provides detailed error information in development and generic messages in production.

### Not Found Middleware (`src/middleware/notFound.ts`)

This middleware is used to handle requests for routes that do not exist. It creates a 404 error and passes it to the error handling middleware.

## 9. Services (`src/services/`)

The `src/services/` directory contains modules that provide reusable business logic and interact with external services. This helps to keep the controllers clean and focused on handling HTTP requests.

### Email Service (`src/services/email.service.ts`)

The Email Service is responsible for sending all email communications from the application. It uses the `nodemailer` library to send emails via an SMTP server. Its key features include:

*   **SMTP Transporter:** It initializes a `nodemailer` transporter with credentials from the environment variables.
*   **Email Templates:** It uses a variety of pre-defined email templates for different types of notifications.
*   **Email Sending Methods:** It provides a comprehensive set of methods for sending emails related to:
    *   Proposal submissions and status updates.
    *   Reviewer invitations, assignments, and reminders.
    *   User credentials and invitations.

### Token Service (`src/services/token.service.ts`)

The Token Service is responsible for managing JSON Web Tokens (JWTs) for authentication and authorization. Its main responsibilities are:

*   **Token Generation:** It generates new access and refresh tokens with different expiration times.
*   **Token Verification:** It verifies the authenticity and expiration of tokens.
*   **Token Blacklisting:** It maintains a blacklist of revoked tokens to prevent their reuse.
*   **Token Rotation:** It provides a mechanism to rotate refresh tokens, enhancing security.
*   **Cookie Management:** It handles the setting and clearing of the refresh token in a secure, HTTP-only cookie.

## 10. Controllers and Business Logic

The `controllers` directory contains the logic for handling incoming requests. Each controller is responsible for a specific feature or resource (e.g., `auth.controller.ts`, `submit.controller.ts`). They process the request, interact with services and models, and send a response.

### Example: Authentication Flow (`src/routes/auth.routes.ts`)

The authentication routes are defined in `src/routes/auth.routes.ts`. Here's how the login process works:

1.  A `POST` request is made to `/api/v2/auth/researcher-login`.
2.  The `rateLimiter` middleware is applied to prevent brute-force attacks.
3.  The `authController.researcherLogin` function is called.
4.  The controller validates the user's credentials, generates a JWT, and sends it back to the client.

### Example: Proposal Submission Flow (`src/Proposal_Submission/routes/submit.routes.ts`)

The proposal submission process involves file uploads and data validation:

1.  A `POST` request is made to `/api/v2/submit/staff-proposal`.
2.  The `submissionRateLimiter` middleware is applied.
3.  The `upload` middleware (from `multer`) processes the file uploads (`cvFile` and `docFile`).
4.  The `submitController.submitStaffProposal` function is called.
5.  The controller saves the proposal data to the database and sends a confirmation response.

## 11. Models and Database (`src/models/`)

The `src/models/` directory contains the Mongoose schema definitions for the MongoDB database. These models define the structure of the documents and provide an interface for interacting with the database.

### User Model (`src/model/user.model.ts`)

The User model defines the schema for users of the application. Key fields include:

*   **`name`**: The user's full name.
*   **`email`**: The user's primary email address (must be a `uniben.edu` address).
*   **`password`**: The user's hashed password.
*   **`role`**: The user's role (`admin`, `researcher`, or `reviewer`).
*   **`userType`**: The type of user (`staff` or `master_student`).
*   **`department`**, **`faculty`**: References to the user's department and faculty.
*   **`proposals`**, **`assignedProposals`**, **`completedReviews`**: Arrays of references to other documents.

The model also includes a `pre-save` hook for password hashing and a `comparePassword` method for password verification.

### Proposal Model (`src/Proposal_Submission/models/proposal.model.ts`)

The Proposal model defines the schema for research proposals. Key fields include:

*   **`submitterType`**: The type of submitter (`staff` or `master_student`).
*   **`projectTitle`**, **`problemStatement`**, **`objectives`**, **`methodology`**: The core content of the proposal.
*   **`submitter`**: A reference to the User who submitted the proposal.
*   **`cvFile`**, **`docFile`**: Paths to uploaded documents.
*   **`status`**: The current status of the proposal (e.g., `submitted`, `under_review`, `approved`).

The schema uses conditional validation to enforce different requirements based on the `submitterType`.

## 12. Background Processing with Agenda (`src/worker.ts` & `src/config/agenda.ts`)

The application uses the `agenda` library to manage and execute background jobs. This allows for offloading long-running tasks to a separate worker process, preventing them from blocking the main application thread.

The `src/worker.ts` file is the entry point for the Agenda worker. It connects to the database and starts the Agenda instance.

### AI Review Generation Job

The `src/config/agenda.ts` file defines the jobs that the worker can execute. The primary job defined is `"generate AI review"`. This job is responsible for:

1.  Receiving a `proposalId` as input.
2.  Calling the `generateAIReviewForProposal` function to generate an AI-powered review for the specified proposal.

This architecture allows the application to initiate an AI review and then immediately return a response to the user, while the review is generated in the background.

## 13. User Management

The application provides a comprehensive system for managing users, with a particular focus on reviewers.

### Reviewer Invitation and Management (`reviewer.controller.ts`)

The `reviewer.controller.ts` file contains the logic for managing the entire lifecycle of a reviewer, from invitation to deletion. There are two main ways to add a reviewer to the system:

**1. Invitation Flow:**

*   An administrator can send an invitation to a potential reviewer's email address.
*   The system generates a unique, secure token and creates a new user with the `role` of `REVIEWER` and a `pending` invitation status.
*   The invited user receives an email with a link to complete their profile.
*   Upon completing their profile, the user becomes an active reviewer, and their login credentials (including a system-generated password) are sent to them in a separate email.

**2. Manual Addition:**

*   An administrator can also add a reviewer directly to the system without sending an invitation.
*   In this case, a new, active reviewer profile is created, and their login credentials are sent to them via email.

**Reviewer Management:**

The controller also provides a set of tools for managing reviewers, including:

*   Listing all reviewers with their statistics (e.g., number of assigned and completed reviews).
*   Retrieving a single reviewer's profile and review history.
*   Deleting a reviewer (only if they have no assigned proposals).
*   Managing invitations (listing, resending).

## 14. Review System (`src/Review_System/`)

The `src/Review_System/` directory contains the core logic for managing the proposal review process. This includes assigning reviewers, tracking review status, and handling overdue reviews.

### Review Assignment and Clustering (`assignReview.controller.ts`)

The review assignment process is designed to ensure that proposals are reviewed by qualified and available reviewers from related but different faculties. This is achieved through a combination of faculty clustering and workload balancing.

**Faculty Clustering:**

The system uses a `clusterMap` to group faculties into five distinct clusters. This map defines which faculties are considered related for the purpose of review. For example, the 'Faculty of Agriculture' is in a cluster with the 'Faculty of Life Sciences' and the 'Faculty of Veterinary Medicine'. When a proposal is submitted from a particular faculty, the system will only select reviewers from the other faculties in the same cluster.

**Reviewer Selection Process:**

1.  **Identify Submitter's Faculty:** The system first determines the faculty of the proposal's submitter.
2.  **Determine Eligible Faculties:** Using the `clusterMap`, it identifies the pool of eligible faculties for reviewers.
3.  **Calculate Reviewer Workload:** The system queries the database to find all active reviewers from the eligible faculties and calculates their current workload. This includes the number of pending reviews, reconciliation reviews, and total reviews.
4.  **Select Reviewer:** The system selects a reviewer based on the following criteria:
    *   It prioritizes reviewers with the least total workload.
    *   It filters out reviewers who have reached a maximum number of reviews.
    *   If all eligible reviewers have reached the maximum, it selects the one with the lowest workload among them.

**Assignment and Notification:**

*   Once a reviewer is selected, a new `Review` document is created with a due date of 5 business days.
*   The selected reviewer is notified of the new assignment via email.
*   Simultaneously, a job is dispatched to the Agenda worker to generate an AI-powered review for the same proposal.

### Overdue Reviews

The system has a mechanism to track and manage overdue reviews:

*   **Reminders:** It sends reminder emails to reviewers for reviews that are approaching their deadline.
*   **Overdue Status:** It automatically marks reviews as `OVERDUE` if they are not completed by the due date and notifies the reviewer.

### Reconciliation and Discrepancy Handling (`reconciliation.controller.ts`)

The system has a sophisticated mechanism for handling discrepancies between reviews to ensure fairness and accuracy.

**Discrepancy Detection:**

*   After at least one review is completed, the system calculates the average score for the proposal.
*   It then checks if any individual review's total score differs from the average by more than a 20% threshold.

**Reconciliation Assignment:**

*   If a significant discrepancy is detected, the proposal is flagged for reconciliation, and its status is set to `REVISION_REQUESTED`.
*   The system then assigns a new `RECONCILIATION` review to a different reviewer who has not previously reviewed the proposal.
*   The reconciliation reviewer is provided with the scores from the previous reviews to help them make an informed decision.

**Final Score Calculation:**

*   After the reconciliation review is completed, a final score is calculated as a weighted average: 60% of the reconciliation review score and 40% of the average of the original reviews.
*   This final score is then used to create or update an `Award` record for the proposal.

### Re-assignment of Reviews (`reAssignReviewer.controller.ts`)

The system allows for the re-assignment of both regular and reconciliation reviews if a reviewer is unable to complete the task. The re-assignment process follows the same logic as the initial assignment, ensuring that the new reviewer is eligible and has a manageable workload.

### AI-Powered Reviews (`aiScoring.controller.ts`)

The application leverages an AI model to provide an automated, baseline review for each proposal. This is a key feature that helps to streamline the review process and provide an additional data point for decision-making.

**Generation Process:**

1.  **Background Job:** The AI review generation is initiated as a background job, managed by the `agenda` library. This ensures that the main application thread is not blocked during the potentially long-running AI scoring process.
2.  **Input Preparation:** The system prepares the input for the AI model based on the type of proposal:
    *   For **staff proposals**, it constructs a formatted text string containing all the proposal's fields.
    *   For **master's student proposals**, it uses the path to the uploaded document.
3.  **AI Model:** It uses the `uniben-ai-proposal-review-cli` library to interact with the AI model and get the review scores and comments.
4.  **Review Creation:** The AI-generated scores and comments are then used to create a new `Review` document with the `reviewType` set to `AI`.

**Error Handling:**

The system has a robust error handling mechanism for the AI review process. If an error occurs, it will:

*   Log the error for debugging purposes.
*   Send an email notification to a support address.
*   Automatically re-dispatch the job to the Agenda worker to retry the review generation.

## 15. Overall Workflow

The general workflow of the application can be summarized as follows:

1.  A user (researcher, admin, or reviewer) authenticates with the system.
2.  A researcher submits a proposal, including uploading necessary documents.
3.  The system assigns the proposal to reviewers.
4.  Reviewers review the proposal and submit their feedback.
5.  The system aggregates the reviews and an admin makes a final decision.
6.  The researcher is notified of the decision.

This document provides a high-level overview of the DRID Server v2 project. For more detailed information, please refer to the source code and the API documentation.