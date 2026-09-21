import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import {
  Camera,
  CommonResolutions,
  useCameraPermission,
  useFrameOutput,
  usePhotoOutput,
  type TorchMode,
} from 'react-native-vision-camera';

import { CardQuadOverlay } from '../components/CardQuadOverlay';
import { useAppTheme } from '../context/ThemeContext';
import type { CardScannerSide } from '../services/cardScanner/cardScannerController';
import { detectCardQuad } from '../services/cardScanner/detectCardQuad';
import { lerpQuad, quadDrift, type CardQuad } from '../services/cardScanner/quadGeometry';
import { sampleFrameLuma, type LumaSample } from '../services/cardScanner/sampleFrameLuma';
import { warpCardPhoto } from '../services/cardScanner/warpCardPhoto';

/** Detection cadence. Edge detection does not need 60fps and this saves heat. */
const DETECT_INTERVAL_MS = 120;

/** Mean corner movement (normalized) below which the card counts as steady. */
const STEADY_DRIFT_THRESHOLD = 0.012;

/** Consecutive steady detections required before auto-capture fires. */
const STEADY_FRAMES_REQUIRED = 5;

/** Drop the outline after this long without a detection, so it never sticks. */
const DETECTION_STALE_MS = 500;

/** Overlay smoothing — higher snaps faster, lower glides more. */
const SMOOTHING = 0.45;

/**
 * Frame and photo outputs must share an aspect ratio: the overlay works in
 * normalized coordinates and `resizeMode="contain"` shows the whole frame, so
 * a 16:9 preview quad maps straight onto a 16:9 capture.
 */
const FRAME_RESOLUTION = CommonResolutions.HD_16_9;
const PHOTO_RESOLUTION = CommonResolutions.FHD_16_9;

interface CardScannerScreenProps {
  side: CardScannerSide;
  onComplete: (imageUri: string | null) => void;
}

type Phase = 'scanning' | 'capturing' | 'confirming';

export function CardScannerScreen({
  side,
  onComplete,
}: CardScannerScreenProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { hasPermission, requestPermission } = useCameraPermission();

  const [phase, setPhase] = useState<Phase>('scanning');
  const [quad, setQuad] = useState<CardQuad | null>(null);
  const [steadyCount, setSteadyCount] = useState(0);
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [torchMode, setTorchMode] = useState<TorchMode>('off');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs mirror the state the detector callback reads, so the frame worklet
  // does not have to be rebuilt on every detection.
  const quadRef = useRef<CardQuad | null>(null);
  const steadyRef = useRef(0);
  const phaseRef = useRef<Phase>('scanning');
  const lastDetectionAtRef = useRef(0);

  // A shared value, not a ref: the throttle clock is read and written on the
  // camera's frame thread, and only shared values are truly shared between
  // that runtime and this one.
  const lastSampleAt = useSharedValue(0);

  /**
   * Phase lives in both a ref and state. The ref is what the async capture
   * path and the detector read, so it must update synchronously — a render
   * cannot be allowed to land between the two and re-open the capture gate.
   */
  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    if (!hasPermission) {
      void requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const photoOutput = usePhotoOutput({
    targetResolution: PHOTO_RESOLUTION,
    qualityPrioritization: 'quality',
  });

  const capture = useCallback(
    async (withQuad: CardQuad | null) => {
      if (phaseRef.current !== 'scanning') {
        return;
      }
      changePhase('capturing');
      setError(null);

      let photo: Awaited<ReturnType<typeof photoOutput.capturePhoto>> | null = null;
      try {
        photo = await photoOutput.capturePhoto({}, {});
        const rawUri = await photo.saveToTemporaryFileAsync();
        const fileUri = rawUri.startsWith('file://') ? rawUri : `file://${rawUri}`;

        const finalUri = withQuad ? await warpCardPhoto(fileUri, withQuad) : fileUri;
        setCapturedUri(finalUri);
        changePhase('confirming');
      } catch (captureError) {
        const message =
          captureError instanceof Error
            ? captureError.message
            : 'Could not capture the card.';
        setError(message);
        changePhase('scanning');
        steadyRef.current = 0;
        setSteadyCount(0);
      } finally {
        photo?.dispose();
      }
    },
    [changePhase, photoOutput],
  );

  /**
   * Receives a detection sample on the JS thread, runs OpenCV over it, and
   * decides whether the card has held still long enough to capture.
   */
  const handleSample = useCallback(
    (sample: LumaSample) => {
      if (phaseRef.current !== 'scanning') {
        return;
      }

      const detected = detectCardQuad(sample);
      const now = Date.now();

      if (!detected) {
        if (now - lastDetectionAtRef.current > DETECTION_STALE_MS) {
          quadRef.current = null;
          setQuad(null);
          steadyRef.current = 0;
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
      setQuad(smoothed);
      setSteadyCount(steadyRef.current);

      if (steadyRef.current >= STEADY_FRAMES_REQUIRED) {
        void capture(smoothed);
      }
    },
    [capture],
  );

  const frameOutput = useFrameOutput({
    pixelFormat: 'yuv',
    targetResolution: FRAME_RESOLUTION,
    dropFramesWhileBusy: true,
    onFrame: (frame) => {
      'worklet';
      try {
        const now = Date.now();
        if (now - lastSampleAt.value < DETECT_INTERVAL_MS) {
          return;
        }
        lastSampleAt.value = now;

        const sample = sampleFrameLuma(frame);
        if (sample) {
          scheduleOnRN(handleSample, sample);
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

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setQuad(null);
    quadRef.current = null;
    steadyRef.current = 0;
    setSteadyCount(0);
    lastDetectionAtRef.current = 0;
    changePhase('scanning');
  }, [changePhase]);

  const isLocked = steadyCount >= STEADY_FRAMES_REQUIRED - 2;

  const hint = useMemo(() => {
    if (error) {
      return error;
    }
    if (!quad) {
      return side === 'front'
        ? 'Place the front of the card in view'
        : 'Place the back of the card in view';
    }
    return isLocked ? 'Hold still...' : 'Card found - hold steady';
  }, [error, isLocked, quad, side]);

  if (!hasPermission) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: scan.background }]}>
        <Text style={[styles.permissionText, { color: scan.cream }]}>
          Camera access is needed to scan a card.
        </Text>
        <Pressable
          accessibilityRole="button"
          style={[styles.secondaryButton, { borderColor: scan.gold }]}
          onPress={() => onComplete(null)}>
          <Text style={[styles.secondaryButtonText, { color: scan.gold }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'confirming' && capturedUri) {
    return (
      <View style={[styles.container, { backgroundColor: scan.background }]}>
        <Image
          source={{ uri: capturedUri }}
          style={styles.confirmImage}
          resizeMode="contain"
        />
        <View style={[styles.confirmBar, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { borderColor: scan.creamMuted }]}
            onPress={handleRetake}>
            <Text style={[styles.secondaryButtonText, { color: scan.cream }]}>
              Retake
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, { backgroundColor: scan.gold }]}
            onPress={() => onComplete(capturedUri)}>
            <Text style={styles.primaryButtonText}>Use this scan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <View style={styles.previewWrapper} onLayout={handleLayout}>
        <Camera
          style={StyleSheet.absoluteFill}
          device="back"
          isActive={phase === 'scanning'}
          outputs={outputs}
          resizeMode="contain"
          torchMode={torchMode}
          enableNativeTapToFocusGesture
        />
        <CardQuadOverlay
          quad={quad}
          width={previewSize.width}
          height={previewSize.height}
          color={isLocked ? scan.gold : scan.goldLight}
          isLocked={isLocked}
        />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel scan"
          style={styles.iconButton}
          onPress={() => onComplete(null)}>
          <Text style={styles.iconButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle flashlight"
          style={styles.iconButton}
          onPress={() => setTorchMode((current) => (current === 'on' ? 'off' : 'on'))}>
          <Text style={styles.iconButtonText}>
            {torchMode === 'on' ? 'Flash on' : 'Flash off'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.hint}>{hint}</Text>
        {phase === 'capturing' ? (
          <ActivityIndicator color={scan.gold} size="large" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture card"
            style={[styles.shutter, { borderColor: scan.gold }]}
            onPress={() => void capture(quadRef.current)}>
            <View style={[styles.shutterInner, { backgroundColor: scan.gold }]} />
          </Pressable>
        )}
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    alignItems: 'center',
    gap: 18,
    marginTop: 'auto',
    paddingHorizontal: 24,
  },
  hint: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
  },
  shutter: {
    alignItems: 'center',
    borderRadius: 38,
    borderWidth: 4,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  shutterInner: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  confirmImage: {
    flex: 1,
    width: '100%',
  },
  confirmBar: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  primaryButton: {
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});
