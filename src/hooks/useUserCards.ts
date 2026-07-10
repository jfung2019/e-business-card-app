import { useCallback, useEffect, useState } from 'react';



import {

  createUserCard,

  deleteUserCard,

  listUserCards,

  reorderUserCards,

  updateUserCard,

  updateUserCardWalletDisplay,

} from '../api/userCards';

import { ApiClientError } from '../api/client';

import {

  isLocalUserCardId,

  listQueuedUserScans,

  localUserCardIdToQueueId,

  queuedUserScanToUserCard,

  updateQueuedUserScan,

} from '../services/offlineUserCardQueue';

import { onOfflineSyncComplete } from '../services/offlineSyncCoordinator';

import { loadCachedUserCards, saveCachedUserCards } from '../services/userCardsCache';
import { prefetchScanImagesForCards } from '../utils/scanImage';

import type {

  PhotoFace,

  UserCard,

  UserCardDraft,

  UserCardListState,

  WalletDisplay,

} from '../types/userCard';

import { shouldFallbackToOfflineScan } from '../utils/network';



function mergeLocalAndServerUserCards(

  localCards: UserCard[],

  serverCards: UserCard[],

): UserCard[] {

  return [...localCards, ...serverCards];

}



async function loadLocalUserCards(): Promise<UserCard[]> {

  const queuedScans = await listQueuedUserScans();

  return queuedScans

    .filter(item => item.syncStatus !== 'uploading')

    .map(queuedUserScanToUserCard);

}



interface UseUserCardsResult {

  state: UserCardListState;

  cards: UserCard[];

  fetchUserCards: () => Promise<void>;

  addUserCard: (draft: UserCardDraft) => Promise<UserCard>;

  editUserCard: (cardId: string, draft: Partial<UserCardDraft>) => Promise<UserCard>;

  removeUserCard: (cardId: string) => Promise<void>;

  reorderCards: (orderedIds: string[]) => Promise<UserCard[]>;

  setCardWalletDisplay: (cardId: string, walletDisplay: WalletDisplay) => Promise<void>;

  setCardPhotoFace: (cardId: string, photoFace: PhotoFace) => Promise<void>;

}



export function useUserCards(): UseUserCardsResult {

  const [state, setState] = useState<UserCardListState>({ status: 'idle' });



  const fetchUserCards = useCallback(async () => {

    const localCards = await loadLocalUserCards();

    const cachedCards = await loadCachedUserCards();



    setState(previous => {

      const existingCards =

        previous.status === 'success'

          ? previous.cards

          : (previous.status === 'loading' || previous.status === 'error') && previous.cards

            ? previous.cards

            : undefined;



      const cardsToShow =

        existingCards && existingCards.length > 0

          ? existingCards

          : mergeLocalAndServerUserCards(localCards, cachedCards);



      if (cardsToShow.length > 0) {

        return { status: 'loading', cards: cardsToShow };

      }



      return { status: 'loading' };

    });



    try {

      const serverCards = await listUserCards();

      await saveCachedUserCards(serverCards);
      void prefetchScanImagesForCards(serverCards);

      setState({

        status: 'success',

        cards: mergeLocalAndServerUserCards(localCards, serverCards),

        isOfflineSnapshot: false,

      });

    } catch (error) {

      const freshLocalCards = await loadLocalUserCards();

      const freshCachedCards = await loadCachedUserCards();

      const offlineCards = mergeLocalAndServerUserCards(freshLocalCards, freshCachedCards);



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

          : 'Unable to load your business cards.';

      setState({ status: 'error', message });

    }

  }, []);



  useEffect(() => {

    return onOfflineSyncComplete(() => {

      void fetchUserCards();

    });

  }, [fetchUserCards]);



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

    await saveCachedUserCards(reordered);

    setState(previous => ({

      status: 'success',

      cards: reordered,

      isOfflineSnapshot: previous.status === 'success' ? previous.isOfflineSnapshot : false,

    }));

    return reordered;

  }, []);



  const setCardWalletDisplay = useCallback(

    async (cardId: string, walletDisplay: WalletDisplay) => {

      if (isLocalUserCardId(cardId)) {

        const updated = await updateQueuedUserScan(localUserCardIdToQueueId(cardId), {

          wallet_display: walletDisplay,

        });

        if (!updated) {

          return;

        }

        const card = queuedUserScanToUserCard(updated);

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



      let previousCards: UserCard[] | undefined;

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

        const updated = await updateUserCardWalletDisplay(cardId, { walletDisplay });

        setState(previous => {

          if (previous.status !== 'success') {

            return previous;

          }

          const cards = previous.cards.map(card => (card._id === cardId ? updated : card));

          void saveCachedUserCards(cards);

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

    if (isLocalUserCardId(cardId)) {

      const updated = await updateQueuedUserScan(localUserCardIdToQueueId(cardId), {

        photo_face: photoFace,

      });

      if (!updated) {

        return;

      }

      const card = queuedUserScanToUserCard(updated);

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



    let previousCards: UserCard[] | undefined;

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

      const updated = await updateUserCardWalletDisplay(cardId, { photoFace });

      setState(previous => {

        if (previous.status !== 'success') {

          return previous;

        }

        const cards = previous.cards.map(card => (card._id === cardId ? updated : card));

        void saveCachedUserCards(cards);

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



  return {

    state,

    cards,

    fetchUserCards,

    addUserCard,

    editUserCard,

    removeUserCard,

    reorderCards,

    setCardWalletDisplay,

    setCardPhotoFace,

  };

}

