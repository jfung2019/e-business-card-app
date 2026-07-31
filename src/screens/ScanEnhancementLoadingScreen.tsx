import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { retryCardScanEnhancement } from '../api/cards';
import { retryUserCardScanEnhancement } from '../api/userCards';
import { ScanSubmissionLoadingView } from '../components/ScanSubmissionLoadingView';
import { useAppTheme } from '../context/ThemeContext';
import { useScanSubmissionProgress } from '../hooks/useScanSubmissionProgress';
import type { MainStackParamList } from '../navigation/AppNavigator';
import type { CapturedCard } from '../types/card';
import type { UserCard } from '../types/userCard';

type Props = NativeStackScreenProps<MainStackParamList, 'ScanEnhancementLoading'>;

export function ScanEnhancementLoadingScreen({
  navigation,
  route,
}: Props): React.JSX.Element {
  const { wallet } = useAppTheme();
  const { kind, cardId } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [updatedCard, setUpdatedCard] = useState<CapturedCard | UserCard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { progressWidth, showProgress, showResult, isHolding } = useScanSubmissionProgress(
    isLoading,
    isSuccess,
  );

  const runRetry = useCallback(async () => {
    setIsLoading(true);
    setIsSuccess(false);
    setErrorMessage(null);
    setUpdatedCard(null);

    try {
      const updated =
        kind === 'captured'
          ? await retryCardScanEnhancement(cardId)
          : await retryUserCardScanEnhancement(cardId);
      setUpdatedCard(updated);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to retry AI cleanup.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [cardId, kind]);

  useEffect(() => {
    void runRetry();
  }, [runRetry]);

  useEffect(() => {
    if (!showResult || !updatedCard) {
      return;
    }

    if (kind === 'captured') {
      navigation.replace('ScanImageReview', {
        kind: 'captured',
        card: updatedCard as CapturedCard,
      });
      return;
    }

    navigation.replace('ScanImageReview', {
      kind: 'user',
      card: updatedCard as UserCard,
    });
  }, [kind, navigation, showResult, updatedCard]);

  useEffect(() => {
    if (isLoading || !errorMessage) {
      return;
    }

    if (kind === 'captured') {
      navigation.replace('ScanImageReview', {
        kind: 'captured',
        card: route.params.card,
        errorMessage,
      });
      return;
    }

    navigation.replace('ScanImageReview', {
      kind: 'user',
      card: route.params.card,
      errorMessage,
    });
  }, [errorMessage, isLoading, kind, navigation, route.params.card]);

  if (errorMessage && !isLoading && !showProgress) {
    return (
      <View style={[styles.errorWrap, { backgroundColor: wallet.background }]}>
        <Text style={[styles.errorText, { color: wallet.error }]}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <ScanSubmissionLoadingView
      progressWidth={progressWidth}
      isHolding={isHolding}
      preset="retry"
      title="Retrying AI cleanup"
    />
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
