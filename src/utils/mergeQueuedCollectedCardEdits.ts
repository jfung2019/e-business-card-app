import type { CapturedCard } from '../types/card';
import type { QueuedCardScan } from '../types/offlineQueue';

import { buildQueueFieldEditsPatch } from './buildQueueFieldEditsPatch';

export function buildCollectedCardPatchFromQueueEdits(
  created: CapturedCard,
  item: QueuedCardScan,
): Pick<CapturedCard, 'core_fields' | 'custom_fields'> {
  return buildQueueFieldEditsPatch(created, item);
}
