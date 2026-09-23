import { AppState, Platform } from 'react-native';
import DocumentScanner from 'react-native-document-scanner-plugin';

import { scanBusinessCard, scanBusinessCardBothSides } from '../src/services/ocr';
import {
  openCardScanner,
  openCardScannerBothSides,
} from '../src/services/cardScanner/cardScannerController';

jest.mock('react-native-document-scanner-plugin', () => ({
  __esModule: true,
  default: { scanDocument: jest.fn() },
}));

jest.mock('../src/services/cardScanner/cardScannerController', () => ({
  __esModule: true,
  openCardScanner: jest.fn(),
  openCardScannerBothSides: jest.fn(),
}));

jest.mock('../src/services/qrDetect', () => ({
  __esModule: true,
  detectWechatQrUrls: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../src/utils/compressScanImage', () => ({
  __esModule: true,
  compressScanImageForUpload: jest.fn(() => Promise.resolve('base64')),
}));

jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: { recognize: jest.fn(() => Promise.resolve({ blocks: [{ text: 'Jane Doe' }] })) },
  TextRecognitionScript: { LATIN: 0, CHINESE: 1 },
}));

const scanDocument = DocumentScanner.scanDocument as jest.Mock;
const openScanner = openCardScanner as jest.Mock;
const openBothSides = openCardScannerBothSides as jest.Mock;

/**
 * The two platforms deliberately use different scanners. Android's ML Kit
 * backend honours `maxNumDocuments: 1` and already captures exactly one card;
 * only iOS needed replacing, because VisionKit ignores the page limit.
 *
 * Routing Android through the custom camera regressed a working flow once —
 * this pins it.
 */
describe('scanner platform routing', () => {
  beforeAll(() => {
    // ocr.ts waits up to 2s for the app to report "active" before opening a
    // scanner; without this every Android case pays that timeout.
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      get: () => 'active',
    });
  });

  beforeEach(() => {
    scanDocument.mockReset();
    openScanner.mockReset();
    openBothSides.mockReset();
  });

  afterEach(() => {
    Platform.OS = 'ios';
  });

  it('uses the ML Kit document scanner on Android', async () => {
    Platform.OS = 'android';
    scanDocument.mockResolvedValue({
      status: 'success',
      scannedImages: ['file:///tmp/card.jpg'],
    });

    await scanBusinessCard('camera');

    expect(scanDocument).toHaveBeenCalledWith({
      maxNumDocuments: 1,
      croppedImageQuality: 90,
    });
    expect(openScanner).not.toHaveBeenCalled();
  });

  it('uses the in-app card scanner on iOS', async () => {
    Platform.OS = 'ios';
    openScanner.mockResolvedValue('file:///tmp/card.jpg');

    await scanBusinessCard('camera');

    expect(openScanner).toHaveBeenCalledWith('front');
    expect(scanDocument).not.toHaveBeenCalled();
  });

  it('passes the requested side through on iOS', async () => {
    Platform.OS = 'ios';
    openScanner.mockResolvedValue('file:///tmp/card-back.jpg');

    await scanBusinessCard('camera', { requireText: false, side: 'back' });

    expect(openScanner).toHaveBeenCalledWith('back');
  });

  it('returns null when the Android scanner is cancelled', async () => {
    Platform.OS = 'android';
    scanDocument.mockResolvedValue({ status: 'cancel', scannedImages: [] });

    await expect(scanBusinessCard('camera')).resolves.toBeNull();
  });

  it('analyzes both sides from one scanner session', async () => {
    openBothSides.mockResolvedValue({
      front: 'file:///tmp/front.jpg',
      back: 'file:///tmp/back.jpg',
    });

    const pair = await scanBusinessCardBothSides();

    expect(pair?.front).toMatchObject({ imageUri: 'file:///tmp/front.jpg', ocrText: 'Jane Doe' });
    expect(pair?.back).toMatchObject({ imageUri: 'file:///tmp/back.jpg' });
  });

  it('leaves the back empty when it was skipped', async () => {
    openBothSides.mockResolvedValue({ front: 'file:///tmp/front.jpg', back: null });

    await expect(scanBusinessCardBothSides()).resolves.toMatchObject({ back: null });
  });

  it('returns null when the combined scan is cancelled', async () => {
    openBothSides.mockResolvedValue(null);

    await expect(scanBusinessCardBothSides()).resolves.toBeNull();
  });
});
