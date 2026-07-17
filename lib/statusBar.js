'use strict';

function shouldShowStatusBarItems(showStatusBarSetting, cliInstalled) {
  return Boolean(showStatusBarSetting) && Boolean(cliInstalled);
}

module.exports = {
  shouldShowStatusBarItems,
};
