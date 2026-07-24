// Dashboard authentication: "Sign in with Google" restricted to an allowed
// domain / email list, backed by a signed (HMAC) httpOnly session cookie.
// Dependency-free beyond googleapis (reuses google.auth.OAuth2 for OIDC).

const crypto = require('crypto');
const { google } = require('googleapis');

const COOKIE_NAME = 'qa_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function redirectUri(config) {
  return `${config.env.DASHBOARD_BASE_URL}/auth/google/callback`;
}

function loginClient(config) {
  const { GOOGLE_LOGIN_CLIENT_ID, GOOGLE_LOGIN_CLIENT_SECRET } = config.env;
  if (!GOOGLE_LOGIN_CLIENT_ID || !GOOGLE_LOGIN_CLIENT_SECRET) {
    throw new Error('Missing GOOGLE_LOGIN_CLIENT_ID / GOOGLE_LOGIN_CLIENT_SECRET');
  }
  return new google.auth.OAuth2(GOOGLE_LOGIN_CLIENT_ID, GOOGLE_LOGIN_CLIENT_SECRET, redirectUri(config));
}

function authUrl(config) {
  return loginClient(config).generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
  });
}

// Exchange code -> verify id_token -> return { email, name } if allowed, else null.
async function verifyGoogleCallback(config, code) {
  const client = loginClient(config);
  const { tokens } = await client.getToken(code);
  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.env.GOOGLE_LOGIN_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = (payload.email || '').toLowerCase();
  if (!payload.email_verified) return null;
  if (!isEmailAllowed(config, email)) return null;
  return { email, name: payload.name || email };
}

function isEmailAllowed(config, email) {
  const dash = config.dashboard || {};
  const domain = (dash.allowed_domain || '').toLowerCase();
  const list = (dash.allowed_emails || []).map((e) => String(e).toLowerCase());
  if (list.length && list.includes(email)) return true;
  if (domain && email.endsWith('@' + domain)) return true;
  // If neither configured, deny by default (safer).
  return false;
}

// ---- Signed session cookie ----
function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function issueCookie(config, user) {
  const secret = config.env.DASHBOARD_SESSION_SECRET;
  if (!secret) throw new Error('Missing DASHBOARD_SESSION_SECRET');
  const payload = Buffer.from(
    JSON.stringify({ email: user.email, name: user.name, exp: Date.now() + SESSION_TTL_MS })
  ).toString('base64url');
  const token = `${payload}.${sign(payload, secret)}`;
  const secure = config.env.DASHBOARD_BASE_URL.startsWith('https://') ? ' Secure;' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/;${secure} Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie;
  if (!raw) return out;
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

function readSession(config, req) {
  const secret = config.env.DASHBOARD_SESSION_SECRET;
  if (!secret) return null;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload, secret);
  // constant-time compare
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || Date.now() > data.exp) return null;
    return { email: data.email, name: data.name };
  } catch {
    return null;
  }
}

// Express middleware: 401 if not authenticated.
function requireAuth(config) {
  return (req, res, next) => {
    const user = readSession(config, req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    next();
  };
}

module.exports = {
  COOKIE_NAME,
  authUrl,
  verifyGoogleCallback,
  isEmailAllowed,
  issueCookie,
  clearCookie,
  readSession,
  requireAuth,
};
