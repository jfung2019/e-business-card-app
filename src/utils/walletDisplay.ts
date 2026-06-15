import type { CapturedCard, WalletDisplay } from '../types/card';

/** Photo when a scan exists unless the user explicitly chose classic. */
export function resolveWalletDisplay(card: CapturedCard): WalletDisplay {
  if (!card.scan_image_url) {
    return 'classic';
  }
  return card.wallet_display === 'classic' ? 'classic' : 'photo';
}

export function showsWalletPhoto(card: CapturedCard): boolean {
  return resolveWalletDisplay(card) === 'photo';
}

export function nextWalletDisplay(card: CapturedCard): WalletDisplay {
  return showsWalletPhoto(card) ? 'classic' : 'photo';
}

export function hasScanImage(card: CapturedCard): boolean {
  return Boolean(card.scan_image_url);
}
