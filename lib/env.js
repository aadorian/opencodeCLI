'use strict';

const ENV_MAP = {
  'opencode.configPath': 'OPENCODE_CONFIG',
  'opencode.configDir': 'OPENCODE_CONFIG_DIR',
  'opencode.tuiConfigPath': 'OPENCODE_TUI_CONFIG',
  'opencode.autoShare': 'OPENCODE_AUTO_SHARE',
  'opencode.modelsUrl': 'OPENCODE_MODELS_URL',
  'opencode.serverPassword': 'OPENCODE_SERVER_PASSWORD',
  'opencode.serverUsername': 'OPENCODE_SERVER_USERNAME',
  'opencode.disableAutoUpdate': 'OPENCODE_DISABLE_AUTOUPDATE',
  'opencode.disablePrune': 'OPENCODE_DISABLE_PRUNE',
  'opencode.disableTerminalTitle': 'OPENCODE_DISABLE_TERMINAL_TITLE',
  'opencode.disableDefaultPlugins': 'OPENCODE_DISABLE_DEFAULT_PLUGINS',
  'opencode.disableLspDownload': 'OPENCODE_DISABLE_LSP_DOWNLOAD',
  'opencode.disableAutoCompact': 'OPENCODE_DISABLE_AUTOCOMPACT',
  'opencode.disableClaudeCode': 'OPENCODE_DISABLE_CLAUDE_CODE',
  'opencode.disableModelsFetch': 'OPENCODE_DISABLE_MODELS_FETCH',
  'opencode.disableMouse': 'OPENCODE_DISABLE_MOUSE',
  'opcode.enableExa': 'OPENCODE_ENABLE_EXA',
  'opencode.experimental': 'OPENCODE_EXPERIMENTAL',
  'opencode.experimental.planMode': 'OPENCODE_EXPERIMENTAL_PLAN_MODE',
  'opencode.experimental.backgroundSubagents': 'OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS',
  'opencode.experimental.nativeLlm': 'OPENCODE_EXPERIMENTAL_NATIVE_LLM',
  'opencode.experimental.scout': 'OPENCODE_EXPERIMENTAL_SCOUT',
  'opencode.experimental.workspaces': 'OPENCODE_EXPERIMENTAL_WORKSPACES',
};

function buildEnvObject(getConfig) {
  const config = getConfig();
  const env = { ...process.env };
  for (const [key, envVar] of Object.entries(ENV_MAP)) {
    const value = config.get(key);
    if (value !== undefined && value !== null && value !== '') {
      env[envVar] = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
    }
  }
  return env;
}

function buildEnvExports(getConfig) {
  const config = getConfig();
  const exports = [];
  for (const [key, envVar] of Object.entries(ENV_MAP)) {
    const value = config.get(key);
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'boolean') {
        exports.push(`export ${envVar}=${value ? 'true' : 'false'}`);
      } else {
        exports.push(`export ${envVar}="${value}"`);
      }
    }
  }
  return exports;
}

module.exports = { ENV_MAP, buildEnvObject, buildEnvExports };
