import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryButton } from '../components/SecondaryButton';
import { useCardPrefs } from '../context/CardPrefsContext';
import { useAppTheme } from '../context/ThemeContext';
import { useCards } from '../hooks/useCards';
import { useOfflineCardSync } from '../hooks/useOfflineCardSync';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import { getCardDesign } from '../theme/cardDesigns';
import type { CapturedCard } from '../types/card';
import { filterCardsByQuery } from '../utils/filterCards';
import {
  compareBySortKey,
  getChineseName,
  resolveSortKey,
  sectionLetter,
  sortedNameDisplay,
  type NameSortMode,
} from '../utils/nameSort';
import { hasScanImage } from '../utils/walletDisplay';

type CollectedNavigation = NativeStackNavigationProp<MainStackParamList, 'Collection'>;

interface Section {
  title: string | null;
  data: CapturedCard[];
}

const SORT_CHIPS: { mode: NameSortMode; label: string }[] = [
  { mode: 'recent', label: 'Recent' },
  { mode: 'first', label: 'First name' },
  { mode: 'last', label: 'Last name' },
  { mode: 'company', label: 'Company' },
];

function buildSections(cards: CapturedCard[], mode: NameSortMode): Section[] {
  if (mode === 'recent') {
    const sorted = [...cards].sort(
      (a, b) => Date.parse(b.scanned_at ?? '') - Date.parse(a.scanned_at ?? ''),
    );
    return [{ title: null, data: sorted }];
  }

  const withKeys = cards.map(card => ({ card, key: resolveSortKey(card, mode) }));
  withKeys.sort((a, b) => compareBySortKey(a.key, b.key));

  const sections: Section[] = [];
  withKeys.forEach(({ card, key }) => {
    const letter = sectionLetter(key);
    const last = sections[sections.length - 1];
    if (last && last.title === letter) {
      last.data.push(card);
      return;
    }
    sections.push({ title: letter, data: [card] });
  });
  return sections;
}

export function CollectedScreen(): React.JSX.Element {
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const navigation = useNavigation<CollectedNavigation>();
  const insets = useSafeAreaInsets();
  const { designId } = useCardPrefs();
  const design = useMemo(() => getCardDesign(designId), [designId]);
  const { state, cards, fetchCards } = useCards();
  const { syncQueuedScans } = useOfflineCardSync();

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<NameSortMode>('recent');

  const refresh = useCallback(async () => {
    await syncQueuedScans();
    await fetchCards();
  }, [fetchCards, syncQueuedScans]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const sections = useMemo(
    () => buildSections(filterCardsByQuery(cards, query), sortMode),
    [cards, query, sortMode],
  );

  const isEmpty = cards.length === 0 && state.status !== 'loading';
  const noMatches = cards.length > 0 && sections.every(section => section.data.length === 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Collected</Text>
        <Text style={styles.subtitle}>
          {cards.length === 0
            ? 'Cards you take from other people'
            : `${cards.length} ${cards.length === 1 ? 'contact' : 'contacts'}`}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, company, phone"
          placeholderTextColor={wallet.subtitle}
          style={styles.search}
          autoCorrect={false}
          accessibilityLabel="Search collected cards"
        />
      </View>

      <View style={styles.chipRow}>
        {SORT_CHIPS.map(chip => {
          const active = chip.mode === sortMode;
          return (
            <Pressable
              key={chip.mode}
              onPress={() => setSortMode(chip.mode)}
              accessibilityRole="button"
              accessibilityState={active ? { selected: true } : {}}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {state.status === 'loading' && cards.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={wallet.title} />
        </View>
      ) : null}

      {isEmpty ? (
        <View style={styles.empty}>
          <View style={styles.ghostCard}>
            <Text style={styles.ghostText}>Contacts you scan land here</Text>
          </View>
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptyBody}>
            Scan someone's card with the camera button below. Front first, back only if it
            has more on it.
          </Text>
          <SecondaryButton label="Scan a card" onPress={() => navigation.navigate('Scan')} />
        </View>
      ) : null}

      {noMatches ? (
        <View style={styles.centered}>
          <Text style={styles.emptyBody}>No card matches “{query.trim()}”.</Text>
        </View>
      ) : null}

      <SectionList
        sections={sections}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={styles.sectionHeader}>{section.title}</Text> : null
        }
        renderItem={({ item }) => {
          const subtitle = [item.core_fields.job_title, item.core_fields.company_name]
            .filter((value): value is string => Boolean(value?.trim()))
            .join(' · ');
          const detail = item.core_fields.phone ?? item.core_fields.email ?? '';
          const chineseName = getChineseName(item.core_fields, item.custom_fields);
          // While the list is sorted by name, the family name leads and is set
          // in bold so the eye lands on what the section letter came from.
          const sortedName =
            sortMode === 'first' || sortMode === 'last'
              ? sortedNameDisplay(item.core_fields, item.custom_fields)
              : null;

          return (
            <Pressable
              onPress={() => navigation.navigate('CardDetail', { card: item })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.thumb, { backgroundColor: design.background }]}>
                <View style={[styles.thumbBar, { backgroundColor: design.text }]} />
                <View style={[styles.thumbBarShort, { backgroundColor: design.muted }]} />
              </View>
              <View style={styles.rowCopy}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {sortedName ? (
                      <>
                        <Text style={styles.rowTitleLead}>{sortedName.lead}</Text>
                        {sortedName.rest ? <Text>{sortedName.rest}</Text> : null}
                      </>
                    ) : (
                      item.core_fields.name
                    )}
                    {chineseName ? (
                      <Text style={styles.rowTitleAlt}>{`  ·  ${chineseName}`}</Text>
                    ) : null}
                  </Text>
                  {!hasScanImage(item) ? (
                    <Text style={styles.typedTag}>Typed in</Text>
                  ) : null}
                </View>
                {subtitle ? (
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
                {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
              </View>
            </Pressable>
          );
        }}
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
    header: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 2,
    },
    title: {
      fontSize: 27,
      fontWeight: '700',
      color: wallet.title,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 13,
      color: wallet.subtitle,
    },
    searchWrap: {
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    search: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: wallet.border,
      backgroundColor: wallet.surface,
      paddingHorizontal: 14,
      fontSize: 15,
      color: wallet.title,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    chipActive: {
      backgroundColor: wallet.addButton,
      borderColor: wallet.addButton,
    },
    chipLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: wallet.subtitle,
    },
    chipLabelActive: {
      color: wallet.addButtonText,
    },
    pressed: {
      opacity: 0.85,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 28,
      gap: 10,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      color: wallet.accentMuted,
      paddingTop: 8,
      paddingBottom: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: wallet.border,
      backgroundColor: wallet.surface,
    },
    thumb: {
      width: 54,
      height: 34,
      borderRadius: 7,
      paddingHorizontal: 8,
      justifyContent: 'center',
      gap: 3,
    },
    thumbBar: {
      width: 26,
      height: 3,
      borderRadius: 2,
    },
    thumbBarShort: {
      width: 16,
      height: 3,
      borderRadius: 2,
    },
    rowCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    rowTitle: {
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '500',
      color: wallet.title,
    },
    rowTitleLead: {
      fontWeight: '700',
    },
    rowTitleAlt: {
      fontWeight: '400',
      color: wallet.subtitle,
    },
    typedTag: {
      fontSize: 10,
      fontWeight: '700',
      color: wallet.subtitle,
      backgroundColor: wallet.background,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    rowSubtitle: {
      fontSize: 12,
      color: wallet.subtitle,
    },
    rowDetail: {
      fontSize: 12,
      color: wallet.accentMuted,
    },
    centered: {
      paddingVertical: 32,
      alignItems: 'center',
      gap: 10,
    },
    empty: {
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    ghostCard: {
      width: '100%',
      height: 160,
      borderRadius: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: wallet.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: {
      color: wallet.subtitle,
      fontSize: 13,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: wallet.title,
    },
    emptyBody: {
      fontSize: 14,
      lineHeight: 21,
      color: wallet.subtitle,
      textAlign: 'center',
      maxWidth: 300,
    },
  });
