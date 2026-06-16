import { launchImageLibrary } from 'react-native-image-picker';
import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import DocumentScanner from 'react-native-document-scanner-plugin';

import { readImageAsBase64 } from '../utils/imageBase64';

export type OcrSource = 'camera' | 'gallery';

export interface CardScanResult {
  imageUri: string;
  imageBase64: string;
  ocrText: string;
}

type PickedImage = { uri: string; base64?: string };

async function pickGalleryImageUri(): Promise<PickedImage | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.9,
    selectionLimit: 1,
    includeBase64: true,
  });

  if (result.didCancel || result.errorCode) {
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }

  return { uri: asset.uri, base64: asset.base64 ?? undefined };
}

async function scanWithDocumentCamera(): Promise<string | null> {
  const { scannedImages, status } = await DocumentScanner.scanDocument({
    maxNumDocuments: 1,
    croppedImageQuality: 90,
  });

  if (status === 'cancel' || !scannedImages?.length) {
    return null;
  }

  return scannedImages[0] ?? null;
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

export async function scanBusinessCard(
  source: OcrSource,
): Promise<CardScanResult | null> {
  const picked: PickedImage | null =
    source === 'camera'
      ? await scanWithDocumentCamera().then((uri) => (uri ? { uri } : null))
      : await pickGalleryImageUri();

  if (!picked) {
    return null;
  }

  const { uri: imageUri, base64: embeddedBase64 } = picked;
  const ocrText = await recognizeText(imageUri);
  const imageBase64 = embeddedBase64 ?? (await readImageAsBase64(imageUri));
  return { imageUri, imageBase64, ocrText };
}
