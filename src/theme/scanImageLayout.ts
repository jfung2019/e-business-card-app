/**
 * How a scanned card photo is framed, everywhere it appears. The Review Scan
 * screen set the standard; the wallet, My Card, the card form preview, card
 * detail and shared-card preview all follow it so a scan looks the same on
 * every screen.
 *
 * A frame takes the photo's own aspect ratio (see `utils/scanImageAspect`), so
 * nothing is cropped and there are no letterbox bars. This ratio is only the
 * fallback until the photo has been measured.
 */
export const SCAN_IMAGE_ASPECT_RATIO = 1.57;
/**
 * A measured ratio is clamped to this range so a bad crop (or a portrait card)
 * cannot produce a towering or sliver-thin frame; outside it, the photo is
 * letterboxed instead.
 */
export const SCAN_IMAGE_MIN_ASPECT_RATIO = 1.3;
export const SCAN_IMAGE_MAX_ASPECT_RATIO = 2.0;
export const SCAN_IMAGE_BORDER_RADIUS = 14;
/** Never cropped: printed text runs to the edge of most cards. */
export const SCAN_IMAGE_RESIZE_MODE = 'contain' as const;
