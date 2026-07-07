import type { CapturedCard, PhotoFace, WalletDisplay } from '../types/card';
import { API_BASE_URL, API_V1_PREFIX } from '../config/apiConfig';
import { getAccessToken } from './authToken';
import { ApiClientError, apiDelete, apiGet, apiPatch, apiPost } from './client';

const PROCESS_CARD_TIMEOUT_MS = 60_000;

type CapturedCardApiPayload = CapturedCard & { id?: string };

function normalizeCapturedCard(card: CapturedCardApiPayload): CapturedCard {
  return {
    ...card,
    _id: card._id ?? card.id ?? '',
  };
}

export async function listCards(): Promise<CapturedCard[]> {
  const cards = await apiGet<CapturedCardApiPayload[]>(`${API_V1_PREFIX}/cards`);
  return cards.map(normalizeCapturedCard);
}

export async function processCard(
  rawOcrText: string,
  imageBase64?: string,
  backImageBase64?: string,
): Promise<CapturedCard> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROCESS_CARD_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('raw_ocr_text', rawOcrText.trim());
    if (imageBase64) {
      formData.append('scan_image_base64', imageBase64);
    }
    if (backImageBase64) {
      formData.append('scan_image_back_base64', backImageBase64);
    }

    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/cards/process`, {
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

    return normalizeCapturedCard((await response.json()) as CapturedCardApiPayload);
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

export async function updateCardWalletDisplay(
  cardId: string,
  payload: { walletDisplay?: WalletDisplay; photoFace?: PhotoFace },
): Promise<CapturedCard> {
  const body: Record<string, string> = {};
  if (payload.walletDisplay) {
    body.wallet_display = payload.walletDisplay;
  }
  if (payload.photoFace) {
    body.photo_face = payload.photoFace;
  }
  const card = await apiPatch<CapturedCardApiPayload>(
    `${API_V1_PREFIX}/cards/${cardId}/wallet-display`,
    body,
  );
  return normalizeCapturedCard(card);
}

export async function deleteCard(cardId: string): Promise<void> {
  await apiDelete(`${API_V1_PREFIX}/cards/${cardId}`);
}

export async function saveOfflineDraft(
  rawOcrText: string,
  coreFields: CapturedCard['core_fields'],
  customFields: Record<string, string>,
  imageBase64?: string,
  backImageBase64?: string,
  editedFields: string[] = [],
): Promise<CapturedCard> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROCESS_CARD_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append('raw_ocr_text', rawOcrText.trim());
    formData.append('core_fields_json', JSON.stringify(coreFields));
    formData.append('custom_fields_json', JSON.stringify(customFields));
    formData.append('edited_fields_json', JSON.stringify(editedFields));
    if (imageBase64) {
      formData.append('scan_image_base64', imageBase64);
    }
    if (backImageBase64) {
      formData.append('scan_image_back_base64', backImageBase64);
    }

    const token = await getAccessToken();
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${API_V1_PREFIX}/cards/offline-draft`, {
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
        // ignore
      }
      throw new ApiClientError(detail, response.status);
    }

    return normalizeCapturedCard((await response.json()) as CapturedCardApiPayload);
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

export async function enhanceCard(cardId: string): Promise<CapturedCard> {
  const card = await apiPost<CapturedCardApiPayload>(
    `${API_V1_PREFIX}/cards/${cardId}/enhance`,
    {},
  );
  return normalizeCapturedCard(card);
}

export async function applyCardEnhancement(
  cardId: string,
  payload: { acceptAll?: boolean; acceptedFields?: string[] },
): Promise<CapturedCard> {
  const card = await apiPost<CapturedCardApiPayload>(
    `${API_V1_PREFIX}/cards/${cardId}/enhancement/apply`,
    {
      accept_all: payload.acceptAll ?? false,
      accepted_fields: payload.acceptedFields ?? [],
    },
  );
  return normalizeCapturedCard(card);
}
