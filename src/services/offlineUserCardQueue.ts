import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CARD_DESIGN_ID } from '../theme/cardDesigns';
import type { QueuedUserCardScan } from '../types/offlineQueue';
import type { UserCard } from '../types/userCard';

const INDEX_KEY = '@ebc/offlineUserCardQueue/index';

function itemKey(localId: string): string {
  return `@ebc/offlineUserCardQueue/item/${localId}`;
}

function imageKey(localId: string, face: 'front' | 'back'): string {
  return `@ebc/offlineUserCardQueue/image/${localId}/${face}`;
}

type StoredQueueMeta = Omit<QueuedUserCardScan, 'imageBase64' | 'backImageBase64'> & {
  hasBackImage?: boolean;
};

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isLocalUserCardId(cardId: string): boolean {
  return cardId.startsWith('local:user:');
}

export function localUserCardIdToQueueId(cardId: string): string {
  return cardId.replace(/^local:user:/, '');
}

function toScanImageDataUri(base64: string): string {
  return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
}

export function queuedUserScanToUserCard(item: QueuedUserCardScan): UserCard {
  const frontImageUri = item.imageBase64 ? toScanImageDataUri(item.imageBase64) : null;
  const backImageUri = item.backImageBase64 ? toScanImageDataUri(item.backImageBase64) : null;

  return {
    _id: `local:user:${item.localId}`,
    owner_user_id: 'local',
    core_fields: item.core_fields,
    custom_fields: item.custom_fields,
    design_id: item.designId,
    design_type: 'preset',
    is_primary: item.isPrimary,
    sort_order: 0,
    scan_image_url: frontImageUri,
    scan_image_front_url: frontImageUri,
    scan_image_back_url: backImageUri,
    wallet_display: item.wallet_display ?? (frontImageUri ? 'photo' : 'classic'),
    photo_face: item.photo_face ?? 'front',
    created_at: item.createdAt,
    updated_at: item.createdAt,
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

async function hydrateQueuedScan(meta: StoredQueueMeta): Promise<QueuedUserCardScan> {
  const imageBase64 = (await AsyncStorage.getItem(imageKey(meta.localId, 'front'))) ?? '';
  const backImageBase64 = meta.hasBackImage
    ? (await AsyncStorage.getItem(imageKey(meta.localId, 'back'))) ?? undefined
    : undefined;

  return {
    ...meta,
    imageBase64,
    backImageBase64,
    editedFields: meta.editedFields ?? [],
  };
}

export async function listQueuedUserScans(): Promise<QueuedUserCardScan[]> {
  const localIds = await readIndex();
  const items: QueuedUserCardScan[] = [];

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

export async function enqueueOfflineUserScan(input: {
  rawOcrText: string;
  imageBase64: string;
  backImageBase64?: string;
  core_fields: QueuedUserCardScan['core_fields'];
  custom_fields: Record<string, string>;
  designId?: string;
  isPrimary?: boolean;
}): Promise<QueuedUserCardScan> {
  const localId = createLocalId();
  const item: QueuedUserCardScan = {
    localId,
    createdAt: new Date().toISOString(),
    rawOcrText: input.rawOcrText,
    imageBase64: input.imageBase64,
    backImageBase64: input.backImageBase64,
    core_fields: input.core_fields,
    custom_fields: input.custom_fields,
    designId: input.designId ?? DEFAULT_CARD_DESIGN_ID,
    isPrimary: input.isPrimary ?? true,
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
    designId: item.designId,
    isPrimary: item.isPrimary,
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

export async function updateQueuedUserScan(
  localId: string,
  patch: Partial<QueuedUserCardScan>,
): Promise<QueuedUserCardScan | null> {
  const raw = await AsyncStorage.getItem(itemKey(localId));
  if (!raw) {
    return null;
  }

  const existing = await hydrateQueuedScan(JSON.parse(raw) as StoredQueueMeta);
  const updated: QueuedUserCardScan = { ...existing, ...patch };

  const meta: StoredQueueMeta = {
    localId: updated.localId,
    createdAt: updated.createdAt,
    rawOcrText: updated.rawOcrText,
    core_fields: updated.core_fields,
    custom_fields: updated.custom_fields,
    designId: updated.designId,
    isPrimary: updated.isPrimary,
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

export async function getQueuedUserScan(localId: string): Promise<QueuedUserCardScan | null> {
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

export async function removeQueuedUserScan(localId: string): Promise<void> {
  const localIds = (await readIndex()).filter(id => id !== localId);
  await writeIndex(localIds);
  await AsyncStorage.multiRemove([
    itemKey(localId),
    imageKey(localId, 'front'),
    imageKey(localId, 'back'),
  ]);
}

export async function clearOfflineUserCardQueue(): Promise<void> {
  const localIds = await readIndex();
  await writeIndex([]);
  await AsyncStorage.multiRemove(
    localIds.flatMap(localId => [
      itemKey(localId),
      imageKey(localId, 'front'),
      imageKey(localId, 'back'),
    ]),
  );
}
