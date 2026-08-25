// Scheduler (Trigger layer): Gmail polling loop.
// Order is safety-critical: mark-as-read BEFORE process (BP4/G5),
// dedup check BEFORE process (BP2), record processed AFTER success.

const gmailService = require('./services/gmail');
const dedupRepo = require('./repositories/dedupRepo');
const { processEmail } = require('./orchestrator');
const { SendGate } = require('./send-gate');
const logger = require('./logger');

// Runtime stats surfaced to the dashboard.
const stats = {
  startedAt: Date.now(),
  lastCycleAt: null,
  lastMatched: 0,
  totalProcessed: 0,
  totalErrors: 0,
  running: false,
};

async function runCycle(config) {
  if (stats.running) {
    logger.warn({ msg: 'cycle_skipped_already_running' });
    return { skipped: true };
  }
  stats.running = true;
  const gmailCfg = config.tools.gmail;
  const query = gmailCfg.scan_query;
  const monitored = (gmailCfg.monitored_mailbox || '').toLowerCase();
  const sendGate = new SendGate(gmailCfg.send_gate.max_per_cycle || 2);
  let processedThisCycle = 0;

  try {
    const stubs = await gmailService.fetchUnread(config, query);
    stats.lastMatched = stubs.length;
    logger.info({ msg: 'cycle_start', matched: stubs.length });

    for (const stub of stubs) {
      try {
        if (gmailCfg.mark_as_read_before_processing) {
          await gmailService.markAsRead(config, stub.id);
        }
        if (await dedupRepo.isProcessed(config, stub.id)) {
          logger.info({ msg: 'skip_duplicate', message_id: stub.id });
          continue;
        }
        const email = await gmailService.getMessage(config, stub.id);
        // Guard: never process mail the agent itself sent (avoids reply loops).
        if (monitored && gmailService.extractEmail(email.from).toLowerCase() === monitored) {
          logger.info({ msg: 'skip_self_sent', message_id: email.id });
          continue;
        }
        logger.info({ msg: 'processing_email', message_id: email.id, subject: email.subject });
        await processEmail(email, config, sendGate);
        await dedupRepo.recordProcessed(config, email.id, { subject: email.subject, from: email.from });
        stats.totalProcessed += 1;
        processedThisCycle += 1;
      } catch (e) {
        stats.totalErrors += 1;
        logger.error({ msg: 'process_error', message_id: stub.id, error: String(e.message || e) });
      }
    }
    logger.info({ msg: 'cycle_end', processed: processedThisCycle });
    return { matched: stubs.length, processed: processedThisCycle };
  } finally {
    stats.lastCycleAt = Date.now();
    stats.running = false;
  }
}

// On-demand scan (dashboard "scan now"). Guards against overlap via runCycle.
async function triggerScan(config) {
  return runCycle(config);
}

function getStats() {
  return { ...stats };
}

function startScheduler(config) {
  const intervalMs = (config.tools.gmail.check_frequency_minutes || 5) * 60 * 1000;
  const tick = async () => {
    try {
      await runCycle(config);
    } catch (e) {
      logger.error({ msg: 'cycle_error', error: String(e.message || e) });
    }
  };
  setTimeout(tick, 3000);
  setInterval(tick, intervalMs);
  logger.info({ msg: 'scheduler_started', interval_minutes: intervalMs / 60000 });
}

module.exports = { startScheduler, runCycle, triggerScan, getStats };
