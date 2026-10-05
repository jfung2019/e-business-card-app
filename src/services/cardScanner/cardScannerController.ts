/**
 * Promise bridge between `scanBusinessCard()` and the scanner UI.
 *
 * The old iOS scanner was a native modal that resolved a promise, so callers
 * in `services/ocr.ts` just awaited a URI. Keeping that shape means the custom
 * scanner drops in without touching the scan screens.
 */

/** Resolves with one URI per captured side, in order, or `null` on cancel. */
type ScannerResolver = (imageUris: string[] | null) => void;

export type CardScannerSide = 'front' | 'back';

export interface CardScannerRequest {
  /**
   * Sides to capture in one camera session, in order. Every side after the
   * first is optional — the scanner offers Skip for it.
   */
  sides: readonly CardScannerSide[];
}

export interface CardScannerPair {
  front: string;
  back: string | null;
}

type Listener = (request: CardScannerRequest | null) => void;

let listener: Listener | null = null;
let pending: ScannerResolver | null = null;

/** Called by the scanner host to receive open/close requests. */
export function setCardScannerListener(next: Listener | null): void {
  listener = next;
}

function openScanner(sides: readonly CardScannerSide[]): Promise<string[] | null> {
  if (!listener) {
    return Promise.reject(
      new Error('Card scanner is unavailable. Please restart the app.'),
    );
  }
  if (pending) {
    return Promise.reject(new Error('A scan is already in progress.'));
  }

  return new Promise<string[] | null>((resolve) => {
    pending = resolve;
    listener?.({ sides });
  });
}

/**
 * Opens the scanner and resolves with a local image URI, or `null` when the
 * user backs out.
 *
 * @throws If the scanner host is not mounted, or a scan is already running.
 */
export async function openCardScanner(
  side: CardScannerSide = 'front',
): Promise<string | null> {
  const uris = await openScanner([side]);
  return uris?.[0] ?? null;
}

/**
 * Captures the front and then, optionally, the back in a single camera
 * session — no round trip back to the calling screen between the two.
 * Resolves `null` when the user backs out before the front is kept.
 *
 * @throws If the scanner host is not mounted, or a scan is already running.
 */
export async function openCardScannerBothSides(): Promise<CardScannerPair | null> {
  const uris = await openScanner(['front', 'back']);
  if (!uris?.[0]) {
    return null;
  }
  return { front: uris[0], back: uris[1] ?? null };
}

/** Called by the scanner host when the user finishes or cancels. */
export function finishCardScan(imageUris: string[] | null): void {
  const resolve = pending;
  pending = null;
  listener?.(null);
  resolve?.(imageUris);
}

/** Test seam: drops any in-flight scan without resolving the UI. */
export function resetCardScanner(): void {
  pending = null;
}
