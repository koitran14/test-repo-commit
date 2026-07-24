// Drive service - minimal. Only used if SKILL.md is hosted on Drive.
// Kept so skill-loader supports source: "drive" without extra wiring.

const { getGoogleAuth } = require('./google-auth');
const { google } = require('googleapis');

async function downloadFromDrive(config, fileId) {
  const auth = getGoogleAuth(config, ['https://www.googleapis.com/auth/drive.readonly']);
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'text' }
  );
  return res.data;
}

module.exports = { downloadFromDrive };
