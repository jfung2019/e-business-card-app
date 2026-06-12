import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ebc.myCardsBannerDismissed';

export function useMyCardsBanner(hasUserCards: boolean): {
  visible: boolean;
  dismiss: () => Promise<void>;
} {
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (!cancelled) {
        setDismissed(value === 'true');
        setLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async () => {
    setDismissed(true);
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const visible = loaded && !hasUserCards && !dismissed;

  return { visible, dismiss };
}
