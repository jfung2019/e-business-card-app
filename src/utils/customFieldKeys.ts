/** Canonical MongoDB/API key for a contact's WeChat ID. */
export const WECHAT_ID_KEY = 'wechat_id';

/** Canonical MongoDB/API keys for localized custom fields. */
const CUSTOM_FIELD_KEY_ALIASES: Record<string, string> = {
  address_ch: 'address_cn',
  address_zh: 'address_cn',
  alternate_name_ch: 'alternate_name_cn',
  alternate_name_zh: 'alternate_name_cn',
  // The LLM prompt asks for snake_case, but cards label WeChat many ways and
  // the model echoes whatever it read. Fold every spelling onto one key.
  // Keep in sync with _CUSTOM_FIELD_KEY_ALIASES in the API
  // (app/services/openrouter.py). A spelling missed on either side silently
  // hides the WeChat button.
  wechat: WECHAT_ID_KEY,
  'we chat': WECHAT_ID_KEY,
  wechat_id: WECHAT_ID_KEY,
  'wechat id': WECHAT_ID_KEY,
  wechat_no: WECHAT_ID_KEY,
  'wechat no.': WECHAT_ID_KEY,
  wechat_number: WECHAT_ID_KEY,
  wechat_account: WECHAT_ID_KEY,
  weixin: WECHAT_ID_KEY,
  weixin_id: WECHAT_ID_KEY,
  'weixin id': WECHAT_ID_KEY,
  微信: WECHAT_ID_KEY,
  微信号: WECHAT_ID_KEY,
  // Traditional form, used on Hong Kong and Taiwan cards.
  微信號: WECHAT_ID_KEY,
  微信id: WECHAT_ID_KEY,
};

export function canonicalCustomFieldKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  const direct = CUSTOM_FIELD_KEY_ALIASES[lower];
  if (direct) {
    return direct;
  }

  // Mirror _normalize_custom_field_key in the API: a card may print
  // "WeChat No" and the model may emit "wechat_no", and both must fold the
  // same way without listing every spelling twice on each side.
  const spaced = lower.replace(/_+/g, ' ');
  const underscored = lower.replace(/\s+/g, '_');
  return (
    CUSTOM_FIELD_KEY_ALIASES[spaced] ??
    CUSTOM_FIELD_KEY_ALIASES[underscored] ??
    trimmed
  );
}

/**
 * Look a value up by canonical key, whatever spelling it was stored under.
 *
 * Stored cards are only normalized on save, so values written by the LLM or by
 * an older build can still carry an alias (`wechat`, `微信`) as their key.
 * Returns null when absent or blank.
 */
export function findCustomFieldValue(
  customFields: Record<string, string>,
  canonicalKey: string,
): string | null {
  for (const [key, value] of Object.entries(customFields)) {
    if (canonicalCustomFieldKey(key) !== canonicalKey) {
      continue;
    }
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
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
  const priority = [
    'address_en',
    'address_cn',
    'alternate_name_cn',
    'phone_2',
    'phone_3',
    'WhatsApp',
    WECHAT_ID_KEY,
  ];
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
