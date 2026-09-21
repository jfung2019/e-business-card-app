/**
 * Promise bridge between `scanBusinessCard()` and the scanner UI.
 *
 * The old iOS scanner was a native modal that resolved a promise, so callers
 * in `services/ocr.ts` just awaited a URI. Keeping that shape means the custom
 * scanner drops in without touching the scan screens.
 */

type ScannerResolver = (imageUri: string | null) => void;

export type CardScannerSide = 'front' | 'back';

export interface CardScannerRequest {
  side: CardScannerSide;
}

type Listener = (request: CardScannerRequest | null) => void;

let listener: Listener | null = null;
let pending: ScannerResolver | null = null;

/** Called by the scanner host to receive open/close requests. */
export function setCardScannerListener(next: Listener | null): void {
  listener = next;
}

/**
 * Opens the scanner and resolves with a local image URI, or `null` when the
 * user backs out.
 *
 * @throws If the scanner host is not mounted, or a scan is already running.
 */
export function openCardScanner(
  side: CardScannerSide = 'front',
): Promise<string | null> {
  if (!listener) {
    return Promise.reject(
      new Error('Card scanner is unavailable. Please restart the app.'),
    );
  }
  if (pending) {
    return Promise.reject(new Error('A scan is already in progress.'));
  }

  return new Promise<string | null>((resolve) => {
    pending = resolve;
    listener?.({ side });
  });
}

/** Called by the scanner host when the user finishes or cancels. */
export function finishCardScan(imageUri: string | null): void {
  const resolve = pending;
  pending = null;
  listener?.(null);
  resolve?.(imageUri);
}

/** Test seam: drops any in-flight scan without resolving the UI. */
export function resetCardScanner(): void {
  pending = null;
}
