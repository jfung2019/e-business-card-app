import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Camera,
  CommonResolutions,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
} from 'react-native-vision-camera';

import { completeCardScan, isCardScanPending } from '../services/cardScanner';
import {
  computeCardGuideRect,
  type Rect,
  type Size,
} from '../utils/cardGuideGeometry';
import { cropCardPhotoFromFile } from '../utils/cropCardFromGuide';

function toFileUri(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function CardScannerScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const cameraRef = useRef<CameraRef>(null);
  const finishingRef = useRef(false);
  const captureLockRef = useRef(false);

  const device = useCameraDevice('back');
  // Prefer file capture + modest resolution — in-memory UHD Photos OOM/crash on device.
  const photoOutput = usePhotoOutput({
    targetResolution: CommonResolutions.FHD_4_3,
    containerFormat: 'jpeg',
    quality: 0.9,
    qualityPrioritization: 'balanced',
  });
  const { hasPermission, requestPermission, canRequestPermission } =
    useCameraPermission();

  const [permissionChecked, setPermissionChecked] = useState(hasPermission);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [viewSize, setViewSize] = useState<Size>({ width: 0, height: 0 });

  const guide = useMemo(() => {
    if (viewSize.width <= 0 || viewSize.height <= 0) {
      return null;
    }
    return computeCardGuideRect(viewSize);
  }, [viewSize]);

  const onPreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewSize(prev =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasPermission && canRequestPermission) {
        await requestPermission();
      }
      if (!cancelled) {
        setPermissionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPermission, canRequestPermission, requestPermission]);

  const finish = useCallback(
    (imageUri: string | null) => {
      if (finishingRef.current) {
        return;
      }
      finishingRef.current = true;
      completeCardScan(imageUri);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [navigation],
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (finishingRef.current) {
        return;
      }
      finishingRef.current = true;
      if (isCardScanPending()) {
        completeCardScan(null);
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    void photoOutput
      .prepareSettings([{ flashMode: 'off', enableShutterSound: true }])
      .catch(() => {});
  }, [photoOutput]);

  const handleCapture = useCallback(async () => {
    if (
      captureLockRef.current ||
      busy ||
      !cameraReady ||
      !photoOutput ||
      !guide ||
      viewSize.width <= 0
    ) {
      return;
    }

    captureLockRef.current = true;
    setError(null);
    setBusy(true);

    try {
      // File capture avoids in-memory Photo/toImageAsync native crashes on iOS.
      // Keep isActive=true — do not stop the session until after this returns.
      const photoFile = await photoOutput.capturePhotoToFile(
        { flashMode: 'off', enableShutterSound: true },
        {},
      );

      let croppedUri: string;
      try {
        croppedUri = await cropCardPhotoFromFile(photoFile.filePath, guide, viewSize);
      } catch (cropError) {
        // If crop fails, still return the full photo so OCR can proceed.
        if (__DEV__) {
          console.warn('[CardScanner] crop failed, using full photo', cropError);
        }
        croppedUri = toFileUri(photoFile.filePath);
      }

      finish(croppedUri);
    } catch (captureError) {
      const message =
        captureError instanceof Error
          ? captureError.message
          : 'Unable to capture the card. Try again.';
      setError(message);
      captureLockRef.current = false;
      setBusy(false);
    }
  }, [busy, cameraReady, finish, guide, photoOutput, viewSize]);

  const handleCancel = useCallback(() => {
    finish(null);
  }, [finish]);

  if (!permissionChecked) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Camera permission is required to scan cards.</Text>
        {canRequestPermission ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.secondaryButtonText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Enable camera access in Settings, then try again.</Text>
        )}
        <Pressable style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>No back camera was found on this device.</Text>
        <Pressable style={styles.secondaryButton} onPress={handleCancel}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  const canCapture = cameraReady && !!guide && !busy;

  return (
    <View style={styles.root} onLayout={onPreviewLayout}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isFocused}
        outputs={[photoOutput]}
        resizeMode="cover"
        orientationSource="interface"
        torchMode={torchOn ? 'on' : 'off'}
        onStarted={() => setCameraReady(true)}
        onStopped={() => setCameraReady(false)}
        onError={(cameraError) => {
          setCameraReady(false);
          setError(cameraError.message);
        }}
      />

      {guide ? <CardGuideOverlay guide={guide} /> : null}

      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable style={styles.topButton} onPress={handleCancel} disabled={busy}>
          <Text style={styles.topButtonText}>Cancel</Text>
        </Pressable>
        {device.hasTorch ? (
          <Pressable
            style={styles.topButton}
            onPress={() => setTorchOn(value => !value)}
            disabled={busy}
          >
            <Text style={styles.topButtonText}>{torchOn ? 'Light on' : 'Light'}</Text>
          </Pressable>
        ) : (
          <View style={styles.topButtonSpacer} />
        )}
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <Text style={styles.instruction}>
          {cameraReady ? 'Place the card inside the frame' : 'Starting camera…'}
        </Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable
          style={[styles.shutter, !canCapture && styles.shutterDisabled]}
          onPress={() => void handleCapture()}
          disabled={!canCapture}
        >
          {busy ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

function CardGuideOverlay({ guide }: { guide: Rect }): React.JSX.Element {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.mask, { height: Math.max(0, guide.y) }]} />
      <View style={[styles.maskRow, { height: guide.height }]}>
        <View style={[styles.mask, { width: Math.max(0, guide.x) }]} />
        <View
          style={[
            styles.guide,
            { width: guide.width, height: guide.height },
          ]}
        />
        <View style={styles.maskFlex} />
      </View>
      <View style={styles.maskFlex} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  mask: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskFlex: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  maskRow: {
    flexDirection: 'row',
  },
  guide: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  topBar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topButtonSpacer: {
    width: 72,
  },
  topButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    alignItems: 'center',
    gap: 14,
  },
  instruction: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterDisabled: {
    opacity: 0.7,
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
