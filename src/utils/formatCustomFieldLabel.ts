const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ch: 'Chinese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
};

const EXACT_LABELS: Record<string, string> = {
  address_en: 'Address (English)',
  address_ch: 'Address (Chinese)',
  address_zh: 'Address (Chinese)',
  alternate_name_en: 'Alternate name (English)',
  alternate_name_ch: 'Alternate name (Chinese)',
  alternate_name_zh: 'Alternate name (Chinese)',
  phone_2: 'Phone 2',
};

function titleCaseWords(value: string): string {
  return value.replace(/\b\w/g, character => character.toUpperCase());
}

/** Human-readable label for custom_fields keys (e.g. address_en → Address (English)). */
export function formatCustomFieldLabel(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return trimmed;
  }

  const exact = EXACT_LABELS[trimmed] ?? EXACT_LABELS[trimmed.toLowerCase()];
  if (exact) {
    return exact;
  }

  const localized = trimmed.match(/^(.+)_([a-z]{2})$/i);
  if (localized) {
    const [, field, langCode] = localized;
    const fieldLabel = titleCaseWords(field.replace(/_/g, ' '));
    const languageLabel = LANGUAGE_LABELS[langCode.toLowerCase()];
    if (languageLabel) {
      return `${fieldLabel} (${languageLabel})`;
    }
  }

  if (trimmed.includes('_')) {
    return titleCaseWords(trimmed.replace(/_/g, ' '));
  }

  return trimmed;
}
