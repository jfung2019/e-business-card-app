import { useCallback } from 'react';

import { enhanceCard, saveOfflineDraft } from '../api/cards';
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
import { notifyOfflineSyncComplete } from '../services/offlineSyncCoordinator';
import { isDeviceOnline } from '../utils/network';
import { buildUserCardPatchFromQueueEdits } from '../utils/mergeQueuedUserCardEdits';

export async function runOfflineCardSync(): Promise<number> {
  const online = await isDeviceOnline();
  if (!online) {
    return 0;
  }

  const queue = await listQueuedScans();
  const pending = queue.filter(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );
  let syncedCount = 0;

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
      await removeQueuedScan(item.localId);
      syncedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync offline card.';
      await updateQueuedScan(item.localId, { syncStatus: 'failed', lastError: message });
    }
  }

  return syncedCount;
}

export async function runOfflineUserCardSync(): Promise<number> {
  const online = await isDeviceOnline();
  if (!online) {
    return 0;
  }

  const queue = await listQueuedUserScans();
  const pending = queue.filter(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );
  let syncedCount = 0;

  for (const item of pending) {
    await updateQueuedUserScan(item.localId, { syncStatus: 'uploading', lastError: undefined });
    try {
      const created = await processUserCard(item.rawOcrText, item.imageBase64, {
        backImageBase64: item.backImageBase64,
        designId: item.designId,
        isPrimary: item.isPrimary,
      });

      const patch = buildUserCardPatchFromQueueEdits(created, item);
      if (Object.keys(patch).length > 0) {
        await updateUserCard(created._id, patch);
      }

      if (item.wallet_display && item.wallet_display !== created.wallet_display) {
        await updateUserCardWalletDisplay(created._id, { walletDisplay: item.wallet_display });
      }
      if (item.photo_face && item.photo_face !== created.photo_face) {
        await updateUserCardWalletDisplay(created._id, { photoFace: item.photo_face });
      }

      await removeQueuedUserScan(item.localId);
      syncedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync offline user card.';
      await updateQueuedUserScan(item.localId, { syncStatus: 'failed', lastError: message });
    }
  }

  return syncedCount;
}

export async function runAllOfflineSync(): Promise<number> {
  const collectedSynced = await runOfflineCardSync();
  const userCardsSynced = await runOfflineUserCardSync();
  const total = collectedSynced + userCardsSynced;

  if (total > 0) {
    notifyOfflineSyncComplete(total);
  }

  return total;
}

export function useOfflineCardSync() {
  const syncQueuedScans = useCallback(async (): Promise<number> => {
    return runAllOfflineSync();
  }, []);

  return { syncQueuedScans };
}
