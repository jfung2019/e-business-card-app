import {
  launchCamera,
  launchImageLibrary,
  type PhotoQuality,
} from 'react-native-image-picker';
import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { AppState, InteractionManager, Platform } from 'react-native';

import {
  openCardScanner,
  openCardScannerBothSides,
  type CardScannerSide,
} from './cardScanner/cardScannerController';
import { compressScanImageForUpload } from '../utils/compressScanImage';
import { detectWechatQrUrls } from './qrDetect';

export type OcrSource = 'camera' | 'gallery';

export interface CardScanResult {
  imageUri: string;
  imageBase64: string;
  ocrText: string;
  /** WeChat QR codes found on this side of the card. Empty when there are none. */
  wechatQrUrls: string[];
}

type PickedImage = { uri: string; base64?: string };

async function runAfterInteractions(): Promise<void> {
  await new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}

async function waitForActiveAppState(timeoutMs = 2_000): Promise<void> {
  if (AppState.currentState === 'active') {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        subscription.remove();
        resolve();
      }
    }, timeoutMs);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (resolved) {
        return;
      }
      if (nextState === 'active') {
        resolved = true;
        clearTimeout(timeout);
        subscription.remove();
        resolve();
      }
    });
  });
}

function isActivityRegistryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    message.includes('ActivityResultRegistry') ||
    message.includes('getActivityResultRegistry') ||
    message.includes('null object reference') ||
    message.includes('current activity')
  );
}

async function withActivityRetry<T>(task: () => Promise<T>): Promise<T> {
  await waitForActiveAppState();
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (!isActivityRegistryError(error)) {
        throw error;
      }
      lastError = error;
      await waitForActiveAppState();
      await runAfterInteractions();
      await sleep(350 + attempt * 200);
    }
  }

  throw lastError;
}

const SCAN_IMAGE_MAX_EDGE_PX = 1600;
const SCAN_IMAGE_JPEG_QUALITY: PhotoQuality = 0.7;

async function pickGalleryImageUri(): Promise<PickedImage | null> {
  await runAfterInteractions();
  // Android: react-native-image-picker uses the system Photo Picker (PickVisualMedia),
  // so READ_MEDIA_IMAGES is not required. Keep selectionLimit=1 and includeExtra=false.
  const result = await withActivityRetry(() =>
    launchImageLibrary({
      mediaType: 'photo',
      quality: SCAN_IMAGE_JPEG_QUALITY,
      maxWidth: SCAN_IMAGE_MAX_EDGE_PX,
      maxHeight: SCAN_IMAGE_MAX_EDGE_PX,
      selectionLimit: 1,
      includeBase64: true,
      includeExtra: false,
    }),
  );

  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Unable to open image gallery.');
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No image was selected.');
  }

  return { uri: asset.uri, base64: asset.base64 ?? undefined };
}

async function scanWithCameraFallback(): Promise<PickedImage | null> {
  await runAfterInteractions();
  const result = await withActivityRetry(() =>
    launchCamera({
      mediaType: 'photo',
      quality: SCAN_IMAGE_JPEG_QUALITY,
      maxWidth: SCAN_IMAGE_MAX_EDGE_PX,
      maxHeight: SCAN_IMAGE_MAX_EDGE_PX,
      includeBase64: true,
    }),
  );
  if (result.didCancel) {
    return null;
  }
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Unable to open camera.');
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('No camera image was captured.');
  }
  return { uri: asset.uri, base64: asset.base64 ?? undefined };
}

/**
 * Android's scanner: ML Kit's document scanner, which honours
 * `maxNumDocuments` and closes itself after a single page.
 */
async function scanWithDocumentCamera(): Promise<string | null> {
  await runAfterInteractions();
  try {
    const { scannedImages, status } = await withActivityRetry(() =>
      DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 90,
      }),
    );

    if (status === 'cancel' || !scannedImages?.length) {
      return null;
    }

    return scannedImages[0] ?? null;
  } catch (error) {
    if (!isActivityRegistryError(error)) {
      throw error;
    }
    const fallback = await scanWithCameraFallback();
    return fallback?.uri ?? null;
  }
}

/**
 * iOS-only: the in-app card scanner — one card, detected and captured
 * automatically, done in a single shot.
 *
 * Only iOS needs this. The plugin's iOS backend is VisionKit's
 * `VNDocumentCameraViewController`, a multi-page document scanner that ignores
 * `maxNumDocuments` entirely, so users scanned several cards and only the
 * first was ever kept. ML Kit on Android already does the right thing, so
 * Android stays on {@link scanWithDocumentCamera}.
 */
async function scanWithCardScanner(side: CardScannerSide): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return scanWithDocumentCamera();
  }

  await runAfterInteractions();
  try {
    return await openCardScanner(side);
  } catch {
    // Camera or OpenCV unavailable: fall back to a plain camera capture
    // rather than blocking the scan entirely.
    const fallback = await scanWithCameraFallback();
    return fallback?.uri ?? null;
  }
}

async function recognizeWithScript(
  imageUri: string,
  script: TextRecognitionScript,
): Promise<string[]> {
  try {
    const recognized = await TextRecognition.recognize(imageUri, script);
    return recognized.blocks
      .map((block) => block.text.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function mergeOcrLines(...lineGroups: string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const lines of lineGroups) {
    for (const line of lines) {
      const key = line.replace(/\s+/g, ' ').toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(line);
    }
  }

  return merged;
}

async function recognizeText(imageUri: string): Promise<string> {
  // Bilingual cards: Chinese script + Latin script, merged (either alone can miss lines).
  const [chineseLines, latinLines] = await Promise.all([
    recognizeWithScript(imageUri, TextRecognitionScript.CHINESE),
    recognizeWithScript(imageUri, TextRecognitionScript.LATIN),
  ]);
  const lines = mergeOcrLines(chineseLines, latinLines);

  if (lines.length === 0) {
    throw new Error('No text detected on the image. Try better lighting or a clearer photo.');
  }

  return lines.join('\n');
}

export function isNoTextDetectedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('No text detected on the image')
  );
}

export interface ScanBusinessCardOptions {
  /** When false, returns empty ocrText if no text is found (used for optional back scans). */
  requireText?: boolean;
  /** Which side is being captured — drives the scanner's on-screen prompt. */
  side?: CardScannerSide;
}

export async function scanBusinessCard(
  source: OcrSource,
  options?: ScanBusinessCardOptions,
): Promise<CardScanResult | null> {
  const requireText = options?.requireText !== false;
  const picked: PickedImage | null =
    source === 'camera'
      ? await scanWithCardScanner(options?.side ?? 'front').then((uri) =>
          uri ? { uri } : null,
        )
      : await pickGalleryImageUri();

  if (!picked) {
    return null;
  }

  return analyzeCardImage(picked.uri, requireText);
}

/** OCR, QR detection and the upload copy for one captured side. */
async function analyzeCardImage(imageUri: string, requireText: boolean): Promise<CardScanResult> {
  // Read QR codes off the original image: the upload copy is downscaled to
  // 1280px at quality 65, which a small printed card QR may not survive.
  // Runs first so a card whose text fails OCR can still yield its QR.
  const wechatQrUrls = await detectWechatQrUrls(imageUri);

  let ocrText = '';
  try {
    ocrText = await recognizeText(imageUri);
  } catch (error) {
    if (!requireText && isNoTextDetectedError(error)) {
      ocrText = '';
    } else {
      throw error;
    }
  }
  const imageBase64 = await compressScanImageForUpload(imageUri);
  return { imageUri, imageBase64, ocrText, wechatQrUrls };
}

export interface CardScanPair {
  front: CardScanResult;
  /** `null` when the user skipped the back. */
  back: CardScanResult | null;
}

/**
 * iOS-only: front and optional back in one camera session, analyzed together.
 * Resolves `null` when the user cancels before keeping the front.
 *
 * @throws When the front has no readable text, or the scanner cannot open.
 */
export async function scanBusinessCardBothSides(): Promise<CardScanPair | null> {
  await runAfterInteractions();
  const pair = await openCardScannerBothSides();
  if (!pair) {
    return null;
  }
  const front = await analyzeCardImage(pair.front, true);
  const back = pair.back ? await analyzeCardImage(pair.back, false) : null;
  return { front, back };
}
