// SKILL.md loader with 4 mandatory features:
// 1) load local  2) load from Drive  3) load references  4) cache with TTL

const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { downloadFromDrive } = require('./services/drive');

let _cachedPrompt = null;
let _cacheTime = 0;

async function loadSkill(config) {
  const skillConfig = config.skill || {};
  const reloadInterval = (skillConfig.reload_interval_minutes || 5) * 60 * 1000;

  // 1. Cache TTL
  if (_cachedPrompt && Date.now() - _cacheTime < reloadInterval) {
    return _cachedPrompt;
  }

  // 2. Load from source
  let skillText = '';
  const source = skillConfig.source || 'local';
  if (source === 'drive') {
    skillText = await downloadFromDrive(config, skillConfig.drive_file_id);
  } else {
    const localPath = path.resolve(__dirname, '..', skillConfig.local_path || 'skill/SKILL.md');
    skillText = fs.readFileSync(localPath, 'utf8');
  }

  // 3. Load references
  let references = '';
  const refDir = path.resolve(__dirname, '..', skillConfig.references_path || 'skill/references');
  if (fs.existsSync(refDir)) {
    const files = fs.readdirSync(refDir).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      references += '\n\n' + fs.readFileSync(path.join(refDir, f), 'utf8');
    }
  }

  // 4. Cache and return
  _cachedPrompt = skillText + references;
  _cacheTime = Date.now();
  logger.info({ msg: 'skill_loaded', source, ref_included: references.length > 0 });
  return _cachedPrompt;
}

module.exports = { loadSkill };
