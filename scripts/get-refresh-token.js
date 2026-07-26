// One-time helper: obtain a Google OAuth refresh token for the agent.
//
// Prereqs:
//   1) Create an OAuth Client of type "Desktop app" in Google Cloud.
//   2) Put GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in .env
//      (or export them in your shell).
//
// Run:  node scripts/get-refresh-token.js
// Then open the printed URL, sign in with the mailbox to monitor, approve,
// and copy the REFRESH TOKEN it prints into .env (GOOGLE_OAUTH_REFRESH_TOKEN).

const http = require('http');
const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/spreadsheets',
];

const PORT = 5555;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Thieu GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET trong .env');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',   // needed to receive a refresh_token
  prompt: 'consent',        // force refresh_token even on re-auth
  scope: SCOPES,
});

console.log('\n============================================================');
console.log('1) Mo link sau trong trinh duyet (dang nhap bang hop thu can theo doi):\n');
console.log(authUrl);
console.log('\n2) Sau khi bam Allow, quay lai cua so terminal nay.');
console.log('============================================================\n');
console.log(`Dang cho phan hoi tai ${REDIRECT} ...`);

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404).end();
    return;
  }
  try {
    const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('code');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h3>Da uy quyen xong. Ban co the dong tab nay va quay lai terminal.</h3>');

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      console.error('\nKHONG nhan duoc refresh_token. Hay thu lai (co the can go quyen truy cap cu tai https://myaccount.google.com/permissions roi chay lai).');
    } else {
      console.log('\n=== GOOGLE_OAUTH_REFRESH_TOKEN (copy vao .env) ===\n');
      console.log(tokens.refresh_token);
      console.log('\n==================================================\n');
    }
  } catch (e) {
    console.error('Loi khi doi token:', e.message || e);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT);
