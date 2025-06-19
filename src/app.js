require("dotenv").config();
const express = require("express");
const https = require("https"); // 1. Import the 'https' module
const fs = require("fs"); // 2. Import the 'fs' module to read files
const session = require("express-session");
const axios = require("axios");
const path = require("path");
const crypto = require("crypto"); // Used to generate a random state
const { setupDatabase, saveUserAuthorization } = require("./database");

// --- 1. CONFIGURE YOUR APPLICATION INFO ---
// Make sure to set these in your .env file
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || "localhost";

// Make sure this Redirect URI is added to your Microsoft Entra ID app registration
const REDIRECT_URI = `https://${DOMAIN}:${PORT}/partner/auth/microsoft/callback`;

// Microsoft Authorization, Token, and Graph Endpoints
const AUTHORITY = "https://login.microsoftonline.com/common";
const AUTH_ENDPOINT = "/oauth2/v2.0/authorize";
const TOKEN_ENDPOINT = "/oauth2/v2.0/token";
const GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

// The permission scopes you are requesting
// 'offline_access' is required to get a refresh token
const SCOPES = ["offline_access", "Notes.Read.All", "User.Read"]; // Use Notes.Read.All for read-only access to all user's notebooks

// --- 2. CREATE AND CONFIGURE THE EXPRESS APP ---
const app = express();

// Set up the view engine to use EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "..", "public")));

// Set up the session middleware
app.use(
  session({
    secret: crypto.randomBytes(32).toString("hex"), // Use a random secret key for each session
    resave: false,
    saveUninitialized: true,
  })
);

// --- 3. DEFINE THE APPLICATION ROUTES ---

// Route to display the branded landing page
app.get("/partner/onenote-auth", (req, res) => {
  res.render("index");
});

// Route to start the login process, now renamed to /authorize
app.get("/partner/authorize", (req, res) => {
  // Generate and store a random state value in the session for later validation
  const state = crypto.randomBytes(16).toString("hex");
  req.session.state = state;

  // Build the authorization URL
  const authUrl =
    `${AUTHORITY}${AUTH_ENDPOINT}?` +
    new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(" "),
      state: state,
      response_mode: "query",
    }).toString();

  console.log(`Redirecting to: ${authUrl}`);
  res.redirect(authUrl);
});

// The callback route that handles the response from Microsoft
app.get("/partner/auth/microsoft/callback", async (req, res) => {
  const { code, state } = req.query;

  // Validate the state to prevent CSRF attacks
  if (state !== req.session.state) {
    return res
      .status(400)
      .send("State mismatch. The request might have been tampered with.");
  }

  if (!code) {
    return res
      .status(400)
      .send("Error: Authorization code not found in callback.");
  }

  try {
    // --- Step 1: Exchange authorization code for tokens ---
    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("code", code);
    tokenParams.append("redirect_uri", REDIRECT_URI);
    tokenParams.append("client_id", CLIENT_ID);
    tokenParams.append("client_secret", CLIENT_SECRET);

    console.log("Exchanging authorization code for tokens...");
    const tokenResponse = await axios.post(
      `${AUTHORITY}${TOKEN_ENDPOINT}`,
      tokenParams.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // --- Step 2: Use access token to get user's profile info from Graph API ---
    console.log("Fetching user profile from Microsoft Graph API...");
    const userResponse = await axios.get(GRAPH_API_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { id: microsoftUserId, mail: email } = userResponse.data;

    if (!microsoftUserId || !email) {
      return res
        .status(500)
        .send("Could not retrieve user ID and email from Microsoft.");
    }

    console.log(`User profile received: ID=${microsoftUserId}, Email=${email}`);

    // --- Step 3: Persist the tokens and user info to the database ---
    await saveUserAuthorization({
      microsoftUserId,
      email,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt,
    });

    // --- Step 4: Render the success page ---
    // In a real app, you might set a user session here and redirect
    res.render("success", { userEmail: email });
  } catch (error) {
    console.error(
      "Error during authentication callback:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .send("An error occurred during the authentication process.");
  }
});

// --- 4. START THE APPLICATION ---
const startServer = async () => {
  try {
    // Ensure the database is set up before starting the server
    await setupDatabase();

    // 3. Define SSL options by reading the certificate files
    const sslOptions = {
      key: fs.readFileSync("key.pem"),
      cert: fs.readFileSync("cert.pem"),
    };

    // 4. Create an HTTPS server instead of an HTTP server
    https.createServer(sslOptions, app).listen(PORT, () => {
      console.log(`Server is running securely on https://${DOMAIN}:${PORT}`);
      console.log(
        "Please open your browser and navigate to the address to begin."
      );
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();
