# OneNote Authorization & Integration Module

This project provides a secure and clear user authorization flow for connecting a Microsoft account to an application, allowing the application to access the user's OneNote content. It handles the OAuth 2.0 authorization code flow, persists user credentials, and is built to support token refresh.

## Features

- **Branded UI:** A professional user interface for the authorization journey.
  - A clear landing page explaining the purpose and permissions.
  - A success page confirming the authorization.
- **Secure OAuth 2.0 Flow:** Implements the standard authorization code flow to acquire tokens from Microsoft Identity.
- **Data Persistence:** Securely stores user credentials (access token, refresh token) and profile information in a PostgreSQL database.
- **Structured & Scalable:** The project is organized with a clear structure, separating routes, database logic, and views, making it easy to maintain and extend.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [npm](https://www.npmjs.com/)
- A running [PostgreSQL](https://www.postgresql.org/) instance

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

Install the necessary npm packages.

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example file.

```bash
cp .env.example .env
```

Now, open the `.env` file and fill in the required values:

```ini
# Microsoft Entra ID Application Credentials
# You can get these from your app registration in the Microsoft Entra admin center
CLIENT_ID='YOUR_APPLICATION_CLIENT_ID'
CLIENT_SECRET='YOUR_CLIENT_SECRET_VALUE'

# PostgreSQL Connection URL
# Format: postgresql://<user>:<password>@<host>:<port>/<database>
DATABASE_URL='postgresql://user:password@localhost:5432/onenote_auth_db'
```

### 4. Configure Microsoft Entra App Registration

Before you can authenticate, you must register an application in the Microsoft Entra admin center.

1.  Go to **Microsoft Entra ID > App registrations**.
2.  Select your application.
3.  Go to **Authentication**.
4.  Under **Platform configurations**, click **Add a platform** and select **Web**.
5.  In the **Redirect URIs** section, add the following URI:
    ```
    http://localhost:3000/partner/auth/microsoft/callback
    ```
6.  Click **Save**.

### 5. Running the Application

Once the configuration is complete, you can start the server.

```bash
npm run start
```

The application will be running at `http://localhost:3000`. Open your browser and navigate to `http://localhost:3000/partner/` to begin the authorization flow.

## Project Structure

```
.
├── node_modules/
├── public/
│   └── css/
│       └── style.css      # Styles for the views
├── src/
│   ├── app.js             # Main Express application file (routes, config)
│   └── database.js        # PostgreSQL connection and queries
├── views/
│   ├── index.ejs          # The initial authorization landing page
│   └── success.ejs        # The page shown after successful authorization
├── .env                   # Local environment variables (ignored by git)
├── .env.example           # Example environment variables
├── package-lock.json
└── package.json
```
