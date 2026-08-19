import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { MyCardFace } from '../components/MyCardFace';
import { reorderUserCards } from '../api/userCards';
import { ApiClientError } from '../api/client';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

type ReorderRoute = RouteProp<MainStackParamList, 'ReorderMyCards'>;
type ReorderNavigation = NativeStackNavigationProp<MainStackParamList, 'ReorderMyCards'>;

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    introCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      marginBottom: 16,
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 10,
    },
    rowActive: {
      opacity: 0.9,
    },
    cardWrap: {
      flex: 1,
    },
    rowMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    cardName: {
      color: wallet.title,
      fontSize: 14,
      fontWeight: '700',
      flex: 1,
      marginRight: 10,
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
    separator: {
      height: 12,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 16,
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
      marginTop: 20,
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
  const [cards, setCards] = useState<UserCard[]>(() => route.params.cards ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await reorderUserCards(cards.map(card => card._id));
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
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<UserCard>) => (
    <ScaleDecorator>
      <Pressable
        onLongPress={drag}
        delayLongPress={200}
        disabled={isActive}
        style={[styles.row, isActive && styles.rowActive]}
        accessibilityRole="button"
        accessibilityLabel="Long press and drag to reorder card"
      >
        <View style={styles.cardWrap} pointerEvents="none">
          <View style={styles.rowMeta}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.core_fields.name || 'Untitled card'}
            </Text>
            {cards[0]?._id === item._id ? (
              <Text style={styles.primaryBadge}>Primary</Text>
            ) : null}
          </View>
          <MyCardFace card={item} compact />
        </View>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <View style={styles.screen}>
      <NestableScrollContainer
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.introCard}>
          <Text style={styles.eyebrow}>Card order</Text>
          <Text style={styles.title}>Choose what people see first</Text>
          <Text style={styles.hint}>
            Long-press a card and drag to reorder. The first card becomes your primary card.
          </Text>
        </View>

        <NestableDraggableFlatList
          data={cards}
          keyExtractor={item => item._id}
          onDragEnd={({ data }) => setCards(data)}
          renderItem={renderItem}
          activationDistance={20}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No cards available to reorder right now.</Text>
          }
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => void handleSave()}
          disabled={saving}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={wallet.addButtonText} />
          ) : (
            <Text style={styles.saveButtonText}>Save order</Text>
          )}
        </Pressable>
      </NestableScrollContainer>
    </View>
  );
}
