import { useCallback, useState } from 'react';

import { listCards, updateCardWalletDisplay } from '../api/cards';
import { ApiClientError } from '../api/client';
import {
  listQueuedScans,
  queuedScanToCapturedCard,
} from '../services/offlineCardQueue';
import type { CapturedCard, CardListState, PhotoFace, WalletDisplay } from '../types/card';

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
    setState(previous => {
      if (previous.status === 'success') {
        return { status: 'loading', cards: previous.cards };
      }
      return { status: 'loading' };
    });

    try {
      const [serverCards, queuedScans] = await Promise.all([listCards(), listQueuedScans()]);
      const localCards = queuedScans
        .filter(item => item.syncStatus !== 'uploading')
        .map(queuedScanToCapturedCard);
      setState({ status: 'success', cards: [...localCards, ...serverCards] });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to load your card collection.';
      setState(previous => {
        if (previous.status === 'loading' && 'cards' in previous) {
          return { status: 'error', message, cards: previous.cards };
        }
        return { status: 'error', message };
      });
    }
  }, []);

  const setCardWalletDisplay = useCallback(
    async (cardId: string, walletDisplay: WalletDisplay) => {
      if (cardId.startsWith('local:')) {
        return;
      }
      let previousCards: CapturedCard[] | undefined;

      setState(previous => {
        if (previous.status === 'success') {
          previousCards = previous.cards;
          return {
            status: 'success',
            cards: previous.cards.map(card =>
              card._id === cardId ? { ...card, wallet_display: walletDisplay } : card,
            ),
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
          return {
            status: 'success',
            cards: previous.cards.map(card =>
              card._id === cardId ? updated : card,
            ),
          };
        });
      } catch (error) {
        if (previousCards) {
          setState({ status: 'success', cards: previousCards });
        }
        throw error;
      }
    },
    [],
  );

  const setCardPhotoFace = useCallback(async (cardId: string, photoFace: PhotoFace) => {
    if (cardId.startsWith('local:')) {
      return;
    }
    let previousCards: CapturedCard[] | undefined;

    setState(previous => {
      if (previous.status === 'success') {
        previousCards = previous.cards;
        return {
          status: 'success',
          cards: previous.cards.map(card =>
            card._id === cardId ? { ...card, photo_face: photoFace } : card,
          ),
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
        return {
          status: 'success',
          cards: previous.cards.map(card => (card._id === cardId ? updated : card)),
        };
      });
    } catch (error) {
      if (previousCards) {
        setState({ status: 'success', cards: previousCards });
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
