import { useCallback, useState } from 'react';

import { listCards } from '../api/cards';
import { ApiClientError } from '../api/client';
import type { CapturedCard, CardListState } from '../types/card';

interface UseCardsResult {
  state: CardListState;
  cards: CapturedCard[];
  fetchCards: () => Promise<void>;
}

export function useCards(): UseCardsResult {
  const [state, setState] = useState<CardListState>({ status: 'idle' });

  const fetchCards = useCallback(async () => {
    setState({ status: 'loading' });

    try {
      const cards = await listCards();
      setState({ status: 'success', cards });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to load your card collection.';
      setState({ status: 'error', message });
    }
  }, []);

  const cards = state.status === 'success' ? state.cards : [];

  return {
    state,
    cards,
    fetchCards,
  };
}
