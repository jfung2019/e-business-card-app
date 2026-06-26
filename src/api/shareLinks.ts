import type { CapturedCard } from '../types/card';
import type { SharedUserCard } from '../types/sharedCard';
import { API_V1_PREFIX } from '../config/apiConfig';
import { apiGet, apiPost } from './client';

type CapturedCardApiPayload = CapturedCard & { id?: string };

function normalizeCapturedCard(card: CapturedCardApiPayload): CapturedCard {
  return {
    ...card,
    _id: card._id ?? card.id ?? '',
  };
}

export async function fetchSharedCard(token: string): Promise<SharedUserCard> {
  return apiGet<SharedUserCard>(`${API_V1_PREFIX}/public/user-cards/${encodeURIComponent(token)}`);
}

export async function saveSharedCardToCollection(token: string): Promise<CapturedCard> {
  const card = await apiPost<CapturedCardApiPayload>(
    `${API_V1_PREFIX}/cards/from-share/${encodeURIComponent(token)}`,
    {},
  );
  return normalizeCapturedCard(card);
}
