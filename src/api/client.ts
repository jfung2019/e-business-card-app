import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config/apiConfig';
import { getAccessToken } from './authToken';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}`;
      try {
        const errorBody = (await response.json()) as { detail?: string };
        if (errorBody.detail) {
          detail = errorBody.detail;
        }
      } catch {
        // Response body is not JSON; keep generic message.
      }
      throw new ApiClientError(detail, response.status);
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Request timed out. Check your network and try again.');
    }
    throw new ApiClientError('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}
