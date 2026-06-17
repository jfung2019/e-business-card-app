import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import { CARD_DESIGN_PRESETS } from '../theme/cardDesigns';
import type { WalletThemeColors } from '../theme/appTheme';

interface DesignPickerProps {
  selectedDesignId: string;
  onSelect: (designId: string) => void;
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: wallet.title,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    swatch: {
      width: '31%',
      minWidth: 96,
      height: 72,
      borderRadius: 14,
      padding: 10,
      justifyContent: 'space-between',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    swatchSelected: {
      borderColor: wallet.title,
    },
    swatchAccent: {
      width: 24,
      height: 24,
      borderRadius: 12,
      opacity: 0.8,
    },
    swatchLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
}

export function DesignPicker({
  selectedDesignId,
  onSelect,
}: DesignPickerProps): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card design</Text>
      <View style={styles.grid}>
        {CARD_DESIGN_PRESETS.map(preset => {
          const selected = preset.id === selectedDesignId;
          return (
            <Pressable
              key={preset.id}
              onPress={() => onSelect(preset.id)}
              style={[
                styles.swatch,
                { backgroundColor: preset.background },
                selected && styles.swatchSelected,
              ]}
            >
              <View style={[styles.swatchAccent, { backgroundColor: preset.accent }]} />
              <Text style={[styles.swatchLabel, { color: preset.text }]}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
