import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ScanSubmissionLoadingView } from '../components/ScanSubmissionLoadingView';
import { ScanSuccessPanel } from '../components/ScanSuccessPanel';
import { useAppTheme } from '../context/ThemeContext';
import { useProcessUserCard } from '../hooks/useProcessUserCard';
import { useScanSubmissionProgress } from '../hooks/useScanSubmissionProgress';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { WalletThemeColors } from '../theme/appTheme';
import {
  scanBusinessCard,
  scanBusinessCardBothSides,
  type OcrSource,
} from '../services/ocr';
import { mergeCardOcrText } from '../utils/mergeCardOcrText';
import { shouldOpenScanImageReview } from '../utils/scanImageReview';

type ScanNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCardScan'>;

/**
 * iOS opens the in-app scanner straight away and captures front and back in
 * one camera session. Android keeps the step-by-step screen around ML Kit's
 * document scanner, which captures one page per launch.
 */
const USES_COMBINED_SCANNER = Platform.OS === 'ios';

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
    working: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      backgroundColor: wallet.background,
    },
    captureReadyText: {
      color: wallet.title,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0.3,
    },
  });
}

export function MyCardScanScreen(): React.JSX.Element {
  const navigation = useNavigation<ScanNavigation>();
  const { wallet } = useAppTheme();
  const styles = useMemo(() => createStyles(wallet), [wallet]);
  const { state, userCard, isOfflineDraft, submitScan, reset } = useProcessUserCard();
  const [scanError, setScanError] = useState<string | null>(null);
  const [frontOcrText, setFrontOcrText] = useState<string | null>(null);
  const [frontImageBase64, setFrontImageBase64] = useState<string | null>(null);
  const [awaitingBackCapture, setAwaitingBackCapture] = useState(false);
  /** True from the moment the combined scanner opens until the scan is submitted. */
  const [isCombinedScanRunning, setIsCombinedScanRunning] = useState(USES_COMBINED_SCANNER);
  const autoLaunchedRef = useRef(false);

  const isSuccess = state.status === 'success' && userCard !== null;
  const isBusy = state.status === 'loading';
  const { progressWidth, showProgress, showResult, isHolding } = useScanSubmissionProgress(
    isBusy,
    isSuccess,
  );
  const pendingImageReview =
    userCard !== null &&
    shouldOpenScanImageReview(userCard.scan_image_enhancement_status, isOfflineDraft);

  useEffect(() => {
    if (!showResult || !userCard) {
      return;
    }
    if (pendingImageReview) {
      navigation.replace('ScanImageReview', { kind: 'user', card: userCard });
    } else if (!isOfflineDraft) {
      // What needs checking after a scan is the extracted details, so land on
      // the pre-filled form rather than a success screen.
      navigation.replace('MyCardForm', { mode: 'edit', card: userCard });
    }
  }, [isOfflineDraft, navigation, pendingImageReview, showResult, userCard]);

  const startCombinedScan = useCallback(async () => {
    reset();
    setScanError(null);
    setAwaitingBackCapture(false);
    setFrontOcrText(null);
    setFrontImageBase64(null);
    setIsCombinedScanRunning(true);

    try {
      const pair = await scanBusinessCardBothSides();
      if (!pair) {
        // Cancelled in the camera: there is nothing on this screen to go back to.
        navigation.goBack();
        return;
      }
      await submitScan({
        ocrText: mergeCardOcrText(pair.front.ocrText, pair.back?.ocrText),
        imageBase64: pair.front.imageBase64,
        backImageBase64: pair.back?.imageBase64,
        isPrimary: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to read text from image.';
      setScanError(message);
    } finally {
      setIsCombinedScanRunning(false);
    }
  }, [navigation, reset, submitScan]);

  useEffect(() => {
    if (USES_COMBINED_SCANNER && !autoLaunchedRef.current) {
      autoLaunchedRef.current = true;
      void startCombinedScan();
    }
  }, [startCombinedScan]);

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

    await submitScan({
      ocrText: mergeCardOcrText(frontOcrText, backOcrText),
      imageBase64: frontImageBase64,
      backImageBase64,
      isPrimary: true,
    });
    setAwaitingBackCapture(false);
    setFrontOcrText(null);
    setFrontImageBase64(null);
  };

  const handleScanBack = async (source: OcrSource) => {
    setScanError(null);
    try {
      const result = await scanBusinessCard(source, { requireText: false, side: 'back' });
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
    navigation.navigate('Collection');
  };

  const handleViewDetails = () => {
    if (!userCard) {
      return;
    }
    const card = userCard;
    reset();
    setScanError(null);
    setFrontOcrText(null);
    setFrontImageBase64(null);
    setAwaitingBackCapture(false);
    navigation.navigate('MyCardForm', { mode: 'edit', card });
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

  if (showProgress) {
    return (
      <ScanSubmissionLoadingView
        progressWidth={progressWidth}
        isHolding={isHolding}
        preset="submit"
      />
    );
  }

  // Behind the scanner modal, then while OCR runs on the captured sides.
  if (isCombinedScanRunning) {
    return (
      <View style={styles.working}>
        <ActivityIndicator color={wallet.accentMuted} size="large" />
        <Text style={styles.feedbackText}>Reading your card…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSuccess && !awaitingBackCapture && (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>My card scanner</Text>
            <Text style={styles.title}>Turn your card into a digital profile</Text>
            <Text style={styles.subtitle}>
              Capture the front first. We will extract the details, keep the original image,
              and let you review before sharing.
            </Text>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>1</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Front side</Text>
                <Text style={styles.subtitle}>Use the camera for auto crop or choose a clear image.</Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <Text style={styles.stepNumber}>2</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>Back side optional</Text>
                <Text style={styles.subtitle}>Add a back photo if your card has extra design or details.</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonRow}>
            {renderActionButton('Scan front', () =>
              void (USES_COMBINED_SCANNER ? startCombinedScan() : handleScanFront('camera')),
            )}
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
              a design you want to preserve.
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

      {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}

      {state.status === 'error' && <Text style={styles.errorText}>{state.message}</Text>}

      {showResult && isSuccess && userCard && !pendingImageReview && (
        <ScanSuccessPanel
          coreFields={userCard.core_fields}
          title={isOfflineDraft ? 'Saved offline' : 'Card added!'}
          onDone={handleDone}
          onViewDetails={handleViewDetails}
        />
      )}
    </ScrollView>
  );
}
