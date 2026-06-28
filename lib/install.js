'use strict';

const OPENCODE_DOCS_URL = 'https://opencode.ai/docs';
const OPENCODE_HOME_URL = 'https://opencode.ai';
const INSTALL_SCRIPT = 'curl -fsSL https://opencode.ai/install | bash';
const NPM_INSTALL = 'npm install -g opencode-ai';
const HOMEBREW_INSTALL = 'brew install opencode';

function getInstallTerminalCommand() {
  if (process.platform === 'win32') {
    return NPM_INSTALL;
  }
  return INSTALL_SCRIPT;
}

function getInstallOptions() {
  if (process.platform === 'win32') {
    return [
      { label: 'npm (Recommended)', command: NPM_INSTALL, description: NPM_INSTALL },
    ];
  }
  if (process.platform === 'darwin') {
    return [
      { label: 'Install script (Recommended)', command: INSTALL_SCRIPT, description: INSTALL_SCRIPT },
      { label: 'Homebrew', command: HOMEBREW_INSTALL, description: HOMEBREW_INSTALL },
      { label: 'npm', command: NPM_INSTALL, description: NPM_INSTALL },
    ];
  }
  return [
    { label: 'Install script (Recommended)', command: INSTALL_SCRIPT, description: INSTALL_SCRIPT },
    { label: 'npm', command: NPM_INSTALL, description: NPM_INSTALL },
  ];
}

function getInstallHelpText() {
  if (process.platform === 'win32') {
    return `${NPM_INSTALL}\nOr visit: ${OPENCODE_DOCS_URL}`;
  }
  return `${INSTALL_SCRIPT}\nOr via npm: ${NPM_INSTALL}\nOr visit: ${OPENCODE_DOCS_URL}`;
}

function getMissingInstallTerminalCommand() {
  if (process.platform === 'win32') {
    return 'Write-Host "OpenCode is not installed. Install it with:"; Write-Host "  npm install -g opencode-ai"';
  }
  return `echo "OpenCode is not installed. Install it with:" && echo "  ${INSTALL_SCRIPT}"`;
}

async function promptInstallIfMissing(vscode, { checkInstall, sendToTerminal, executeCommand }) {
  const version = await checkInstall();
  if (version) {
    return true;
  }

  sendToTerminal(getMissingInstallTerminalCommand());

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
  HOMEBREW_INSTALL,
  getInstallTerminalCommand,
  getInstallOptions,
  getInstallHelpText,
  getMissingInstallTerminalCommand,
  promptInstallIfMissing,
};
