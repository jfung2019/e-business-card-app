import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { fetchSharedCard, saveSharedCardToCollection } from '../api/shareLinks';
import { ApiClientError } from '../api/client';
import { CustomFieldsList } from '../components/CustomFieldsList';
import { ScanImage } from '../components/ScanImage';
import { SecondaryButton } from '../components/SecondaryButton';
import { useAppTheme } from '../context/ThemeContext';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import type { CoreFields } from '../types/card';

type SharedCardPreviewProps = NativeStackScreenProps<MainStackParamList, 'SharedCardPreview'>;

const CONTACT_FIELD_LABELS: Array<{ key: keyof CoreFields; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

function buildSubtitle(coreFields: CoreFields): string {
  return [coreFields.job_title, coreFields.company_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(' · ');
}

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      gap: 16,
      backgroundColor: wallet.background,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: wallet.title,
    },
    subtitle: {
      fontSize: 15,
      color: wallet.subtitle,
      lineHeight: 22,
    },
    helper: {
      fontSize: 14,
      color: wallet.subtitle,
      lineHeight: 20,
    },
    scanFrame: {
      width: '100%',
      aspectRatio: 1.586,
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: wallet.surface,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: wallet.subtitle,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    fieldRow: {
      gap: 4,
    },
    fieldLabel: {
      fontSize: 12,
      color: wallet.subtitle,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    fieldValue: {
      fontSize: 16,
      color: wallet.title,
    },
    errorText: {
      color: wallet.error,
      textAlign: 'center',
      fontWeight: '600',
    },
    actions: {
      gap: 10,
      marginTop: 8,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: wallet.background,
    },
  });
}

export function SharedCardPreviewScreen({
  route,
  navigation,
}: SharedCardPreviewProps): React.JSX.Element {
  const { token } = route.params;
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sharedCard, setSharedCard] = useState<Awaited<ReturnType<typeof fetchSharedCard>> | null>(
    null,
  );

  const loadSharedCard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const shared = await fetchSharedCard(token);
      setSharedCard(shared);
    } catch (loadError) {
      const message =
        loadError instanceof ApiClientError
          ? loadError.message
          : 'Unable to load this shared card.';
      setError(message);
      setSharedCard(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadSharedCard();
  }, [loadSharedCard]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSharedCardToCollection(token);
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Collection' },
          { name: 'CardDetail', params: { card: saved } },
        ],
      });
    } catch (saveError) {
      const message =
        saveError instanceof ApiClientError
          ? saveError.message
          : 'Unable to save this card to your collection.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={wallet.accent} />
        <Text style={styles.helper}>Loading shared card...</Text>
      </View>
    );
  }

  if (!sharedCard) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>{error ?? 'Shared card not found.'}</Text>
        <View style={styles.actionRow}>
          <SecondaryButton label="Try again" onPress={() => void loadSharedCard()} />
          <SecondaryButton
            label="Back to collection"
            onPress={() => navigation.navigate('Collection')}
          />
        </View>
      </View>
    );
  }

  const { core_fields, custom_fields, scan_image_front_url } = sharedCard;
  const subtitle = buildSubtitle(core_fields);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.helper}>Someone shared a business card with you.</Text>
      <Text style={styles.title}>{core_fields.name}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {scan_image_front_url ? (
        <View style={styles.scanFrame}>
          <ScanImage scanImageUrl={scan_image_front_url} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Contact</Text>
      {CONTACT_FIELD_LABELS.map(({ key, label }) => {
        const value = core_fields[key];
        if (!value?.trim()) {
          return null;
        }
        return (
          <View key={key} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value.trim()}</Text>
          </View>
        );
      })}

      <CustomFieldsList customFields={custom_fields} />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <SecondaryButton
          label={saving ? 'Saving...' : 'Save to collection'}
          onPress={() => void handleSave()}
          disabled={saving}
        />
        <SecondaryButton
          label="Not now"
          onPress={() => navigation.navigate('Collection')}
          disabled={saving}
        />
      </View>
    </ScrollView>
  );
}
