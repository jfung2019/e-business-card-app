import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNBlobUtil from 'react-native-blob-util';
import {
  BorderTypes,
  DataTypes,
  DecompTypes,
  InterpolationFlags,
  OpenCV,
  type PointVector,
} from 'react-native-fast-opencv';

import { readImageAsBase64 } from '../../utils/imageBase64';
import { CARD_ASPECT_RATIO, type CardQuad } from './quadGeometry';

/** Output width for the dewarped card. Height follows the ISO card ratio. */
const OUTPUT_WIDTH_PX = 1600;

/** Keeps a sliver of background so OCR never clips a character at the edge. */
const EDGE_PADDING_PX = 6;

/** Upper bound before the warp. Full-res captures make warpPerspective crawl. */
const WARP_INPUT_MAX_EDGE_PX = 2400;

/**
 * Perspective-corrects a captured photo to the detected card quad and writes
 * the result to a new JPEG in the cache directory.
 *
 * `quad` is in normalized preview space (0..1), as produced by the live
 * detector. Returns the new file URI, or the original when the warp cannot be
 * applied — a slightly skewed scan still beats a failed one.
 */
export async function warpCardPhoto(
  photoUri: string,
  quad: CardQuad,
): Promise<string> {
  let source: ReturnType<typeof OpenCV.Mat.createFromBase64> | null = null;
  let warped: ReturnType<typeof OpenCV.Mat.create> | null = null;
  let transform: ReturnType<typeof OpenCV.getPerspectiveTransform> | null = null;
  let sourcePoints: ReturnType<typeof OpenCV.Point2fVector.create> | null = null;
  let targetPoints: ReturnType<typeof OpenCV.Point2fVector.create> | null = null;

  try {
    // Re-encode first: this bakes EXIF orientation into the pixels. OpenCV's
    // imdecode ignores EXIF, so without this step a portrait capture would be
    // warped against a sideways image and the quad would land in the wrong place.
    const upright = await ImageResizer.createResizedImage(
      photoUri,
      WARP_INPUT_MAX_EDGE_PX,
      WARP_INPUT_MAX_EDGE_PX,
      'JPEG',
      95,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true },
    );

    const base64 = await readImageAsBase64(upright.uri);
    source = OpenCV.Mat.createFromBase64(base64);

    const sourceWidth = source.cols;
    const sourceHeight = source.rows;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return photoUri;
    }

    const outputWidth = OUTPUT_WIDTH_PX;
    const outputHeight = Math.round(OUTPUT_WIDTH_PX / CARD_ASPECT_RATIO);

    sourcePoints = OpenCV.Point2fVector.create();
    for (const corner of quad) {
      sourcePoints.push(
        OpenCV.Point2f.create(corner.x * sourceWidth, corner.y * sourceHeight),
      );
    }

    // Same corner order as the detector: TL, TR, BR, BL.
    targetPoints = OpenCV.Point2fVector.create();
    targetPoints.push(OpenCV.Point2f.create(-EDGE_PADDING_PX, -EDGE_PADDING_PX));
    targetPoints.push(
      OpenCV.Point2f.create(outputWidth + EDGE_PADDING_PX, -EDGE_PADDING_PX),
    );
    targetPoints.push(
      OpenCV.Point2f.create(
        outputWidth + EDGE_PADDING_PX,
        outputHeight + EDGE_PADDING_PX,
      ),
    );
    targetPoints.push(
      OpenCV.Point2f.create(-EDGE_PADDING_PX, outputHeight + EDGE_PADDING_PX),
    );

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
  } catch {
    return photoUri;
  } finally {
    targetPoints?.release();
    sourcePoints?.release();
    transform?.release();
    warped?.release();
    source?.release();
  }
}
