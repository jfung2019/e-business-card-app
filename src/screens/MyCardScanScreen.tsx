import React, { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CoreFieldsCard } from '../components/CoreFieldsCard';
import { CustomFieldsList } from '../components/CustomFieldsList';
import { parseUserCard } from '../api/userCards';
import { ApiClientError } from '../api/client';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { extractTextFromImage, type OcrSource } from '../services/ocr';
import { walletColors } from '../theme/wallet';
import type { ParsedUserCardPreview } from '../types/userCard';

type ScanNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCardScan'>;

export function MyCardScanScreen(): React.JSX.Element {
  const navigation = useNavigation<ScanNavigation>();
  const [rawPreview, setRawPreview] = useState('');
  const [parsedPreview, setParsedPreview] = useState<ParsedUserCardPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (source: OcrSource) => {
    setLoading(true);
    setError(null);
    setParsedPreview(null);
    setRawPreview('');

    try {
      const ocrText = await extractTextFromImage(source);
      setRawPreview(ocrText);
      const parsed = await parseUserCard(ocrText);
      setParsedPreview(parsed);
    } catch (scanError) {
      const message =
        scanError instanceof ApiClientError
          ? scanError.message
          : scanError instanceof Error
            ? scanError.message
            : 'Failed to scan your business card.';
      if (message !== 'No image selected.') {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!parsedPreview) {
      return;
    }

    navigation.navigate('MyCardForm', {
      mode: 'create',
      parsedPreview,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        Scan your own business card. On-device OCR extracts text, then the API parses your details.
      </Text>

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button title="Take Photo" onPress={() => void handleScan('camera')} />
        </View>
        <View style={styles.button}>
          <Button title="Choose Image" onPress={() => void handleScan('gallery')} />
        </View>
      </View>

      {loading && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={walletColors.title} />
          <Text style={styles.feedbackText}>Reading and parsing your card...</Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {rawPreview.length > 0 && (
        <View style={styles.rawPreview}>
          <Text style={styles.rawPreviewTitle}>Raw OCR</Text>
          <Text style={styles.rawPreviewBody}>{rawPreview}</Text>
        </View>
      )}

      {parsedPreview && (
        <View style={styles.result}>
          <CoreFieldsCard fields={parsedPreview.core_fields} />
          <CustomFieldsList customFields={parsedPreview.custom_fields} />
          <View style={styles.button}>
            <Button title="Review and save" onPress={handleContinue} />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: walletColors.background,
  },
  subtitle: {
    fontSize: 14,
    color: walletColors.subtitle,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  feedback: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  feedbackText: {
    color: walletColors.subtitle,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  rawPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rawPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: walletColors.subtitle,
    textTransform: 'uppercase',
  },
  rawPreviewBody: {
    fontSize: 13,
    color: walletColors.title,
  },
  result: {
    gap: 12,
  },
});
