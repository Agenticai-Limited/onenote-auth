const { Pool } = require("pg");

// The pool will use the DATABASE_URL from the .env file
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // The 'pg' library will automatically handle SSL based on the
  // connection string. For many cloud providers, the URL will
  // include '?ssl=true'. For local development, SSL is usually off.
  // By removing the explicit ssl config, we let the library decide.
});

/**
 * Creates the onenote_authorizations table if it doesn't exist.
 * This table stores user tokens and information.
 */
const setupDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS onenote_authorizations (
        id SERIAL PRIMARY KEY,
        microsoft_user_id VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        token_expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database table 'onenote_authorizations' is ready.");
  } catch (error) {
    console.error("Error setting up the database:", error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Saves or updates a user's authorization details in the database.
 * If the user (based on microsoft_user_id) already exists, their record is updated.
 * Otherwise, a new record is inserted.
 * @param {object} userData - The user's data to save.
 * @param {string} userData.microsoftUserId - The user's unique Microsoft ID.
 * @param {string} userData.email - The user's email.
 * @param {string} userData.accessToken - The access token.
 * @param {string} userData.refreshToken - The refresh token.
 * @param {Date} userData.expiresAt - The token expiration date.
 */
const saveUserAuthorization = async (userData) => {
  const { microsoftUserId, email, accessToken, refreshToken, expiresAt } =
    userData;

  const query = `
    INSERT INTO onenote_authorizations (microsoft_user_id, email, access_token, refresh_token, token_expires_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (microsoft_user_id) 
    DO UPDATE SET
      email = EXCLUDED.email,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at = NOW();
  `;

  try {
    await pool.query(query, [
      microsoftUserId,
      email,
      accessToken,
      refreshToken,
      expiresAt,
    ]);
    console.log(`Successfully saved authorization for user ${email}`);
  } catch (error) {
    console.error(`Error saving authorization for user ${email}:`, error);
    throw error;
  }
};

module.exports = {
  pool,
  setupDatabase,
  saveUserAuthorization,
};
