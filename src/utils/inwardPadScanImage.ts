import {
  BorderTypes,
  DecompTypes,
  InterpolationFlags,
  Mat,
  OpenCV,
  Point,
  PointVector,
  Scalar,
  Size,
} from 'react-native-fast-opencv';
import { Images } from 'react-native-nitro-image';

import { readImageAsBase64 } from './imageBase64';
import {
  boundingSizeOfQuad,
  imageCornerQuad,
  insetQuadTowardCenter,
  type Quad,
  type QuadPoint,
} from './insetQuad';

/** Default inward shrink before (re-)warp — 2.5%. */
export const DEFAULT_CARD_INSET_RATIO = 0.025;

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function toFilePath(uriOrPath: string): string {
  return uriOrPath.replace(/^file:\/\//, '');
}

function pushQuad(vector: PointVector, corners: readonly QuadPoint[]): void {
  for (const corner of corners) {
    vector.push(Point.create(corner.x, corner.y));
  }
}

/**
 * Scale 4 corners toward their center, then warpPerspective onto a flat card.
 */
export async function warpCardWithInset(
  imageUri: string,
  corners: Quad,
  insetRatio: number = DEFAULT_CARD_INSET_RATIO,
): Promise<string> {
  const path = toFilePath(imageUri);
  const base64 = await readImageAsBase64(toFileUri(path));
  const src = Mat.createFromBase64(base64);
  const inset = insetQuadTowardCenter(corners, insetRatio);
  const { width: outW, height: outH } = boundingSizeOfQuad(inset);

  const srcPoints = PointVector.create();
  const dstPoints = PointVector.create();
  const dst = Mat.create();
  const border = Scalar.create(255, 255, 255, 255);
  let transform: Mat | null = null;

  try {
    pushQuad(srcPoints, inset);
    pushQuad(dstPoints, imageCornerQuad(outW, outH));

    transform = OpenCV.getPerspectiveTransform(
      srcPoints,
      dstPoints,
      DecompTypes.DECOMP_LU,
    );

    OpenCV.warpPerspective(
      src,
      dst,
      transform,
      Size.create(outW, outH),
      InterpolationFlags.INTER_LINEAR,
      BorderTypes.BORDER_CONSTANT,
      border,
    );

    const outPath = `${path}.inset.jpg`;
    dst.saveToFile(outPath);
    return toFileUri(outPath);
  } finally {
    src.release();
    dst.release();
    transform?.release();
    srcPoints.release();
    dstPoints.release();
    border.release();
  }
}

/** Axis-aligned inward crop when the scan is already a flat rectangle. */
async function cropWithInsetNitro(
  imageUri: string,
  insetRatio: number,
): Promise<string> {
  const path = toFilePath(imageUri);
  const image = await Images.loadFromFileAsync(path);
  const ratio = Math.min(Math.max(insetRatio, 0), 0.45);
  const corners = insetQuadTowardCenter(
    imageCornerQuad(image.width, image.height),
    ratio,
  );
  const startX = Math.max(0, Math.floor(Math.min(corners[0].x, corners[3].x)));
  const startY = Math.max(0, Math.floor(Math.min(corners[0].y, corners[1].y)));
  const endX = Math.min(
    image.width,
    Math.ceil(Math.max(corners[1].x, corners[2].x)),
  );
  const endY = Math.min(
    image.height,
    Math.ceil(Math.max(corners[2].y, corners[3].y)),
  );

  if (endX <= startX + 8 || endY <= startY + 8) {
    return toFileUri(path);
  }

  const cropped = await image.cropAsync(startX, startY, endX, endY);
  const outPath = await cropped.saveToTemporaryFileAsync('jpg', 92);
  return toFileUri(outPath);
}

/**
 * After OS DocumentScanner (already perspective-corrected), shrink slightly
 * toward the center so edge glare / background crumbs are removed, then re-warp.
 */
export async function applyInwardPaddingToScan(
  imageUri: string,
  insetRatio: number = DEFAULT_CARD_INSET_RATIO,
): Promise<string> {
  const path = toFilePath(imageUri);
  const uri = toFileUri(path);

  try {
    const probe = await Images.loadFromFileAsync(path);
    const corners = imageCornerQuad(probe.width, probe.height);
    return await warpCardWithInset(uri, corners, insetRatio);
  } catch {
    try {
      return await cropWithInsetNitro(uri, insetRatio);
    } catch {
      return uri;
    }
  }
}
