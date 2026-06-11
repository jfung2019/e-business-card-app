const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Resolve subst/junction paths to the real folder so Metro's file watcher stays consistent.
const projectRoot = fs.realpathSync.native(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  projectRoot,
  watchFolders: [projectRoot],
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
