import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CapturedCard } from '../types/card';
import type { QueuedCardScan } from '../types/offlineQueue';

const LEGACY_STORAGE_KEY = '@ebc/offlineCardQueue';
const INDEX_KEY = '@ebc/offlineCardQueue/index';

function itemKey(localId: string): string {
  return `@ebc/offlineCardQueue/item/${localId}`;
}

function imageKey(localId: string, face: 'front' | 'back'): string {
  return `@ebc/offlineCardQueue/image/${localId}/${face}`;
}

type StoredQueueMeta = Omit<QueuedCardScan, 'imageBase64' | 'backImageBase64'> & {
  hasBackImage?: boolean;
};

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLocalCardId(cardId: string): boolean {
  return cardId.startsWith('local:');
}

export function localCardIdToQueueId(cardId: string): string {
  return cardId.replace(/^local:/, '');
}

function toScanImageDataUri(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

export function queuedScanToCapturedCard(item: QueuedCardScan): CapturedCard {
  const frontImageUri = item.imageBase64 ? toScanImageDataUri(item.imageBase64) : null;
  const backImageUri = item.backImageBase64 ? toScanImageDataUri(item.backImageBase64) : null;

  return {
    _id: `local:${item.localId}`,
    owner_user_id: 'local',
    scanned_at: item.createdAt,
    core_fields: item.core_fields,
    custom_fields: item.custom_fields,
    scan_image_url: frontImageUri,
    scan_image_front_url: frontImageUri,
    scan_image_back_url: backImageUri,
    parse_status: 'fallback',
    parse_source: 'offline',
    enhancement_status: item.serverCardId ? 'queued' : 'queued',
    wallet_display: item.wallet_display ?? (frontImageUri ? 'photo' : 'classic'),
    photo_face: item.photo_face ?? 'front',
  };
}

async function readIndex(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIndex(localIds: string[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(localIds));
}

async function hydrateQueuedScan(meta: StoredQueueMeta): Promise<QueuedCardScan> {
  const imageBase64 = (await AsyncStorage.getItem(imageKey(meta.localId, 'front'))) ?? '';
  const backImageBase64 = meta.hasBackImage
    ? (await AsyncStorage.getItem(imageKey(meta.localId, 'back'))) ?? undefined
    : undefined;

  return {
    ...meta,
    imageBase64,
    backImageBase64,
  };
}

async function migrateLegacyQueueIfNeeded(): Promise<void> {
  const legacyRaw = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) {
    return;
  }

  try {
    const legacyItems = JSON.parse(legacyRaw) as QueuedCardScan[];
    if (!Array.isArray(legacyItems) || legacyItems.length === 0) {
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const localIds: string[] = [];
    for (const item of legacyItems) {
      const meta: StoredQueueMeta = {
        localId: item.localId,
        createdAt: item.createdAt,
        rawOcrText: item.rawOcrText,
        core_fields: item.core_fields,
        custom_fields: item.custom_fields,
        editedFields: item.editedFields,
        syncStatus: item.syncStatus,
        serverCardId: item.serverCardId,
        lastError: item.lastError,
        hasBackImage: Boolean(item.backImageBase64),
      };
      localIds.push(item.localId);
      await AsyncStorage.setItem(itemKey(item.localId), JSON.stringify(meta));
      await AsyncStorage.setItem(imageKey(item.localId, 'front'), item.imageBase64);
      if (item.backImageBase64) {
        await AsyncStorage.setItem(imageKey(item.localId, 'back'), item.backImageBase64);
      }
    }
    await writeIndex(localIds);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Keep legacy blob if migration fails; reads will still attempt hydration below.
  }
}

export async function listQueuedScans(): Promise<QueuedCardScan[]> {
  await migrateLegacyQueueIfNeeded();
  const localIds = await readIndex();
  const items: QueuedCardScan[] = [];

  for (const localId of localIds) {
    const raw = await AsyncStorage.getItem(itemKey(localId));
    if (!raw) {
      continue;
    }
    try {
      const meta = JSON.parse(raw) as StoredQueueMeta;
      items.push(await hydrateQueuedScan(meta));
    } catch {
      // Skip corrupted queue entries.
    }
  }

  return items;
}

export async function enqueueOfflineScan(input: {
  rawOcrText: string;
  imageBase64: string;
  backImageBase64?: string;
  core_fields: QueuedCardScan['core_fields'];
  custom_fields: Record<string, string>;
}): Promise<QueuedCardScan> {
  const localId = createLocalId();
  const item: QueuedCardScan = {
    localId,
    createdAt: new Date().toISOString(),
    rawOcrText: input.rawOcrText,
    imageBase64: input.imageBase64,
    backImageBase64: input.backImageBase64,
    core_fields: input.core_fields,
    custom_fields: input.custom_fields,
    editedFields: [],
    syncStatus: 'pending',
    wallet_display: 'photo',
    photo_face: 'front',
  };

  const meta: StoredQueueMeta = {
    localId: item.localId,
    createdAt: item.createdAt,
    rawOcrText: item.rawOcrText,
    core_fields: item.core_fields,
    custom_fields: item.custom_fields,
    editedFields: item.editedFields,
    syncStatus: item.syncStatus,
    hasBackImage: Boolean(input.backImageBase64),
    wallet_display: item.wallet_display,
    photo_face: item.photo_face,
  };

  try {
    await AsyncStorage.setItem(imageKey(localId, 'front'), input.imageBase64);
    if (input.backImageBase64) {
      await AsyncStorage.setItem(imageKey(localId, 'back'), input.backImageBase64);
    }
    await AsyncStorage.setItem(itemKey(localId), JSON.stringify(meta));

    const localIds = await readIndex();
    localIds.unshift(localId);
    await writeIndex(localIds);
  } catch (error) {
    await AsyncStorage.multiRemove([
      imageKey(localId, 'front'),
      imageKey(localId, 'back'),
      itemKey(localId),
    ]);
    const message =
      error instanceof Error && error.message.toLowerCase().includes('quota')
        ? 'Offline storage is full. Remove older offline drafts and try again.'
        : 'Unable to save this card on your device. Please try again.';
    throw new Error(message);
  }

  return item;
}

export async function updateQueuedScan(
  localId: string,
  patch: Partial<QueuedCardScan>,
): Promise<QueuedCardScan | null> {
  const raw = await AsyncStorage.getItem(itemKey(localId));
  if (!raw) {
    return null;
  }

  const existing = await hydrateQueuedScan(JSON.parse(raw) as StoredQueueMeta);
  const updated: QueuedCardScan = { ...existing, ...patch };

  const meta: StoredQueueMeta = {
    localId: updated.localId,
    createdAt: updated.createdAt,
    rawOcrText: updated.rawOcrText,
    core_fields: updated.core_fields,
    custom_fields: updated.custom_fields,
    editedFields: updated.editedFields,
    syncStatus: updated.syncStatus,
    serverCardId: updated.serverCardId,
    lastError: updated.lastError,
    hasBackImage: Boolean(updated.backImageBase64),
    wallet_display: updated.wallet_display,
    photo_face: updated.photo_face,
  };

  if (patch.imageBase64 !== undefined) {
    await AsyncStorage.setItem(imageKey(localId, 'front'), patch.imageBase64);
  }
  if (patch.backImageBase64 !== undefined) {
    if (patch.backImageBase64) {
      await AsyncStorage.setItem(imageKey(localId, 'back'), patch.backImageBase64);
    } else {
      await AsyncStorage.removeItem(imageKey(localId, 'back'));
    }
  }

  await AsyncStorage.setItem(itemKey(localId), JSON.stringify(meta));
  return updated;
}

export async function getQueuedScan(localId: string): Promise<QueuedCardScan | null> {
  const raw = await AsyncStorage.getItem(itemKey(localId));
  if (!raw) {
    return null;
  }
  try {
    return hydrateQueuedScan(JSON.parse(raw) as StoredQueueMeta);
  } catch {
    return null;
  }
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
  const localIds = (await readIndex()).filter(id => id !== localId);
  await writeIndex(localIds);
  await AsyncStorage.multiRemove([
    itemKey(localId),
    imageKey(localId, 'front'),
    imageKey(localId, 'back'),
  ]);
}
