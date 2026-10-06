export const walletColors = {
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
} as const;

export interface WalletCardPalette {
  background: string;
  text: string;
  muted: string;
  accent: string;
  /**
   * Wash behind the address band. Unlike the card design presets, these
   * backgrounds run light to vivid, so a single white tint would vanish on
   * lime and cream — each palette carries the direction that lifts it.
   */
  band: string;
}

const DARK_BAND = 'rgba(0,0,0,0.07)';
const LIGHT_BAND = 'rgba(255,255,255,0.15)';

export const WALLET_CARD_PALETTES: WalletCardPalette[] = [
  { background: '#D4F54A', text: '#1A1A1A', muted: '#4A5A00', accent: '#B8D600', band: DARK_BAND },
  { background: '#FF6B5B', text: '#FFFFFF', muted: '#FFE8E5', accent: '#FF8A7D', band: LIGHT_BAND },
  { background: '#7B4DFF', text: '#FFFFFF', muted: '#E8DEFF', accent: '#9B7AFF', band: LIGHT_BAND },
  { background: '#F8F4EC', text: '#1A1A1A', muted: '#6B6B6B', accent: '#C9A962', band: 'rgba(0,0,0,0.05)' },
  { background: '#2DD4BF', text: '#0F3D36', muted: '#CCFBF1', accent: '#14B8A6', band: DARK_BAND },
  { background: '#F472B6', text: '#FFFFFF', muted: '#FCE7F3', accent: '#EC4899', band: LIGHT_BAND },
];

export function getWalletPalette(index: number): WalletCardPalette {
  return WALLET_CARD_PALETTES[index % WALLET_CARD_PALETTES.length];
}

/** Stable palette per card — color follows the card, not the stack slot. */
export function getCardPaletteIndex(
  cardId: string,
  cards: { _id: string }[],
): number {
  const order = [...cards].reverse().map(card => card._id);
  const index = order.indexOf(cardId);
  return index >= 0 ? index : 0;
}
