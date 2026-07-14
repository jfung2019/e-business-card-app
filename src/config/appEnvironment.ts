import { NativeModules } from 'react-native';

export type AppEnvironment = 'prod' | 'dev';

/**
 * Native build environment from the install flavor / Xcode scheme.
 * Android: Gradle flavor (`prod` | `dev`).
 * iOS: EBusinessCard-Dev (Debug) | EBusinessCard-Prod (ProdDebug) | Release.
 */
export function getAppEnvironment(): AppEnvironment {
  const env = NativeModules.AppEnvironment?.appEnvironment;
  if (env === 'prod' || env === 'dev') {
    return env;
  }

  return __DEV__ ? 'dev' : 'prod';
}

/** In-app title — dev install vs prod install (not API target). */
export const APP_DISPLAY_NAME =
  getAppEnvironment() === 'dev' ? 'AI Business Cards Dev' : 'AI Business Cards';
