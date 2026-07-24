// JSON structured logger to stdout (Platform Contract #4).
// Usage: logger.info({ msg: 'event', key: 'value' })

function emit(level, payload) {
  const record = {
    ts: new Date().toISOString(),
    level,
    ...(typeof payload === 'string' ? { msg: payload } : payload),
  };
  // Platform collects stdout -> searchable dashboard
  process.stdout.write(JSON.stringify(record) + '\n');
}

module.exports = {
  info: (p) => emit('info', p),
  warn: (p) => emit('warn', p),
  error: (p) => emit('error', p),
  debug: (p) => emit('debug', p),
};
