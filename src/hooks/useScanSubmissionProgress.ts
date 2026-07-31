import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

const HOLD_PROGRESS = 0.8;
const RAMP_UP_MS = 1200;
const FINISH_MS = 350;

export function useScanSubmissionProgress(isLoading: boolean, isSuccess: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [showProgress, setShowProgress] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const loadingRef = useRef(isLoading);
  loadingRef.current = isLoading;

  useEffect(() => {
    animationRef.current?.stop();

    if (isLoading) {
      setShowProgress(true);
      setShowResult(false);
      setIsHolding(false);
      progress.setValue(0);
      animationRef.current = Animated.timing(progress, {
        toValue: HOLD_PROGRESS,
        duration: RAMP_UP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      animationRef.current.start(({ finished }) => {
        if (finished && loadingRef.current) {
          setIsHolding(true);
        }
      });
      return;
    }

    setIsHolding(false);

    if (isSuccess) {
      animationRef.current = Animated.timing(progress, {
        toValue: 1,
        duration: FINISH_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      });
      animationRef.current.start(({ finished }) => {
        if (finished) {
          setShowProgress(false);
          setShowResult(true);
        }
      });
      return;
    }

    progress.setValue(0);
    setShowProgress(false);
    setShowResult(false);
  }, [isLoading, isSuccess, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return { progressWidth, showProgress, showResult, isHolding };
}
