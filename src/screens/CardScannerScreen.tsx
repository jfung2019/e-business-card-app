import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraDevices,
  useCameraPermission,
  useFrameOutput,
  usePhotoOutput,
  type TorchMode,
} from 'react-native-vision-camera';

import { CardCropEditor } from '../components/CardCropEditor';
import { CardQuadOverlay } from '../components/CardQuadOverlay';
import { CardScanReview, type CaptureMode } from '../components/CardScanReview';
import { useAppTheme } from '../context/ThemeContext';
import {
  discardScanFiles,
  prepareCapturedPhoto,
  warpCardPhoto,
  type PreparedPhoto,
} from '../services/cardScanner/cardPhoto';
import type { CardScannerSide } from '../services/cardScanner/cardScannerController';
import { detectCardQuad, detectCardQuadInImage } from '../services/cardScanner/detectCardQuad';
import {
  containRect,
  defaultCropQuad,
  lerpQuad,
  quadDrift,
  type CardQuad,
} from '../services/cardScanner/quadGeometry';
import { sampleFrameLuma, type LumaSample } from '../services/cardScanner/sampleFrameLuma';

/** Detection cadence. Edge detection does not need 60fps and this saves heat. */
const DETECT_INTERVAL_MS = 120;

/** Mean corner movement (normalized) below which the card counts as steady. */
const STEADY_DRIFT_THRESHOLD = 0.012;

/** Consecutive steady detections before auto-capture fires (~0.7s at 120ms). */
const STEADY_FRAMES_REQUIRED = 6;

/** Drop the outline after this long without a detection, so it never sticks. */
const DETECTION_STALE_MS = 500;

/** Overlay smoothing — higher snaps faster, lower glides more. */
const SMOOTHING = 0.45;

/**
 * After Retake, wait this long before auto-capture can fire again — otherwise
 * a card still sitting in view is re-captured before the user has moved it.
 */
const AUTO_CAPTURE_COOLDOWN_MS = 1200;

/**
 * Portrait 16:9. The frame output is physically rotated to match, so the
 * preview, the frame thumbnail and the overlay all share this aspect.
 */
const FRAME_RESOLUTION = CommonResolutions.HD_16_9;
const PHOTO_RESOLUTION = CommonResolutions.FHD_16_9;
const PREVIEW_ASPECT_WIDTH = Math.min(FRAME_RESOLUTION.width, FRAME_RESOLUTION.height);
const PREVIEW_ASPECT_HEIGHT = Math.max(FRAME_RESOLUTION.width, FRAME_RESOLUTION.height);

const SHUTTER_SIZE = 84;
const RING_STROKE = 4;
const RING_RADIUS = (SHUTTER_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface CardScannerScreenProps {
  side: CardScannerSide;
  onComplete: (imageUri: string | null) => void;
}

/**
 * - scanning:   live preview, detector running, auto-capture armed
 * - capturing:  shutter fired, camera still active until the photo lands
 * - processing: preparing the photo, re-detecting edges, warping
 * - review:     one cropped card — Retake / Crop / Next
 * - cropping:   corner editor over the original photo
 */
type Phase = 'scanning' | 'capturing' | 'processing' | 'review' | 'cropping';

interface ScanResult {
  rawUri: string;
  photo: PreparedPhoto;
  /** Edge found in the still, if any — what "Reset" goes back to. */
  detectedQuad: CardQuad | null;
  /** The crop currently applied. */
  cropQuad: CardQuad | null;
  croppedUri: string | null;
  mode: CaptureMode;
}

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function CardScannerScreen({ side, onComplete }: CardScannerScreenProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();

  // The device factory resolves asynchronously, so the list is empty on the
  // first render. Passing the `"back"` shorthand to <Camera> would throw
  // "This device does not have any back Cameras!" before it ever fills in;
  // these hooks return undefined/[] while loading instead.
  const backDevice = useCameraDevice('back');
  const devices = useCameraDevices();
  const device = backDevice ?? devices[0];
  const devicesLoaded = devices.length > 0;

  const [phase, setPhase] = useState<Phase>('scanning');
  const [liveQuad, setLiveQuad] = useState<CardQuad | null>(null);
  const [steadyCount, setSteadyCount] = useState(0);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isRewarping, setIsRewarping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs mirror what the detector callback reads, so the frame worklet is not
  // rebuilt on every detection.
  const phaseRef = useRef<Phase>('scanning');
  const quadRef = useRef<CardQuad | null>(null);
  const steadyRef = useRef(0);
  const lastDetectionAtRef = useRef(0);
  const autoArmedAtRef = useRef(0);
  const resultRef = useRef<ScanResult | null>(null);
  resultRef.current = result;
  const handedOffUriRef = useRef<string | null>(null);

  /**
   * Phase lives in both a ref and state. The ref is what the async capture
   * path and the detector read, so it must update synchronously — a render
   * cannot be allowed to land between the two and re-open the capture gate.
   */
  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resetDetection = useCallback(() => {
    quadRef.current = null;
    steadyRef.current = 0;
    lastDetectionAtRef.current = 0;
    setLiveQuad(null);
    setSteadyCount(0);
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  // Leaving the scanner any way other than "Next" must not strand temp files.
  useEffect(
    () => () => {
      const current = resultRef.current;
      if (!current) {
        return;
      }
      const keep = handedOffUriRef.current;
      void discardScanFiles(
        [current.rawUri, current.photo.uri, current.croppedUri].filter((uri) => uri !== keep),
      );
    },
    [],
  );

  const photoOutput = usePhotoOutput({
    targetResolution: PHOTO_RESOLUTION,
    qualityPrioritization: 'quality',
  });

  const capture = useCallback(
    async (mode: CaptureMode) => {
      if (phaseRef.current !== 'scanning') {
        return;
      }
      const liveQuadAtCapture = quadRef.current;
      changePhase('capturing');
      setError(null);

      let rawUri: string | null = null;
      let prepared: PreparedPhoto | null = null;
      try {
        const photo = await photoOutput.capturePhoto({}, {});
        try {
          rawUri = toFileUri(await photo.saveToTemporaryFileAsync());
        } finally {
          photo.dispose();
        }

        // The photo is on disk; the camera can stop while we process.
        changePhase('processing');
        prepared = await prepareCapturedPhoto(rawUri);

        // Re-detect on the still: sharper than the live quad, and gives
        // manual captures a crop too. Fall back to the live outline.
        const detected = await detectCardQuadInImage(prepared.uri);
        const quad = detected ?? liveQuadAtCapture;
        const croppedUri = quad ? await warpCardPhoto(prepared, quad) : null;

        setResult({
          rawUri,
          photo: prepared,
          detectedQuad: quad,
          cropQuad: quad,
          croppedUri,
          mode,
        });
        changePhase('review');
      } catch (captureError) {
        void discardScanFiles([rawUri, prepared?.uri]);
        setError(
          captureError instanceof Error ? captureError.message : 'Could not capture the card.',
        );
        resetDetection();
        changePhase('scanning');
      }
    },
    [changePhase, photoOutput, resetDetection],
  );

  /**
   * Receives a detection sample on the JS thread, runs OpenCV over it, and
   * auto-captures once the card has held still long enough.
   */
  const handleSample = useCallback(
    (
      luma: string,
      width: number,
      height: number,
      orientation: LumaSample['orientation'],
      isMirrored: boolean,
    ) => {
      if (phaseRef.current !== 'scanning') {
        return;
      }

      const detected = detectCardQuad({ luma, width, height, orientation, isMirrored });
      const now = Date.now();

      if (!detected) {
        if (now - lastDetectionAtRef.current > DETECTION_STALE_MS) {
          quadRef.current = null;
          steadyRef.current = 0;
          setLiveQuad(null);
          setSteadyCount(0);
        }
        return;
      }

      lastDetectionAtRef.current = now;

      const previous = quadRef.current;
      const smoothed = previous ? lerpQuad(previous, detected, SMOOTHING) : detected;

      if (previous && quadDrift(previous, detected) < STEADY_DRIFT_THRESHOLD) {
        steadyRef.current += 1;
      } else {
        steadyRef.current = 0;
      }

      quadRef.current = smoothed;
      setLiveQuad(smoothed);
      setSteadyCount(steadyRef.current);

      if (steadyRef.current >= STEADY_FRAMES_REQUIRED && now >= autoArmedAtRef.current) {
        void capture('auto');
      }
    },
    [capture],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    targetResolution: FRAME_RESOLUTION,
    // Frames arrive already rotated to 'up', so the overlay does not depend
    // on hand-written orientation math.
    enablePhysicalBufferRotation: true,
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      try {
        // Throttle state lives on this worklet runtime's own global: nothing
        // here has to be shared back across runtimes.
        const runtime = globalThis as unknown as { __cardScannerLastSampleAt?: number };
        const now = Date.now();
        if (now - (runtime.__cardScannerLastSampleAt ?? 0) < DETECT_INTERVAL_MS) {
          return;
        }
        runtime.__cardScannerLastSampleAt = now;

        const sample = sampleFrameLuma(frame);
        if (sample) {
          scheduleOnRN(
            handleSample,
            sample.luma,
            sample.width,
            sample.height,
            sample.orientation,
            sample.isMirrored,
          );
        }
      } finally {
        frame.dispose();
      }
    },
  });

  const outputs = useMemo(() => [photoOutput, frameOutput], [photoOutput, frameOutput]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPreviewSize({ width, height });
  }, []);

  const handleCancel = useCallback(() => {
    onComplete(null);
  }, [onComplete]);

  const handleRetake = useCallback(() => {
    const current = resultRef.current;
    if (current) {
      void discardScanFiles([current.rawUri, current.photo.uri, current.croppedUri]);
    }
    setResult(null);
    setError(null);
    resetDetection();
    autoArmedAtRef.current = Date.now() + AUTO_CAPTURE_COOLDOWN_MS;
    changePhase('scanning');
  }, [changePhase, resetDetection]);

  const handleApplyCrop = useCallback(
    async (quad: CardQuad) => {
      const current = resultRef.current;
      if (!current) {
        return;
      }
      changePhase('review');
      setIsRewarping(true);
      try {
        const croppedUri = await warpCardPhoto(current.photo, quad);
        void discardScanFiles([current.croppedUri]);
        setResult({ ...current, cropQuad: quad, croppedUri });
      } catch {
        setError('Could not apply that crop. Try again.');
      } finally {
        setIsRewarping(false);
      }
    },
    [changePhase],
  );

  const handleNext = useCallback(() => {
    const current = resultRef.current;
    if (!current) {
      return;
    }
    const finalUri = current.croppedUri ?? current.photo.uri;
    handedOffUriRef.current = finalUri;
    onComplete(finalUri);
  }, [onComplete]);

  const previewRect = useMemo(
    () =>
      containRect(PREVIEW_ASPECT_WIDTH, PREVIEW_ASPECT_HEIGHT, previewSize.width, previewSize.height),
    [previewSize.height, previewSize.width],
  );

  const progress = liveQuad ? Math.min(1, steadyCount / STEADY_FRAMES_REQUIRED) : 0;

  const hint = useMemo(() => {
    if (error) {
      return error;
    }
    if (phase === 'capturing' || phase === 'processing') {
      return 'Capturing…';
    }
    if (!liveQuad) {
      return side === 'front'
        ? 'Point the camera at the front of the card'
        : 'Point the camera at the back of the card';
    }
    return 'Hold still — capturing automatically';
  }, [error, liveQuad, phase, side]);

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: scan.background }]}>
        <Text style={[styles.messageText, { color: scan.cream }]}>
          Camera access is needed to scan a card. You can allow it in Settings.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.outlineButton, { borderColor: scan.gold }]}
          onPress={handleCancel}>
          <Text style={[styles.outlineButtonText, { color: scan.gold }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'review' && result) {
    return (
      <CardScanReview
        side={side}
        imageUri={result.croppedUri ?? result.photo.uri}
        captureMode={result.mode}
        isCropped={result.croppedUri !== null}
        isBusy={isRewarping}
        onRetake={handleRetake}
        onCrop={() => changePhase('cropping')}
        onNext={handleNext}
      />
    );
  }

  if (phase === 'cropping' && result) {
    return (
      <CardCropEditor
        imageUri={result.photo.uri}
        imageWidth={result.photo.width}
        imageHeight={result.photo.height}
        initialQuad={result.cropQuad ?? defaultCropQuad()}
        resetQuad={result.detectedQuad ?? defaultCropQuad()}
        onCancel={() => changePhase('review')}
        onApply={(quad) => void handleApplyCrop(quad)}
      />
    );
  }

  // Devices are still enumerating: hold the screen rather than mounting a
  // Camera with no input.
  if (!device) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: scan.background }]}>
        {devicesLoaded ? (
          <>
            <Text style={[styles.messageText, { color: scan.cream }]}>
              No camera is available on this device.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={[styles.outlineButton, { borderColor: scan.gold }]}
              onPress={handleCancel}>
              <Text style={[styles.outlineButtonText, { color: scan.gold }]}>Close</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={scan.gold} size="large" />
        )}
      </View>
    );
  }

  const isCameraBusy = phase === 'capturing' || phase === 'processing';

  return (
    <View style={styles.cameraContainer}>
      <View style={styles.previewWrapper} onLayout={handleLayout}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          // Stays active through 'capturing' so the photo can land; stops
          // during processing, which leaves the last frame frozen on screen.
          isActive={phase === 'scanning' || phase === 'capturing'}
          outputs={outputs}
          resizeMode="contain"
          torchMode={torchMode}
          enableNativeTapToFocusGesture
        />
        {phase === 'scanning' ? (
          <CardQuadOverlay
            quad={liveQuad}
            rect={previewRect}
            color={progress >= 1 ? scan.gold : scan.goldLight}
            progress={progress}
          />
        ) : null}
        {isCameraBusy ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator color={scan.gold} size="large" />
          </View>
        ) : null}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel scan"
          style={styles.chip}
          onPress={handleCancel}>
          <Text style={styles.chipText}>Cancel</Text>
        </Pressable>

        <View
          accessibilityLabel={liveQuad ? 'Card detected' : 'Looking for a card'}
          style={[styles.chip, liveQuad && { backgroundColor: scan.gold }]}>
          <Text style={[styles.chipText, liveQuad && styles.chipTextOnGold]}>
            {side === 'front' ? 'FRONT' : 'BACK'} · AUTO
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torchMode === 'on' ? 'Turn flashlight off' : 'Turn flashlight on'}
          style={styles.chip}
          onPress={() => setTorchMode((current) => (current === 'on' ? 'off' : 'on'))}>
          <Text style={styles.chipText}>{torchMode === 'on' ? 'Flash on' : 'Flash off'}</Text>
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.hint}>{hint}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Capture card"
          accessibilityHint="Takes the photo now instead of waiting for auto capture"
          disabled={phase !== 'scanning'}
          style={styles.shutterHitArea}
          onPress={() => void capture('manual')}>
          <Svg width={SHUTTER_SIZE} height={SHUTTER_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={SHUTTER_SIZE / 2}
              cy={SHUTTER_SIZE / 2}
              r={RING_RADIUS}
              stroke="rgba(255, 255, 255, 0.35)"
              strokeWidth={RING_STROKE}
              fill="none"
            />
            {/* Fills clockwise from 12 o'clock as the card steadies. */}
            <Circle
              cx={SHUTTER_SIZE / 2}
              cy={SHUTTER_SIZE / 2}
              r={RING_RADIUS}
              stroke={scan.gold}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
              rotation={-90}
              origin={`${SHUTTER_SIZE / 2}, ${SHUTTER_SIZE / 2}`}
              fill="none"
            />
          </Svg>
          <View style={[styles.shutterInner, phase !== 'scanning' && styles.shutterDisabled]} />
        </Pressable>

        <Text style={styles.subHint}>Hold steady for auto capture, or tap to capture now</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraContainer: {
    backgroundColor: '#000000',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  previewWrapper: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  processingOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  chipTextOnGold: {
    color: '#111827',
  },
  bottomBar: {
    alignItems: 'center',
    gap: 14,
    marginTop: 'auto',
    paddingHorizontal: 24,
  },
  hint: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
  },
  shutterHitArea: {
    alignItems: 'center',
    height: SHUTTER_SIZE,
    justifyContent: 'center',
    width: SHUTTER_SIZE,
  },
  shutterInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: (SHUTTER_SIZE - 20) / 2,
    height: SHUTTER_SIZE - 20,
    width: SHUTTER_SIZE - 20,
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  subHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  outlineButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
