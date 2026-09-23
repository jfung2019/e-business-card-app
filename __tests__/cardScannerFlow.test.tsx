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
const mockLaunchImageLibrary = jest.fn();

jest.mock('react-native-image-picker', () => ({
  __esModule: true,
  launchImageLibrary: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));

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
  detectCardQuadLive: jest.fn(() => Promise.resolve(null)),
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

async function renderScanner(sides: ReadonlyArray<'front' | 'back'> = ['front']) {
  const onComplete = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <CardScannerScreen sides={sides} onComplete={onComplete} />
      </ThemeProvider>,
    );
  });
  return { root: renderer.root, onComplete, renderer };
}

/** Lets the brief "captured" confirmation run out. */
async function waitOutConfirmation(): Promise<void> {
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
}

function chipText(root: ReactTestInstance): string {
  const chip = root.find(
    (node) =>
      node.props.accessibilityLabel === 'Looking for a card' ||
      node.props.accessibilityLabel === 'Card detected',
  );
  return textsIn(chip).join('');
}

function discardedUris(): (string | null | undefined)[] {
  return mockedDiscard.mock.calls.flatMap(([uris]) => uris);
}

describe('iOS card scanner flow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCapturePhoto.mockResolvedValue({
      saveToTemporaryFileAsync: () => Promise.resolve('/tmp/raw.jpg'),
      dispose: jest.fn(),
    });
    mockedPrepare.mockResolvedValue(UPRIGHT);
    mockedDetectStill.mockResolvedValue(QUAD);
    mockedWarp.mockResolvedValue(CROPPED_URI);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('a clean crop is shown briefly, then handed back without a Next tap', async () => {
    const { root, onComplete, renderer } = await renderScanner();

    await pressLabel(root, 'Capture card');

    expect(mockedPrepare).toHaveBeenCalledWith(RAW_URI);
    expect(mockedDetectStill).toHaveBeenCalledWith(UPRIGHT.uri);
    expect(mockedWarp).toHaveBeenCalledWith(UPRIGHT, QUAD);
    expect(textsIn(root)).toContain('Front captured');
    expect(root.findAllByType(Image)).toHaveLength(1);
    expect(shownImageUri(root)).toBe(CROPPED_URI);
    expect(onComplete).not.toHaveBeenCalled();

    await waitOutConfirmation();
    expect(onComplete).toHaveBeenCalledWith([CROPPED_URI]);

    // Intermediates go, the handed-off card stays — also after unmount.
    await act(async () => {
      renderer.unmount();
    });
    expect(discardedUris()).toEqual(expect.arrayContaining([RAW_URI, UPRIGHT.uri]));
    expect(discardedUris()).not.toContain(CROPPED_URI);
  });

  it('Retake during the confirmation deletes the scan and returns to the camera', async () => {
    const { root, onComplete } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Retake');
    await waitOutConfirmation();

    expect(mockedDiscard).toHaveBeenCalledWith([RAW_URI, UPRIGHT.uri, CROPPED_URI]);
    expect(onComplete).not.toHaveBeenCalled();
    expect(() =>
      root.find((node) => node.props.accessibilityLabel === 'Capture card'),
    ).not.toThrow();
  });

  it('Adjust crop opens the editor and Apply re-warps, then waits for Done', async () => {
    const { root, onComplete } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Adjust crop');
    expect(textsIn(root)).toContain('Adjust the crop');
    // The editor works on the original photo, not the already-cropped one.
    expect(shownImageUri(root)).toBe(UPRIGHT.uri);

    mockedWarp.mockResolvedValueOnce('file:///cache/card-scan-2.jpg');
    await pressText(root, 'Apply');

    expect(mockedWarp).toHaveBeenLastCalledWith(UPRIGHT, QUAD);
    expect(mockedDiscard).toHaveBeenCalledWith([CROPPED_URI]);
    expect(textsIn(root)).toContain('Check your scan');
    expect(shownImageUri(root)).toBe('file:///cache/card-scan-2.jpg');

    // A manual adjustment is a deliberate choice: no auto-advance from here.
    await waitOutConfirmation();
    expect(onComplete).not.toHaveBeenCalled();
    await pressText(root, 'Done');
    expect(onComplete).toHaveBeenCalledWith(['file:///cache/card-scan-2.jpg']);
  });

  it('Cancel in the crop editor keeps the existing crop', async () => {
    const { root } = await renderScanner();
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Adjust crop');
    await pressText(root, 'Cancel');

    expect(mockedWarp).toHaveBeenCalledTimes(1);
    expect(shownImageUri(root)).toBe(CROPPED_URI);
  });

  it('falls back to full review of the uncropped photo when no edge is found', async () => {
    mockedDetectStill.mockResolvedValue(null);
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Capture card');

    expect(mockedWarp).not.toHaveBeenCalled();
    expect(
      textsIn(root).some((t) => t.includes('could not find the card edges')),
    ).toBe(true);
    expect(shownImageUri(root)).toBe(UPRIGHT.uri);

    await waitOutConfirmation();
    expect(onComplete).not.toHaveBeenCalled();
    await pressText(root, 'Done');
    expect(onComplete).toHaveBeenCalledWith([UPRIGHT.uri]);
  });

  it('captures front then back in one session', async () => {
    const { root, onComplete } = await renderScanner(['front', 'back']);
    expect(chipText(root)).toContain('FRONT');

    await pressLabel(root, 'Capture card');
    await waitOutConfirmation();
    expect(onComplete).not.toHaveBeenCalled();
    expect(chipText(root)).toContain('BACK');

    mockedWarp.mockResolvedValueOnce('file:///cache/card-back.jpg');
    await pressLabel(root, 'Capture card');
    expect(textsIn(root)).toContain('Back captured');
    await waitOutConfirmation();

    expect(onComplete).toHaveBeenCalledWith([CROPPED_URI, 'file:///cache/card-back.jpg']);
  });

  it('Skip on the back finishes with the front only', async () => {
    const { root, onComplete } = await renderScanner(['front', 'back']);
    expect(() => root.find((node) => node.props.accessibilityLabel === 'Skip the back side')).toThrow();

    await pressLabel(root, 'Capture card');
    await waitOutConfirmation();

    await pressLabel(root, 'Skip the back side');
    expect(onComplete).toHaveBeenCalledWith([CROPPED_URI]);
  });

  it('labels the review button Next while another side follows', async () => {
    mockedDetectStill.mockResolvedValue(null);
    const { root, onComplete } = await renderScanner(['front', 'back']);
    await pressLabel(root, 'Capture card');

    await pressText(root, 'Next');
    expect(onComplete).not.toHaveBeenCalled();
    expect(chipText(root)).toContain('BACK');
  });

  it('Cancel after keeping the front discards it', async () => {
    const { root, onComplete, renderer } = await renderScanner(['front', 'back']);
    await pressLabel(root, 'Capture card');
    await waitOutConfirmation();

    await pressLabel(root, 'Cancel scan');
    expect(onComplete).toHaveBeenCalledWith(null);

    await act(async () => {
      renderer.unmount();
    });
    expect(discardedUris()).toContain(CROPPED_URI);
  });

  it('Photos runs a library pick through the same crop pipeline', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///tmp/picked.jpg' }] });
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Choose from photos');

    expect(mockedPrepare).toHaveBeenCalledWith('file:///tmp/picked.jpg');
    expect(mockedWarp).toHaveBeenCalledWith(UPRIGHT, QUAD);
    await waitOutConfirmation();
    expect(onComplete).toHaveBeenCalledWith([CROPPED_URI]);
  });

  it('cancelling the photo picker returns to the camera', async () => {
    mockLaunchImageLibrary.mockResolvedValue({ didCancel: true });
    const { root, onComplete } = await renderScanner();

    await pressLabel(root, 'Choose from photos');

    expect(mockedPrepare).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(() =>
      root.find((node) => node.props.accessibilityLabel === 'Capture card'),
    ).not.toThrow();
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
