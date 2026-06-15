import type { CapturedCard, WalletDisplay } from '../types/card';
import { API_BASE_URL, API_V1_PREFIX } from '../config/apiConfig';
import { getAccessToken } from './authToken';
import { ApiClientError } from './client';
import { apiGet, apiPatch } from './client';



const PROCESS_CARD_TIMEOUT_MS = 60_000;



export async function listCards(): Promise<CapturedCard[]> {

  return apiGet<CapturedCard[]>(`${API_V1_PREFIX}/cards`);

}



export async function processCard(

  rawOcrText: string,

  imageBase64?: string,

): Promise<CapturedCard> {

  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), PROCESS_CARD_TIMEOUT_MS);



  try {

    const formData = new FormData();

    formData.append('raw_ocr_text', rawOcrText.trim());

    if (imageBase64) {

      formData.append('scan_image_base64', imageBase64);

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



    return (await response.json()) as CapturedCard;

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
  walletDisplay: WalletDisplay,
): Promise<CapturedCard> {
  return apiPatch<CapturedCard>(`${API_V1_PREFIX}/cards/${cardId}/wallet-display`, {
    wallet_display: walletDisplay,
  });
}

