/** ISO/IEC 7810 ID-1 business card aspect (width / height). */
export const BUSINESS_CARD_ASPECT = 85.6 / 53.98;

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

/**
 * Landscape card guide centered in the camera preview.
 */
export function computeCardGuideRect(viewSize: Size): Rect {
  const horizontalPadding = Math.max(24, viewSize.width * 0.08);
  const maxWidth = viewSize.width - horizontalPadding * 2;
  // Keep the frame comfortably on-screen while staying near true card proportions.
  const maxHeight = viewSize.height * 0.36;

  let width = maxWidth;
  let height = width / BUSINESS_CARD_ASPECT;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * BUSINESS_CARD_ASPECT;
  }

  return {
    x: (viewSize.width - width) / 2,
    y: (viewSize.height - height) / 2,
    width,
    height,
  };
}

/**
 * Maps a rect from the Camera preview (resizeMode "cover") into image pixels.
 * `imageSize` must match what the user sees (same orientation as the preview).
 */
export function mapViewRectToImageRect(
  viewRect: Rect,
  viewSize: Size,
  imageSize: Size,
): Rect {
  if (viewSize.width <= 0 || viewSize.height <= 0) {
    return { x: 0, y: 0, width: imageSize.width, height: imageSize.height };
  }

  const scale = Math.max(
    viewSize.width / imageSize.width,
    viewSize.height / imageSize.height,
  );
  const displayedWidth = imageSize.width * scale;
  const displayedHeight = imageSize.height * scale;
  const offsetX = (viewSize.width - displayedWidth) / 2;
  const offsetY = (viewSize.height - displayedHeight) / 2;

  const x = (viewRect.x - offsetX) / scale;
  const y = (viewRect.y - offsetY) / scale;
  const width = viewRect.width / scale;
  const height = viewRect.height / scale;

  return clampRectToImage({ x, y, width, height }, imageSize);
}

/** Expand a rect slightly so mapping rounding does not clip card edges. */
export function expandRect(rect: Rect, factor: number, imageSize: Size): Rect {
  const padX = rect.width * factor;
  const padY = rect.height * factor;
  return clampRectToImage(
    {
      x: rect.x - padX,
      y: rect.y - padY,
      width: rect.width + padX * 2,
      height: rect.height + padY * 2,
    },
    imageSize,
  );
}

function clampRectToImage(rect: Rect, imageSize: Size): Rect {
  const x = Math.max(0, Math.min(rect.x, Math.max(0, imageSize.width - 1)));
  const y = Math.max(0, Math.min(rect.y, Math.max(0, imageSize.height - 1)));
  const width = Math.max(1, Math.min(rect.width, imageSize.width - x));
  const height = Math.max(1, Math.min(rect.height, imageSize.height - y));
  return { x, y, width, height };
}

/** True when width/height orientation differs between view and image. */
export function orientationsMismatch(viewSize: Size, imageSize: Size): boolean {
  const viewPortrait = viewSize.height >= viewSize.width;
  const imagePortrait = imageSize.height >= imageSize.width;
  return viewPortrait !== imagePortrait;
}
