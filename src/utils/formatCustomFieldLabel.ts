import { canonicalCustomFieldKey } from './customFieldKeys';

/** Display lang codes: legacy ch/zh → cn for Chinese. */
const DISPLAY_LANG_ALIASES: Record<string, string> = {
  ch: 'cn',
  zh: 'cn',
};

const EXACT_LABELS: Record<string, string> = {
  phone_2: 'phone 2',
  phone_3: 'phone 3',
};

/**
 * Human-readable label for custom_fields keys.
 * e.g. address_cn → "address (cn)", address_en → "address (en)"
 */
export function formatCustomFieldLabel(key: string): string {
  const canonical = canonicalCustomFieldKey(key.trim());
  if (!canonical) {
    return canonical;
  }

  const exact = EXACT_LABELS[canonical] ?? EXACT_LABELS[canonical.toLowerCase()];
  if (exact) {
    return exact;
  }

  const localized = canonical.match(/^(.+)_([a-z]{2})$/i);
  if (localized) {
    const [, field, langCode] = localized;
    const lang = DISPLAY_LANG_ALIASES[langCode.toLowerCase()] ?? langCode.toLowerCase();
    return `${field.replace(/_/g, ' ')} (${lang})`;
  }

  if (canonical.includes('_')) {
    return canonical.replace(/_/g, ' ');
  }

  return canonical;
}
