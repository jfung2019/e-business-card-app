import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { runAllOfflineSync } from './useOfflineCardSync';
import { listQueuedScans } from '../services/offlineCardQueue';
import { listQueuedUserScans } from '../services/offlineUserCardQueue';
import { isDeviceOnline } from '../utils/network';

const ONLINE_POLL_MS = 20_000;

async function hasPendingOfflineScans(): Promise<boolean> {
  const [collectedQueue, userCardQueue] = await Promise.all([
    listQueuedScans(),
    listQueuedUserScans(),
  ]);

  const hasCollected = collectedQueue.some(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );
  const hasUserCards = userCardQueue.some(
    item => item.syncStatus === 'pending' || item.syncStatus === 'failed',
  );

  return hasCollected || hasUserCards;
}

/**
 * Syncs offline queues when the API is reachable and pending scans exist.
 * Polls while the app is active (no extra native NetInfo dependency).
 */
export function useOfflineAutoSync(enabled: boolean): void {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const attemptSync = async (): Promise<void> => {
      if (syncingRef.current) {
        return;
      }

      const online = await isDeviceOnline();
      if (!online || !(await hasPendingOfflineScans())) {
        return;
      }

      syncingRef.current = true;
      try {
        await runAllOfflineSync();
      } finally {
        syncingRef.current = false;
      }
    };

    void attemptSync();

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void attemptSync();
      }
    });

    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        void attemptSync();
      }
    }, ONLINE_POLL_MS);

    return () => {
      appStateSubscription.remove();
      clearInterval(intervalId);
    };
  }, [enabled]);
}
