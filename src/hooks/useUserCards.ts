import { useCallback, useState } from 'react';

import {
  createUserCard,
  deleteUserCard,
  listUserCards,
  reorderUserCards,
  updateUserCard,
} from '../api/userCards';
import { ApiClientError } from '../api/client';
import type { UserCard, UserCardDraft, UserCardListState } from '../types/userCard';

interface UseUserCardsResult {
  state: UserCardListState;
  cards: UserCard[];
  fetchUserCards: () => Promise<void>;
  addUserCard: (draft: UserCardDraft) => Promise<UserCard>;
  editUserCard: (cardId: string, draft: Partial<UserCardDraft>) => Promise<UserCard>;
  removeUserCard: (cardId: string) => Promise<void>;
  reorderCards: (orderedIds: string[]) => Promise<UserCard[]>;
}

export function useUserCards(): UseUserCardsResult {
  const [state, setState] = useState<UserCardListState>({ status: 'idle' });

  const fetchUserCards = useCallback(async () => {
    setState(previous => {
      if (previous.status === 'success') {
        return { status: 'loading', cards: previous.cards };
      }
      return { status: 'loading' };
    });

    try {
      const cards = await listUserCards();
      setState({ status: 'success', cards });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Unable to load your business cards.';
      setState(previous => {
        if (previous.status === 'loading' && previous.cards) {
          return { status: 'error', message, cards: previous.cards };
        }
        return { status: 'error', message };
      });
    }
  }, []);

  const cards: UserCard[] =
    state.status === 'success'
      ? state.cards
      : (state.status === 'loading' || state.status === 'error') && state.cards
        ? state.cards
        : [];

  const addUserCard = useCallback(async (draft: UserCardDraft) => {
    const created = await createUserCard(draft);
    await fetchUserCards();
    return created;
  }, [fetchUserCards]);

  const editUserCard = useCallback(async (cardId: string, draft: Partial<UserCardDraft>) => {
    const updated = await updateUserCard(cardId, draft);
    await fetchUserCards();
    return updated;
  }, [fetchUserCards]);

  const removeUserCard = useCallback(async (cardId: string) => {
    await deleteUserCard(cardId);
    await fetchUserCards();
  }, [fetchUserCards]);

  const reorderCards = useCallback(async (orderedIds: string[]) => {
    const reordered = await reorderUserCards(orderedIds);
    setState({ status: 'success', cards: reordered });
    return reordered;
  }, []);

  return {
    state,
    cards,
    fetchUserCards,
    addUserCard,
    editUserCard,
    removeUserCard,
    reorderCards,
  };
}
