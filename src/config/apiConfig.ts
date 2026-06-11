import { Platform } from 'react-native';

/**
 * Android emulator cannot reach host "localhost" — use 10.0.2.2.
 * iOS simulator can use localhost.
 * Physical device: replace with your PC's LAN IP, e.g. http://192.168.1.10:8000
 */
const DEV_API_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = DEV_API_HOST;
export const API_V1_PREFIX = '/api/v1';
export const REQUEST_TIMEOUT_MS = 45_000;
