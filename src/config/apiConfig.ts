import { Platform } from 'react-native';

import { getAppEnvironment, type AppEnvironment } from './appEnvironment';

/**
 * API target for mobile builds.
 *
 * | Target   | Base URL                              | When to use                          |
 * |----------|---------------------------------------|--------------------------------------|
 * | `prod`   | https://ebc.megaannum.ai              | Production server (HTTPS 443)        |
 * | `dev`    | https://focms.megaannum.ai:8001       | Cloud dev server (CMS co-hosted)     |
 * | `local`  | http://10.0.2.2:8000 / localhost    | API running on your dev machine      |
 *
 * Release builds always use `prod`. Dev flavor debug builds default to `dev`.
 * Change `DEBUG_API_TARGET` only when testing local API on a dev build.
 * Swagger health check: {baseUrl}/docs (e.g. https://ebc.megaannum.ai/docs)
 */
export type ApiTarget = 'prod' | 'dev' | 'local';

/** Cloud dev vs local API when running a dev build (`__DEV__` + dev flavor). */
const DEBUG_API_TARGET: ApiTarget = 'dev';

const API_HOSTS: Record<Exclude<ApiTarget, 'local'>, { baseUrl: string; sharePublicBaseUrl: string }> =
  {
    prod: {
      baseUrl: 'https://ebc.megaannum.ai',
      sharePublicBaseUrl: 'https://ebc.megaannum.ai/c',
    },
    dev: {
      baseUrl: 'https://focms.megaannum.ai:8001',
      sharePublicBaseUrl: 'https://focms.megaannum.ai:8001/c',
    },
  };

export const API_TARGET_LABELS: Record<Exclude<ApiTarget, 'prod'>, string> = {
  dev: 'focms dev API',
  local: 'local API on your machine',
};

const DEV_API_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

function resolveApiTarget(): ApiTarget {
  if (!__DEV__) {
    return 'prod';
  }

  if (getAppEnvironment() === 'prod') {
    return 'prod';
  }

  return DEBUG_API_TARGET;
}

const activeTarget = resolveApiTarget();

/** Firebase project the active API expects (prod API ↔ prod Firebase). */
export function expectedFirebaseEnvironmentForApiTarget(
  apiTarget: ApiTarget = activeTarget,
): AppEnvironment {
  return apiTarget === 'prod' ? 'prod' : 'dev';
}

/** False when API host and bundled Firebase project do not match (e.g. dev app → prod API). */
export function isApiFirebaseEnvironmentAligned(
  apiTarget: ApiTarget = activeTarget,
): boolean {
  return getAppEnvironment() === expectedFirebaseEnvironmentForApiTarget(apiTarget);
}

export const API_FIREBASE_MISMATCH_MESSAGE =
  'This API target uses a different Firebase project than this app install. ' +
  'Use matching settings (dev app + dev API, or prod app + prod API) and sign in again.';

export const API_BASE_URL =
  activeTarget === 'local' ? DEV_API_HOST : API_HOSTS[activeTarget].baseUrl;

/** Short public path for QR / deep links: `{base}/{token}` → `/c/{token}` on the API host */
export const SHARE_PUBLIC_BASE_URL =
  activeTarget === 'local'
    ? `${DEV_API_HOST}/c`
    : API_HOSTS[activeTarget].sharePublicBaseUrl;

export const API_V1_PREFIX = '/api/v1';
export const REQUEST_TIMEOUT_MS = 15_000;

/** Active target (useful when logging connection issues in dev). */
export const ACTIVE_API_TARGET = activeTarget;

/** Native Firebase / bundle environment (`prod` release vs `dev` debug). */
export const APP_ENVIRONMENT = getAppEnvironment();
