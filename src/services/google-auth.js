// Centralized Google auth (building block #6) — OAuth 2.0 (user account).
// The agent acts AS the signed-in user (their own mailbox + their own Sheet),
// so no service-account key and no domain-wide delegation are required.
// Secrets come from env (never hardcoded). Same client covers Gmail + Sheets;
// scopes are granted once during the consent flow (see scripts/get-refresh-token.js).

const { google } = require('googleapis');

let _client = null;

function getOAuthClient(config) {
  if (_client) return _client;

  const {
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN,
  } = config.env;

  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    throw new Error(
      'Missing Google OAuth env vars: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REFRESH_TOKEN'
    );
  }

  const client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
  client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
  // googleapis auto-refreshes the access token from the refresh token as needed.
  _client = client;
  return client;
}

// Kept for signature compatibility with the service layer.
// `scopes` is accepted but ignored — they were granted at consent time.
function getGoogleAuth(config, _scopes) {
  return getOAuthClient(config);
}

module.exports = { getGoogleAuth, getOAuthClient };
