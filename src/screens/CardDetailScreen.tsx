import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { CustomFieldsList } from '../components/CustomFieldsList';
import { ScanImage } from '../components/ScanImage';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { luxuryColors } from '../theme/luxury';
import type { CoreFields } from '../types/card';
import { formatScannedDate } from '../utils/formatDate';

type CardDetailProps = NativeStackScreenProps<MainStackParamList, 'CardDetail'>;

const CORE_FIELD_LABELS: Array<{ key: keyof CoreFields; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'company_name', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

export function CardDetailScreen({ route }: CardDetailProps): React.JSX.Element {
  const { card } = route.params;
  const { core_fields, custom_fields, scanned_at, scan_image_url } = card;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {scan_image_url ? (
        <ScanImage
          scanImageUrl={scan_image_url}
          style={styles.scanImage}
          resizeMode="contain"
        />
      ) : null}

      <View style={styles.headerCard}>
        <Text style={styles.eyebrow}>CONTACT DETAILS</Text>
        <Text style={styles.name}>{core_fields.name}</Text>
        {core_fields.company_name ? (
          <Text style={styles.company}>{core_fields.company_name}</Text>
        ) : null}
        <Text style={styles.meta}>Added {formatScannedDate(scanned_at)} · Scan</Text>
      </View>

      <View style={styles.section}>
        {CORE_FIELD_LABELS.map(({ key, label }) => {
          const value = core_fields[key];
          if (!value) {
            return null;
          }
          return (
            <View key={key} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          );
        })}
      </View>

      {Object.keys(custom_fields).length > 0 && (
        <View style={styles.customSection}>
          <CustomFieldsList customFields={custom_fields} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: luxuryColors.background,
  },
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
  },
  scanImage: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 16,
    backgroundColor: luxuryColors.surface,
  },
  headerCard: {
    backgroundColor: luxuryColors.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: luxuryColors.border,
    padding: 22,
    gap: 6,
  },
  eyebrow: {
    color: luxuryColors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  name: {
    color: luxuryColors.cream,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  company: {
    color: luxuryColors.creamMuted,
    fontSize: 16,
  },
  meta: {
    marginTop: 8,
    color: luxuryColors.goldMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: luxuryColors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: luxuryColors.border,
    padding: 18,
    gap: 14,
  },
  row: {
    gap: 4,
  },
  label: {
    color: luxuryColors.goldMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  value: {
    color: luxuryColors.cream,
    fontSize: 16,
    lineHeight: 22,
  },
  customSection: {
    opacity: 0.95,
  },
});
