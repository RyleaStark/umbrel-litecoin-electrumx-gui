/* Minimal privacy-preserving logger for the local Umbrel GUI.
 *
 * Do not persist request paths, RPC responses, wallet-related values, or error
 * payloads. Operational errors are emitted without attached data so Docker's
 * bounded logging remains the only log sink.
 */

function label(moduleName, message) {
  return `[${moduleName || 'electrumx-ltc'}] ${String(message || '')}`;
}

function error(message, moduleName) {
  console.error(label(moduleName, message));
}

function warn(message, moduleName) {
  console.warn(label(moduleName, message));
}

function info() {
  // Deliberately suppress per-request and routine API logs.
}

function debug() {
  // Deliberately disabled in production.
}

const morganConfiguration = {
  stream: {
    write() {
      // Do not log request paths or query strings.
    },
  },
};

module.exports = {
  error,
  warn,
  info,
  debug,
  morganConfiguration,
};
