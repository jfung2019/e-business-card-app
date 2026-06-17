import React, { useMemo } from 'react';
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

import { useAppTheme } from '../context/ThemeContext';
import { useAuthenticatedImageSource } from '../utils/scanImage';

interface ScanImageProps extends Omit<ImageProps, 'source'> {
  scanImageUrl: string | null | undefined;
}

export function ScanImage({
  scanImageUrl,
  style,
  ...imageProps
}: ScanImageProps): React.JSX.Element | null {
  const { wallet } = useAppTheme();
  const source = useAuthenticatedImageSource(scanImageUrl);
  const placeholderStyle = useMemo(
    () => ({
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: wallet.background,
    }),
    [wallet.background],
  );

  if (!scanImageUrl) {
    return null;
  }
  if (!source) {
    return (
      <View style={[placeholderStyle, style]}>
        <ActivityIndicator color={wallet.accent} />
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
  const { wallet } = useAppTheme();
  const source = useAuthenticatedImageSource(scanImageUrl);
  const placeholderStyle = useMemo(
    () => ({
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: wallet.background,
    }),
    [wallet.background],
  );

  if (!scanImageUrl) {
    return null;
  }

  if (!source) {
    return (
      <View style={[style, placeholderStyle]}>
        <ActivityIndicator color={wallet.accent} />
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
