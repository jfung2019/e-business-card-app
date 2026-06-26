import {
  launchCamera,
  launchImageLibrary,
  type PhotoQuality,
} from 'react-native-image-picker';
import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { AppState, InteractionManager } from 'react-native';

import { compressScanImageForUpload } from '../utils/compressScanImage';

export type OcrSource = 'camera' | 'gallery';

export interface CardScanResult {
  imageUri: string;
  imageBase64: string;
  ocrText: string;
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
  const result = await withActivityRetry(() =>
    launchImageLibrary({
      mediaType: 'photo',
      quality: SCAN_IMAGE_JPEG_QUALITY,
      maxWidth: SCAN_IMAGE_MAX_EDGE_PX,
      maxHeight: SCAN_IMAGE_MAX_EDGE_PX,
      selectionLimit: 1,
      includeBase64: true,
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

async function scanWithDocumentCamera(): Promise<string | null> {
  await runAfterInteractions();
  try {
    const { scannedImages, status } = await withActivityRetry(() =>
      DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 55,
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

async function recognizeText(imageUri: string): Promise<string> {
  const recognized = await TextRecognition.recognize(
    imageUri,
    TextRecognitionScript.CHINESE,
  );
  const lines = recognized.blocks
    .map((block) => block.text.trim())
    .filter(Boolean);

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
}

export async function scanBusinessCard(
  source: OcrSource,
  options?: ScanBusinessCardOptions,
): Promise<CardScanResult | null> {
  const requireText = options?.requireText !== false;
  const picked: PickedImage | null =
    source === 'camera'
      ? await scanWithDocumentCamera().then((uri) => (uri ? { uri } : null))
      : await pickGalleryImageUri();

  if (!picked) {
    return null;
  }

  const { uri: imageUri } = picked;
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
  return { imageUri, imageBase64, ocrText };
}
