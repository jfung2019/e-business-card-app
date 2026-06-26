import ImageResizer from '@bam.tech/react-native-image-resizer';

import { readImageAsBase64 } from './imageBase64';

/** Keep front + back uploads under typical nginx limits without losing OCR quality. */
const UPLOAD_MAX_EDGE_PX = 1280;
const UPLOAD_JPEG_QUALITY = 65;

export async function compressScanImageForUpload(imageUri: string): Promise<string> {
  const resized = await ImageResizer.createResizedImage(
    imageUri,
    UPLOAD_MAX_EDGE_PX,
    UPLOAD_MAX_EDGE_PX,
    'JPEG',
    UPLOAD_JPEG_QUALITY,
    0,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );

  return readImageAsBase64(resized.uri);
}
