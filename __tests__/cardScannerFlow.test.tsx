/**
 * @format
 */

import React from 'react';
import ReactTestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { Image, Text } from 'react-native';

import { ThemeProvider } from '../src/context/ThemeContext';
import { CardScannerScreen } from '../src/screens/CardScannerScreen';
import {
  discardScanFiles,
  prepareCapturedPhoto,
  warpCardPhoto,
} from '../src/services/cardScanner/cardPhoto';
import { detectCardQuadInImage } from '../src/services/cardScanner/detectCardQuad';
import type { CardQuad } from '../src/services/cardScanner/quadGeometry';

const mockCapturePhoto = jest.fn();

jest.mock('react-native-vision-camera', () => {
  const { View } = require('react-native');
  const photoOutput = { capturePhoto: (...args: unknown[]) => mockCapturePhoto(...args) };
  const frameOutput = {};
  return {
    __esModule: true,
    Camera: View,
    CommonResolutions: {
      HD_16_9: { width: 720, height: 1280 },
      FHD_16_9: { width: 1080, height: 1920 },
    },
    useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn() }),
    useCameraDevice: () => ({ id: 'back-0', position: 'back' }),
    useCameraDevices: () => [{ id: 'back-0', position: 'back' }],
    usePhotoOutput: () => photoOutput,
    useFrameOutput: () => frameOutput,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../src/services/cardScanner/cardPhoto', () => ({
  __esModule: true,
  prepareCapturedPhoto: jest.fn(),
  warpCardPhoto: jest.fn(),
  discardScanFiles: jest.fn(() => Promise.resolve()),
}));

jest.mock('../src/services/cardScanner/detectCardQuad', () => ({
  __esModule: true,
  detectCardQuad: jest.fn(() => null),
  detectCardQuadInImage: jest.fn(),
}));

const QUAD: CardQuad = [
  { x: 0.1, y: 0.2 },
  { x: 0.9, y: 0.2 },
  { x: 0.9, y: 0.6 },
  { x: 0.1, y: 0.6 },
] as CardQuad;

const RAW_URI = 'file:///tmp/raw.jpg';
const UPRIGHT = { uri: 'file:///cache/upright.jpg', width: 1080, height: 1920 };
const CROPPED_URI = 'file:///cache/card-scan-1.jpg';

const mockedPrepare = prepareCapturedPhoto as jest.Mock;
const mockedWarp = warpCardPhoto as jest.Mock;
const mockedDiscard = discardScanFiles as jest.Mock;
const mockedDetectStill = detectCardQuadInImage as jest.Mock;

function textsIn(root: ReactTestInstance): string[] {
  return root
    .findAllByType(Text)
    .map((node) => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    });
}

/** Presses the nearest pressable ancestor of the Text reading exactly `label`. */
async function pressText(root: ReactTestInstance, label: string): Promise<void> {
  const text = root.findAll(
    (node) => node.type === Text && node.props.children === label,
  )[0];
  if (!text) {
    throw new Error(`No text "${label}" on screen. Visible: ${textsIn(root).join(' | ')}`);
  }
  let node: ReactTestInstance | null = text;
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent;
  }
  if (!node) {
    throw new Error(`"${label}" is not pressable`);
  }
  await act(async () => {
    node!.props.onPress();
  });
}

async function pressLabel(root: ReactTestInstance, accessibilityLabel: string): Promise<void> {
  const target = root.find(
    (node) =>
      node.props.accessibilityLabel === accessibilityLabel &&
      typeof node.props.onPress === 'function',
  );
  await act(async () => {
    target.props.onPress();
  });
}

function shownImageUri(root: ReactTestInstance): string | undefined {
  return root.findAllByType(Image)[0]?.props.source?.uri;
}

async function renderScanner(side: 'front' | 'back' = 'front') {
  const onComplete = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <CardScannerScreen side={side} onComplete={onComplete} />
      </ThemeProvider>,
    );
  });
  return { root: renderer.root, onComplete, renderer };
}

describe('iOS card scanner flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturePhoto.mockResolvedValue({
      saveToTemporaryFileAsync: () => Promise.resolve('/tmp/raw.jpg'),
      dispose: jest.fn(),
    });
    mockedPrepare.mockResolvedValue(UPRIGHT);
    mockedDetectStill.mockResolvedValue(QUAD);
    mockedWarp.mockResolvedValue(CROPPED_URI);
  });

  it('manual capture shows exactly one cropped card for review', async () => {
    const { root } = await renderScanner();

    await pressLabel(root, 'Capture card');

    expect(mockedPrepare).toHaveBeenCalledWith(RAW_URI);
    expect(mockedDetectStill).toHaveBeenCalledWith(UPRIGHT.uri);
    expect(mockedWarp).toHaveBeenCalledWith(UPRIGHT, QUAD);

    const texts = textsIn(root);
    expect(texts).toContain('Check your scan');
    expect(texts.some((t) => t.includes('Captured manually'))).toBe(true);
    expect(root.findAllByType(Image)).toHaveLength(1);
    expect(shownImageUri(root)).toBe(CROPPED_URI);
  });

  it('Next hands the cropped card back and keeps it on disk', async () => {
    const { root, onComplete, renderer } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Next');
    expect(onComplete).toHaveBeenCalledWith(CROPPED_URI);

    // The host unmounts the scanner after completion: intermediates go, the
    // handed-off card stays.
    await act(async () => {
      renderer.unmount();
    });
    const discarded = mockedDiscard.mock.calls.flatMap(([uris]) => uris);
    expect(discarded).toEqual(expect.arrayContaining([RAW_URI, UPRIGHT.uri]));
    expect(discarded).not.toContain(CROPPED_URI);
  });

  it('Retake deletes the scan and returns to the camera', async () => {
    const { root, onComplete } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Retake');

    expect(mockedDiscard).toHaveBeenCalledWith([RAW_URI, UPRIGHT.uri, CROPPED_URI]);
    expect(onComplete).not.toHaveBeenCalled();
    expect(() =>
      root.find((node) => node.props.accessibilityLabel === 'Capture card'),
    ).not.toThrow();
  });

  it('Crop opens the editor and Apply re-warps with the adjusted corners', async () => {
    const { root } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Crop');
    expect(textsIn(root)).toContain('Adjust the crop');
    // The editor works on the original photo, not the already-cropped one.
    expect(shownImageUri(root)).toBe(UPRIGHT.uri);

    mockedWarp.mockResolvedValueOnce('file:///cache/card-scan-2.jpg');
    await pressText(root, 'Apply');

    expect(mockedWarp).toHaveBeenLastCalledWith(UPRIGHT, QUAD);
    expect(mockedDiscard).toHaveBeenCalledWith([CROPPED_URI]);
    expect(textsIn(root)).toContain('Check your scan');
    expect(shownImageUri(root)).toBe('file:///cache/card-scan-2.jpg');
  });

  it('Cancel in the crop editor keeps the existing crop', async () => {
    const { root } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Crop');
    await pressText(root, 'Cancel');

    expect(mockedWarp).toHaveBeenCalledTimes(1);
    expect(shownImageUri(root)).toBe(CROPPED_URI);
  });

  it('falls back to the uncropped photo when no edge is found', async () => {
    mockedDetectStill.mockResolvedValue(null);
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Capture card');

    expect(mockedWarp).not.toHaveBeenCalled();
    expect(
      textsIn(root).some((t) => t.includes('could not find the card edges')),
    ).toBe(true);
    expect(shownImageUri(root)).toBe(UPRIGHT.uri);

    await pressText(root, 'Next');
    expect(onComplete).toHaveBeenCalledWith(UPRIGHT.uri);
  });

  it('labels the final button Done on the back side', async () => {
    const { root, onComplete } = await renderScanner('back');
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Done');
    expect(onComplete).toHaveBeenCalledWith(CROPPED_URI);
  });

  it('recovers to the camera if the capture fails', async () => {
    mockCapturePhoto.mockRejectedValueOnce(new Error('Camera busy'));
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Capture card');

    expect(textsIn(root)).toContain('Camera busy');
    expect(onComplete).not.toHaveBeenCalled();
    expect(() =>
      root.find((node) => node.props.accessibilityLabel === 'Capture card'),
    ).not.toThrow();
  });

  it('Cancel on the camera closes the scanner with no image', async () => {
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Cancel scan');

    expect(onComplete).toHaveBeenCalledWith(null);
  });
});
