// Shared helpers: truncation (BP6) + retry with backoff (BP7).

const logger = require('./logger');

const MAX_TOOL_RESULT_CHARS = 50000;

function truncate(result) {
  const str = typeof result === 'string' ? result : JSON.stringify(result);
  if (str.length <= MAX_TOOL_RESULT_CHARS) return str;
  return str.slice(0, MAX_TOOL_RESULT_CHARS) + '\n\n[TRUNCATED — exceeded 50,000 chars]';
}

const RETRYABLE = new Set([429, 500, 502, 503, 529]);

// Retry an async fn on transient errors: 5s -> 10s -> 15s, max 3.
async function callWithRetry(fn, { maxRetries = 3, baseDelay = 5000, label = 'call' } = {}) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const code = e.status || e.statusCode || (e.code && Number(e.code)) || 0;
      const retryable = RETRYABLE.has(code);
      if (!retryable || attempt === maxRetries) throw e;
      const delay = baseDelay * attempt;
      logger.warn({ msg: 'retrying', label, attempt, delay_ms: delay, error: String(e.message || e) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

module.exports = { truncate, callWithRetry, MAX_TOOL_RESULT_CHARS };
