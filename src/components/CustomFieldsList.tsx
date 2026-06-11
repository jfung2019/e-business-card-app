import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

interface CustomFieldsListProps {
  customFields: Record<string, string>;
}

export function CustomFieldsList({
  customFields,
}: CustomFieldsListProps): React.JSX.Element | null {
  const entries = Object.entries(customFields);

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Additional Details</Text>
      <FlatList
        data={entries}
        keyExtractor={([key]) => key}
        scrollEnabled={false}
        renderItem={({ item: [key, value] }) => (
          <View style={styles.row}>
            <Text style={styles.label}>{key}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  row: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  value: {
    fontSize: 15,
    color: '#111827',
  },
  separator: {
    height: 12,
  },
});
