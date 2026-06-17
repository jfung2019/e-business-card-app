export type ColorScheme = 'light' | 'dark';

export interface AppThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryText: string;
  link: string;
  error: string;
  placeholder: string;
  googleButtonBg: string;
  googleButtonText: string;
  statusBarStyle: 'light-content' | 'dark-content';
}

export interface WalletThemeColors {
  background: string;
  title: string;
  subtitle: string;
  addButton: string;
  addButtonText: string;
  surface: string;
  border: string;
  accent: string;
  accentMuted: string;
  error: string;
}

export interface ScanThemeColors {
  background: string;
  surfaceElevated: string;
  border: string;
  gold: string;
  goldLight: string;
  cream: string;
  creamMuted: string;
  error: string;
}

export interface AppTheme {
  colors: AppThemeColors;
  wallet: WalletThemeColors;
  scan: ScanThemeColors;
}

const lightTheme: AppTheme = {
  colors: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#D1D5DB',
    primary: '#C9A962',
    primaryText: '#111827',
    link: '#2563EB',
    error: '#B91C1C',
    placeholder: '#9CA3AF',
    googleButtonBg: '#FFFFFF',
    googleButtonText: '#6B7280',
    statusBarStyle: 'dark-content',
  },
  wallet: {
    background: '#F2F2F7',
    title: '#111111',
    subtitle: '#6B6B6B',
    addButton: '#111111',
    addButtonText: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E5E5EA',
    accent: '#C9A962',
    accentMuted: '#8A7340',
    error: '#B91C1C',
  },
  scan: {
    background: '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    border: '#E5E5EA',
    gold: '#C9A962',
    goldLight: '#8A7340',
    cream: '#111827',
    creamMuted: '#6B7280',
    error: '#B91C1C',
  },
};

const darkTheme: AppTheme = {
  colors: {
    background: '#0A0A0A',
    surface: '#141414',
    text: '#F5F0E8',
    textMuted: '#A8A29E',
    border: '#2A2A2A',
    primary: '#C9A962',
    primaryText: '#0A0A0A',
    link: '#E8D5A3',
    error: '#E87C7C',
    placeholder: '#A8A29E',
    googleButtonBg: '#141414',
    googleButtonText: '#A8A29E',
    statusBarStyle: 'light-content',
  },
  wallet: {
    background: '#0A0A0A',
    title: '#F5F0E8',
    subtitle: '#A8A29E',
    addButton: '#C9A962',
    addButtonText: '#0A0A0A',
    surface: '#1C1C1E',
    border: '#2A2A2A',
    accent: '#C9A962',
    accentMuted: '#8A7340',
    error: '#E87C7C',
  },
  scan: {
    background: '#0A0A0A',
    surfaceElevated: '#1C1C1E',
    border: '#2A2A2A',
    gold: '#C9A962',
    goldLight: '#E8D5A3',
    cream: '#F5F0E8',
    creamMuted: '#A8A29E',
    error: '#E87C7C',
  },
};

export function getAppTheme(scheme: ColorScheme): AppTheme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}

/** @deprecated Use useAppTheme().wallet instead */
export function getWalletColors(scheme: ColorScheme): WalletThemeColors {
  return getAppTheme(scheme).wallet;
}

/** @deprecated Use useAppTheme().scan instead */
export function getScanColors(scheme: ColorScheme): ScanThemeColors {
  return getAppTheme(scheme).scan;
}
