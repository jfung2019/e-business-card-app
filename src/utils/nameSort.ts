import type { CoreFields, NamePartsEn, NameSortBasis } from '../types/card';
import { romanizeChineseSurname } from './chineseSurname';

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

const HAN = /\p{Script=Han}/u;

/** English words in a printed name, ignoring any Chinese beside them. */
function latinWords(name: string | null): string[] {
  return name?.match(/\p{Script=Latin}[\p{Script=Latin}\p{M}'\u2019.-]*/gu) ?? [];
}

/**
 * The printed English words left over once `known` is taken off either end:
 * "Andy Chan" minus "Andy" is "Chan". Null when `known` is not at an end.
 */
function remainderOf(words: string[], known: string): string | null {
  const knownWords = latinWords(known).map((word) => word.toLowerCase());
  const lower = words.map((word) => word.toLowerCase());
  const n = knownWords.length;
  if (n === 0 || n >= words.length) {
    return null;
  }
  const matchesAt = (offset: number) =>
    knownWords.every((word, index) => lower[offset + index] === word);

  if (matchesAt(0)) {
    return words.slice(n).join(' ');
  }
  if (matchesAt(words.length - n)) {
    return words.slice(0, words.length - n).join(' ');
  }
  return null;
}

interface ResolvedNameParts extends NamePartsEn {
  /** True when `last` is the romanized Chinese surname, not English on the card. */
  lastIsRomanized: boolean;
}

function resolveNameParts(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
): ResolvedNameParts {
  const printed = clean(coreFields.name);
  const words = latinWords(printed);
  const romanizedSurname = () =>
    romanizeChineseSurname(
      printed && HAN.test(printed)
        ? printed
        : clean(coreFields.name_cn) ?? clean(customFields?.name_cn),
    );

  let first = clean(coreFields.first_name);
  let last = clean(coreFields.last_name);
  if (!first && !last) {
    first = clean(customFields?.first_name);
    last = clean(customFields?.last_name);
  }

  if (first && last) {
    return { first, last, lastIsRomanized: false };
  }

  // Only one half stored: take the other from the printed English name, and
  // failing that, the family name from the Chinese surname.
  if (first) {
    const rest = remainderOf(words, first);
    if (rest) {
      return { first, last: rest, lastIsRomanized: false };
    }
    const romanized = romanizedSurname();
    return { first, last: romanized, lastIsRomanized: romanized !== null };
  }
  if (last) {
    return { first: remainderOf(words, last), last, lastIsRomanized: false };
  }

  // Nothing stored. A purely Chinese name has no English parts and stays in
  // the 中文 section.
  if (words.length === 0) {
    return { first: null, last: null, lastIsRomanized: false };
  }
  if (words.length === 1) {
    // "Andy 陳": the English word is the given name, the Chinese one the surname.
    const romanized = romanizedSurname();
    if (romanized && romanized.toLowerCase() !== words[0].toLowerCase()) {
      return { first: words[0], last: romanized, lastIsRomanized: true };
    }
    return { first: null, last: words[0], lastIsRomanized: false };
  }
  return {
    first: words.slice(0, -1).join(' '),
    last: words[words.length - 1],
    lastIsRomanized: false,
  };
}

/**
 * The English name parts.
 *
 * Reads the API's `first_name`/`last_name` first, then the custom fields an
 * older API puts them in. A missing half is filled in: from the printed
 * English name ("Andy Chan" with only "Andy" stored gives "Chan"), and failing
 * that from the Chinese surname in HK romanization ("Andy 陳" gives "Chan").
 *
 * With nothing stored, the split is guessed from the printed name. The guess
 * is crude on purpose: "Wong Ka Ming" leads with the family name while "Chris
 * Huang" ends with it, and nothing in the string says which convention is in
 * play. Treat it as a starting point the user can correct, never as a fact.
 *
 * Derived only — nothing here is written back to the card.
 */
export function getNameParts(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
): NamePartsEn {
  const { first, last } = resolveNameParts(coreFields, customFields);
  return { first, last };
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

  // The server's key wins unless it filed by something other than a family
  // name while one is known here — the row reads "Chan, Andy", so it must not
  // sit under A.
  const serverKey = clean(card.sort_key);
  if (serverKey && (serverUsedFamilyName(card.sort_basis) || !parts.last)) {
    return serverKey.toLowerCase();
  }

  return (parts.last ?? parts.first ?? clean(card.core_fields.company_name) ?? '').toLowerCase();
}

function serverUsedFamilyName(basis: NameSortBasis | null | undefined): boolean {
  return basis === 'last_en' || basis === 'guessed_en' || basis === 'romanized_cn';
}

/** Why the key is what it is, for the hint on the edit form. */
export function resolveSortBasis(card: SortableCard): NameSortBasis {
  const parts = resolveNameParts(card.core_fields, card.custom_fields);
  if (card.sort_basis && (serverUsedFamilyName(card.sort_basis) || !parts.last)) {
    return card.sort_basis;
  }
  if (parts.last) {
    return parts.lastIsRomanized ? 'romanized_cn' : 'last_en';
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
  /** Leading part, shown in bold: the name part the row files under. */
  lead: string;
  /** The rest of the name, or null when the lead is the whole name. */
  rest: string | null;
}

/**
 * How an English name reads while the list is sorted by name. Every card with
 * both English parts follows one pattern per sort, however it was printed:
 *
 * - First name: "Andy Chan" — given name leads.
 * - Last name:  "Chan, Andy" — family name leads, the way Contacts does.
 *
 * So "Li Shan Shan" (printed family-first) reads "Shan Shan Li" / "Li, Shan
 * Shan", same as a card printed "Shan Shan Li". A name without both English
 * parts — "陳大文", or a single word like "Madonna" — stays as printed.
 */
export function sortedNameDisplay(
  coreFields: CoreFields,
  customFields?: Record<string, string>,
  mode: 'first' | 'last' = 'last',
): SortedNameDisplay {
  const printed = clean(coreFields.name) ?? '';
  const { first, last } = getNameParts(coreFields, customFields);

  if (!first || !last || !LATIN_LETTER.test(first) || !LATIN_LETTER.test(last)) {
    return { lead: printed, rest: null };
  }

  return mode === 'first'
    ? { lead: first, rest: ` ${last}` }
    : { lead: last, rest: `, ${first}` };
}
