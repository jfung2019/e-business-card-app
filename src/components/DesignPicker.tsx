import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DESIGN_PRESETS } from '../theme/cardDesigns';
import { walletColors } from '../theme/wallet';

interface DesignPickerProps {
  selectedDesignId: string;
  onSelect: (designId: string) => void;
}

export function DesignPicker({
  selectedDesignId,
  onSelect,
}: DesignPickerProps): React.JSX.Element {
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

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: walletColors.title,
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
    borderColor: walletColors.title,
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
