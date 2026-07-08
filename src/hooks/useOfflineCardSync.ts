import { useCallback } from 'react';

import { enhanceCard, saveOfflineDraft } from '../api/cards';
import {
  listQueuedScans,
  removeQueuedScan,
  updateQueuedScan,
} from '../services/offlineCardQueue';
import { notifyOfflineSyncComplete } from '../services/offlineSyncCoordinator';
import { isDeviceOnline } from '../utils/network';

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

  if (syncedCount > 0) {
    notifyOfflineSyncComplete(syncedCount);
  }

  return syncedCount;
}

export function useOfflineCardSync() {
  const syncQueuedScans = useCallback(async (): Promise<number> => {
    return runOfflineCardSync();
  }, []);

  return { syncQueuedScans };
}
