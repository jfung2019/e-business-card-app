import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { discardCardScanEnhancement } from '../api/cards';
import { discardUserCardScanEnhancement } from '../api/userCards';
import { navigationRef } from '../navigation/AppNavigator';
import {
  onOfflineSyncComplete,
  type OfflineScanReviewCandidate,
} from '../services/offlineSyncCoordinator';

async function discardCandidate(candidate: OfflineScanReviewCandidate): Promise<void> {
  if (candidate.kind === 'captured') {
    await discardCardScanEnhancement(candidate.card._id);
    return;
  }
  await discardUserCardScanEnhancement(candidate.card._id);
}

function openReview(candidate: OfflineScanReviewCandidate): void {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.navigate('ScanImageReview', candidate);
}

function isOnScanReviewFlow(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  const route = navigationRef.getCurrentRoute()?.name;
  return route === 'ScanImageReview' || route === 'ScanEnhancementLoading';
}

function waitUntilLeftScanReviewFlow(): Promise<void> {
  return new Promise(resolve => {
    if (!isOnScanReviewFlow()) {
      resolve();
      return;
    }

    const unsubscribe = navigationRef.addListener('state', () => {
      if (!isOnScanReviewFlow()) {
        unsubscribe();
        resolve();
      }
    });
  });
}

function promptForCandidate(candidate: OfflineScanReviewCandidate): Promise<void> {
  return new Promise(resolve => {
    const name =
      candidate.card.core_fields?.name?.trim() ||
      (candidate.kind === 'captured' ? 'Collected card' : 'My card');

    Alert.alert(
      'AI image enhancement',
      `Your image for "${name}" has been enhanced by AI. Do you want to apply it?`,
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => {
            void discardCandidate(candidate)
              .catch(() => {
                // Keep original on the server even if discard request fails.
              })
              .finally(resolve);
          },
        },
        {
          text: 'Yes',
          onPress: () => {
            openReview(candidate);
            void waitUntilLeftScanReviewFlow().then(resolve);
          },
        },
      ],
      { cancelable: false },
    );
  });
}

/**
 * After offline drafts sync online with AI scan previews ready, ask the user
 * whether to review/apply them. Yes opens ScanImageReview; No keeps the original.
 */
export function useOfflineScanReviewPrompt(enabled: boolean): void {
  const promptingRef = useRef(false);
  const queueRef = useRef<OfflineScanReviewCandidate[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const drainQueue = async () => {
      if (promptingRef.current) {
        return;
      }
      promptingRef.current = true;
      try {
        while (queueRef.current.length > 0) {
          const next = queueRef.current.shift();
          if (next) {
            await promptForCandidate(next);
          }
        }
      } finally {
        promptingRef.current = false;
      }
    };

    return onOfflineSyncComplete(result => {
      if (result.reviewCandidates.length === 0) {
        return;
      }
      queueRef.current.push(...result.reviewCandidates);
      void drainQueue();
    });
  }, [enabled]);
}
