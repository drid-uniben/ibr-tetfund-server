# Drid_server Project Overview

This document provides a comprehensive overview of the Drid_server project, a Research Project Management API. It details the project's structure, components, and functionality to serve as a reference for future development and integration.

## Project Description

The Drid_server is a Node.js application built with the Express framework. It serves as a backend API for managing research projects. Key features include user authentication, article management, and information handling. The project uses MongoDB as its database with the Mongoose ODM.

## Core Technologies

- **Node.js:** The runtime environment for the application.
- **Express:** A web application framework for Node.js, used to build the API.
- **MongoDB:** A NoSQL database used for data storage.
- **Mongoose:** An Object Data Modeling (ODM) library for MongoDB and Node.js.
- **JSON Web Tokens (JWT):** Used for securing the API endpoints through authentication.
- **Multer:** A middleware for handling `multipart/form-data`, primarily used for file uploads.
- **Nodemailer:** A module for sending emails.
- **Winston:** A logger for Node.js.
- **Swagger:** Used for API documentation.

## Project Structure

The project is organized into several directories, each with a specific purpose:

- **`src/`**: The main directory containing the application's source code.
  - **`controllers/`**: Contains the business logic of the application.
  - **`db/`**: Manages the database connection.
  - **`middleware/`**: Holds custom middleware for handling requests.
  - **`models/`**: Defines the Mongoose schemas for the database models.
  - **`routes/`**: Contains the API routes.
  - **`scripts/`**: Includes scripts for tasks like creating an admin user.
  - **`services/`**: Contains services for tasks like sending emails and generating tokens.
  - **`uploads/`**: The directory where uploaded files are stored.
  - **`utils/`**: Contains utility functions used throughout the application.
- **`.env.example`**: An example file for environment variables.
- **`package.json`**: Lists the project's dependencies and scripts.
- **`swagger.yaml`**: The OpenAPI specification for the API.

---

## Application Initialization

The application starts execution from `src/index.js`. This file is responsible for:

- **Database Connection:** It calls the `connectDB` function from `src/db/database.js` to establish a connection with the MongoDB database.
- **Environment Validation:** It uses `validateEnv` from `src/utils/validateEnv.js` to ensure that all required environment variables are set.
- **Uploads Directory:** It creates the `uploads` directory and its subdirectories (`profiles`, `cover_pic`, `info_docs`) if they don't exist.
- **Server Startup:** It starts the Express server on the port specified in the environment variables. Once the server is running, it calls `createAdminUser` from `src/scripts/createAdmin.js` to create a default admin user if one doesn't already exist.

## Express Application (`src/app.js`)

The `src/app.js` file configures the Express application and its middleware. The key middleware used are:

- **`compression`:** Compresses the response bodies for better performance.
- **`helmet`:** Sets various HTTP headers to secure the application.
- **`cors`:** Enables Cross-Origin Resource Sharing (CORS) with specific options.
- **`express-rate-limit`:** Limits the number of requests from an IP address to prevent brute-force attacks.
- **`cookie-parser`:** Parses cookies attached to the client request object.
- **`morgan`:** Logs HTTP requests.
- **`express.json` and `express.urlencoded`:** Parses incoming request bodies with JSON and URL-encoded payloads.
- **`swagger-ui-express`:** Serves the Swagger UI for API documentation.

The application's routes are imported from `src/routes/index.js` and mounted under the `/api/v1` path. The file also sets up middleware for handling 404 errors (`notFound`) and other errors (`errorHandler`).

---

## Routing

The application's routing is modular, with different route groups defined in separate files. The main router file, `src/routes/index.js`, imports and mounts these route groups under the `/api/v1` path.

### Main Router (`src/routes/index.js`)

- `/api/v1/auth`: Authentication routes.
- `/api/v1/admin`: Admin-only routes.
- `/api/v1/researcher`: Researcher-specific routes.
- `/api/v1/`: Routes for the Articles and Info modules.

### Authentication Routes (`src/routes/auth.routes.js`)

- `POST /api/v1/auth/admin/login`: Admin login.
- `POST /api/v1/auth/researcher/login`: Researcher login.
- `POST /api/v1/auth/refresh-token`: Refresh JWT token.
- `POST /api/v1/auth/logout`: Logout.
- `GET /api/v1/auth/verify-token`: Verify JWT token.
- `POST /api/v1/auth/complete-profile/:token`: Complete researcher profile from invitation.

### Admin Routes (`src/routes/admin.routes.js`)

These routes are protected and can only be accessed by authenticated admins.

- `POST /api/v1/admin/researchers/invite`: Invite a new researcher.
- `POST /api/v1/admin/researchers/add`: Add a researcher profile.
- `GET /api/v1/admin/researchers`: Get all researchers.
- `DELETE /api/v1/admin/researchers/:id`: Delete a researcher.
- `GET /api/v1/admin/researchers/:id/dashboard`: Get a researcher's dashboard.
- `GET /api/v1/admin/invitations`: Get all invitations.
- `POST /api/v1/admin/invitations/:id/resend`: Resend an invitation.
- `DELETE /api/v1/admin/invitations/:id`: Delete an invitation.

### Researcher Routes (`src/routes/researcher.routes.js`)

- `GET /api/v1/researcher/profile`: Get the profile of the logged-in researcher.
- `GET /api/v1/researcher/profile/:id`: Get the profile of a specific researcher.
- `GET /api/v1/researcher/popular-articles`: Get popular articles of the logged-in researcher.
- `GET /api/v1/researcher/popular-articles/:id`: Get popular articles of a specific researcher.
- `GET /api/v1/researcher/analytics`: Get analytics for the logged-in researcher.
- `GET /api/v1/researcher/analytics/:id`: Get analytics for a specific researcher.

### Articles Module Routes (`src/Articles/routes/`)

- **`articles.routes.js`**
  - `GET /api/v1/articles`: Get all articles.
  - `GET /api/v1/articles/dashboard`: Get dashboard data for articles.
  - `GET /api/v1/articles/:id`: Get an article by ID.
  - `POST /api/v1/articles`: Create a new article (admin only).
  - `PUT /api/v1/articles/:id`: Update an article (admin only).
  - `DELETE /api/v1/articles/:id`: Delete an article (admin only).

- **`articleView.routes.js`**
  - `POST /api/v1/article-views/:id/view`: Record a view for an article.
  - `GET /api/v1/article-views/popular`: Get popular articles.
  - `GET /api/v1/article-views/:id/stats`: Get view statistics for an article (admin and researchers only).

- **`department.routes.js`**
  - `GET /api/v1/department`: Get all departments.
  - `GET /api/v1/department/:code`: Get a department by code.

- **`faculty.routes.js`**
  - `GET /api/v1/faculty`: Get all faculties.
  - `GET /api/v1/faculty/:code`: Get a faculty by code.
  - `GET /api/v1/faculty/id/:id`: Get a faculty by ID.

### Info Module Routes (`src/Info/routes/`)

- **`info.routes.js`**
  - `GET /api/v1/info`: Get all info documents.
  - `GET /api/v1/info/:id`: Get an info document by ID.
  - `POST /api/v1/info`: Create a new info document (admin only).
  - `DELETE /api/v1/info/:id`: Delete an info document (admin only).

- **`infoView.route.js`**
  - `POST /api/v1/info-views/:id/view`: Record a view for an info document.
  - `GET /api/v1/info-views/popular`: Get popular info documents.
  - `GET /api/v1/info-views/:id/stats`: Get view statistics for an info document (admin only).

---

## Controllers

Controllers hold the business logic of the application. Each controller is responsible for handling incoming requests, interacting with the models, and sending responses.

### Auth Controller (`src/controllers/auth.controller.js`)

- **`completeProfile`**: Completes a researcher's profile using an invitation token.
- **`adminLogin`**: Handles login for admin users.
- **`researcherLogin`**: Handles login for researcher users.
- **`refreshToken`**: Refreshes JWT tokens.
- **`verifyToken`**: Verifies a JWT token.
- **`logout`**: Logs out a user.

### Admin Controller (`src/controllers/admin.controller.js`)

- **`inviteResearcher`**: Invites a new researcher via email.
- **`addResearcherProfile`**: Manually adds a new researcher profile.
- **`deleteResearcher`**: Deletes a researcher's profile.
- **`getResearchers`**: Retrieves all researcher profiles.
- **`getInvitations`**: Retrieves all invitations.
- **`resendInvitation`**: Resends an invitation to a researcher.
- **`deleteInvitation`**: Deletes an invitation.
- **`getResearcherDashboard`**: Retrieves dashboard data for a specific researcher.

### Researcher Controller (`src/controllers/researcher.controller.js`)

- **`getProfile`**: Retrieves the profile of a researcher, including their articles and collaborators.
- **`getPopularArticles`**: Retrieves the most popular articles of a researcher.
- **`getArticlesAnalytics`**: Retrieves analytics data for a researcher's articles.

### Article Controller (`src/Articles/controllers/article.controller.js`)

- **`getArticles`**: Retrieves a list of articles based on query parameters.
- **`getArticleById`**: Retrieves a single article by its ID.
- **`createArticle`**: Creates a new article.
- **`updateArticle`**: Updates an existing article.
- **`deleteArticle`**: Deletes an article.
- **`getDashboardData`**: Retrieves dashboard data for articles.

### Article View Controller (`src/Articles/controllers/articleView.controller.js`)

- **`recordView`**: Records a view for an article.
- **`getPopularArticles`**: Retrieves a list of popular articles.
- **`getArticleViewStats`**: Retrieves view statistics for an article.

### Department Controller (`src/Articles/controllers/department.controller.js`)

- **`getDepartments`**: Retrieves a list of all departments.
- **`getDepartmentByCode`**: Retrieves a department by its code.

### Faculty Controller (`src/Articles/controllers/faculty.controller.js`)

- **`getFaculties`**: Retrieves a list of all faculties.
- **`getFacultyByCode`**: Retrieves a faculty by its code.
- **`getFacultyById`**: Retrieves a faculty by its ID.

### Info Controller (`src/Info/controllers/info.controller.js`)

- **`getInfoDocuments`**: Retrieves a list of info documents.
- **`getInfoDocumentById`**: Retrieves a single info document by its ID.
- **`createInfoDocument`**: Creates a new info document.
- **`deleteInfoDocument`**: Deletes an info document.

### Info View Controller (`src/Info/controllers/infoView.controller.js`)

- **`recordView`**: Records a view for an info document.
- **`getPopularInfoDocuments`**: Retrieves a list of popular info documents.
- **`getInfoDocumentViewStats`**: Retrieves view statistics for an info document.

---

## Models

Models define the structure of the data in the MongoDB database. They are created using Mongoose schemas.

### User Model (`src/model/user.model.js`)

The `User` model represents the users of the application. It includes the following fields:

- `name`: The user's name.
- `email`: The user's email address (unique).
- `password`: The user's hashed password.
- `role`: The user's role (`admin` or `researcher`).
- `faculty`: The faculty the user belongs to.
- `bio`: A short biography of the user.
- `title`: The user's title.
- `profilePicture`: The URL of the user's profile picture.
- `isActive`: A boolean indicating if the user's account is active.
- `refreshToken`: The refresh token for the user.
- `inviteToken`: The token for inviting a new researcher.
- `inviteTokenExpires`: The expiration date of the invite token.
- `invitationStatus`: The status of the invitation (`pending`, `accepted`, `added`, or `expired`).
- `lastLogin`: The date of the user's last login.
- `articles`: An array of articles written by the user.

### Article Model (`src/Articles/models/article.model.js`)

The `Article` model represents the articles in the application. It includes the following fields:

- `title`: The title of the article.
- `category`: The category of the article (`Research`, `Innovation`, or `Development`).
- `content`: The content of the article.
- `cover_photo`: The URL of the article's cover photo.
- `contributors`: An array of users who contributed to the article.
- `faculty`: The faculty the article belongs to.
- `department`: The department the article belongs to.
- `owner`: The user who owns the article.
- `summary`: A short summary of the article.
- `publish_date`: The date the article was published.
- `views`: An object that tracks the number of views and the viewers of the article.
- `tags`: An array of tags for the article.
- `status`: The status of the article (`draft`, `published`, or `archived`).

### Department Model (`src/Articles/models/department.model.js`)

The `Department` model represents the departments in the application. It includes the following fields:

- `code`: The code of the department (unique).
- `title`: The title of the department.
- `faculty`: The faculty the department belongs to.

### Faculty Model (`src/Articles/models/faculty.model.js`)

The `Faculty` model represents the faculties in the application. It includes the following fields:

- `code`: The code of the faculty (unique).
- `title`: The title of the faculty.

### Info Model (`src/Info/models/info.model.js`)

The `Info` model represents the info documents in the application. It includes the following fields:

- `title`: The title of the info document.
- `description`: A description of the info document.
- `info_doc`: The URL of the info document.
- `original_filename`: The original filename of the info document.
- `file_size`: The size of the info document in bytes.
- `file_type`: The MIME type of the info document.
- `owner`: The user who owns the info document.
- `publish_date`: The date the info document was published.
- `views`: An object that tracks the number of views and the viewers of the info document.
- `status`: The status of the info document (`published` or `archived`).

---

## Middleware

Middleware functions are used to handle requests and perform various tasks before the request reaches the controller.

### Authentication Middleware (`src/middleware/auth.middleware.js`)

- **`authenticateAdminToken`**: Authenticates an access token and checks if the user has admin privileges.
- **`authenticateResearcherToken`**: Authenticates an access token and checks if the user has researcher privileges.
- **`authenticateToken`**: Authenticates an access token for any valid user (admin or researcher).
- **`authorizeModeration`**: Authorizes moderation actions, requiring admin privileges.
- **`rateLimiter`**: Implements a rate limiting mechanism to prevent abuse of public endpoints.

### Error Handler Middleware (`src/middleware/errorHandler.js`)

This middleware is responsible for handling all errors that occur in the application. It logs the errors and sends a JSON response with the error details. It also handles specific errors like MongoDB duplicate key errors, validation errors, and JWT errors.

### Not Found Middleware (`src/middleware/notFound.js`)

This middleware is used to handle requests for routes that do not exist. It creates a 404 error and passes it to the error handler middleware.

---

## Services

Services provide reusable logic that can be used across different parts of the application.

### Email Service (`src/services/email.service.js`)

The `EmailService` is responsible for sending emails. It uses the `nodemailer` library to send emails via SMTP. It provides the following methods:

- **`sendInvitationEmail`**: Sends an invitation email to a new researcher.
- **`sendCredentialsEmail`**: Sends an email with the user's credentials.
- **`sendNotificationEmail`**: Sends a notification email about a new research publication.
- **`sendBulkEmails`**: Sends bulk emails to a list of recipients.

### Token Service (`src/services/token.service.js`)

The `TokenService` is responsible for generating and verifying JWTs. It provides the following methods:

- **`generateTokens`**: Generates an access token and a refresh token.
- **`verifyAccessToken`**: Verifies an access token.
- **`verifyRefreshToken`**: Verifies a refresh token.
- **`blacklistToken`**: Blacklists a token to prevent its use.
- **`rotateRefreshToken`**: Rotates a refresh token, blacklisting the old one and issuing a new one.
- **`setRefreshTokenCookie`**: Sets the refresh token as a cookie in the response.
- **`clearRefreshTokenCookie`**: Clears the refresh token cookie.

---

## Utils

The `utils` directory contains various utility functions and configurations that are used throughout the application.

### `asyncHandler.js`

This utility is a higher-order function that wraps async route handlers and catches any errors that occur, passing them to the error handling middleware. This avoids the need for repetitive try-catch blocks in every controller.

### `customErrors.js`

This file defines a set of custom error classes that extend the built-in `Error` class. These custom errors provide more specific information about the type of error that occurred, making it easier to handle them in the error handling middleware.

### `logger.js`

This file configures the `winston` logger. It sets up different transports for logging to the console and to files. It also configures the log format and level.

### `passwordGenerator.js`

This utility provides a function to generate a secure random password.

### `ResponseHelpers.js`

This file contains helper functions for sending standardized JSON responses. It includes functions for sending success and error responses.

### `securityConfig.js`

This file contains the configuration for various security-related middleware, including `cors`, `helmet`, and `express-rate-limit`.

### `validateEnv.js`

This utility uses the `envalid` library to validate the environment variables at application startup. It ensures that all required environment variables are present and have the correct type.
