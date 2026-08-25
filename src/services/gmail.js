// Gmail service (low-level API wrappers). "Blind" to AI logic.
// Responsibilities: fetch unread, mark-as-read, get message, send reply in thread.

const { google } = require('googleapis');
const { getGoogleAuth } = require('./google-auth');
const { callWithRetry } = require('../utils');
const logger = require('../logger');

const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

function client(config) {
  const auth = getGoogleAuth(config, GMAIL_SCOPES);
  return google.gmail({ version: 'v1', auth });
}

// Fetch unread message stubs matching the scan query.
async function fetchUnread(config, query) {
  const gmail = client(config);
  const res = await callWithRetry(
    () => gmail.users.messages.list({ userId: 'me', q: query, maxResults: 25 }),
    { label: 'gmail.list' }
  );
  return res.data.messages || [];
}

// Mark-as-read = remove UNREAD label (BP4/G5). Call BEFORE processing.
async function markAsRead(config, messageId) {
  const gmail = client(config);
  await callWithRetry(
    () => gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { removeLabelIds: ['UNREAD'] },
    }),
    { label: 'gmail.markAsRead' }
  );
}

function headerValue(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

// Decode RFC 2047 encoded-words (=?UTF-8?B?..?= / =?UTF-8?Q?..?=) in headers.
// Safe no-op for plain values.
function decodeMimeWords(str) {
  if (!str) return str;
  return str
    .replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?)/g, '$1') // join adjacent words
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (m, charset, enc, text) => {
      try {
        if (enc.toUpperCase() === 'B') {
          return Buffer.from(text, 'base64').toString('utf8');
        }
        const bin = text.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_, h) =>
          String.fromCharCode(parseInt(h, 16))
        );
        return Buffer.from(bin, 'latin1').toString('utf8');
      } catch {
        return m;
      }
    });
}

function decodePart(part) {
  if (!part) return '';
  if (part.body && part.body.data) {
    return Buffer.from(part.body.data, 'base64').toString('utf8');
  }
  if (part.parts) {
    // Prefer text/plain, fall back to first text part
    const plain = part.parts.find((p) => p.mimeType === 'text/plain');
    if (plain) return decodePart(plain);
    return part.parts.map(decodePart).join('\n');
  }
  return '';
}

// Get a full message with parsed fields we need.
async function getMessage(config, messageId) {
  const gmail = client(config);
  const res = await callWithRetry(
    () => gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' }),
    { label: 'gmail.get' }
  );
  const msg = res.data;
  const headers = msg.payload && msg.payload.headers;
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: decodeMimeWords(headerValue(headers, 'From')),
    to: headerValue(headers, 'To'),
    subject: decodeMimeWords(headerValue(headers, 'Subject')),
    date: headerValue(headers, 'Date'),
    messageIdHeader: headerValue(headers, 'Message-ID'),
    references: headerValue(headers, 'References'),
    body: decodePart(msg.payload) || msg.snippet || '',
  };
}

function extractEmail(fromHeader) {
  const m = /<([^>]+)>/.exec(fromHeader);
  return m ? m[1] : (fromHeader || '').trim();
}

// Encode a header value as an RFC 2047 encoded-word if it has non-ASCII chars.
// Without this, Vietnamese subjects placed raw in headers become mojibake.
function encodeHeaderWord(s) {
  if (!/[^\x00-\x7F]/.test(s)) return s;
  return '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
}

function buildRawReply({ to, subject, inReplyTo, references, body }) {
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  // Body: base64 (CTE) so UTF-8 content is transmitted intact.
  const b64body = Buffer.from(body, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeHeaderWord(replySubject)}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    references ? `References: ${references}` : null,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64body,
  ].filter(Boolean);
  const raw = lines.join('\r\n');
  return Buffer.from(raw, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send a reply inside the same thread.
async function sendReply(config, { threadId, to, subject, inReplyTo, references, body }) {
  const gmail = client(config);
  const raw = buildRawReply({ to, subject, inReplyTo, references, body });
  const res = await callWithRetry(
    () => gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw, threadId },
    }),
    { label: 'gmail.send' }
  );
  logger.info({ msg: 'reply_sent', to, thread_id: threadId, message_id: res.data.id });
  return res.data;
}

module.exports = { fetchUnread, markAsRead, getMessage, sendReply, extractEmail };
