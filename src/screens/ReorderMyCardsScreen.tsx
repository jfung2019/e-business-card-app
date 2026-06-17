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
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
      padding: 20,
      gap: 12,
    },
    hint: {
      color: wallet.subtitle,
      fontSize: 14,
      lineHeight: 20,
    },
    list: {
      gap: 12,
      paddingBottom: 24,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowActive: {
      opacity: 0.9,
    },
    handle: {
      fontSize: 22,
      color: wallet.subtitle,
      width: 24,
      textAlign: 'center',
    },
    cardWrap: {
      flex: 1,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
    },
    saveButton: {
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 'auto',
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
  const [cards, setCards] = useState(route.params.cards);
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
        disabled={isActive}
        style={[styles.row, isActive && styles.rowActive]}
      >
        <Text style={styles.handle}>≡</Text>
        <View style={styles.cardWrap}>
          <MyCardFace card={item} compact />
        </View>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Text style={styles.hint}>Long-press and drag to reorder. The first card becomes primary.</Text>

      <DraggableFlatList
        data={cards}
        keyExtractor={item => item._id}
        onDragEnd={({ data }) => setCards(data)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
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
    </GestureHandlerRootView>
  );
}
