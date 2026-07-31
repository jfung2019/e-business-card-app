import { shouldOpenScanImageReview } from '../src/utils/scanImageReview';

describe('scan image review routing', () => {
  it('opens review for successful and failed online enhancement', () => {
    expect(shouldOpenScanImageReview('preview_ready', false)).toBe(true);
    expect(shouldOpenScanImageReview('failed', false)).toBe(true);
  });

  it('keeps offline scans on their existing success flow', () => {
    expect(shouldOpenScanImageReview('preview_ready', true)).toBe(false);
    expect(shouldOpenScanImageReview('none', false)).toBe(false);
  });
});
