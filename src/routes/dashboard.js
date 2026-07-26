// Dashboard routes (Trigger/Routes layer): auth + read/control endpoints.
// Route handlers stay thin — data comes from repositories, control from the
// scheduler. No business logic or direct API calls here.

const express = require('express');
const { loadConfig } = require('../config');
const auth = require('../services/dashboard-auth');
const quotationRepo = require('../repositories/quotationRepo');
const dedupRepo = require('../repositories/dedupRepo');
const scheduler = require('../scheduler');
const logger = require('../logger');

function buildRouter() {
  const config = loadConfig();
  const router = express.Router();
  const guard = auth.requireAuth(config);

  // ---- Auth ----
  router.get('/auth/google', (req, res) => {
    try {
      res.redirect(auth.authUrl(config));
    } catch (e) {
      logger.error({ msg: 'auth_url_failed', error: String(e.message || e) });
      res.redirect('/?error=config');
    }
  });

  router.get('/auth/google/callback', async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) return res.redirect('/?error=nocode');
      const user = await auth.verifyGoogleCallback(config, code);
      if (!user) return res.redirect('/?error=denied');
      res.setHeader('Set-Cookie', auth.issueCookie(config, user));
      logger.info({ msg: 'dashboard_login', email: user.email });
      res.redirect('/');
    } catch (e) {
      logger.error({ msg: 'auth_callback_failed', error: String(e.message || e) });
      res.redirect('/?error=auth');
    }
  });

  router.post('/api/logout', (req, res) => {
    res.setHeader('Set-Cookie', auth.clearCookie());
    res.json({ ok: true });
  });

  router.get('/api/me', guard, (req, res) => res.json({ user: req.user }));

  // ---- Read ----
  router.get('/api/status', guard, (req, res) => {
    const gmail = config.tools.gmail;
    res.json({
      agent: config.agent.name,
      monitored_mailbox: gmail.monitored_mailbox,
      scan_query: gmail.scan_query,
      check_frequency_minutes: gmail.check_frequency_minutes,
      test_mode: !!(config.test_mode && config.test_mode.enabled),
      sheets_dry_run: !!(config.test_mode && config.test_mode.sheets && config.test_mode.sheets.dry_run),
      stats: scheduler.getStats(),
    });
  });

  router.get('/api/quotations', guard, async (req, res) => {
    try {
      const items = await quotationRepo.listQuotations(config);
      res.json({ items });
    } catch (e) {
      logger.error({ msg: 'list_quotations_failed', error: String(e.message || e) });
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  router.get('/api/process-log', guard, async (req, res) => {
    try {
      const data = await dedupRepo.getProcessLog(config);
      res.json(data);
    } catch (e) {
      logger.error({ msg: 'process_log_failed', error: String(e.message || e) });
      res.status(500).json({ error: String(e.message || e) });
    }
  });

  // ---- Control ----
  router.post('/api/test-mode', guard, (req, res) => {
    const enabled = !!(req.body && req.body.enabled);
    if (!config.test_mode) config.test_mode = {};
    config.test_mode.enabled = enabled; // runtime toggle (resets to config.yaml on restart)
    logger.warn({ msg: 'test_mode_toggled', enabled, by: req.user.email });
    res.json({ ok: true, test_mode: enabled });
  });

  router.post('/api/scan-now', guard, async (req, res) => {
    logger.info({ msg: 'manual_scan', by: req.user.email });
    const result = await scheduler.triggerScan(config);
    res.json({ ok: true, result });
  });

  return router;
}

module.exports = { buildRouter };
