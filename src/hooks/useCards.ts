import { useCallback, useEffect, useState } from 'react';

import { listCards, updateCardWalletDisplay } from '../api/cards';
import { ApiClientError } from '../api/client';
import { loadCachedCards, saveCachedCards } from '../services/cardCollectionCache';
import {
  listQueuedScans,
  localCardIdToQueueId,
  queuedScanToCapturedCard,
  updateQueuedScan,
} from '../services/offlineCardQueue';
import { onOfflineSyncComplete } from '../services/offlineSyncCoordinator';
import type { CapturedCard, CardListState, PhotoFace, WalletDisplay } from '../types/card';
import { shouldFallbackToOfflineScan } from '../utils/network';

function mergeLocalAndServerCards(
  localCards: CapturedCard[],
  serverCards: CapturedCard[],
): CapturedCard[] {
  return [...localCards, ...serverCards];
}

async function loadLocalCards(): Promise<CapturedCard[]> {
  const queuedScans = await listQueuedScans();
  return queuedScans
    .filter(item => item.syncStatus !== 'uploading')
    .map(queuedScanToCapturedCard);
}

interface UseCardsResult {
  state: CardListState;
  cards: CapturedCard[];
  fetchCards: () => Promise<void>;
  setCardWalletDisplay: (cardId: string, walletDisplay: WalletDisplay) => Promise<void>;
  setCardPhotoFace: (cardId: string, photoFace: PhotoFace) => Promise<void>;
}

export function useCards(): UseCardsResult {
  const [state, setState] = useState<CardListState>({ status: 'idle' });

  const fetchCards = useCallback(async () => {
    const localCards = await loadLocalCards();

    setState(previous => {
      const existingCards =
        previous.status === 'success'
          ? previous.cards
          : (previous.status === 'loading' || previous.status === 'error') && previous.cards
            ? previous.cards
            : undefined;

      if (existingCards && existingCards.length > 0) {
        return { status: 'loading', cards: existingCards };
      }

      if (localCards.length > 0) {
        return { status: 'loading', cards: localCards };
      }

      return { status: 'loading' };
    });

    try {
      const serverCards = await listCards();
      await saveCachedCards(serverCards);
      setState({
        status: 'success',
        cards: mergeLocalAndServerCards(localCards, serverCards),
        isOfflineSnapshot: false,
      });
    } catch (error) {
      const cachedCards = await loadCachedCards();
      const offlineCards = mergeLocalAndServerCards(localCards, cachedCards);

      if (offlineCards.length > 0 || shouldFallbackToOfflineScan(error)) {
        setState({
          status: 'success',
          cards: offlineCards,
          isOfflineSnapshot: true,
        });
        return;
      }

      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to load your card collection.';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    return onOfflineSyncComplete(() => {
      void fetchCards();
    });
  }, [fetchCards]);

  const setCardWalletDisplay = useCallback(
    async (cardId: string, walletDisplay: WalletDisplay) => {
      if (cardId.startsWith('local:')) {
        const updated = await updateQueuedScan(localCardIdToQueueId(cardId), {
          wallet_display: walletDisplay,
        });
        if (!updated) {
          return;
        }
        const card = queuedScanToCapturedCard(updated);
        setState(previous => {
          if (previous.status !== 'success') {
            return previous;
          }
          return {
            status: 'success',
            cards: previous.cards.map(item => (item._id === cardId ? card : item)),
            isOfflineSnapshot: previous.isOfflineSnapshot,
          };
        });
        return;
      }
      let previousCards: CapturedCard[] | undefined;
      let previousOfflineSnapshot = false;

      setState(previous => {
        if (previous.status === 'success') {
          previousCards = previous.cards;
          previousOfflineSnapshot = previous.isOfflineSnapshot ?? false;
          return {
            status: 'success',
            cards: previous.cards.map(card =>
              card._id === cardId ? { ...card, wallet_display: walletDisplay } : card,
            ),
            isOfflineSnapshot: previous.isOfflineSnapshot,
          };
        }
        return previous;
      });

      try {
        const updated = await updateCardWalletDisplay(cardId, { walletDisplay });
        setState(previous => {
          if (previous.status !== 'success') {
            return previous;
          }
          const cards = previous.cards.map(card => (card._id === cardId ? updated : card));
          void saveCachedCards(cards);
          return {
            status: 'success',
            cards,
            isOfflineSnapshot: previous.isOfflineSnapshot,
          };
        });
      } catch (error) {
        if (previousCards) {
          setState({
            status: 'success',
            cards: previousCards,
            isOfflineSnapshot: previousOfflineSnapshot,
          });
        }
        throw error;
      }
    },
    [],
  );

  const setCardPhotoFace = useCallback(async (cardId: string, photoFace: PhotoFace) => {
    if (cardId.startsWith('local:')) {
      const updated = await updateQueuedScan(localCardIdToQueueId(cardId), {
        photo_face: photoFace,
      });
      if (!updated) {
        return;
      }
      const card = queuedScanToCapturedCard(updated);
      setState(previous => {
        if (previous.status !== 'success') {
          return previous;
        }
        return {
          status: 'success',
          cards: previous.cards.map(item => (item._id === cardId ? card : item)),
          isOfflineSnapshot: previous.isOfflineSnapshot,
        };
      });
      return;
    }
    let previousCards: CapturedCard[] | undefined;
    let previousOfflineSnapshot = false;

    setState(previous => {
      if (previous.status === 'success') {
        previousCards = previous.cards;
        previousOfflineSnapshot = previous.isOfflineSnapshot ?? false;
        return {
          status: 'success',
          cards: previous.cards.map(card =>
            card._id === cardId ? { ...card, photo_face: photoFace } : card,
          ),
          isOfflineSnapshot: previous.isOfflineSnapshot,
        };
      }
      return previous;
    });

    try {
      const updated = await updateCardWalletDisplay(cardId, { photoFace });
      setState(previous => {
        if (previous.status !== 'success') {
          return previous;
        }
        const cards = previous.cards.map(card => (card._id === cardId ? updated : card));
        void saveCachedCards(cards);
        return {
          status: 'success',
          cards,
          isOfflineSnapshot: previous.isOfflineSnapshot,
        };
      });
    } catch (error) {
      if (previousCards) {
        setState({
          status: 'success',
          cards: previousCards,
          isOfflineSnapshot: previousOfflineSnapshot,
        });
      }
      throw error;
    }
  }, []);

  const cards: CapturedCard[] =
    state.status === 'success'
      ? state.cards
      : (state.status === 'loading' || state.status === 'error') && state.cards
        ? state.cards
        : [];

  return {
    state,
    cards,
    fetchCards,
    setCardWalletDisplay,
    setCardPhotoFace,
  };
}
