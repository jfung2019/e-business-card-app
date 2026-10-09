import React from 'react';
import type { ImageStyle, StyleProp } from 'react-native';

import { SCAN_IMAGE_RESIZE_MODE } from '../theme/scanImageLayout';
import { useScanImageAspectRatio } from '../utils/scanImageAspect';
import { ScanImage } from './ScanImage';

/**
 * A scan photo in a frame shaped to the photo itself: never cropped, never
 * letterboxed. `style` sets the width, corners and background.
 */
export function ScanPhotoFrame({
  scanImageUrl,
  style,
}: {
  scanImageUrl: string | null | undefined;
  style?: StyleProp<ImageStyle>;
}): React.JSX.Element | null {
  const aspectRatio = useScanImageAspectRatio(scanImageUrl);
  return (
    <ScanImage
      scanImageUrl={scanImageUrl}
      style={[style, { aspectRatio }]}
      resizeMode={SCAN_IMAGE_RESIZE_MODE}
    />
  );
}
