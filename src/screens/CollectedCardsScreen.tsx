import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useCards } from '../hooks/useCards';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CapturedCard, CoreFields } from '../types/card';
import { filterCollectedCards } from '../utils/filterCollectedCards';

type CollectedCardsNavigation = NativeStackNavigationProp<MainStackParamList, 'CollectedCards'>;

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

function CollectedCardRow({
  card,
  onPress,
  styles,
}: {
  card: CapturedCard;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  const subtitle = buildSubtitle(card.core_fields);
  const detail = buildDetailLine(card.core_fields);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowName} numberOfLines={1}>
          {card.core_fields.name}
        </Text>
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

export function CollectedCardsScreen(): React.JSX.Element {
  const navigation = useNavigation<CollectedCardsNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { cards, fetchCards } = useCards();
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void fetchCards();
    }, [fetchCards]),
  );

  const filteredCards = useMemo(
    () => filterCollectedCards(cards, query),
    [cards, query],
  );

  const handleCardPress = (card: CapturedCard) => {
    navigation.navigate('CardDetail', { card });
  };

  return (
    <View style={styles.screen}>
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
          ? `${filteredCards.length} of ${cards.length} contacts`
          : `${cards.length} ${cards.length === 1 ? 'contact' : 'contacts'}`}
      </Text>

      <FlatList
        data={filteredCards}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <CollectedCardRow
            card={item}
            onPress={() => handleCardPress(item)}
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
    </View>
  );
}

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: wallet.background,
    },
    searchWrap: {
      paddingHorizontal: 20,
      paddingTop: 12,
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
    rowName: {
      color: wallet.title,
      fontSize: 17,
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
