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
import { useProcessUserCard } from '../hooks/useProcessUserCard';
import type { MainStackParamList } from '../navigation/AppNavigator';
import { scanBusinessCard, type OcrSource } from '../services/ocr';
import { walletColors } from '../theme/wallet';

type ScanNavigation = NativeStackNavigationProp<MainStackParamList, 'MyCardScan'>;

export function MyCardScanScreen(): React.JSX.Element {
  const navigation = useNavigation<ScanNavigation>();
  const { state, userCard, submitScan, reset } = useProcessUserCard();
  const [scanError, setScanError] = useState<string | null>(null);

  const isSuccess = state.status === 'success' && userCard !== null;
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
        imageBase64: result.imageBase64,
        isPrimary: true,
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
    if (!userCard) {
      return;
    }
    const card = userCard;
    reset();
    setScanError(null);
    navigation.navigate('MyCardForm', { mode: 'edit', card });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isSuccess && (
        <>
          <Text style={styles.subtitle}>
            Scan your business card with the document camera for auto crop and align, or pick
            from gallery. Your photo and details are saved on the API server.
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
          <ActivityIndicator size="large" color={walletColors.title} />
          <Text style={styles.feedbackText}>
            Uploading scan and parsing your card details...
          </Text>
        </View>
      )}

      {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}

      {state.status === 'error' && <Text style={styles.errorText}>{state.message}</Text>}

      {isSuccess && userCard && (
        <ScanSuccessPanel
          coreFields={userCard.core_fields}
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
    backgroundColor: walletColors.background,
    justifyContent: 'center',
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
    gap: 12,
    paddingVertical: 24,
  },
  feedbackText: {
    color: walletColors.subtitle,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'center',
  },
});
