'use strict';

const path = require('path');

const REQUIRED_WORKFLOWS = [
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/workflows/pull-request.yml',
];

const REQUIRED_MARKETPLACE_FILES = [
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'package.json',
  'media/opencode-icon.png',
];

const MAX_KEYWORDS = 30;

/**
 * @param {object} pkg
 * @param {object} fs
 * @param {string} root
 * @returns {string[]}
 */
function validatePublishPrerequisites(pkg, fs, root) {
  const errors = [];

  if (!pkg.publisher) {
    errors.push('package.json must define publisher (Marketplace publisher id)');
  }
  if (!pkg.engines?.vscode) {
    errors.push('package.json must define engines.vscode');
  }
  if (!pkg.version || !/^\d+\.\d+\.\d+/.test(pkg.version)) {
    errors.push('package.json version must be semver major.minor.patch');
  }
  if (pkg.icon && /\.svg$/i.test(pkg.icon)) {
    errors.push('Marketplace icon must be PNG, not SVG (see vsce publishing constraints)');
  }

  const keywords = pkg.keywords ?? [];
  if (keywords.length > MAX_KEYWORDS) {
    errors.push(`package.json keywords must not exceed ${MAX_KEYWORDS} (Marketplace limit)`);
  }

  for (const relativePath of REQUIRED_MARKETPLACE_FILES) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      errors.push(`Missing file required for Marketplace: ${relativePath}`);
    }
  }

  for (const relativePath of REQUIRED_WORKFLOWS) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      errors.push(`Missing CI/CD workflow: ${relativePath}`);
    }
  }

  if (!pkg.scripts?.['vscode:prepublish']) {
    errors.push('package.json must define scripts.vscode:prepublish (vsce pre-publish hook)');
  }

  return errors;
}

/**
 * @param {string} tagVersion e.g. 0.0.3 from v0.0.3
 * @param {string} packageVersion from package.json
 */
function validateReleaseVersion(tagVersion, packageVersion) {
  if (tagVersion !== packageVersion) {
    return `Tag version (${tagVersion}) does not match package.json (${packageVersion})`;
  }
  return null;
}

/**
 * @param {string} refName e.g. v0.0.4-pre.1
 * @param {boolean} [preview]
 */
function shouldPublishPreRelease(refName, preview = false) {
  return preview === true || refName.includes('-');
}

module.exports = {
  REQUIRED_WORKFLOWS,
  REQUIRED_MARKETPLACE_FILES,
  MAX_KEYWORDS,
  validatePublishPrerequisites,
  validateReleaseVersion,
  shouldPublishPreRelease,
};
