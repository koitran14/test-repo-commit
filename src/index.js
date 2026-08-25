// Entry point: bootstrap the agent.
// 1) load config  2) start health server (immediately)  3) warm skill cache
// 4) start Gmail polling scheduler  5) mark ready

const { loadConfig } = require('./config');
const { startServer } = require('./server');
const { startScheduler } = require('./scheduler');
const { loadSkill } = require('./skill-loader');
const logger = require('./logger');

async function main() {
  const config = loadConfig();
  logger.info({ msg: 'agent_starting', agent: config.agent.name, version: require('../package.json').version });

  // Health endpoint must be up right away (Platform Contract #2)
  const { markReady } = startServer(config);

  // Warm the skill cache (non-blocking for health)
  try {
    await loadSkill(config);
  } catch (e) {
    logger.error({ msg: 'skill_load_failed', error: String(e.message || e) });
  }

  if (config.email_trigger && config.email_trigger.enabled) {
    startScheduler(config);
  }

  markReady();
  logger.info({ msg: 'agent_ready' });
}

main().catch((e) => {
  logger.error({ msg: 'fatal', error: String(e.stack || e.message || e) });
  process.exit(1);
});
