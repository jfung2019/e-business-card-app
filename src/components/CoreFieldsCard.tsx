import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CoreFields } from '../types/card';

interface CoreFieldsCardProps {
  fields: CoreFields;
}

const CORE_FIELD_LABELS: Array<{ key: keyof CoreFields; label: string }> = [
  { key: 'name', label: 'Name' },
  { key: 'company_name', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
];

export function CoreFieldsCard({ fields }: CoreFieldsCardProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Contact</Text>
      {CORE_FIELD_LABELS.map(({ key, label }) => {
        const value = fields[key];
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
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#111827',
  },
});
