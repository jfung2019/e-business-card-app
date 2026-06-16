import React from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  type ImageProps,
  type ImageStyle,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { useAuthenticatedImageSource } from '../utils/scanImage';
import { walletColors } from '../theme/wallet';

interface ScanImageProps extends Omit<ImageProps, 'source'> {
  scanImageUrl: string | null | undefined;
}

export function ScanImage({
  scanImageUrl,
  style,
  ...imageProps
}: ScanImageProps): React.JSX.Element | null {
  const source = useAuthenticatedImageSource(scanImageUrl);
  if (!scanImageUrl) {
    return null;
  }
  if (!source) {
    return (
      <View style={[styles.placeholder, style]}>
        <ActivityIndicator color={walletColors.accent} />
      </View>
    );
  }

  return <Image {...imageProps} source={source} style={style} />;
}

interface ScanImageBackgroundProps {
  scanImageUrl: string | null | undefined;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  children?: React.ReactNode;
}

export function ScanImageBackground({
  scanImageUrl,
  style,
  imageStyle,
  resizeMode = 'cover',
  children,
}: ScanImageBackgroundProps): React.JSX.Element | null {
  const source = useAuthenticatedImageSource(scanImageUrl);
  if (!scanImageUrl) {
    return null;
  }

  if (!source) {
    return (
      <View style={[style, styles.placeholder]}>
        <ActivityIndicator color={walletColors.accent} />
        {children}
      </View>
    );
  }

  return (
    <ImageBackground
      source={source}
      style={style}
      imageStyle={imageStyle}
      resizeMode={resizeMode}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: walletColors.background,
  },
});
