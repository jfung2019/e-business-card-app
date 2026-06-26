import { ApiClientError } from '../api/client';

export function scanUploadErrorMessage(error: unknown): string | null {
  const isTooLarge =
    (error instanceof ApiClientError && error.statusCode === 413) ||
    (error instanceof Error &&
      (error.message.toLowerCase().includes('status 413') ||
        error.message.toLowerCase().includes('entity too large') ||
        error.message.toLowerCase().includes('scan image must be 10 mb')));

  if (isTooLarge) {
    return 'Scan images are too large to upload. Try again in a moment, or scan front only.';
  }

  return null;
}
