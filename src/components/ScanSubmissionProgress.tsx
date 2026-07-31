import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';

interface ScanSubmissionProgressProps {
  progressWidth: Animated.AnimatedInterpolation<string>;
  isHolding?: boolean;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    track: {
      width: '100%',
      maxWidth: 280,
      height: 6,
      borderRadius: 999,
      backgroundColor: wallet.border,
      overflow: 'hidden',
    },
    fill: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
      backgroundColor: wallet.addButton,
      overflow: 'hidden',
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 72,
      backgroundColor: 'rgba(255, 255, 255, 0.28)',
    },
  });
}

export function ScanSubmissionProgress({
  progressWidth,
  isHolding = false,
}: ScanSubmissionProgressProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const pulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isHolding) {
      pulse.setValue(1);
      shimmer.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.72,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [isHolding, pulse, shimmer]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-72, 280],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={{ width: progressWidth, height: '100%' }}>
        <Animated.View style={[styles.fill, { opacity: pulse }]}>
          {isHolding ? (
            <Animated.View
              style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
            />
          ) : null}
        </Animated.View>
      </Animated.View>
    </View>
  );
}
