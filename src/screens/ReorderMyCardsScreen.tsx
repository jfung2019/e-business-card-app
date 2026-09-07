import React, { useCallback, useMemo, useState } from 'react';
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

import { ApiClientError } from '../api/client';
import { reorderUserCards } from '../api/userCards';
import CardBoard from '../components/CardBoard';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { UserCard } from '../types/userCard';

type ReorderRoute = RouteProp<MainStackParamList, 'ReorderMyCards'>;
type ReorderNavigation = NativeStackNavigationProp<MainStackParamList, 'ReorderMyCards'>;

function cardsWithStableIds(cards: UserCard[] | undefined): UserCard[] {
  return (cards ?? []).filter(card => typeof card._id === 'string' && card._id.length > 0);
}

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
    // Cards and the floating clone live strictly between the intro box and the
    // save button; nothing may spill into either.
    dragArea: {
      flex: 1,
      overflow: 'hidden',
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
      marginHorizontal: 20,
      marginTop: 8,
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

  return (
    <View style={styles.screen}>
      <View style={styles.introCard}>
        <Text style={styles.eyebrow}>Card order</Text>
        <Text style={styles.title}>Choose what people see first</Text>
        <Text style={styles.hint}>
          Long-press a card and drag. The first card becomes your primary card.
        </Text>
      </View>

      <View style={styles.dragArea}>
        <CardBoard cards={data} onCardsChange={setData} />
      </View>

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
