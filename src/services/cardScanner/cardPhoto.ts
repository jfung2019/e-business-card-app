import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNBlobUtil from 'react-native-blob-util';
import {
  BorderTypes,
  DataTypes,
  DecompTypes,
  InterpolationFlags,
  OpenCV,
  type Mat,
  type PointVector,
} from 'react-native-fast-opencv';

import { readImageAsBase64 } from '../../utils/imageBase64';
import { isNativeCardVisionAvailable, warpCardPhotoNative } from './nativeCardVision';
import { CARD_ASPECT_RATIO, type CardQuad } from './quadGeometry';

/** Long edge of the dewarped card. The short edge follows the ISO ratio. */
const OUTPUT_LONG_EDGE_PX = 1600;

/** Keeps a sliver of background so OCR never clips a character at the edge. */
const EDGE_PADDING_PX = 6;

/** Upper bound for the working photo. Full-res captures make the warp crawl. */
const WORKING_MAX_EDGE_PX = 2400;

export interface PreparedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Turns a raw capture into the working photo every later step uses: EXIF
 * orientation baked into the pixels, and bounded in size.
 *
 * The baking matters. OpenCV's imdecode ignores EXIF, while <Image> honours
 * it — without this, the crop editor and the warp would disagree about which
 * way is up, and a crop drawn on screen would land sideways on the pixels.
 */
export async function prepareCapturedPhoto(rawUri: string): Promise<PreparedPhoto> {
  const upright = await ImageResizer.createResizedImage(
    rawUri,
    WORKING_MAX_EDGE_PX,
    WORKING_MAX_EDGE_PX,
    'JPEG',
    95,
    0,
    undefined,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );
  return { uri: upright.uri, width: upright.width, height: upright.height };
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/**
 * Perspective-corrects `photo` to `quad` and writes the result to a new JPEG
 * in the cache directory. `quad` is normalized to the photo, ordered
 * TL, TR, BR, BL.
 *
 * Output keeps the card's own orientation: a card photographed upright
 * (portrait design) comes out portrait instead of being squashed to landscape.
 *
 * iOS uses Core Image's CIPerspectiveCorrection; OpenCV is the fallback.
 */
export async function warpCardPhoto(photo: PreparedPhoto, quad: CardQuad): Promise<string> {
  if (isNativeCardVisionAvailable()) {
    try {
      return await warpCardPhotoNative(photo.uri, quad);
    } catch (error) {
      if (__DEV__) {
        console.warn('[cardScanner] native warp failed, using OpenCV', error);
      }
    }
  }
  return warpCardPhotoWithOpenCV(photo, quad);
}

async function warpCardPhotoWithOpenCV(photo: PreparedPhoto, quad: CardQuad): Promise<string> {
  let source: Mat | null = null;
  let warped: Mat | null = null;
  let transform: Mat | null = null;
  let sourcePoints: ReturnType<typeof OpenCV.Point2fVector.create> | null = null;
  let targetPoints: ReturnType<typeof OpenCV.Point2fVector.create> | null = null;

  try {
    const base64 = await readImageAsBase64(photo.uri);
    source = OpenCV.Mat.createFromBase64(base64);

    const sourceWidth = source.cols;
    const sourceHeight = source.rows;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new Error('The captured photo could not be read.');
    }

    const px = quad.map((corner) => ({
      x: corner.x * sourceWidth,
      y: corner.y * sourceHeight,
    }));
    const [tl, tr, br, bl] = px;
    const measuredWidth = (distance(tl.x, tl.y, tr.x, tr.y) + distance(bl.x, bl.y, br.x, br.y)) / 2;
    const measuredHeight = (distance(tl.x, tl.y, bl.x, bl.y) + distance(tr.x, tr.y, br.x, br.y)) / 2;

    const isPortrait = measuredHeight > measuredWidth;
    const shortEdge = Math.round(OUTPUT_LONG_EDGE_PX / CARD_ASPECT_RATIO);
    const outputWidth = isPortrait ? shortEdge : OUTPUT_LONG_EDGE_PX;
    const outputHeight = isPortrait ? OUTPUT_LONG_EDGE_PX : shortEdge;

    sourcePoints = OpenCV.Point2fVector.create();
    for (const point of px) {
      sourcePoints.push(OpenCV.Point2f.create(point.x, point.y));
    }

    // Same corner order as the source: TL, TR, BR, BL.
    const pad = EDGE_PADDING_PX;
    targetPoints = OpenCV.Point2fVector.create();
    targetPoints.push(OpenCV.Point2f.create(-pad, -pad));
    targetPoints.push(OpenCV.Point2f.create(outputWidth + pad, -pad));
    targetPoints.push(OpenCV.Point2f.create(outputWidth + pad, outputHeight + pad));
    targetPoints.push(OpenCV.Point2f.create(-pad, outputHeight + pad));

    // The native binding reads both arguments as Point2fVector; the shipped
    // typings still say PointVector, hence the casts.
    transform = OpenCV.getPerspectiveTransform(
      sourcePoints as unknown as PointVector,
      targetPoints as unknown as PointVector,
      DecompTypes.DECOMP_LU,
    );

    warped = OpenCV.Mat.create(outputHeight, outputWidth, DataTypes.CV_8UC3);
    OpenCV.warpPerspective(
      source,
      warped,
      transform,
      OpenCV.Size.create(outputWidth, outputHeight),
      InterpolationFlags.INTER_LINEAR,
      BorderTypes.BORDER_REPLICATE,
      OpenCV.Scalar.create(0, 0, 0),
    );

    const path = `${RNBlobUtil.fs.dirs.CacheDir}/card-scan-${Date.now()}.jpg`;
    await RNBlobUtil.fs.writeFile(path, warped.toBase64(), 'base64');
    return `file://${path}`;
  } finally {
    targetPoints?.release();
    sourcePoints?.release();
    transform?.release();
    warped?.release();
    source?.release();
  }
}

/**
 * Best-effort removal of scanner temp files — raw captures, working photos
 * and superseded crops pile up in the cache on every retake otherwise.
 */
export async function discardScanFiles(uris: readonly (string | null | undefined)[]): Promise<void> {
  await Promise.all(
    uris
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0)
      .map(async (uri) => {
        try {
          await RNBlobUtil.fs.unlink(uri.replace(/^file:\/\//, ''));
        } catch {
          // Already gone, or owned by the system — nothing to do.
        }
      }),
  );
}
