import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type AppThemeColors,
  type ColorScheme,
  type ScanThemeColors,
  type WalletThemeColors,
  getAppTheme,
} from '../theme/appTheme';

const STORAGE_KEY = '@ebc/colorScheme';

interface ThemeContextValue {
  colorScheme: ColorScheme;
  colors: AppThemeColors;
  wallet: WalletThemeColors;
  scan: ScanThemeColors;
  isDark: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setColorSchemeState(stored);
        }
      } catch {
        // Keep default light theme.
      }
    })();
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    void AsyncStorage.setItem(STORAGE_KEY, scheme);
  }, []);

  const toggleColorScheme = useCallback(() => {
    setColorSchemeState((current) => {
      const next: ColorScheme = current === 'light' ? 'dark' : 'light';
      void AsyncStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = getAppTheme(colorScheme);
    return {
      colorScheme,
      colors: theme.colors,
      wallet: theme.wallet,
      scan: theme.scan,
      isDark: colorScheme === 'dark',
      setColorScheme,
      toggleColorScheme,
    };
  }, [colorScheme, setColorScheme, toggleColorScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within ThemeProvider');
  }
  return context;
}
