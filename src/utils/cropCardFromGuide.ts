import { Image } from 'react-native';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { Images } from 'react-native-nitro-image';

import {
  expandRect,
  mapViewRectToImageRect,
  type Rect,
  type Size,
} from './cardGuideGeometry';

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function toFilePath(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '');
}

function getImageSize(uri: string): Promise<Size> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

function isPortrait(size: Size): boolean {
  return size.height >= size.width;
}

/**
 * Re-encode via ImageResizer so EXIF orientation is baked into real pixels.
 * Nitro's crop operates on the raw pixel buffer; EXIF-only orientation makes
 * the on-screen rectangle map onto the wrong region (often looks 90° wrong).
 */
async function reencode(
  imageUri: string,
  rotationDegrees: number,
): Promise<{ uri: string; width: number; height: number }> {
  const sourceSize = await getImageSize(imageUri);
  const maxEdge = Math.max(sourceSize.width, sourceSize.height, 1600);

  const resized = await ImageResizer.createResizedImage(
    imageUri,
    maxEdge,
    maxEdge,
    'JPEG',
    95,
    rotationDegrees,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );

  return {
    uri: resized.uri.startsWith('file://') ? resized.uri : toFileUri(resized.uri),
    width: resized.width,
    height: resized.height,
  };
}

/**
 * Produce a JPEG whose pixel orientation matches the camera preview.
 */
async function matchPreviewOrientation(
  imageUri: string,
  viewSize: Size,
): Promise<{ uri: string; width: number; height: number }> {
  // 1) Bake EXIF into pixels (rotation 0).
  const baked = await reencode(imageUri, 0);

  if (isPortrait(viewSize) === isPortrait(baked)) {
    return baked;
  }

  // 2) Portrait phone + landscape pixels: try 90° CW then 270° CW.
  const candidates = isPortrait(viewSize) ? [90, 270] : [270, 90];
  for (const degrees of candidates) {
    const rotated = await reencode(baked.uri, degrees);
    if (isPortrait(viewSize) === isPortrait(rotated)) {
      return rotated;
    }
  }

  return baked;
}

/**
 * Crop exactly the on-screen card guide from a Vision Camera photo file.
 */
export async function cropCardPhotoFromFile(
  photoPathOrUri: string,
  guideInView: Rect,
  viewSize: Size,
): Promise<string> {
  const originalUri = toFileUri(toFilePath(photoPathOrUri));
  const upright = await matchPreviewOrientation(originalUri, viewSize);

  const image = await Images.loadFromFileAsync(toFilePath(upright.uri));
  const imageSize: Size = {
    width: image.width || upright.width,
    height: image.height || upright.height,
  };

  const mapped = mapViewRectToImageRect(guideInView, viewSize, imageSize);
  const crop = expandRect(mapped, 0.02, imageSize);

  const startX = Math.max(0, Math.floor(crop.x));
  const startY = Math.max(0, Math.floor(crop.y));
  const endX = Math.min(imageSize.width, Math.ceil(crop.x + crop.width));
  const endY = Math.min(imageSize.height, Math.ceil(crop.y + crop.height));

  if (endX <= startX || endY <= startY) {
    return upright.uri;
  }

  const cropped = await image.cropAsync(startX, startY, endX, endY);
  let outUri = toFileUri(await cropped.saveToTemporaryFileAsync('jpg', 92));

  // Guide is landscape — keep saved card horizontal.
  let outSize = await getImageSize(outUri);
  if (outSize.height > outSize.width * 1.05) {
    for (const degrees of [90, 270]) {
      const fixed = await reencode(outUri, degrees);
      if (fixed.width >= fixed.height) {
        outUri = fixed.uri;
        outSize = fixed;
        break;
      }
    }
  }

  // Downscale for OCR / upload.
  if (outSize.width > 1600) {
    const scaled = await ImageResizer.createResizedImage(
      outUri,
      1600,
      Math.max(1, Math.round((1600 / outSize.width) * outSize.height)),
      'JPEG',
      92,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true },
    );
    outUri = scaled.uri.startsWith('file://') ? scaled.uri : toFileUri(scaled.uri);
  }

  return outUri;
}
