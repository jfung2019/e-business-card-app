import { Platform } from 'react-native';

/**
 * API host selection. Prod is the default for debug and release builds
 * (emulator, simulator, and physical devices).
 *
 * Set USE_PROD_API = false only when testing against a local API on your machine.
 */
const USE_PROD_API = true;

const PROD_API_BASE_URL = 'https://focms.megaannum.ai:8001';
const PROD_SHARE_PUBLIC_BASE_URL = 'https://focms.megaannum.ai:8001/c';

const DEV_API_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

const useProdApi = USE_PROD_API || !__DEV__;

export const API_BASE_URL = useProdApi ? PROD_API_BASE_URL : DEV_API_HOST;
/** Short public path for QR / deep links: `{base}/{token}` → `/c/{token}` on the API host */
export const SHARE_PUBLIC_BASE_URL = useProdApi
  ? PROD_SHARE_PUBLIC_BASE_URL
  : `${DEV_API_HOST}/c`;
export const API_V1_PREFIX = '/api/v1';
export const REQUEST_TIMEOUT_MS = 15_000;
