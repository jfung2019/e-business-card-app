import {
  notifyOfflineSyncComplete,
  onOfflineSyncComplete,
  type OfflineSyncResult,
} from '../src/services/offlineSyncCoordinator';
import type { CapturedCard } from '../src/types/card';

function makeCapturedCard(overrides: Partial<CapturedCard> = {}): CapturedCard {
  return {
    _id: 'card-1',
    owner_user_id: 'user-1',
    scanned_at: new Date().toISOString(),
    raw_ocr_text: 'OCR',
    core_fields: { name: 'Ada' },
    custom_fields: {},
    edited_fields: [],
    parse_status: 'parsed',
    parse_source: 'llm',
    enhancement_status: 'applied',
    scan_image_enhancement_status: 'preview_ready',
    ...overrides,
  } as CapturedCard;
}

describe('offlineSyncCoordinator', () => {
  it('notifies listeners with review candidates after a successful sync', () => {
    const seen: OfflineSyncResult[] = [];
    const unsubscribe = onOfflineSyncComplete(result => {
      seen.push(result);
    });

    const result: OfflineSyncResult = {
      syncedCount: 1,
      reviewCandidates: [{ kind: 'captured', card: makeCapturedCard() }],
    };
    notifyOfflineSyncComplete(result);

    expect(seen).toEqual([result]);
    unsubscribe();
  });

  it('does not notify when syncedCount is zero', () => {
    const seen: OfflineSyncResult[] = [];
    const unsubscribe = onOfflineSyncComplete(result => {
      seen.push(result);
    });

    notifyOfflineSyncComplete({ syncedCount: 0, reviewCandidates: [] });
    expect(seen).toEqual([]);
    unsubscribe();
  });
});
