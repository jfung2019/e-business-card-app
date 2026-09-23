import { OpenCV } from 'react-native-fast-opencv';

import { detectCardQuad } from '../src/services/cardScanner/detectCardQuad';
import { decodeLuma, type LumaSample } from '../src/services/cardScanner/sampleFrameLuma';

/**
 * `Mat.createFromBuffer` memcpys `width * height` bytes out of the supplied
 * buffer without validating its length, so handing it a short or empty buffer
 * segfaults the whole app rather than throwing. The detector must reject those
 * samples in JS, before the native call.
 *
 * This reproduces the Android crash where the grayscale buffer arrived empty
 * across the worklet boundary.
 */
describe('detectCardQuad buffer guard', () => {
  const createFromBuffer = OpenCV.Mat.createFromBuffer as jest.Mock;
  const WIDTH = 32;
  const HEIGHT = 18;

  beforeEach(() => {
    createFromBuffer.mockClear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function sample(overrides: Partial<LumaSample>): LumaSample {
    return {
      width: WIDTH,
      height: HEIGHT,
      luma: 'x'.repeat(WIDTH * HEIGHT),
      orientation: 'up',
      isMirrored: false,
      ...overrides,
    } as LumaSample;
  }

  it('rejects an empty payload without calling into OpenCV', () => {
    expect(detectCardQuad(sample({ luma: '' }))).toBeNull();
    expect(createFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects a payload shorter than the declared frame', () => {
    expect(detectCardQuad(sample({ luma: 'x'.repeat(10) }))).toBeNull();
    expect(createFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects a payload longer than the declared frame', () => {
    expect(detectCardQuad(sample({ luma: 'x'.repeat(WIDTH * HEIGHT * 2) }))).toBeNull();
    expect(createFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects a missing or non-string payload', () => {
    expect(detectCardQuad(sample({ luma: undefined as unknown as string }))).toBeNull();
    expect(detectCardQuad(sample({ luma: new ArrayBuffer(8) as unknown as string }))).toBeNull();
    expect(createFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects zero-sized frame geometry', () => {
    expect(detectCardQuad(sample({ width: 0, height: 0 }))).toBeNull();
    expect(createFromBuffer).not.toHaveBeenCalled();
  });

  it('passes a correctly sized payload through to OpenCV', () => {
    detectCardQuad(sample({}));
    expect(createFromBuffer).toHaveBeenCalledWith(
      'uint8',
      HEIGHT,
      WIDTH,
      1,
      expect.any(Uint8Array),
    );
  });
});

describe('decodeLuma', () => {
  it('round-trips every non-zero byte value', () => {
    const bytes = Array.from({ length: 255 }, (_, i) => i + 1);
    const encoded = String.fromCharCode(...bytes);

    expect(Array.from(decodeLuma(encoded))).toEqual(bytes);
  });
});
