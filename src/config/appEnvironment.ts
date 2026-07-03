import { NativeModules, Platform } from 'react-native';

export type AppEnvironment = 'prod' | 'dev';

/**
 * Native build environment: prod release vs dev debug builds.
 * Android: Gradle flavor (`prod` | `dev`).
 * iOS: Release = prod, Debug = dev (bundle id `.dev`).
 */
export function getAppEnvironment(): AppEnvironment {
  if (Platform.OS === 'android') {
    const env = NativeModules.AppEnvironment?.appEnvironment;
    if (env === 'prod' || env === 'dev') {
      return env;
    }
  }

  return __DEV__ ? 'dev' : 'prod';
}
