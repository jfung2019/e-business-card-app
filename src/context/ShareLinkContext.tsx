import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { parseShareTokenFromUrl } from '../utils/parseShareLink';

const PENDING_SHARE_TOKEN_KEY = '@ebc/pendingShareToken';

interface ShareLinkContextValue {
  pendingToken: string | null;
  setPendingToken: (token: string) => Promise<void>;
  clearPendingToken: () => Promise<void>;
  handleIncomingUrl: (url: string | null) => string | null;
}

const ShareLinkContext = createContext<ShareLinkContextValue | null>(null);

export function ShareLinkProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [pendingToken, setPendingTokenState] = useState<string | null>(null);

  useEffect(() => {
    void AsyncStorage.getItem(PENDING_SHARE_TOKEN_KEY).then((stored) => {
      if (stored) {
        setPendingTokenState(stored);
      }
    });
  }, []);

  const setPendingToken = useCallback(async (token: string) => {
    setPendingTokenState(token);
    await AsyncStorage.setItem(PENDING_SHARE_TOKEN_KEY, token);
  }, []);

  const clearPendingToken = useCallback(async () => {
    setPendingTokenState(null);
    await AsyncStorage.removeItem(PENDING_SHARE_TOKEN_KEY);
  }, []);

  const handleIncomingUrl = useCallback((url: string | null) => {
    if (!url) {
      return null;
    }
    return parseShareTokenFromUrl(url);
  }, []);

  const value = useMemo(
    () => ({
      pendingToken,
      setPendingToken,
      clearPendingToken,
      handleIncomingUrl,
    }),
    [pendingToken, setPendingToken, clearPendingToken, handleIncomingUrl],
  );

  return <ShareLinkContext.Provider value={value}>{children}</ShareLinkContext.Provider>;
}

export function useShareLink(): ShareLinkContextValue {
  const context = useContext(ShareLinkContext);
  if (!context) {
    throw new Error('useShareLink must be used within ShareLinkProvider');
  }
  return context;
}
