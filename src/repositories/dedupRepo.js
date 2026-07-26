// Dedup repository (BP2). Prevents reprocessing the same email (G5).
// Persists processed message IDs to a Sheet "claim log" tab so state
// survives container restarts. In-memory cache avoids repeated reads.

const sheetsService = require('../services/sheets');
const logger = require('../logger');

let _cache = null; // Set of processed message IDs

async function loadCache(config) {
  if (_cache) return _cache;
  _cache = new Set();
  try {
    const cfg = config.tools.sheets.sheets.claim_log;
    const ids = await sheetsService.readColumn(config, cfg.id, cfg.tab, 'A');
    ids.forEach((id) => _cache.add(id));
    logger.info({ msg: 'dedup_cache_loaded', count: _cache.size });
  } catch (e) {
    logger.warn({ msg: 'dedup_cache_load_failed', error: String(e.message || e) });
  }
  return _cache;
}

async function isProcessed(config, messageId) {
  const cache = await loadCache(config);
  return cache.has(messageId);
}

async function recordProcessed(config, messageId, meta = {}) {
  const cache = await loadCache(config);
  cache.add(messageId);

  const testMode = config.test_mode && config.test_mode.enabled;
  const dryRun = testMode && config.test_mode.sheets && config.test_mode.sheets.dry_run;
  const row = [messageId, new Date().toISOString(), meta.subject || '', meta.from || ''];

  if (dryRun) {
    logger.info({ msg: '[TEST MODE] dedup_dry_run', row });
    return;
  }
  const cfg = config.tools.sheets.sheets.claim_log;
  await sheetsService.appendRow(config, cfg.id, cfg.tab, row);
}

// Read the process log for the dashboard (newest first).
async function getProcessLog(config, limit = 100) {
  const cfg = config.tools.sheets.sheets.claim_log;
  let rows = [];
  try {
    rows = await sheetsService.readRows(config, cfg.id, cfg.tab, 'A:D');
  } catch (e) {
    logger.warn({ msg: 'process_log_read_failed', error: String(e.message || e) });
    return { total: 0, items: [] };
  }
  // Real entries: message id present, not the header, not the template note,
  // and message ids never contain spaces.
  const body = rows.filter(
    (r) => r && r[0] && r[0] !== 'Message ID' && !/\s/.test(r[0])
  );
  const items = body
    .map((r) => ({ message_id: r[0] || '', ts: r[1] || '', subject: r[2] || '', from: r[3] || '' }))
    .reverse()
    .slice(0, limit);
  return { total: body.length, items };
}

module.exports = { isProcessed, recordProcessed, getProcessLog };
