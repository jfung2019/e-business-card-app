/**
 * Decide what a QR code found on a business card actually points at.
 *
 * Cards frequently carry more than one QR -- WeChat beside WhatsApp, or a
 * company website beside a vCard -- so finding a QR is not enough. The payload
 * is the only reliable way to tell them apart.
 */

/** custom_fields key holding the WeChat QR codes found on a card. */
export const WECHAT_QR_KEY = 'wechat_qr_url';

export type QrKind = 'wechat' | 'whatsapp' | 'other';

export interface QrClassification {
  kind: QrKind;
  /** The payload as decoded, trimmed. Stored so the choice can be audited. */
  value: string;
}

/** Hosts that identify a WeChat QR. Matched on label boundaries, not substrings. */
const WECHAT_HOSTS = ['weixin.qq.com', 'wechat.com'];
const WHATSAPP_HOSTS = ['wa.me', 'whatsapp.com'];

/**
 * Scheme + host of a URL-ish payload, lowercased. Null when the payload is not
 * a URL (plain text, a vCard, a bare WeChat ID).
 *
 * Deliberately regex-based rather than `new URL()`: URL support is uneven
 * across React Native runtimes and a polyfill is not worth the dependency.
 */
function parseSchemeAndHost(payload: string): { scheme: string; host: string } | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)/i.exec(payload);
  if (!match) {
    return null;
  }
  const [, scheme, authority] = match;
  // Drop userinfo (user:pass@) and any :port before comparing hosts.
  const hostWithPort = authority.split('@').pop() ?? '';
  const host = hostWithPort.replace(/:\d+$/, '').toLowerCase();
  return { scheme: scheme.toLowerCase(), host };
}

/**
 * True when `host` is `domain` or a subdomain of it.
 *
 * Guards against look-alikes: a plain `includes` would accept
 * `wechat.com.attacker.net` and `notwechat.com`.
 */
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function classifyQrPayload(payload: string): QrClassification {
  const value = payload.trim();
  if (!value) {
    return { kind: 'other', value };
  }

  const parsed = parseSchemeAndHost(value);
  if (!parsed) {
    return { kind: 'other', value };
  }

  const { scheme, host } = parsed;

  // weixin:// and weixin://dl/... are WeChat's own app scheme.
  if (scheme === 'weixin') {
    return { kind: 'wechat', value };
  }
  if (scheme === 'whatsapp') {
    return { kind: 'whatsapp', value };
  }

  if (scheme === 'http' || scheme === 'https') {
    if (WECHAT_HOSTS.some(domain => hostMatches(host, domain))) {
      return { kind: 'wechat', value };
    }
    if (WHATSAPP_HOSTS.some(domain => hostMatches(host, domain))) {
      return { kind: 'whatsapp', value };
    }
  }

  return { kind: 'other', value };
}

/**
 * Every WeChat QR on a card, de-duplicated and in the order found.
 *
 * Cards really do carry more than one: a "Follow us" official-account code
 * beside a contact code, both served from `weixin.qq.com/r/...`. The payload
 * cannot tell those apart -- same host, same path shape -- so we return all of
 * them and let the caller decide rather than silently guessing.
 */
export function findWechatQrs(payloads: string[]): string[] {
  const found: string[] = [];
  for (const payload of payloads) {
    const { kind, value } = classifyQrPayload(payload);
    if (kind === 'wechat' && !found.includes(value)) {
      found.push(value);
    }
  }
  return found;
}

/**
 * The single WeChat QR on a card, or null when there is none *or more than
 * one*. With two codes and no way to tell contact from official account,
 * picking one at random is worse than declining: the caller should fall back
 * to showing the card image so the user can choose.
 */
export function pickWechatQr(payloads: string[]): string | null {
  const found = findWechatQrs(payloads);
  return found.length === 1 ? found[0] : null;
}

/**
 * Serialise WeChat QR codes for the `custom_fields` string map.
 *
 * A card can legitimately carry two (an official-account code beside a contact
 * code), and custom_fields values are strings, so they are stored
 * whitespace-separated. Returns null when there is nothing to store.
 */
export function serializeWechatQrUrls(urls: string[]): string | null {
  const cleaned = urls.map(url => url.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(' ') : null;
}

/** Inverse of {@link serializeWechatQrUrls}. Tolerates a single bare URL. */
export function parseWechatQrUrls(stored: string | null | undefined): string[] {
  if (!stored) {
    return [];
  }
  return stored.split(/\s+/).filter(Boolean);
}

/**
 * Add any WeChat QR codes to a card's custom fields.
 *
 * Returns the map unchanged when no codes were found, so a card without a QR
 * is never given an empty field.
 */
export function withWechatQrUrls(
  customFields: Record<string, string>,
  urls?: string[],
): Record<string, string> {
  const stored = serializeWechatQrUrls(urls ?? []);
  if (!stored) {
    return customFields;
  }
  return { ...customFields, [WECHAT_QR_KEY]: stored };
}
