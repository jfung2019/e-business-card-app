import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';

export type OcrSource = 'camera' | 'gallery';

async function pickImageUri(source: OcrSource): Promise<string | null> {
  const result =
    source === 'camera'
      ? await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.9,
          saveToPhotos: false,
        })
      : await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.9,
          selectionLimit: 1,
        });

  if (result.didCancel || result.errorCode) {
    return null;
  }

  const uri = result.assets?.[0]?.uri;
  return uri ?? null;
}

export async function extractTextFromImage(source: OcrSource): Promise<string> {
  const uri = await pickImageUri(source);
  if (!uri) {
    throw new Error('No image selected.');
  }

  // Chinese script (Simplified + Traditional). Use LATIN for English-only cards if needed.
  const recognized = await TextRecognition.recognize(uri, TextRecognitionScript.CHINESE);
  const lines = recognized.blocks.map((block) => block.text.trim()).filter(Boolean);

  if (lines.length === 0) {
    throw new Error('No text detected on the image. Try better lighting or a clearer photo.');
  }

  return lines.join('\n');
}
