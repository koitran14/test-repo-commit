// Config loader: business config from config.yaml, secrets from env.
// Never hardcode credentials (Platform Contract #3 & #5).

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
require('dotenv').config();

let _config = null;

function loadConfig() {
  if (_config) return _config;

  const configPath = path.resolve(__dirname, '..', 'config.yaml');
  const raw = fs.readFileSync(configPath, 'utf8');
  const cfg = yaml.load(raw);

  // Secrets from environment (platform-injected). OAuth 2.0 user credentials.
  cfg.env = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    // Dashboard login (Google OAuth) - separate Web OAuth client
    GOOGLE_LOGIN_CLIENT_ID: process.env.GOOGLE_LOGIN_CLIENT_ID,
    GOOGLE_LOGIN_CLIENT_SECRET: process.env.GOOGLE_LOGIN_CLIENT_SECRET,
    DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET,
    DASHBOARD_BASE_URL: process.env.DASHBOARD_BASE_URL || 'http://localhost:3100',
    PORT: process.env.PORT || (cfg.agent && cfg.agent.port) || 3100,
  };

  _config = cfg;
  return _config;
}

module.exports = { loadConfig };
