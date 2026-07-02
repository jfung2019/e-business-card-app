import { API_V1_PREFIX } from '../config/apiConfig';
import { apiDelete } from './client';

export async function deleteAccount(): Promise<void> {
  await apiDelete(`${API_V1_PREFIX}/account`);
}
