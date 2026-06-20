import { defineConfig } from '@vscode/test-cli';
import path from 'path';
import os from 'os';

export default defineConfig({
  files: 'test/**/*.test.js',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
  },
  launchArgs: [
    '--user-data-dir',
    path.join(os.tmpdir(), 'vscode-test-userdata'),
  ],
});
