import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CapturedCard } from '../types/card';
import type { QueuedCardScan } from '../types/offlineQueue';

const STORAGE_KEY = '@ebc/offlineCardQueue';

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLocalCardId(cardId: string): boolean {
  return cardId.startsWith('local:');
}

export function localCardIdToQueueId(cardId: string): string {
  return cardId.replace(/^local:/, '');
}

export function queuedScanToCapturedCard(item: QueuedCardScan): CapturedCard {
  return {
    _id: `local:${item.localId}`,
    owner_user_id: 'local',
    scanned_at: item.createdAt,
    core_fields: item.core_fields,
    custom_fields: item.custom_fields,
    parse_status: 'fallback',
    parse_source: 'offline',
    enhancement_status: item.serverCardId ? 'queued' : 'queued',
    wallet_display: item.imageBase64 ? 'photo' : 'classic',
    photo_face: 'front',
  };
}

export async function listQueuedScans(): Promise<QueuedCardScan[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as QueuedCardScan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueuedScans(items: QueuedCardScan[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineScan(input: {
  rawOcrText: string;
  imageBase64: string;
  backImageBase64?: string;
  core_fields: QueuedCardScan['core_fields'];
  custom_fields: Record<string, string>;
}): Promise<QueuedCardScan> {
  const item: QueuedCardScan = {
    localId: createLocalId(),
    createdAt: new Date().toISOString(),
    rawOcrText: input.rawOcrText,
    imageBase64: input.imageBase64,
    backImageBase64: input.backImageBase64,
    core_fields: input.core_fields,
    custom_fields: input.custom_fields,
    editedFields: [],
    syncStatus: 'pending',
  };
  const items = await listQueuedScans();
  items.unshift(item);
  await writeQueuedScans(items);
  return item;
}

export async function updateQueuedScan(
  localId: string,
  patch: Partial<QueuedCardScan>,
): Promise<QueuedCardScan | null> {
  const items = await listQueuedScans();
  const index = items.findIndex(item => item.localId === localId);
  if (index < 0) {
    return null;
  }
  const updated = { ...items[index], ...patch };
  items[index] = updated;
  await writeQueuedScans(items);
  return updated;
}

export async function getQueuedScan(localId: string): Promise<QueuedCardScan | null> {
  const items = await listQueuedScans();
  return items.find(item => item.localId === localId) ?? null;
}

export async function updateQueuedScanFields(
  localId: string,
  core_fields: QueuedCardScan['core_fields'],
  custom_fields: Record<string, string>,
  editedFields: string[],
): Promise<QueuedCardScan | null> {
  return updateQueuedScan(localId, { core_fields, custom_fields, editedFields });
}

export async function removeQueuedScan(localId: string): Promise<void> {
  const items = await listQueuedScans();
  await writeQueuedScans(items.filter(item => item.localId !== localId));
}
