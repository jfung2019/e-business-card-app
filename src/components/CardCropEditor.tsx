import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { useAppTheme } from '../context/ThemeContext';
import {
  clampPoint,
  containRect,
  isValidCropQuad,
  orderQuadCorners,
  type CardQuad,
  type ContainRect,
} from '../services/cardScanner/quadGeometry';

interface CardCropEditorProps {
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  /** Starting corners, normalized to the image. */
  initialQuad: CardQuad;
  /** Corners to restore on "Reset" — the auto-detected edge, when there was one. */
  resetQuad: CardQuad;
  onCancel: () => void;
  onApply: (quad: CardQuad) => void;
}

/** Visual radius of a corner handle. */
const HANDLE_RADIUS = 12;

/** Touch target around each corner — well over Apple's 44pt minimum. */
const HANDLE_HIT_SIZE = 56;

/**
 * Lets the user drag the four corners of the crop on the original photo.
 *
 * Built on PanResponder rather than gesture-handler: four independent handles
 * need nothing more, and it keeps this screen off the gesture-handler v3
 * migration path.
 */
export function CardCropEditor({
  imageUri,
  imageWidth,
  imageHeight,
  initialQuad,
  resetQuad,
  onCancel,
  onApply,
}: CardCropEditorProps): React.JSX.Element {
  const { scan } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [quad, setQuad] = useState<CardQuad>(initialQuad);
  const [container, setContainer] = useState({ width: 0, height: 0 });

  const rect: ContainRect = useMemo(
    () => containRect(imageWidth, imageHeight, container.width, container.height),
    [container.height, container.width, imageHeight, imageWidth],
  );

  // PanResponders are created once; they read the latest geometry via refs.
  const quadRef = useRef(quad);
  quadRef.current = quad;
  const rectRef = useRef(rect);
  rectRef.current = rect;
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const responders: PanResponderInstance[] = useMemo(
    () =>
      [0, 1, 2, 3].map((corner) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            dragOriginRef.current = { ...quadRef.current[corner] };
          },
          onPanResponderMove: (_event, gesture) => {
            const origin = dragOriginRef.current;
            const { width, height } = rectRef.current;
            if (!origin || width <= 0 || height <= 0) {
              return;
            }
            const moved = clampPoint({
              x: origin.x + gesture.dx / width,
              y: origin.y + gesture.dy / height,
            });
            setQuad((current) => {
              const next = [...current] as unknown as [
                CardQuad[0],
                CardQuad[1],
                CardQuad[2],
                CardQuad[3],
              ];
              next[corner] = moved;
              return next as CardQuad;
            });
          },
          onPanResponderRelease: () => {
            dragOriginRef.current = null;
          },
          onPanResponderTerminate: () => {
            dragOriginRef.current = null;
          },
        }),
      ),
    [],
  );

  // Handles keep their identity while dragging, so a user can cross two of
  // them. Re-order before validating so an honest drag is not rejected.
  const ordered = useMemo(() => orderQuadCorners(quad) ?? quad, [quad]);
  const isValid = isValidCropQuad(ordered);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainer({ width, height });
  }, []);

  const toScreen = (x: number, y: number) => ({
    x: rect.x + x * rect.width,
    y: rect.y + y * rect.height,
  });

  const screenPoints = quad.map((corner) => toScreen(corner.x, corner.y));
  const polygon = screenPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Even-odd path: the image rect with the crop cut out, so everything
  // outside the card is dimmed.
  const mask =
    `M${rect.x},${rect.y} h${rect.width} v${rect.height} h${-rect.width} Z ` +
    `M${screenPoints.map((p) => `${p.x},${p.y}`).join(' L')} Z`;

  const strokeColor = isValid ? scan.gold : scan.error;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Adjust the crop</Text>
        <Text style={styles.subtitle}>Drag each corner onto a corner of the card.</Text>
      </View>

      <View style={styles.stage} onLayout={handleLayout}>
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />

        {rect.width > 0 ? (
          <>
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path d={mask} fill="rgba(0, 0, 0, 0.55)" fillRule="evenodd" />
              <Polygon
                points={polygon}
                fill="none"
                stroke={strokeColor}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
              {screenPoints.map((p, index) => (
                <Circle
                  key={`handle-dot-${index}`}
                  cx={p.x}
                  cy={p.y}
                  r={HANDLE_RADIUS}
                  fill="rgba(0, 0, 0, 0.35)"
                  stroke={strokeColor}
                  strokeWidth={3}
                />
              ))}
            </Svg>

            {screenPoints.map((p, index) => (
              <View
                key={`handle-${index}`}
                accessibilityRole="adjustable"
                accessibilityLabel={
                  ['Top left corner', 'Top right corner', 'Bottom right corner', 'Bottom left corner'][
                    index
                  ]
                }
                style={[
                  styles.handleHitArea,
                  {
                    left: p.x - HANDLE_HIT_SIZE / 2,
                    top: p.y - HANDLE_HIT_SIZE / 2,
                  },
                ]}
                {...responders[index].panHandlers}
              />
            ))}
          </>
        ) : null}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!isValid ? (
          <Text style={[styles.warning, { color: scan.error }]}>
            The corners overlap — move them back onto the card.
          </Text>
        ) : null}
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { borderColor: scan.creamMuted }]}
            onPress={onCancel}>
            <Text style={[styles.secondaryText, { color: scan.cream }]}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { borderColor: scan.creamMuted }]}
            onPress={() => setQuad(resetQuad)}>
            <Text style={[styles.secondaryText, { color: scan.cream }]}>Reset</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid }}
            disabled={!isValid}
            style={[
              styles.primaryButton,
              { backgroundColor: scan.gold },
              !isValid && styles.disabled,
            ]}
            onPress={() => onApply(ordered)}>
            <Text style={styles.primaryText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: 12,
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 14,
    textAlign: 'center',
  },
  stage: {
    flex: 1,
    marginHorizontal: 16,
  },
  handleHitArea: {
    height: HANDLE_HIT_SIZE,
    position: 'absolute',
    width: HANDLE_HIT_SIZE,
  },
  footer: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  warning: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1.3,
    paddingVertical: 14,
  },
  primaryText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});
