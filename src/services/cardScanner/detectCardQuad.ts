import {
  ContourApproximationModes,
  DataTypes,
  MorphShapes,
  MorphTypes,
  OpenCV,
  RetrievalModes,
} from 'react-native-fast-opencv';

import {
  isPlausibleCard,
  orderQuadCorners,
  quadArea,
  type CardQuad,
  type QuadPoint,
} from './quadGeometry';
import { quadToPreviewSpace, type LumaSample } from './sampleFrameLuma';

/** Canny hysteresis thresholds, tuned for printed card edges on a desk. */
const CANNY_LOW = 40;
const CANNY_HIGH = 120;

/** approxPolyDP epsilon as a fraction of contour perimeter. */
const POLY_EPSILON_RATIO = 0.02;

/**
 * Finds the most card-like quadrilateral in a grayscale thumbnail.
 *
 * Runs on the JS runtime (see {@link sampleFrameLuma} for why). Returns the
 * four corners in preview space, normalized 0..1, or `null` when nothing
 * convincing is in view.
 */
export function detectCardQuad(sample: LumaSample): CardQuad | null {
  const { width, height } = sample;
  const pixels = new Uint8Array(sample.pixels);

  // Every Mat/vector below is released in the finally block: these are native
  // allocations, and the detector runs several times per second.
  let source: ReturnType<typeof OpenCV.Mat.createFromBuffer> | null = null;
  let blurred: ReturnType<typeof OpenCV.Mat.create> | null = null;
  let edges: ReturnType<typeof OpenCV.Mat.create> | null = null;
  let closed: ReturnType<typeof OpenCV.Mat.create> | null = null;
  let kernel: ReturnType<typeof OpenCV.getStructuringElement> | null = null;
  let contours: ReturnType<typeof OpenCV.PointVectorOfVectors.create> | null = null;

  try {
    source = OpenCV.Mat.createFromBuffer('uint8', height, width, 1, pixels);
    blurred = OpenCV.Mat.create(height, width, DataTypes.CV_8U);
    edges = OpenCV.Mat.create(height, width, DataTypes.CV_8U);
    closed = OpenCV.Mat.create(height, width, DataTypes.CV_8U);

    OpenCV.GaussianBlur(source, blurred, OpenCV.Size.create(5, 5), 0);
    OpenCV.Canny(blurred, edges, CANNY_LOW, CANNY_HIGH);

    // Printed edges break up under uneven lighting; closing rejoins them so
    // the card reads as one contour instead of four separate strokes.
    kernel = OpenCV.getStructuringElement(
      MorphShapes.MORPH_RECT,
      OpenCV.Size.create(3, 3),
    );
    OpenCV.morphologyEx(edges, closed, MorphTypes.MORPH_CLOSE, kernel);

    contours = OpenCV.PointVectorOfVectors.create();
    OpenCV.findContours(
      closed,
      contours,
      RetrievalModes.RETR_LIST,
      ContourApproximationModes.CHAIN_APPROX_SIMPLE,
    );

    let best: CardQuad | null = null;
    let bestArea = 0;

    for (let index = 0; index < contours.length; index += 1) {
      const contour = contours.get(index);
      let approx: ReturnType<typeof OpenCV.PointVector.create> | null = null;

      try {
        const perimeter = OpenCV.arcLength(contour, true).value;
        if (perimeter <= 0) {
          continue;
        }

        approx = OpenCV.PointVector.create();
        OpenCV.approxPolyDP(contour, approx, POLY_EPSILON_RATIO * perimeter, true);
        if (approx.length !== 4) {
          continue;
        }

        const corners: QuadPoint[] = approx
          .getAll()
          .map((point) => ({ x: point.x, y: point.y }));

        const ordered = orderQuadCorners(corners);
        if (!ordered || !isPlausibleCard(ordered, width, height)) {
          continue;
        }

        const area = quadArea(ordered);
        if (area > bestArea) {
          bestArea = area;
          best = ordered;
        }
      } finally {
        approx?.release();
        contour.release();
      }
    }

    if (!best) {
      return null;
    }

    const normalized = [
      { x: best[0].x / width, y: best[0].y / height },
      { x: best[1].x / width, y: best[1].y / height },
      { x: best[2].x / width, y: best[2].y / height },
      { x: best[3].x / width, y: best[3].y / height },
    ] as CardQuad;

    return quadToPreviewSpace(normalized, sample.orientation, sample.isMirrored);
  } catch {
    // A malformed frame should stall the overlay, not crash the scanner.
    return null;
  } finally {
    contours?.release();
    kernel?.release();
    closed?.release();
    edges?.release();
    blurred?.release();
    source?.release();
  }
}
