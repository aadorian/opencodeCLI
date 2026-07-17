'use strict';

const assert = require('assert');
const { shouldShowStatusBarItems } = require('../lib/statusBar');

suite('Status bar visibility', () => {
  test('hides items when CLI is not installed', () => {
    assert.equal(shouldShowStatusBarItems(true, false), false);
  });

  test('hides items when setting is disabled', () => {
    assert.equal(shouldShowStatusBarItems(false, true), false);
    assert.equal(shouldShowStatusBarItems(false, false), false);
  });

  test('shows items when setting is enabled and CLI is installed', () => {
    assert.equal(shouldShowStatusBarItems(true, true), true);
  });
});
