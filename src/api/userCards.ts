import { API_V1_PREFIX } from '../config/apiConfig';
import type { ParsedUserCardPreview, UserCard, UserCardDraft } from '../types/userCard';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

export async function listUserCards(): Promise<UserCard[]> {
  return apiGet<UserCard[]>(`${API_V1_PREFIX}/user-cards`);
}

export async function createUserCard(draft: UserCardDraft): Promise<UserCard> {
  return apiPost<UserCard>(`${API_V1_PREFIX}/user-cards`, draft);
}

export async function updateUserCard(
  cardId: string,
  draft: Partial<UserCardDraft>,
): Promise<UserCard> {
  return apiPut<UserCard>(`${API_V1_PREFIX}/user-cards/${cardId}`, draft);
}

export async function deleteUserCard(cardId: string): Promise<void> {
  await apiDelete(`${API_V1_PREFIX}/user-cards/${cardId}`);
}

export async function reorderUserCards(orderedIds: string[]): Promise<UserCard[]> {
  return apiPatch<UserCard[]>(`${API_V1_PREFIX}/user-cards/reorder`, {
    ordered_ids: orderedIds,
  });
}

export async function parseUserCard(rawOcrText: string): Promise<ParsedUserCardPreview> {
  return apiPost<ParsedUserCardPreview>(`${API_V1_PREFIX}/user-cards/parse`, {
    raw_ocr_text: rawOcrText,
  });
}
