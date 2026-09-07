import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

export const CARD_ROW_HEIGHT = 104;
export const CARD_ROW_GAP = 12;
export const CARD_ITEM_HEIGHT = CARD_ROW_HEIGHT + CARD_ROW_GAP;
export const CARD_LONG_PRESS_DELAY = 300;
export const CARD_LIST_HORIZONTAL_PADDING = 20;

interface DraggingCardProps {
  item: UserCard;
  isPrimary: boolean;
  preview?: boolean;
}

/**
 * Presentational card row. Deliberately inert: pickup is owned by the single
 * long-press gesture in CardDragArea, so nothing here competes for the touch.
 */
export const DraggingCard: React.FC<DraggingCardProps> = memo(
  ({ item, isPrimary, preview }) => {
    const { wallet } = useAppTheme();
    const styles = useMemo(() => createCardStyles(wallet), [wallet]);

    return (
      <View style={styles.cell} pointerEvents="none">
        <View
          style={styles.card}
          accessibilityRole={preview ? 'none' : 'button'}
          accessibilityLabel={preview ? undefined : 'Long press and drag to reorder card'}
        >
          <View style={styles.cardMeta}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.core_fields.name || 'Untitled card'}
            </Text>
            {isPrimary ? <Text style={styles.primaryBadge}>Primary</Text> : null}
          </View>
          <Text style={styles.cardCompany} numberOfLines={1}>
            {item.core_fields.company_name || 'No company'}
          </Text>
          <Text style={styles.cardDetails} numberOfLines={1}>
            {item.core_fields.job_title || item.core_fields.email || 'Business card'}
          </Text>
        </View>
      </View>
    );
  },
);

function createCardStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    cell: {
      height: CARD_ITEM_HEIGHT,
      paddingBottom: CARD_ROW_GAP,
    },
    card: {
      height: CARD_ROW_HEIGHT,
      justifyContent: 'center',
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
    },
    cardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    cardName: {
      color: wallet.title,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
    },
    primaryBadge: {
      color: wallet.addButtonText,
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 11,
      fontWeight: '700',
    },
    cardCompany: {
      color: wallet.title,
      fontSize: 16,
      fontWeight: '600',
    },
    cardDetails: {
      color: wallet.subtitle,
      fontSize: 13,
      marginTop: 4,
    },
  });
}
