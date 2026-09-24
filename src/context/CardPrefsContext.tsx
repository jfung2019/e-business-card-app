import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { CARD_DESIGN_PRESETS, DEFAULT_CARD_DESIGN_ID } from '../theme/cardDesigns';

const DESIGN_KEY = '@ebc/cardDesignId';
const LIMIT_KEY = '@ebc/walletCardLimit';

/** How many cards the wallet shows before "Browse all" takes over. */
export type WalletCardLimit = 3 | 5 | 10 | 'all';

export const WALLET_CARD_LIMITS: WalletCardLimit[] = [3, 5, 10, 'all'];

const DEFAULT_LIMIT: WalletCardLimit = 5;

interface CardPrefsValue {
  /** One design for every card that has no scan photo to show. */
  designId: string;
  setDesignId: (designId: string) => void;
  walletLimit: WalletCardLimit;
  setWalletLimit: (limit: WalletCardLimit) => void;
}

const CardPrefsContext = createContext<CardPrefsValue | null>(null);

function parseLimit(stored: string | null): WalletCardLimit | null {
  if (stored === 'all') {
    return 'all';
  }
  const parsed = Number(stored);
  return WALLET_CARD_LIMITS.includes(parsed as WalletCardLimit)
    ? (parsed as WalletCardLimit)
    : null;
}

export function CardPrefsProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [designId, setDesignIdState] = useState(DEFAULT_CARD_DESIGN_ID);
  const [walletLimit, setWalletLimitState] = useState<WalletCardLimit>(DEFAULT_LIMIT);

  useEffect(() => {
    void (async () => {
      try {
        const [storedDesign, storedLimit] = await Promise.all([
          AsyncStorage.getItem(DESIGN_KEY),
          AsyncStorage.getItem(LIMIT_KEY),
        ]);
        if (storedDesign && CARD_DESIGN_PRESETS.some(preset => preset.id === storedDesign)) {
          setDesignIdState(storedDesign);
        }
        const limit = parseLimit(storedLimit);
        if (limit !== null) {
          setWalletLimitState(limit);
        }
      } catch {
        // Defaults are fine; these are preferences, not data.
      }
    })();
  }, []);

  const setDesignId = useCallback((next: string) => {
    setDesignIdState(next);
    void AsyncStorage.setItem(DESIGN_KEY, next);
  }, []);

  const setWalletLimit = useCallback((next: WalletCardLimit) => {
    setWalletLimitState(next);
    void AsyncStorage.setItem(LIMIT_KEY, String(next));
  }, []);

  const value = useMemo<CardPrefsValue>(
    () => ({ designId, setDesignId, walletLimit, setWalletLimit }),
    [designId, setDesignId, walletLimit, setWalletLimit],
  );

  return <CardPrefsContext.Provider value={value}>{children}</CardPrefsContext.Provider>;
}

export function useCardPrefs(): CardPrefsValue {
  const context = useContext(CardPrefsContext);
  if (!context) {
    throw new Error('useCardPrefs must be used within CardPrefsProvider');
  }
  return context;
}

/**
 * The chosen design, or the default when no provider is above — card faces are
 * presentational and render on their own in tests and previews.
 */
export function useCardDesignId(): string {
  return useContext(CardPrefsContext)?.designId ?? DEFAULT_CARD_DESIGN_ID;
}

/** Cards to show before the "Browse all" link, given the current preference. */
export function applyWalletLimit<T>(cards: T[], limit: WalletCardLimit): T[] {
  return limit === 'all' ? cards : cards.slice(0, limit);
}
