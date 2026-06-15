import { API_BASE_URL, API_V1_PREFIX } from '../config/apiConfig';
import type { ParsedUserCardPreview, UserCard, UserCardDraft, WalletDisplay } from '../types/userCard';
import { getAccessToken } from './authToken';
import { ApiClientError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from './client';

const PROCESS_USER_CARD_TIMEOUT_MS = 60_000;

type UserCardApiPayload = UserCard & { id?: string };

function normalizeUserCard(card: UserCardApiPayload): UserCard {
  return {
    ...card,
    _id: card._id ?? card.id ?? '',
  };
}

export async function listUserCards(): Promise<UserCard[]> {
  const cards = await apiGet<UserCardApiPayload[]>(`${API_V1_PREFIX}/user-cards`);
  return cards.map(normalizeUserCard);
}

export async function createUserCard(draft: UserCardDraft): Promise<UserCard> {
  const card = await apiPost<UserCardApiPayload>(`${API_V1_PREFIX}/user-cards`, draft);
  return normalizeUserCard(card);
}

export async function updateUserCard(
  cardId: string,
  draft: Partial<UserCardDraft>,
): Promise<UserCard> {
  const card = await apiPut<UserCardApiPayload>(`${API_V1_PREFIX}/user-cards/${cardId}`, draft);
  return normalizeUserCard(card);
}

export async function deleteUserCard(cardId: string): Promise<void> {
  await apiDelete(`${API_V1_PREFIX}/user-cards/${cardId}`);
}

export async function reorderUserCards(orderedIds: string[]): Promise<UserCard[]> {
  const cards = await apiPatch<UserCardApiPayload[]>(`${API_V1_PREFIX}/user-cards/reorder`, {
    ordered_ids: orderedIds,
  });
  return cards.map(normalizeUserCard);
}

export async function parseUserCard(rawOcrText: string): Promise<ParsedUserCardPreview> {
  return apiPost<ParsedUserCardPreview>(`${API_V1_PREFIX}/user-cards/parse`, {
    raw_ocr_text: rawOcrText,
  });
}

export async function processUserCard(
  rawOcrText: string,
  imageBase64?: string,
  options?: { designId?: string; isPrimary?: boolean },
): Promise<UserCard> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROCESS_USER_CARD_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('raw_ocr_text', rawOcrText.trim());
    if (imageBase64) {
      formData.append('scan_image_base64', imageBase64);
    }
    if (options?.designId) {
      formData.append('design_id', options.designId);
    }
    if (options?.isPrimary) {
      formData.append('is_primary', 'true');
    }

    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/user-cards/process`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `Request failed with status ${response.status}`;
      try {
        const errorBody = (await response.json()) as { detail?: string };
        if (errorBody.detail) {
          detail = errorBody.detail;
        }
      } catch {
        // Response body is not JSON; keep generic message.
      }
      throw new ApiClientError(detail, response.status);
    }

    return normalizeUserCard((await response.json()) as UserCardApiPayload);
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Request timed out. Check your network and try again.');
    }
    if (error instanceof Error && error.message) {
      throw new ApiClientError(error.message);
    }
    throw new ApiClientError('Network error. Check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function updateUserCardWalletDisplay(
  cardId: string,
  walletDisplay: WalletDisplay,
): Promise<UserCard> {
  const card = await apiPatch<UserCardApiPayload>(
    `${API_V1_PREFIX}/user-cards/${cardId}/wallet-display`,
    {
      wallet_display: walletDisplay,
    },
  );
  return normalizeUserCard(card);
}
