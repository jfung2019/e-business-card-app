import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getCardDesign } from '../theme/cardDesigns';
import type { UserCard } from '../types/userCard';

export const MY_CARD_WIDTH = 300;
export const MY_CARD_HEIGHT = 176;

interface MyCardFaceProps {
  card: UserCard;
  onPress?: () => void;
  compact?: boolean;
}

export function MyCardFace({
  card,
  onPress,
  compact = false,
}: MyCardFaceProps): React.JSX.Element {
  const design = getCardDesign(card.design_id);
  const { core_fields } = card;

  const content = (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        { backgroundColor: design.background },
      ]}
    >
      <View style={[styles.accentOrb, { backgroundColor: design.accent }]} />
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={[styles.company, { color: design.text }]} numberOfLines={1}>
            {core_fields.company_name ?? core_fields.name}
          </Text>
          {card.is_primary && (
            <Text style={[styles.primaryBadge, { color: design.muted }]}>Primary</Text>
          )}
        </View>
        <View style={styles.bottomBlock}>
          <Text style={[styles.name, { color: design.text }]} numberOfLines={1}>
            {core_fields.name}
          </Text>
          {core_fields.job_title ? (
            <Text style={[styles.subtitle, { color: design.muted }]} numberOfLines={1}>
              {core_fields.job_title}
            </Text>
          ) : null}
          {core_fields.email ? (
            <Text style={[styles.detail, { color: design.muted }]} numberOfLines={1}>
              {core_fields.email}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: MY_CARD_WIDTH,
    height: MY_CARD_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardCompact: {
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  accentOrb: {
    position: 'absolute',
    top: -36,
    right: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.24,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  company: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  primaryBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  bottomBlock: {
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  detail: {
    fontSize: 12,
    fontWeight: '500',
  },
});
