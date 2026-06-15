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

import { ScanSuccessPanel } from '../components/ScanSuccessPanel';
import { useProcessCard } from '../hooks/useProcessCard';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { scanBusinessCard, type OcrSource } from '../services/ocr';
import { luxuryColors } from '../theme/luxury';

type ScanNavigation = NativeStackNavigationProp<MainStackParamList, 'Scan'>;

export function ScanScreen(): React.JSX.Element {
  const navigation = useNavigation<ScanNavigation>();
  const { state, capturedCard, submitScan, reset } = useProcessCard();
  const [scanError, setScanError] = useState<string | null>(null);

  const isSuccess = state.status === 'success' && capturedCard !== null;
  const isBusy = state.status === 'loading';

  const handleScan = async (source: OcrSource) => {
    reset();
    setScanError(null);

    try {
      const result = await scanBusinessCard(source);
      if (!result) {
        return;
      }

      await submitScan({
        ocrText: result.ocrText,
        imageUri: result.imageUri,
        imageBase64: result.imageBase64,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read text from image.';
      setScanError(message);
    }
  };

  const handleDone = () => {
    reset();
    setScanError(null);
    navigation.navigate('Collection');
  };

  const handleViewDetails = () => {
    if (!capturedCard) {
      return;
    }
    const card = capturedCard;
    reset();
    setScanError(null);
    navigation.navigate('CardDetail', { card });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSuccess && (
        <>
          <Text style={styles.subtitle}>
            Scan with the document camera for auto crop and align, or pick from gallery.
            OCR runs on-device; the photo is saved on the API server (MongoDB GridFS).
          </Text>

          <View style={styles.buttonRow}>
            <View style={styles.button}>
              <Button
                title="Scan Card"
                onPress={() => void handleScan('camera')}
                disabled={isBusy}
              />
            </View>
            <View style={styles.button}>
              <Button
                title="Choose Image"
                onPress={() => void handleScan('gallery')}
                disabled={isBusy}
              />
            </View>
          </View>
        </>
      )}

      {isBusy && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={luxuryColors.gold} />
          <Text style={styles.feedbackText}>
            Uploading scan and parsing contact details...
          </Text>
        </View>
      )}

      {scanError && <Text style={styles.errorText}>{scanError}</Text>}

      {state.status === 'error' && (
        <Text style={styles.errorText}>{state.message}</Text>
      )}

      {isSuccess && capturedCard && (
        <ScanSuccessPanel
          coreFields={capturedCard.core_fields}
          onDone={handleDone}
          onViewDetails={handleViewDetails}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
    backgroundColor: luxuryColors.background,
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: luxuryColors.creamMuted,
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
    gap: 12,
    paddingVertical: 24,
  },
  feedbackText: {
    color: luxuryColors.creamMuted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: luxuryColors.error,
    fontWeight: '600',
    textAlign: 'center',
  },
});
