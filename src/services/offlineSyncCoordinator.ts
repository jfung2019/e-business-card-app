type OfflineSyncListener = (syncedCount: number) => void;

const listeners = new Set<OfflineSyncListener>();

export function onOfflineSyncComplete(listener: OfflineSyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineSyncComplete(syncedCount: number): void {
  if (syncedCount <= 0) {
    return;
  }
  for (const listener of listeners) {
    listener(syncedCount);
  }
}
