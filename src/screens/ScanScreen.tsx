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
  const [frontOcrText, setFrontOcrText] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [awaitingBackCapture, setAwaitingBackCapture] = useState(false);
  const [submissionVariant, setSubmissionVariant] = useState<'frontOnly' | 'frontAndBack'>(
    'frontOnly',
  );

  const isSuccess = state.status === 'success' && capturedCard !== null;
  const isBusy = state.status === 'loading';

  const handleScanFront = async (source: OcrSource) => {
    reset();
    setScanError(null);
    setAwaitingBackCapture(false);
    setFrontOcrText(null);
    setFrontImageBase64(null);

    try {
      const result = await scanBusinessCard(source);
      if (!result) {
        return;
      }

      setFrontOcrText(result.ocrText);
      setFrontImageBase64(result.imageBase64);
      setAwaitingBackCapture(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read text from image.';
      setScanError(message);
    }
  };

  const finalizeSubmission = async (backImageBase64?: string) => {
    if (!frontOcrText || !frontImageBase64) {
      setScanError('Front card image is missing. Please scan the front again.');
      setAwaitingBackCapture(false);
      return;
    }

    setSubmissionVariant(backImageBase64 ? 'frontAndBack' : 'frontOnly');
    await submitScan({
      ocrText: frontOcrText,
      imageBase64: frontImageBase64,
      backImageBase64,
    });
    setAwaitingBackCapture(false);
    setFrontOcrText(null);
    setFrontImageBase64(null);
  };

  const handleScanBack = async (source: OcrSource) => {
    setScanError(null);
    try {
      const result = await scanBusinessCard(source);
      if (!result) {
        return;
      }
      await finalizeSubmission(result.imageBase64);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to capture the back image.';
      setScanError(message);
    }
  };

  const handleSkipBack = () => {
    void finalizeSubmission();
  };

  const handleDone = () => {
    reset();
    setScanError(null);
    setFrontOcrText(null);
    setFrontImageBase64(null);
    setAwaitingBackCapture(false);
    setSubmissionVariant('frontOnly');
    navigation.navigate('Collection');
  };

  const handleViewDetails = () => {
    if (!capturedCard) {
      return;
    }
    const card = capturedCard;
    reset();
    setScanError(null);
    setFrontOcrText(null);
    setFrontImageBase64(null);
    setAwaitingBackCapture(false);
    setSubmissionVariant('frontOnly');
    navigation.navigate('CardDetail', { card });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSuccess && !awaitingBackCapture && (
        <>
          <Text style={styles.subtitle}>
            Scan with the document camera for auto crop and align, or pick from gallery.
            OCR runs on-device; the photo is saved on the API server (MongoDB GridFS).
          </Text>

          <View style={styles.buttonRow}>
            <View style={styles.button}>
              <Button
                title="Scan Card"
                onPress={() => void handleScanFront('camera')}
                disabled={isBusy}
              />
            </View>
            <View style={styles.button}>
              <Button
                title="Choose Image"
                onPress={() => void handleScanFront('gallery')}
                disabled={isBusy}
              />
            </View>
          </View>
        </>
      )}

      {!isSuccess && awaitingBackCapture && !isBusy && (
        <>
          <Text style={styles.captureReadyText}>Front captured successfully</Text>
          <Text style={styles.subtitle}>
            Front captured. Capture the back side now (optional), or skip and save front only.
          </Text>
          <View style={styles.buttonRow}>
            <View style={styles.button}>
              <Button
                title="Scan Back"
                onPress={() => void handleScanBack('camera')}
                disabled={isBusy}
              />
            </View>
            <View style={styles.button}>
              <Button
                title="Choose Back Image"
                onPress={() => void handleScanBack('gallery')}
                disabled={isBusy}
              />
            </View>
          </View>
          <Button title="Skip Back and Save" onPress={handleSkipBack} disabled={isBusy} />
        </>
      )}

      {isBusy && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={luxuryColors.gold} />
          <Text style={styles.feedbackText}>
            {submissionVariant === 'frontAndBack'
              ? 'Uploading front and back scans, then parsing contact details...'
              : 'Uploading front scan and parsing contact details...'}
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
  captureReadyText: {
    color: luxuryColors.gold,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
