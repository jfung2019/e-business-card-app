import {
  ColorConversionCodes,
  ContourApproximationModes,
  DataTypes,
  InterpolationFlags,
  MorphShapes,
  MorphTypes,
  OpenCV,
  RetrievalModes,
  type Mat,
} from 'react-native-fast-opencv';

import { readImageAsBase64 } from '../../utils/imageBase64';
import {
  isPlausibleCard,
  orderQuadCorners,
  quadArea,
  type CardQuad,
  type QuadPoint,
} from './quadGeometry';
import { decodeLuma, quadToPreviewSpace, type LumaSample } from './sampleFrameLuma';

/** Canny hysteresis thresholds, tuned for printed card edges on a desk. */
const CANNY_LOW = 40;
const CANNY_HIGH = 120;

/** approxPolyDP epsilon as a fraction of contour perimeter. */
const POLY_EPSILON_RATIO = 0.02;

/** Stills are shrunk to this long edge before detection — plenty for edges. */
const STILL_DETECT_LONG_EDGE = 480;

/**
 * Core pass shared by live and still detection: blur → Canny → close → the
 * largest plausible 4-point contour.
 *
 * Returns corners in the pixel space of `gray`. Never releases `gray` — the
 * caller owns it.
 */
function findCardCorners(gray: Mat, width: number, height: number): CardQuad | null {
  // Every Mat/vector below is released in the finally block: these are native
  // allocations, and the live detector runs several times per second.
  let blurred: Mat | null = null;
  let edges: Mat | null = null;
  let closed: Mat | null = null;
  let kernel: Mat | null = null;
  let contours: ReturnType<typeof OpenCV.PointVectorOfVectors.create> | null = null;

  try {
    blurred = OpenCV.Mat.create(height, width, DataTypes.CV_8U);
    edges = OpenCV.Mat.create(height, width, DataTypes.CV_8U);
    closed = OpenCV.Mat.create(height, width, DataTypes.CV_8U);

    OpenCV.GaussianBlur(gray, blurred, OpenCV.Size.create(5, 5), 0);
    OpenCV.Canny(blurred, edges, CANNY_LOW, CANNY_HIGH);

    // Printed edges break up under uneven lighting; closing rejoins them so
    // the card reads as one contour instead of four separate strokes.
    kernel = OpenCV.getStructuringElement(MorphShapes.MORPH_RECT, OpenCV.Size.create(3, 3));
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
      // `get` returns an owned copy (see PointVectorVectorDelegate.cpp), so
      // releasing each one here is correct, not a double free.
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

        const corners: QuadPoint[] = approx.getAll().map((point) => ({ x: point.x, y: point.y }));
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

    return best;
  } finally {
    contours?.release();
    kernel?.release();
    closed?.release();
    edges?.release();
    blurred?.release();
  }
}

function normalize(quad: CardQuad, width: number, height: number): CardQuad {
  return quad.map((corner) => ({ x: corner.x / width, y: corner.y / height })) as unknown as CardQuad;
}

/**
 * Live detection: finds the card in a preview thumbnail from the camera
 * thread. Returns corners in normalized preview space, or `null`.
 */
export function detectCardQuad(sample: LumaSample): CardQuad | null {
  const { width, height } = sample;
  const pixels = decodeLuma(typeof sample.luma === 'string' ? sample.luma : '');

  // Hard gate before any native call. `Mat.createFromBuffer` memcpys
  // width*height bytes without checking the buffer's length, so a short or
  // empty buffer reads from a null pointer and takes the app down with a
  // SIGSEGV. Bail out instead.
  if (width <= 0 || height <= 0 || pixels.length !== width * height) {
    if (__DEV__) {
      console.warn(
        `[cardScanner] discarding frame sample: expected ${width * height} ` +
          `bytes for ${width}x${height}, got ${pixels.length}`,
      );
    }
    return null;
  }

  let gray: Mat | null = null;
  try {
    gray = OpenCV.Mat.createFromBuffer('uint8', height, width, 1, pixels);
    const corners = findCardCorners(gray, width, height);
    if (!corners) {
      return null;
    }
    return quadToPreviewSpace(normalize(corners, width, height), sample.orientation, sample.isMirrored);
  } catch {
    // A malformed frame should stall the overlay, not crash the scanner.
    return null;
  } finally {
    gray?.release();
  }
}

/**
 * Still detection: finds the card in a captured, upright photo. Returns
 * corners in normalized image space, or `null`.
 *
 * More precise than the live quad — full-resolution input, no motion, no
 * smoothing lag — and it also gives manual captures a proposed crop.
 */
export async function detectCardQuadInImage(imageUri: string): Promise<CardQuad | null> {
  let color: Mat | null = null;
  let gray: Mat | null = null;
  let small: Mat | null = null;

  try {
    const base64 = await readImageAsBase64(imageUri);
    color = OpenCV.Mat.createFromBase64(base64);
    if (color.cols <= 0 || color.rows <= 0) {
      return null;
    }

    gray = OpenCV.Mat.create(color.rows, color.cols, DataTypes.CV_8U);
    OpenCV.cvtColor(color, gray, ColorConversionCodes.COLOR_BGR2GRAY);

    const scale = Math.min(1, STILL_DETECT_LONG_EDGE / Math.max(color.cols, color.rows));
    const width = Math.max(1, Math.round(color.cols * scale));
    const height = Math.max(1, Math.round(color.rows * scale));

    small = OpenCV.Mat.create(height, width, DataTypes.CV_8U);
    OpenCV.resize(gray, small, OpenCV.Size.create(width, height), 0, 0, InterpolationFlags.INTER_AREA);

    const corners = findCardCorners(small, width, height);
    return corners ? normalize(corners, width, height) : null;
  } catch {
    return null;
  } finally {
    small?.release();
    gray?.release();
    color?.release();
  }
}
