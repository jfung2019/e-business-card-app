import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  type ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';

import { ApiClientError } from '../api/client';
import { reorderUserCards } from '../api/userCards';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

type ReorderRoute = RouteProp<MainStackParamList, 'ReorderMyCards'>;
type ReorderNavigation = NativeStackNavigationProp<MainStackParamList, 'ReorderMyCards'>;
type ReorderStyles = ReturnType<typeof createStyles>;

const CARD_ROW_HEIGHT = 104;
const CARD_ROW_GAP = 12;
const CARD_ITEM_HEIGHT = CARD_ROW_HEIGHT + CARD_ROW_GAP;

function cardsWithStableIds(cards: UserCard[] | undefined): UserCard[] {
  return (cards ?? []).filter(card => typeof card._id === 'string' && card._id.length > 0);
}

interface CardRowProps {
  item: UserCard;
  isPrimary: boolean;
  styles: ReorderStyles;
}

const CardRow: React.FC<CardRowProps> = memo(({ item, isPrimary, styles }) => {
  const drag = useReorderableDrag();

  return (
    <View style={styles.cell}>
      <Pressable
        onLongPress={drag}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel="Long press and drag to reorder card"
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
      </Pressable>
    </View>
  );
});

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    introCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 12,
    },
    eyebrow: {
      color: wallet.accentMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: wallet.title,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.2,
      marginTop: 6,
    },
    hint: {
      color: wallet.subtitle,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
    },
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
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
      marginHorizontal: 20,
      marginTop: 8,
    },
    emptyText: {
      color: wallet.subtitle,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: 20,
    },
    saveButton: {
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 12,
      marginBottom: 20,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: wallet.addButtonText,
      fontWeight: '700',
      fontSize: 16,
    },
  });
}

export function ReorderMyCardsScreen(): React.JSX.Element {
  const navigation = useNavigation<ReorderNavigation>();
  const route = useRoute<ReorderRoute>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);

  const [data, setData] = useState<UserCard[]>(() => cardsWithStableIds(route.params.cards));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReorder = useCallback(({ from, to }: ReorderableListReorderEvent) => {
    setData(value => reorderItems(value, from, to));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await reorderUserCards(data.map(card => card._id));
      navigation.navigate('Collection');
    } catch (saveError) {
      const message =
        saveError instanceof ApiClientError
          ? saveError.message
          : 'Unable to save card order.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [data, navigation]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<UserCard>) => (
      <CardRow item={item} isPrimary={index === 0} styles={styles} />
    ),
    [styles],
  );

  const keyExtractor = useCallback((item: UserCard) => item._id, []);

  const getItemLayout = useCallback(
    (_items: ArrayLike<UserCard> | null | undefined, index: number) => ({
      length: CARD_ITEM_HEIGHT,
      offset: CARD_ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const listEmpty = useMemo(
    () => <Text style={styles.emptyText}>No cards available to reorder right now.</Text>,
    [styles],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.introCard}>
        <Text style={styles.eyebrow}>Card order</Text>
        <Text style={styles.title}>Choose what people see first</Text>
        <Text style={styles.hint}>
          Long-press a card and drag to the list edge to scroll. The first card becomes your
          primary card.
        </Text>
      </View>

      <ReorderableList
        data={data}
        extraData={data}
        onReorder={handleReorder}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        animationDuration={280}
        autoscrollThreshold={0.18}
        autoscrollThresholdOffset={{ start: 24, end: 24 }}
        autoscrollSpeedScale={0.55}
        autoscrollDelay={120}
        autoscrollActivationDelta={12}
        scrollEnabled
        ListEmptyComponent={listEmpty}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
      >
        {saving ? (
          <ActivityIndicator color={wallet.addButtonText} />
        ) : (
          <Text style={styles.saveButtonText}>Save order</Text>
        )}
      </Pressable>
    </View>
  );
}
