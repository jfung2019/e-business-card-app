import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ApiClientError } from '../api/client';
import { deleteCard } from '../api/cards';
import { CustomFieldsList } from '../components/CustomFieldsList';
import { ScanImage } from '../components/ScanImage';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { useAppTheme } from '../context/ThemeContext';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CoreFields } from '../types/card';
import { formatScannedDate } from '../utils/formatDate';

type CardDetailProps = NativeStackScreenProps<MainStackParamList, 'CardDetail'>;
type CardDetailNavigation = NativeStackNavigationProp<MainStackParamList, 'CardDetail'>;

const CONTACT_FIELD_LABELS: Array<{ key: keyof CoreFields; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

type QuickAction = {
  key: string;
  label: string;
  onPress: () => void;
};

function buildSubtitle(coreFields: CoreFields): string {
  return [coreFields.job_title, coreFields.company_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' · ');
}

function normalizeWebsite(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

export function CardDetailScreen({ route }: CardDetailProps): React.JSX.Element {
  const navigation = useNavigation<CardDetailNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { card } = route.params;
  const {
    core_fields,
    custom_fields,
    scanned_at,
    scan_image_url,
    scan_image_front_url,
    scan_image_back_url,
  } = card;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtitle = buildSubtitle(core_fields);
  const scanImages = [
    { label: scan_image_back_url ? 'Front scan' : 'Original scan', url: scan_image_front_url ?? scan_image_url },
    { label: 'Back scan', url: scan_image_back_url },
  ].filter((image): image is { label: string; url: string } => Boolean(image.url));

  const quickActions: QuickAction[] = [];
  if (core_fields.phone?.trim()) {
    const phone = core_fields.phone.trim();
    quickActions.push({
      key: 'phone',
      label: 'Call',
      onPress: () => void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`),
    });
  }
  if (core_fields.email?.trim()) {
    const email = core_fields.email.trim();
    quickActions.push({
      key: 'email',
      label: 'Email',
      onPress: () => void Linking.openURL(`mailto:${email}`),
    });
  }
  if (core_fields.website?.trim()) {
    const website = core_fields.website.trim();
    quickActions.push({
      key: 'website',
      label: 'Website',
      onPress: () => void Linking.openURL(normalizeWebsite(website)),
    });
  }

  const handleDelete = () => {
    void (async () => {
      setDeleting(true);
      setError(null);
      try {
        await deleteCard(card._id);
        navigation.navigate('Collection');
      } catch (deleteError) {
        const message =
          deleteError instanceof ApiClientError
            ? deleteError.message
            : 'Unable to delete this card.';
        setError(message);
      } finally {
        setDeleting(false);
      }
    })();
  };

  const openField = (key: keyof CoreFields, value: string) => {
    if (key === 'phone') {
      void Linking.openURL(`tel:${value.replace(/\s/g, '')}`);
      return;
    }
    if (key === 'email') {
      void Linking.openURL(`mailto:${value}`);
      return;
    }
    if (key === 'website') {
      void Linking.openURL(normalizeWebsite(value));
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {scanImages.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original scans</Text>
          {scanImages.map(image => (
            <View key={image.label} style={styles.scanCard}>
              <Text style={styles.scanLabel}>{image.label}</Text>
              <ScanImage
                scanImageUrl={image.url}
                style={styles.scanImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Contact</Text>
        <Text style={styles.name}>{core_fields.name}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.meta}>Added {formatScannedDate(scanned_at)}</Text>
      </View>

      {quickActions.length > 0 ? (
        <View style={styles.actionsRow}>
          {quickActions.map(action => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {CONTACT_FIELD_LABELS.some(({ key }) => core_fields[key]) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact details</Text>
          {CONTACT_FIELD_LABELS.map(({ key, label }) => {
            const value = core_fields[key];
            if (!value) {
              return null;
            }
            return (
              <Pressable
                key={key}
                onPress={() => openField(key, value)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={styles.label}>{label}</Text>
                <Text style={[styles.value, styles.valueLink]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {Object.keys(custom_fields).length > 0 ? (
        <CustomFieldsList customFields={custom_fields} />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable
        onPress={handleDelete}
        disabled={deleting}
        style={styles.deleteButton}
      >
        {deleting ? (
          <ActivityIndicator color={wallet.error} />
        ) : (
          <Text style={styles.deleteText}>Delete card</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
} as const;

const createStyles = (wallet: WalletThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: wallet.background,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  scanCard: {
    backgroundColor: wallet.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: wallet.border,
    overflow: 'hidden',
  },
  scanLabel: {
    color: wallet.subtitle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  scanImage: {
    width: '100%',
    aspectRatio: 1.586,
    backgroundColor: wallet.background,
  },
  heroCard: {
    backgroundColor: wallet.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wallet.border,
    padding: 22,
    gap: 6,
    borderTopWidth: 3,
    borderTopColor: wallet.accent,
    ...cardShadow,
  },
  eyebrow: {
    color: wallet.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  name: {
    color: wallet.title,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: wallet.subtitle,
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    marginTop: 6,
    color: wallet.subtitle,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: wallet.addButton,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonText: {
    color: wallet.addButtonText,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: wallet.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: wallet.border,
    padding: 18,
    gap: 14,
    ...cardShadow,
  },
  sectionTitle: {
    color: wallet.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    gap: 4,
    borderRadius: 8,
    paddingVertical: 2,
  },
  rowPressed: {
    opacity: 0.7,
  },
  label: {
    color: wallet.subtitle,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: wallet.title,
    fontSize: 16,
    lineHeight: 22,
  },
  valueLink: {
    color: wallet.accentMuted,
  },
  errorText: {
    color: wallet.error,
    textAlign: 'center',
    fontSize: 14,
  },
  deleteButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  deleteText: {
    color: wallet.error,
    fontWeight: '600',
    fontSize: 16,
  },
});

