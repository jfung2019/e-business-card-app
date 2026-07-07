import { API_BASE_URL } from '../config/apiConfig';
import { ApiClientError } from '../api/client';

const ONLINE_PROBE_TIMEOUT_MS = 4_000;

export async function isDeviceOnline(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ONLINE_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(API_BASE_URL, {
      method: 'HEAD',
      signal: controller.signal,
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof ApiClientError && error.statusCode) {
    return false;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      error.name === 'AbortError' ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('timed out')
    );
  }
  return false;
}
