// Express server: health + readiness endpoints (Platform Contract #2)
// plus the dashboard (static UI + API routes).
// Health/readiness MUST return immediately - no blocking calls.

const express = require('express');
const path = require('path');
const logger = require('./logger');
const { buildRouter } = require('./routes/dashboard');

const state = { ready: false };

function startServer(config) {
  const app = express();
  const version = require('../package.json').version;
  const name = (config.agent && config.agent.name) || 'Quotation Agent';

  app.use(express.json());

  // Health / readiness
  app.get('/health', (req, res) => res.json({ status: 'ok', agent: name, version }));
  app.get('/ready', (req, res) => {
    if (state.ready) return res.json({ status: 'ready', agent: name });
    return res.status(503).json({ status: 'starting', agent: name });
  });

  // Dashboard (auth + API) — only if enabled
  if (config.dashboard && config.dashboard.enabled) {
    app.use('/', buildRouter());
    app.use('/', express.static(path.resolve(__dirname, '..', 'ui')));
    logger.info({ msg: 'dashboard_mounted' });
  }

  const port = config.env.PORT;
  app.listen(port, () => logger.info({ msg: 'server_started', port, agent: name, version }));

  return { markReady: () => { state.ready = true; } };
}

module.exports = { startServer };
