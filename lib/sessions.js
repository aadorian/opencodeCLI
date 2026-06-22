'use strict';

const { runCli } = require('./cli');

/**
 * @typedef {{ id: string, title?: string, model?: string, raw?: string }} SessionEntry
 */

/**
 * @param {string} stdout
 * @returns {SessionEntry[]}
 */
function parseSessionOutput(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const data = JSON.parse(trimmed);
    const list = Array.isArray(data) ? data : (data.sessions || []);
    return list.map(s => ({
      id: s.id || s.sessionId || '',
      title: s.title || s.name || 'Untitled',
      model: s.model || '',
    })).filter(s => s.id || s.title);
  } catch {
    return trimmed.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => ({ id: '', title: line, model: '', raw: line }));
  }
}

async function listSessions(options = {}) {
  try {
    const { stdout } = await runCli('session list --format json', options);
    return parseSessionOutput(stdout);
  } catch {
    try {
      const { stdout } = await runCli('session list', options);
      return parseSessionOutput(stdout);
    } catch {
      return [];
    }
  }
}

module.exports = { listSessions, parseSessionOutput };
