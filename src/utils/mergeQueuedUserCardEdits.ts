import type { QueuedUserCardScan } from '../types/offlineQueue';
import type { UserCard, UserCardDraft } from '../types/userCard';

import { buildQueueFieldEditsPatch } from './buildQueueFieldEditsPatch';

export function buildUserCardPatchFromQueueEdits(
  created: UserCard,
  item: QueuedUserCardScan,
): Partial<UserCardDraft> {
  const edited = new Set(item.editedFields);
  const patch: Partial<UserCardDraft> = {
    ...buildQueueFieldEditsPatch(created, item),
  };

  if (edited.has('meta.design_id')) {
    patch.design_id = item.designId;
  }
  if (edited.has('meta.is_primary')) {
    patch.is_primary = item.isPrimary;
  }

  return patch;
}
