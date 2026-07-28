import { navigationRef } from '../navigation/navigationRef';

type ScanResolver = (imageUri: string | null) => void;

let pendingResolve: ScanResolver | null = null;

/**
 * Opens the in-app card scanner and resolves with a cropped card image URI,
 * or null if the user cancels.
 */
export function openCardScanner(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!navigationRef.isReady()) {
      reject(new Error('Navigation is not ready. Try again in a moment.'));
      return;
    }

    if (pendingResolve) {
      pendingResolve(null);
      pendingResolve = null;
    }

    pendingResolve = resolve;
    navigationRef.navigate('CardScanner');
  });
}

/** Called by CardScannerScreen when capture finishes or the user cancels. */
export function completeCardScan(imageUri: string | null): void {
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(imageUri);
}

export function isCardScanPending(): boolean {
  return pendingResolve !== null;
}
