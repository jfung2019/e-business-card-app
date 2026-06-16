import type { CapturedCard, WalletDisplay } from '../types/card';
import type { UserCard, WalletDisplay as UserWalletDisplay } from '../types/userCard';

/** Photo when a scan exists unless the user explicitly chose classic. */
export function resolveWalletDisplay(
  card: Pick<CapturedCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): WalletDisplay {
  const front = card.scan_image_front_url ?? card.scan_image_url;
  if (!front) {
    return 'classic';
  }
  return card.wallet_display === 'classic' ? 'classic' : 'photo';
}

export function resolveUserCardWalletDisplay(
  card: Pick<UserCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): UserWalletDisplay {
  const front = card.scan_image_front_url ?? card.scan_image_url;
  if (!front) {
    return 'classic';
  }
  return card.wallet_display === 'classic' ? 'classic' : 'photo';
}

export function showsWalletPhoto(
  card: Pick<CapturedCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): boolean {
  return resolveWalletDisplay(card) === 'photo';
}

export function showsUserCardPhoto(
  card: Pick<UserCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): boolean {
  return resolveUserCardWalletDisplay(card) === 'photo';
}

export function nextWalletDisplay(
  card: Pick<CapturedCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): WalletDisplay {
  return showsWalletPhoto(card) ? 'classic' : 'photo';
}

export function nextUserCardWalletDisplay(
  card: Pick<UserCard, 'scan_image_url' | 'scan_image_front_url' | 'wallet_display'>,
): UserWalletDisplay {
  return showsUserCardPhoto(card) ? 'classic' : 'photo';
}

export function hasScanImage(
  card: Pick<CapturedCard, 'scan_image_url' | 'scan_image_front_url'>,
): boolean {
  return Boolean(card.scan_image_front_url ?? card.scan_image_url);
}

export function userCardHasScanImage(
  card: Pick<UserCard, 'scan_image_url' | 'scan_image_front_url'>,
): boolean {
  return Boolean(card.scan_image_front_url ?? card.scan_image_url);
}
