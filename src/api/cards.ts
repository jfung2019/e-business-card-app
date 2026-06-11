import type { CapturedCard, ProcessCardRequest } from '../types/card';
import { API_V1_PREFIX } from '../config/apiConfig';
import { apiPost } from './client';

export async function processCard(
  request: ProcessCardRequest,
): Promise<CapturedCard> {
  return apiPost<CapturedCard>(`${API_V1_PREFIX}/cards/process`, request);
}
