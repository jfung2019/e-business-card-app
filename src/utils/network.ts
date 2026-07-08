import { API_BASE_URL } from '../config/apiConfig';
import { ApiClientError } from '../api/client';

const ONLINE_PROBE_TIMEOUT_MS = 2_000;

const NETWORK_MESSAGE_PATTERNS = [
  'network',
  'failed to fetch',
  'network request failed',
  'timed out',
  'timeout',
  'unable to resolve host',
  'connection refused',
  'connection aborted',
  'connection reset',
  'econnrefused',
  'enotfound',
  'socket',
  'internet connection',
  'offline',
];

/**
 * True when the API health endpoint responds (not merely when the radio is on).
 */
export async function isDeviceOnline(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ONLINE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'text/html' },
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

function messageLooksLikeNetworkFailure(message: string): boolean {
  const lower = message.toLowerCase();
  return NETWORK_MESSAGE_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Whether a failed online scan should fall back to the local offline queue.
 */
export function shouldFallbackToOfflineScan(error: unknown): boolean {
  if (error instanceof ApiClientError) {
    const status = error.statusCode;
    if (status === 401 || status === 403 || status === 413 || status === 422) {
      return false;
    }
    if (status === 408 || status === 502 || status === 503 || status === 504) {
      return true;
    }
    if (status === undefined || status === 0) {
      return true;
    }
    return messageLooksLikeNetworkFailure(error.message);
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || messageLooksLikeNetworkFailure(error.message);
  }

  return false;
}

/** @deprecated Use shouldFallbackToOfflineScan */
export function isLikelyNetworkError(error: unknown): boolean {
  return shouldFallbackToOfflineScan(error);
}
