import React, { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CoreFieldsCard } from '../components/CoreFieldsCard';
import { CustomFieldsList } from '../components/CustomFieldsList';
import { useProcessCard } from '../hooks/useProcessCard';
import { extractTextFromImage, type OcrSource } from '../services/ocr';

export function ScanScreen(): React.JSX.Element {
  const { state, capturedCard, submitOcrText, reset } = useProcessCard();
  const [rawPreview, setRawPreview] = useState<string>('');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const handleScan = async (source: OcrSource) => {
    reset();
    setRawPreview('');
    setPreviewUri(null);
    setOcrError(null);

    let ocrText: string;
    try {
      ocrText = await extractTextFromImage(source);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read text from image.';
      if (message !== 'No image selected.') {
        setOcrError(message);
      }
      return;
    }

    setRawPreview(ocrText);
    await submitOcrText(ocrText);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* <Text style={styles.title}>Scan Business Card</Text> */}
      <Text style={styles.subtitle}>
        Take a photo or pick an image. On-device OCR extracts text, then the API parses it.
      </Text>

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button title="Take Photo" onPress={() => handleScan('camera')} />
        </View>
        <View style={styles.button}>
          <Button title="Choose Image" onPress={() => handleScan('gallery')} />
        </View>
      </View>

      {state.status === 'loading' && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" />
          <Text style={styles.feedbackText}>Reading card and parsing details...</Text>
        </View>
      )}

      {ocrError && <Text style={styles.errorText}>{ocrError}</Text>}

      {state.status === 'error' && (
        <Text style={styles.errorText}>{state.message}</Text>
      )}

      {previewUri && (
        <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
      )}

      {rawPreview.length > 0 && (
        <View style={styles.rawPreview}>
          <Text style={styles.rawPreviewTitle}>Raw OCR</Text>
          <Text style={styles.rawPreviewBody}>{rawPreview}</Text>
        </View>
      )}

      {capturedCard && (
        <View style={styles.result}>
          <CoreFieldsCard fields={capturedCard.core_fields} />
          <CustomFieldsList customFields={capturedCard.custom_fields} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#4B5563',
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rawPreview: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  rawPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    textTransform: 'uppercase',
  },
  rawPreviewBody: {
    fontSize: 13,
    color: '#1F2937',
  },
  result: {
    marginTop: 8,
  },
});
