import type { ScanImageEnhancementStatus } from '../types/card';

export function shouldOpenScanImageReview(
  status: ScanImageEnhancementStatus | undefined,
  isOfflineDraft: boolean,
): boolean {
  return !isOfflineDraft && (status === 'preview_ready' || status === 'failed');
}
