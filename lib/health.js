'use strict';

const { checkInstall, runCli } = require('./cli');

/**
 * @returns {Promise<{ installed: boolean, version: string|null, authConfigured: boolean|null, ready: boolean, message: string }>}
 */
async function checkHealth() {
  const version = await checkInstall();
  if (!version) {
    return {
      installed: false,
      version: null,
      authConfigured: null,
      ready: false,
      message: 'OpenCode CLI is not installed',
    };
  }

  let authConfigured = null;
  try {
    const { stdout } = await runCli('auth ls 2>/dev/null');
    authConfigured = stdout.trim().length > 0 && !/no providers/i.test(stdout) && !/^error:/im.test(stdout);
  } catch {
    authConfigured = null;
  }

  const ready = authConfigured !== false;
  let message = `OpenCode ${version}`;
  if (authConfigured === false) {
    message += ' — no providers configured';
  } else if (authConfigured === true) {
    message += ' — ready';
  }

  return {
    installed: true,
    version,
    authConfigured,
    ready,
    message,
  };
}

module.exports = { checkHealth };
