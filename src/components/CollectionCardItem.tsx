import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { luxuryColors } from '../theme/luxury';
import type { CapturedCard } from '../types/card';
import { formatScannedDate, getInitials } from '../utils/formatDate';

interface CollectionCardItemProps {
  card: CapturedCard;
  onPress: () => void;
}

export function CollectionCardItem({
  card,
  onPress,
}: CollectionCardItemProps): React.JSX.Element {
  const { core_fields, scanned_at } = card;
  const subtitle = core_fields.company_name ?? core_fields.email ?? core_fields.phone;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.accentBar} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(core_fields.name)}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {core_fields.name}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SCAN</Text>
          </View>
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.date}>Added {formatScannedDate(scanned_at)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: luxuryColors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: luxuryColors.border,
    paddingVertical: 16,
    paddingRight: 16,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: luxuryColors.gold,
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: luxuryColors.goldMuted,
    backgroundColor: luxuryColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: luxuryColors.goldLight,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    color: luxuryColors.cream,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  badge: {
    borderWidth: 1,
    borderColor: luxuryColors.goldMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: luxuryColors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  subtitle: {
    color: luxuryColors.creamMuted,
    fontSize: 14,
  },
  date: {
    color: luxuryColors.goldMuted,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    color: luxuryColors.goldMuted,
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },
});
