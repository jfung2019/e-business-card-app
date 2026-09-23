import { NativeModules, Platform } from 'react-native';

import type { CardQuad } from '../src/services/cardScanner/quadGeometry';

/**
 * On iOS, live detection, still detection and dewarping go through Apple
 * Vision / Core Image (`CardVisionModule`). OpenCV only runs when that module
 * is missing or fails.
 */
describe('CardVision routing', () => {
  const QUAD: CardQuad = [
    { x: 0.1, y: 0.2 },
    { x: 0.9, y: 0.2 },
    { x: 0.9, y: 0.8 },
    { x: 0.1, y: 0.8 },
  ];
  const PHOTO = { uri: 'file:///tmp/photo.jpg', width: 1200, height: 1600 };
  const SAMPLE = {
    width: 4,
    height: 2,
    luma: 'x'.repeat(8),
    orientation: 'up' as const,
    isMirrored: false,
  };
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    Platform.OS = originalOS;
    delete (NativeModules as Record<string, unknown>).CardVision;
    jest.restoreAllMocks();
    jest.resetModules();
  });

  function load(cardVision: unknown) {
    Platform.OS = 'ios';
    (NativeModules as Record<string, unknown>).CardVision = cardVision;
    let modules!: {
      detect: typeof import('../src/services/cardScanner/detectCardQuad');
      photo: typeof import('../src/services/cardScanner/cardPhoto');
      opencv: typeof import('react-native-fast-opencv');
      imageBase64: typeof import('../src/utils/imageBase64');
    };
    jest.isolateModules(() => {
      modules = {
        detect: require('../src/services/cardScanner/detectCardQuad'),
        photo: require('../src/services/cardScanner/cardPhoto'),
        opencv: require('react-native-fast-opencv'),
        imageBase64: require('../src/utils/imageBase64'),
      };
    });
    return modules;
  }

  it('uses Vision for still detection and Core Image for the warp', async () => {
    const native = {
      detectCardQuad: jest.fn().mockResolvedValue(QUAD.map((p) => ({ ...p }))),
      detectCardQuadInLuma: jest.fn(),
      warpCard: jest.fn().mockResolvedValue('file:///tmp/card.jpg'),
    };
    const { detect, photo } = load(native);

    await expect(detect.detectCardQuadInImage(PHOTO.uri)).resolves.toEqual(QUAD);
    await expect(photo.warpCardPhoto(PHOTO, QUAD)).resolves.toBe('file:///tmp/card.jpg');
    expect(native.warpCard).toHaveBeenCalledWith(PHOTO.uri, QUAD);
  });

  it('uses Vision for live frames', async () => {
    const native = {
      detectCardQuad: jest.fn(),
      detectCardQuadInLuma: jest.fn().mockResolvedValue(QUAD.map((p) => ({ ...p }))),
      warpCard: jest.fn(),
    };
    const { detect, opencv } = load(native);

    await expect(detect.detectCardQuadLive(SAMPLE)).resolves.toEqual(QUAD);
    expect(native.detectCardQuadInLuma).toHaveBeenCalledWith(SAMPLE.luma, 4, 2);
    expect(opencv.OpenCV.Mat.createFromBuffer).not.toHaveBeenCalled();
  });

  it('falls back to OpenCV for live frames when Vision fails', async () => {
    const native = {
      detectCardQuad: jest.fn(),
      detectCardQuadInLuma: jest.fn().mockRejectedValue(new Error('vision failed')),
      warpCard: jest.fn(),
    };
    const { detect, opencv } = load(native);

    await expect(detect.detectCardQuadLive(SAMPLE)).resolves.toBeNull();
    expect(opencv.OpenCV.Mat.createFromBuffer).toHaveBeenCalled();
  });

  it('passes through "no card found" without falling back to OpenCV', async () => {
    const native = {
      detectCardQuad: jest.fn().mockResolvedValue(null),
      detectCardQuadInLuma: jest.fn(),
      warpCard: jest.fn(),
    };
    const { detect, opencv, imageBase64 } = load(native);
    const readImage = jest.spyOn(imageBase64, 'readImageAsBase64');

    await expect(detect.detectCardQuadInImage(PHOTO.uri)).resolves.toBeNull();
    expect(readImage).not.toHaveBeenCalled();
    expect(opencv.OpenCV.Mat.createFromBase64).not.toHaveBeenCalled();
  });

  it('falls back to OpenCV when the native still calls fail', async () => {
    const native = {
      detectCardQuad: jest.fn().mockRejectedValue(new Error('vision failed')),
      detectCardQuadInLuma: jest.fn(),
      warpCard: jest.fn().mockRejectedValue(new Error('filter failed')),
    };
    const { detect, photo, imageBase64 } = load(native);
    const readImage = jest
      .spyOn(imageBase64, 'readImageAsBase64')
      .mockRejectedValue(new Error('opencv path'));

    // Both calls reach the OpenCV path, which starts by reading the image.
    await expect(detect.detectCardQuadInImage(PHOTO.uri)).resolves.toBeNull();
    await expect(photo.warpCardPhoto(PHOTO, QUAD)).rejects.toThrow('opencv path');
    expect(readImage).toHaveBeenCalledTimes(2);
  });
});
