import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScanSuccessPanel } from '../components/ScanSuccessPanel';
import { useAppTheme } from '../context/ThemeContext';
import { useProcessCard } from '../hooks/useProcessCard';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import { scanBusinessCard, type OcrSource } from '../services/ocr';
import { mergeCardOcrText } from '../utils/mergeCardOcrText';

type ScanNavigation = NativeStackNavigationProp<MainStackParamList, 'Scan'>;

function createStyles(wallet: WalletThemeColors) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      gap: 18,
      backgroundColor: wallet.background,
    },
    heroCard: {
      backgroundColor: wallet.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 20,
      gap: 8,
    },
    eyebrow: {
      color: wallet.accentMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: wallet.title,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 14,
      color: wallet.subtitle,
      lineHeight: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: wallet.addButton,
    },
    buttonSecondary: {
      backgroundColor: wallet.surface,
      borderWidth: 1,
      borderColor: wallet.border,
    },
    buttonPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.98 }],
    },
    buttonText: {
      color: wallet.addButtonText,
      fontSize: 15,
      fontWeight: '700',
    },
    buttonTextSecondary: {
      color: wallet.title,
    },
    stepCard: {
      backgroundColor: wallet.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: wallet.border,
      padding: 16,
      gap: 10,
    },
    stepRow: {
      flexDirection: 'row',
      gap: 12,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      textAlign: 'center',
      lineHeight: 24,
      overflow: 'hidden',
      backgroundColor: wallet.addButton,
      color: wallet.addButtonText,
      fontSize: 12,
      fontWeight: '700',
    },
    stepCopy: {
      flex: 1,
      gap: 2,
    },
    stepTitle: {
      color: wallet.title,
      fontSize: 15,
      fontWeight: '700',
    },
    skipButton: {
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: wallet.border,
    },
    feedback: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 24,
    },
    feedbackText: {
      color: wallet.subtitle,
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 22,
    },
    errorText: {
      color: wallet.error,
      fontWeight: '600',
      textAlign: 'center',
    },
    captureReadyText: {
      color: wallet.title,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });
}

export function ScanScreen(): React.JSX.Element {
  const navigation = useNavigation<ScanNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { state, capturedCard, isOfflineDraft, submitScan, reset } = useProcessCard();
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

  const finalizeSubmission = async (backImageBase64?: string, backOcrText?: string) => {
    if (!frontOcrText || !frontImageBase64) {
      setScanError('Front card image is missing. Please scan the front again.');
      setAwaitingBackCapture(false);
      return;
    }

    setSubmissionVariant(backImageBase64 ? 'frontAndBack' : 'frontOnly');
    await submitScan({
      ocrText: mergeCardOcrText(frontOcrText, backOcrText),
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
      const result = await scanBusinessCard(source, { requireText: false });
      if (!result) {
        return;
      }
      await finalizeSubmission(result.imageBase64, result.ocrText);
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

  const renderActionButton = (
    label: string,
    onPress: () => void,
    variant: 'primary' | 'secondary' = 'primary',
  ) => (
    <Pressable
      onPress={onPress}
      disabled={isBusy}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && styles.buttonPressed,
        isBusy && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSuccess && !awaitingBackCapture && (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Collected card scanner</Text>
            <Text style={styles.title}>Save a contact to your collection</Text>
            <Text style={styles.subtitle}>
              Capture the front first. We will extract contact details on-device, save the
              photo on the server, and add the card to your wallet.
            </Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Front side</Text>
                <Text style={styles.subtitle}>
                  Use the camera for auto crop or choose a clear image.
                </Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Back side optional</Text>
                <Text style={styles.subtitle}>
                  Add a back photo if the card has extra details or a second language.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            {renderActionButton('Scan card', () => void handleScanFront('camera'))}
            {renderActionButton(
              'Choose image',
              () => void handleScanFront('gallery'),
              'secondary',
            )}
          </View>
        </>
      )}

      {!isSuccess && awaitingBackCapture && !isBusy && (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.captureReadyText}>Front captured successfully</Text>
            <Text style={styles.title}>Add the back side?</Text>
            <Text style={styles.subtitle}>
              This step is optional. Capture the back if it has extra details, QR codes, or
              text in another language.
            </Text>
          </View>
          <View style={styles.buttonRow}>
            {renderActionButton('Scan back', () => void handleScanBack('camera'))}
            {renderActionButton(
              'Choose back',
              () => void handleScanBack('gallery'),
              'secondary',
            )}
          </View>
          <Pressable
            onPress={handleSkipBack}
            disabled={isBusy}
            style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonTextSecondary}>Skip back and save</Text>
          </Pressable>
        </>
      )}

      {isBusy && (
        <View style={styles.feedback}>
          <ActivityIndicator size="large" color={wallet.title} />
          <Text style={styles.feedbackText}>
            {submissionVariant === 'frontAndBack'
              ? 'Uploading front and back scans, then parsing contact details...'
              : 'Uploading front scan and parsing contact details...'}
          </Text>
        </View>
      )}

      {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}

      {state.status === 'error' && <Text style={styles.errorText}>{state.message}</Text>}

      {isSuccess && capturedCard && (
        <ScanSuccessPanel
          coreFields={capturedCard.core_fields}
          title={isOfflineDraft ? 'Saved offline' : 'Card added!'}
          onDone={handleDone}
          onViewDetails={handleViewDetails}
        />
      )}
    </ScrollView>
  );
}
