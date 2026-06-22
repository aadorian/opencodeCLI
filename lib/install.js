'use strict';

const OPENCODE_DOCS_URL = 'https://opencode.ai/docs';
const OPENCODE_HOME_URL = 'https://opencode.ai';
const INSTALL_SCRIPT = 'curl -fsSL https://opencode.ai/install | bash';
const NPM_INSTALL = 'npm install -g opencode-ai';

function getInstallTerminalCommand() {
  if (process.platform === 'win32') {
    return NPM_INSTALL;
  }
  return INSTALL_SCRIPT;
}

function getInstallHelpText() {
  if (process.platform === 'win32') {
    return `npm install -g opencode-ai\nOr visit: ${OPENCODE_DOCS_URL}`;
  }
  return `${INSTALL_SCRIPT}\nOr visit: ${OPENCODE_DOCS_URL}`;
}

async function promptInstallIfMissing(vscode, { checkInstall, sendToTerminal, executeCommand }) {
  const version = await checkInstall();
  if (version) {
    return true;
  }

  const help = getInstallHelpText().replace(/\n/g, '" && echo "  ');
  sendToTerminal(`echo "OpenCode is not installed. Install it with:" && echo "  ${help}"`);

  const action = await vscode.window.showWarningMessage(
    'OpenCode is not installed. Install it from opencode.ai.',
    'Open Docs',
    'Install'
  );
  if (action === 'Open Docs') {
    vscode.env.openExternal(vscode.Uri.parse(OPENCODE_DOCS_URL));
  } else if (action === 'Install') {
    await executeCommand('opencode-walkthrough.install');
  }
  return false;
}

module.exports = {
  OPENCODE_DOCS_URL,
  OPENCODE_HOME_URL,
  INSTALL_SCRIPT,
  NPM_INSTALL,
  getInstallTerminalCommand,
  getInstallHelpText,
  promptInstallIfMissing,
};
