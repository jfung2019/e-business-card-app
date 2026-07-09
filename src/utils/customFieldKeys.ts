/** Canonical MongoDB/API keys for localized custom fields. */
const CUSTOM_FIELD_KEY_ALIASES: Record<string, string> = {
  address_ch: 'address_cn',
  address_zh: 'address_cn',
  alternate_name_ch: 'alternate_name_cn',
  alternate_name_zh: 'alternate_name_cn',
};

export function canonicalCustomFieldKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return trimmed;
  }
  return CUSTOM_FIELD_KEY_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

export function normalizeCustomFields(
  customFields: Record<string, string>,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(customFields)) {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      continue;
    }
    const canonicalKey = canonicalCustomFieldKey(key);
    if (!normalized[canonicalKey]) {
      normalized[canonicalKey] = trimmedValue;
    }
  }

  return normalized;
}

export function sortCustomFieldKeys(keys: string[]): string[] {
  const priority = ['address_en', 'address_cn', 'alternate_name_cn', 'phone_2', 'phone_3'];
  const canonicalKeys = [...new Set(keys.map(canonicalCustomFieldKey))];

  return canonicalKeys.sort((left, right) => {
    const leftIndex = priority.indexOf(left);
    const rightIndex = priority.indexOf(right);
    if (leftIndex !== -1 || rightIndex !== -1) {
      return (leftIndex === -1 ? priority.length : leftIndex) -
        (rightIndex === -1 ? priority.length : rightIndex);
    }
    return left.localeCompare(right);
  });
}
