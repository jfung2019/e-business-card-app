import { Platform } from 'react-native';

/**
 * Dev: emulator/simulator or LAN IP for a physical device on the same Wi‑Fi.
 * Release: same subdomain as CMS, different port (no extra DNS record).
 *
 * Set USE_PROD_API = true to hit the deployed server from debug builds (emulator).
 * Set false to use local API (10.0.2.2 / localhost).
 */
const USE_PROD_API = false;

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
