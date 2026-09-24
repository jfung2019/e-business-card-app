import type { CoreFields, NamePartsEn, NameSortBasis } from '../types/card';

/**
 * Bucket for cards with no Latin key at all. They sort after A–Z rather than by
 * code point, which would order 陳 before 李 for no reason a reader can see.
 */
export const CJK_SECTION = '中文';

export type NameSortMode = 'recent' | 'first' | 'last' | 'company';

export interface SortableCard {
  core_fields: CoreFields;
  custom_fields?: Record<string, string>;
  sort_key?: string | null;
  sort_basis?: NameSortBasis | null;
}

const LATIN_LETTER = /[A-Za-z]/;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The Latin name parts.
 *
 * Reads the API's `first_name`/`last_name` first, then the custom fields an
 * older API puts them in, and only then guesses from the printed name. The guess is crude on
 * purpose: "Wong Ka Ming" leads with the family name while "Chris Huang" ends
 * with it, and nothing in the string says which convention is in play. Treat it
 * as a starting point the user can correct, never as a fact.
 */
export function getNameParts(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
): NamePartsEn {
  const apiFirst = clean(coreFields.first_name);
  const apiLast = clean(coreFields.last_name);
  if (apiFirst || apiLast) {
    return { first: apiFirst, last: apiLast };
  }

  const storedFirst = clean(customFields?.first_name);
  const storedLast = clean(customFields?.last_name);
  if (storedFirst || storedLast) {
    return { first: storedFirst, last: storedLast };
  }

  const name = clean(coreFields.name);
  if (!name || !LATIN_LETTER.test(name)) {
    return { first: null, last: null };
  }

  const tokens = name.split(/\s+/);
  if (tokens.length === 1) {
    return { first: null, last: tokens[0] };
  }
  return { first: tokens.slice(0, -1).join(' '), last: tokens[tokens.length - 1] };
}

/** The Chinese name, when the card carries one that differs from the printed name. */
export function getChineseName(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
): string | null {
  const direct = clean(coreFields.name_cn) ?? clean(customFields?.name_cn);
  if (!direct || direct === clean(coreFields.name)) {
    return null;
  }
  return direct;
}

/**
 * The key a card files under, following the agreed fallback chain:
 * English family name, then English given name, then company, then nothing —
 * which lands the card in the 中文 section.
 *
 * The server sends `sort_key` once the API branch ships; this recomputes the
 * same chain so today's API and an offline draft still sort sensibly.
 */
export function resolveSortKey(card: SortableCard, mode: NameSortMode = 'last'): string {
  if (mode === 'company') {
    return (clean(card.core_fields.company_name) ?? '').toLowerCase();
  }

  const parts = getNameParts(card.core_fields, card.custom_fields);
  if (mode === 'first') {
    return (parts.first ?? parts.last ?? '').toLowerCase();
  }

  const serverKey = clean(card.sort_key);
  if (serverKey) {
    return serverKey.toLowerCase();
  }

  return (parts.last ?? parts.first ?? clean(card.core_fields.company_name) ?? '').toLowerCase();
}

/** Why the key is what it is, for the hint on the edit form. */
export function resolveSortBasis(card: SortableCard): NameSortBasis {
  if (card.sort_basis) {
    return card.sort_basis;
  }
  const parts = getNameParts(card.core_fields, card.custom_fields);
  if (parts.last) {
    return 'last_en';
  }
  if (parts.first) {
    return 'first_en';
  }
  if (clean(card.core_fields.company_name)) {
    return 'company';
  }
  return 'none';
}

/** Uppercase A–Z letter a key files under, or the CJK bucket. */
export function sectionLetter(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  for (const char of trimmed) {
    if (LATIN_LETTER.test(char)) {
      return char.toUpperCase();
    }
    if (/[\p{L}\p{N}]/u.test(char)) {
      return CJK_SECTION;
    }
  }
  return CJK_SECTION;
}

/** Keys with no Latin letters sort last, so 中文 lands at the bottom. */
export function compareBySortKey(a: string, b: string): number {
  const aIsCjk = sectionLetter(a) === CJK_SECTION;
  const bIsCjk = sectionLetter(b) === CJK_SECTION;
  if (aIsCjk !== bIsCjk) {
    return aIsCjk ? 1 : -1;
  }
  return a.localeCompare(b);
}

export interface SortedNameDisplay {
  /** Leading part, shown in bold: the family name the row files under. */
  lead: string;
  /** The rest of the printed name, or null when the lead is the whole name. */
  rest: string | null;
}

/**
 * How a name reads while the list is sorted by it.
 *
 * A card printed "Given Family" inverts to "Family, Given", the way Contacts
 * does, so the eye lands on the part the section letter came from. A card
 * printed family-first — "Li Shan Shan", "Wong Ka Ming" — is already in that
 * order and stays exactly as printed.
 */
export function sortedNameDisplay(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
): SortedNameDisplay {
  const printed = clean(coreFields.name) ?? '';
  const parts = getNameParts(coreFields, customFields);
  const last = parts.last;

  if (!last) {
    return { lead: printed, rest: null };
  }

  if (printed.toLowerCase().startsWith(last.toLowerCase())) {
    const rest = printed.slice(last.length).trim();
    return { lead: last, rest: rest || null };
  }

  const first = parts.first;
  return { lead: last, rest: first ? `, ${first}` : null };
}
