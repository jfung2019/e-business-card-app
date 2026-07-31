import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';

export type OfflineScanReviewCandidate =
  | { kind: 'captured'; card: CapturedCard }
  | { kind: 'user'; card: UserCard };

export type OfflineSyncResult = {
  syncedCount: number;
  reviewCandidates: OfflineScanReviewCandidate[];
};

type OfflineSyncListener = (result: OfflineSyncResult) => void;

const listeners = new Set<OfflineSyncListener>();

export function onOfflineSyncComplete(listener: OfflineSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineSyncComplete(result: OfflineSyncResult): void {
  if (result.syncedCount <= 0) {
    return;
  }
  for (const listener of listeners) {
    listener(result);
  }
}
