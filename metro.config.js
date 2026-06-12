const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

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
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      // Prefer compiled output — avoids Windows Metro issues resolving Reanimated src/.
      if (moduleName === 'react-native-reanimated') {
        return {
          filePath: path.resolve(
            projectRoot,
            'node_modules/react-native-reanimated/lib/module/index.js',
          ),
          type: 'sourceFile',
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = wrapWithReanimatedMetroConfig(
  mergeConfig(getDefaultConfig(projectRoot), config),
);
