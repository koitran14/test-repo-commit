// Google Sheets service (low-level API wrappers). "Blind" to business logic.
// Higher layers (repositories) decide WHAT to write; this decides HOW.

const { google } = require('googleapis');
const { getGoogleAuth } = require('./google-auth');
const { callWithRetry } = require('../utils');

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function client(config) {
  const auth = getGoogleAuth(config, SHEETS_SCOPES);
  return google.sheets({ version: 'v4', auth });
}

// G6: single-quote tab names so special chars (e.g. [DD/MM]) don't break the range.
function quoteTab(tab) {
  return `'${String(tab).replace(/'/g, "''")}'`;
}

// Append a single row to a tab.
async function appendRow(config, sheetId, tab, row) {
  const sheets = client(config);
  const range = `${quoteTab(tab)}!A1`;
  const res = await callWithRetry(
    () => sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    }),
    { label: 'sheets.append' }
  );
  return res.data;
}

// Read a column's values (used by dedup claim log).
async function readColumn(config, sheetId, tab, column = 'A') {
  const sheets = client(config);
  const range = `${quoteTab(tab)}!${column}:${column}`;
  const res = await callWithRetry(
    () => sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range }),
    { label: 'sheets.get' }
  );
  const values = res.data.values || [];
  return values.map((r) => r[0]).filter(Boolean);
}

// Read a rectangular range and return the raw 2D array of rows.
async function readRows(config, sheetId, tab, a1 = 'A:Z') {
  const sheets = client(config);
  const range = `${quoteTab(tab)}!${a1}`;
  const res = await callWithRetry(
    () => sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range }),
    { label: 'sheets.getRows' }
  );
  return res.data.values || [];
}

module.exports = { appendRow, readColumn, readRows };
