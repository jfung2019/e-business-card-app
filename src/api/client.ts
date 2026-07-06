import { API_BASE_URL, API_FIREBASE_MISMATCH_MESSAGE, isApiFirebaseEnvironmentAligned, REQUEST_TIMEOUT_MS } from '../config/apiConfig';
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

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function apiRequest<TResponse>(
  path: string,
  options: { method: ApiMethod; body?: unknown },
): Promise<TResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
      if (response.status === 401) {
        detail = isApiFirebaseEnvironmentAligned()
          ? 'Authentication failed. The API server may be configured with the wrong Firebase credentials.'
          : API_FIREBASE_MISMATCH_MESSAGE;
      }
      throw new ApiClientError(detail, response.status);
    }

    if (response.status === 204) {
      return undefined as TResponse;
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

export async function apiGet<TResponse>(path: string): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'GET' });
}

export async function apiPost<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'POST', body });
}

export async function apiPut<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'PUT', body });
}

export async function apiPatch<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  return apiRequest<TResponse>(path, { method: 'PATCH', body });
}

export async function apiDelete(path: string): Promise<void> {
  await apiRequest<void>(path, { method: 'DELETE' });
}
