'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  MAX_KEYWORDS,
  validatePublishPrerequisites,
  validateReleaseVersion,
  shouldPublishPreRelease,
} = require('../lib/publishCicd');

const repoRoot = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

test('repository meets Marketplace publish prerequisites', () => {
  const errors = validatePublishPrerequisites(pkg, fs, repoRoot);
  assert.deepEqual(errors, [], errors.join('\n'));
});

test('keywords stay within Marketplace limit', () => {
  assert.ok((pkg.keywords ?? []).length <= MAX_KEYWORDS);
});

test('validateReleaseVersion accepts matching tag and package version', () => {
  assert.equal(validateReleaseVersion('0.0.3', '0.0.3'), null);
});

test('validateReleaseVersion rejects mismatched versions', () => {
  assert.match(
    validateReleaseVersion('0.0.4', '0.0.3'),
    /does not match/
  );
});

test('shouldPublishPreRelease when package.json preview is true', () => {
  assert.equal(shouldPublishPreRelease('v0.0.3', true), true);
});

test('shouldPublishPreRelease for prerelease tags', () => {
  assert.equal(shouldPublishPreRelease('v0.0.4-pre.1', false), true);
});

test('shouldPublishPreRelease for stable release', () => {
  assert.equal(shouldPublishPreRelease('v0.0.4', false), false);
});
