import { OpenCV, Mat } from 'react-native-fast-opencv';

import { readImageAsBase64 } from './imageBase64';

function toFilePath(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '');
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

/**
 * Brightens / boosts contrast so the crop looks closer to an OS document scan
 * (lighter page, clearer text) while keeping card colors.
 */
export async function enhanceDocumentScan(imageUri: string): Promise<string> {
  const path = toFilePath(imageUri);
  const base64 = await readImageAsBase64(toFileUri(path));

  let src: Mat | null = null;
  let enhanced: Mat | null = null;

  try {
    src = Mat.createFromBase64(base64);
    enhanced = Mat.create();
    // alpha = contrast, beta = brightness (scanner-style lift)
    OpenCV.convertScaleAbs(src, enhanced, 1.45, 48);
    enhanced.saveToFile(path);
    return toFileUri(path);
  } finally {
    try {
      src?.release();
    } catch {
      // ignore native cleanup failures
    }
    try {
      enhanced?.release();
    } catch {
      // ignore native cleanup failures
    }
  }
}
