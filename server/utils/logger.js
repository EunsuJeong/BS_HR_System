/**
 * Minimal structured logger for PM2
 * Outputs single-line JSON with level, message, timestamp, and optional metadata.
 */
function serialize(level, message, meta = {}) {
  return JSON.stringify({
    level,
    message,
    ts: new Date().toISOString(),
    ...meta,
  });
}

function info(message, meta) {
  console.log(serialize('info', message, meta));
}

function warn(message, meta) {
  console.warn(serialize('warn', message, meta));
}

function error(message, meta) {
  // Keep stack or error details if provided
  console.error(serialize('error', message, meta));
}

module.exports = {
  info,
  warn,
  error,
};