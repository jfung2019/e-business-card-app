import { useCallback, useState } from 'react';

import { listCards, updateCardWalletDisplay } from '../api/cards';
import { ApiClientError } from '../api/client';
import type { CapturedCard, CardListState, WalletDisplay } from '../types/card';

interface UseCardsResult {
  state: CardListState;
  cards: CapturedCard[];
  fetchCards: () => Promise<void>;
  setCardWalletDisplay: (cardId: string, walletDisplay: WalletDisplay) => Promise<void>;
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
      const cards = await listCards();
      setState({ status: 'success', cards });
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
        const updated = await updateCardWalletDisplay(cardId, walletDisplay);
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
  };
}
