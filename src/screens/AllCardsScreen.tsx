import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useCards } from '../hooks/useCards';
import { useUserCards } from '../hooks/useUserCards';
import { useOfflineCardSync } from '../hooks/useOfflineCardSync';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard, CoreFields } from '../types/card';
import type { UserCard } from '../types/userCard';
import { filterCardsByQuery } from '../utils/filterCards';

type AllCardsRoute = RouteProp<MainStackParamList, 'AllCards'>;
type AllCardsNavigation = NativeStackNavigationProp<MainStackParamList, 'AllCards'>;

type CardMode = 'my' | 'collected';

function buildSubtitle(coreFields: CoreFields): string {
  return [coreFields.job_title, coreFields.company_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' · ');
}

function buildDetailLine(coreFields: CoreFields): string | null {
  const phone = coreFields.phone?.trim();
  const email = coreFields.email?.trim();
  if (phone) {
    return phone;
  }
  if (email) {
    return email;
  }
  return null;
}

function CardRow({
  coreFields,
  isPrimary,
  onPress,
  styles,
}: {
  coreFields: CoreFields;
  isPrimary?: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  const subtitle = buildSubtitle(coreFields);
  const detail = buildDetailLine(coreFields);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowCopy}>
        <View style={styles.rowNameLine}>
          <Text style={styles.rowName} numberOfLines={1}>
            {coreFields.name}
          </Text>
          {isPrimary ? <Text style={styles.primaryBadge}>Primary</Text> : null}
        </View>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Text style={styles.rowChevron}>›</Text>
    </Pressable>
  );
}

export function AllCardsScreen(): React.JSX.Element {
  const navigation = useNavigation<AllCardsNavigation>();
  const route = useRoute<AllCardsRoute>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [mode, setMode] = useState<CardMode>(route.params?.initialMode ?? 'collected');
  const [query, setQuery] = useState('');

  const { cards, fetchCards } = useCards();
  const { cards: userCards, fetchUserCards } = useUserCards();
  const { syncQueuedScans } = useOfflineCardSync();

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        await syncQueuedScans();
        await Promise.all([fetchCards(), fetchUserCards()]);
      })();
    }, [fetchCards, fetchUserCards, syncQueuedScans]),
  );

  const filteredCollectedCards = useMemo(
    () => filterCardsByQuery(cards, query),
    [cards, query],
  );
  const filteredUserCards = useMemo(
    () => filterCardsByQuery(userCards, query),
    [userCards, query],
  );

  const handleCollectedCardPress = (card: CapturedCard) => {
    navigation.navigate('CardDetail', { card });
  };

  const handleMyCardPress = (card: UserCard) => {
    navigation.navigate('MyCardForm', { mode: 'edit', card });
  };

  const totalCount = mode === 'my' ? userCards.length : cards.length;
  const filteredCount = mode === 'my' ? filteredUserCards.length : filteredCollectedCards.length;
  const noun = mode === 'my' ? 'card' : 'contact';

  return (
    <View style={styles.screen}>
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => setMode('my')}
          style={[styles.modeButton, mode === 'my' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeButtonText, mode === 'my' && styles.modeButtonTextActive]}>
            My cards
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode('collected')}
          style={[styles.modeButton, mode === 'collected' && styles.modeButtonActive]}
        >
          <Text
            style={[styles.modeButtonText, mode === 'collected' && styles.modeButtonTextActive]}
          >
            Collected
          </Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, company, phone, email…"
          placeholderTextColor={wallet.subtitle}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <Text style={styles.resultMeta}>
        {query.trim()
          ? `${filteredCount} of ${totalCount} ${totalCount === 1 ? noun : `${noun}s`}`
          : `${totalCount} ${totalCount === 1 ? noun : `${noun}s`}`}
      </Text>

      {mode === 'my' ? (
        <FlatList
          data={filteredUserCards}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <CardRow
              coreFields={item.core_fields}
              isPrimary={item.is_primary}
              onPress={() => handleMyCardPress(item)}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query.trim() ? 'No matches' : 'No cards yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {query.trim()
                  ? 'Try a different name, company, phone number, or email.'
                  : 'Scan or create a card to see it here.'}
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredCollectedCards}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <CardRow
              coreFields={item.core_fields}
              onPress={() => handleCollectedCardPress(item)}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query.trim() ? 'No matches' : 'No collected cards yet'}
              </Text>
              <Text style={styles.emptyBody}>
                {query.trim()
                  ? 'Try a different name, company, phone number, or email.'
                  : 'Scanned contacts will appear here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    modeToggle: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 12,
      padding: 4,
      borderRadius: 14,
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
      gap: 4,
    },
    modeButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 10,
    },
    modeButtonActive: {
      backgroundColor: wallet.addButton,
    },
    modeButtonText: {
      color: wallet.subtitle,
      fontSize: 14,
      fontWeight: '600',
    },
    modeButtonTextActive: {
      color: wallet.addButtonText,
    },
    searchWrap: {
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
    },
    searchInput: {
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: wallet.title,
      fontSize: 16,
    },
    resultMeta: {
      paddingHorizontal: 20,
      paddingBottom: 10,
      color: wallet.subtitle,
      fontSize: 13,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 24,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: wallet.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowPressed: {
      opacity: 0.85,
    },
    rowCopy: {
      flex: 1,
      gap: 3,
    },
    rowNameLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rowName: {
      color: wallet.title,
      fontSize: 17,
      fontWeight: '700',
      flexShrink: 1,
    },
    primaryBadge: {
      color: wallet.addButtonText,
      backgroundColor: wallet.addButton,
      borderRadius: 999,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontSize: 11,
      fontWeight: '700',
    },
    rowSubtitle: {
      color: wallet.subtitle,
      fontSize: 14,
    },
    rowDetail: {
      color: wallet.accentMuted,
      fontSize: 14,
    },
    rowChevron: {
      color: wallet.subtitle,
      fontSize: 22,
      lineHeight: 24,
    },
    emptyState: {
      paddingTop: 48,
      paddingHorizontal: 12,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      color: wallet.title,
      fontSize: 18,
      fontWeight: '700',
    },
    emptyBody: {
      color: wallet.subtitle,
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
