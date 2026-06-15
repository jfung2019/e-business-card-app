import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { luxuryColors } from '../theme/luxury';
import type { CapturedCard } from '../types/card';

interface ScanSuccessPanelProps {
  card: CapturedCard;
  onDone: () => void;
  onViewDetails: () => void;
}

export function ScanSuccessPanel({
  card,
  onDone,
  onViewDetails,
}: ScanSuccessPanelProps): React.JSX.Element {
  const scale = useRef(new Animated.Value(0.72)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideY, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, slideY]);

  const subtitle = [card.core_fields.name, card.core_fields.company_name]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View
      style={[
        styles.panel,
        {
          opacity,
          transform: [{ translateY: slideY }],
        },
      ]}
    >
      <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
        <Text style={styles.checkmark}>✓</Text>
      </Animated.View>

      <Text style={styles.title}>Card added!</Text>
      {subtitle.length > 0 ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      <Pressable
        onPress={onDone}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
      >
        <Text style={styles.primaryButtonText}>OK</Text>
      </Pressable>

      <Pressable onPress={onViewDetails} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>View details</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: luxuryColors.surfaceElevated,
    borderWidth: 1,
    borderColor: luxuryColors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(201, 169, 98, 0.18)',
    borderWidth: 2,
    borderColor: luxuryColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  checkmark: {
    color: luxuryColors.gold,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  title: {
    color: luxuryColors.cream,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: luxuryColors.creamMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    width: '100%',
    backgroundColor: luxuryColors.gold,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: luxuryColors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 6,
  },
  secondaryButtonText: {
    color: luxuryColors.goldLight,
    fontSize: 15,
    fontWeight: '600',
  },
});
