import { useCallback } from 'react';

import {
  enhanceCard,
  retryCardScanEnhancement,
  saveOfflineDraft,
} from '../api/cards';
import { processUserCard, updateUserCard, updateUserCardWalletDisplay } from '../api/userCards';
import {
  listQueuedScans,
  removeQueuedScan,
  updateQueuedScan,
} from '../services/offlineCardQueue';
import {
  listQueuedUserScans,
  removeQueuedUserScan,
  updateQueuedUserScan,
} from '../services/offlineUserCardQueue';
import {
  notifyOfflineSyncComplete,
  type OfflineScanReviewCandidate,
  type OfflineSyncResult,
} from '../services/offlineSyncCoordinator';
import { isDeviceOnline } from '../utils/network';
import { buildUserCardPatchFromQueueEdits } from '../utils/mergeQueuedUserCardEdits';
import { shouldOpenScanImageReview } from '../utils/scanImageReview';

function asReviewCandidate(
  candidate: OfflineScanReviewCandidate,
): OfflineScanReviewCandidate | null {
  if (!shouldOpenScanImageReview(candidate.card.scan_image_enhancement_status, false)) {
    return null;
  }
  return candidate;
}

export async function runOfflineCardSync(): Promise<{
  syncedCount: number;
  reviewCandidates: OfflineScanReviewCandidate[];
}> {
  const online = await isDeviceOnline();
  if (!online) {
    return { syncedCount: 0, reviewCandidates: [] };
  }

  const queue = await listQueuedScans();
  const pending = queue.filter(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );
  let syncedCount = 0;
  const reviewCandidates: OfflineScanReviewCandidate[] = [];

  for (const item of pending) {
    await updateQueuedScan(item.localId, { syncStatus: 'uploading', lastError: undefined });
    try {
      let serverCardId = item.serverCardId;
      if (!serverCardId) {
        const saved = await saveOfflineDraft(
          item.rawOcrText,
          item.core_fields,
          item.custom_fields,
          item.imageBase64,
          item.backImageBase64,
          item.editedFields,
        );
        serverCardId = saved._id;
        await updateQueuedScan(item.localId, { serverCardId });
      }

      await enhanceCard(serverCardId);

      // Image AI is separate from field enhancement for offline drafts.
      let cardForReview = await retryCardScanEnhancement(serverCardId);
      const review = asReviewCandidate({ kind: 'captured', card: cardForReview });
      if (review) {
        reviewCandidates.push(review);
      }

      await removeQueuedScan(item.localId);
      syncedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync offline card.';
      await updateQueuedScan(item.localId, { syncStatus: 'failed', lastError: message });
    }
  }

  return { syncedCount, reviewCandidates };
}

export async function runOfflineUserCardSync(): Promise<{
  syncedCount: number;
  reviewCandidates: OfflineScanReviewCandidate[];
}> {
  const online = await isDeviceOnline();
  if (!online) {
    return { syncedCount: 0, reviewCandidates: [] };
  }

  const queue = await listQueuedUserScans();
  const pending = queue.filter(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );
  let syncedCount = 0;
  const reviewCandidates: OfflineScanReviewCandidate[] = [];

  for (const item of pending) {
    await updateQueuedUserScan(item.localId, { syncStatus: 'uploading', lastError: undefined });
    try {
      let created = await processUserCard(item.rawOcrText, item.imageBase64, {
        backImageBase64: item.backImageBase64,
        designId: item.designId,
        isPrimary: item.isPrimary,
        enhanceScanImage: true,
      });

      const patch = buildUserCardPatchFromQueueEdits(created, item);
      if (Object.keys(patch).length > 0) {
        created = await updateUserCard(created._id, patch);
      }

      if (item.wallet_display && item.wallet_display !== created.wallet_display) {
        created = await updateUserCardWalletDisplay(created._id, {
          walletDisplay: item.wallet_display,
        });
      }
      if (item.photo_face && item.photo_face !== created.photo_face) {
        created = await updateUserCardWalletDisplay(created._id, {
          photoFace: item.photo_face,
        });
      }

      const review = asReviewCandidate({ kind: 'user', card: created });
      if (review) {
        reviewCandidates.push(review);
      }

      await removeQueuedUserScan(item.localId);
      syncedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync offline user card.';
      await updateQueuedUserScan(item.localId, { syncStatus: 'failed', lastError: message });
    }
  }

  return { syncedCount, reviewCandidates };
}

export async function runAllOfflineSync(): Promise<OfflineSyncResult> {
  const collected = await runOfflineCardSync();
  const userCards = await runOfflineUserCardSync();
  const result: OfflineSyncResult = {
    syncedCount: collected.syncedCount + userCards.syncedCount,
    reviewCandidates: [...collected.reviewCandidates, ...userCards.reviewCandidates],
  };

  if (result.syncedCount > 0) {
    notifyOfflineSyncComplete(result);
  }

  return result;
}

export function useOfflineCardSync() {
  const syncQueuedScans = useCallback(async (): Promise<number> => {
    const result = await runAllOfflineSync();
    return result.syncedCount;
  }, []);

  return { syncQueuedScans };
}
