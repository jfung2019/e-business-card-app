/**
 * @format
 */

import type { CoreFields } from '../src/types/card';
import {
  CJK_SECTION,
  compareBySortKey,
  getChineseName,
  getNameParts,
  resolveSortBasis,
  resolveSortKey,
  sectionLetter,
  sortedNameDisplay,
} from '../src/utils/nameSort';

function core(fields: Partial<CoreFields> & { name: string }): CoreFields {
  return fields;
}

describe('name parts', () => {
  test('prefers the split the API sends', () => {
    const fields = core({ name: 'Li Shan Shan', first_name: 'Shan Shan', last_name: 'Li' });
    expect(getNameParts(fields)).toEqual({ first: 'Shan Shan', last: 'Li' });
  });

  test('falls back to custom fields from an older API', () => {
    const fields = core({ name: 'Wong Ka Ming' });
    expect(getNameParts(fields, { first_name: 'Ka Ming', last_name: 'Wong' })).toEqual({
      first: 'Ka Ming',
      last: 'Wong',
    });
  });

  test('guesses western order only as a last resort', () => {
    expect(getNameParts(core({ name: 'Chris Huang' }))).toEqual({
      first: 'Chris',
      last: 'Huang',
    });
  });

  test('a stored first name with no last name takes the rest of the printed name', () => {
    expect(getNameParts(core({ name: 'Andy Chan', first_name: 'Andy' }))).toEqual({
      first: 'Andy',
      last: 'Chan',
    });
  });

  test('a stored last name with no first name takes the rest of the printed name', () => {
    expect(getNameParts(core({ name: 'Andy Chan', last_name: 'Chan' }))).toEqual({
      first: 'Andy',
      last: 'Chan',
    });
  });

  test('a missing last name is romanized from a Chinese surname in the printed name', () => {
    expect(getNameParts(core({ name: 'Andy 陳' }))).toEqual({ first: 'Andy', last: 'Chan' });
    expect(getNameParts(core({ name: 'Andy 陳', first_name: 'Andy' }))).toEqual({
      first: 'Andy',
      last: 'Chan',
    });
  });

  test('a missing last name is romanized from the separate Chinese name', () => {
    expect(getNameParts(core({ name: 'Andy', first_name: 'Andy', name_cn: '陳大文' }))).toEqual({
      first: 'Andy',
      last: 'Chan',
    });
  });

  test('an English family name on the card beats the romanized one', () => {
    // Printed "Chen", not the HK "Chan": the card's own spelling wins.
    expect(getNameParts(core({ name: 'Andy Chen', first_name: 'Andy', name_cn: '陳大文' }))).toEqual({
      first: 'Andy',
      last: 'Chen',
    });
  });

  test('an unknown surname is left missing rather than invented', () => {
    expect(getNameParts(core({ name: 'Andy', first_name: 'Andy', name_cn: '㐀大文' }))).toEqual({
      first: 'Andy',
      last: null,
    });
  });

  test('Chinese beside an English name no longer ends up as the family name', () => {
    expect(getNameParts(core({ name: 'Andy Chan 陳大文' }))).toEqual({
      first: 'Andy',
      last: 'Chan',
    });
  });

  test('a name with no Latin letters yields no parts to guess at', () => {
    expect(getNameParts(core({ name: '陳大文' }))).toEqual({ first: null, last: null });
  });
});

describe('sort key', () => {
  test('case 1: both names present, the English family name wins', () => {
    const card = {
      core_fields: core({
        name: 'Li Shan Shan',
        first_name: 'Shan Shan', last_name: 'Li',
        name_cn: '李珊珊',
      }),
    };
    expect(resolveSortKey(card)).toBe('li');
    expect(resolveSortBasis(card)).toBe('last_en');
  });

  test('case 2: only an English given name, so it carries the sort', () => {
    const card = { core_fields: core({ name: 'Chris', first_name: 'Chris' }) };
    expect(resolveSortKey(card)).toBe('chris');
    expect(resolveSortBasis(card)).toBe('first_en');
  });

  test('case 3: English given name beside a Chinese full name files under the romanized surname', () => {
    // Was 'lily' (given name carried the sort). Changed so the family name is
    // filled from the Chinese surname and the row reads "Lee, Lily".
    const card = {
      core_fields: core({ name: 'Lily', first_name: 'Lily', name_cn: '李珊珊' }),
    };
    expect(resolveSortKey(card)).toBe('lee');
    expect(resolveSortBasis(card)).toBe('romanized_cn');
  });

  test('a server key filed by given name gives way to a known family name', () => {
    const card = {
      core_fields: core({ name: 'Andy Chan', first_name: 'Andy' }),
      sort_key: 'andy',
      sort_basis: 'first_en' as const,
    };
    expect(resolveSortKey(card)).toBe('chan');
    expect(resolveSortBasis(card)).toBe('last_en');
  });

  test('a company-only card files under the company', () => {
    const card = {
      core_fields: core({ name: 'ILIA JEWELLERY CO.', company_name: 'ILIA JEWELLERY CO.' }),
    };
    expect(resolveSortBasis(card)).toBe('last_en');
  });

  test('the server key wins over anything computed here', () => {
    const card = {
      core_fields: core({ name: '陳大文', name_cn: '陳大文' }),
      sort_key: 'chan',
      sort_basis: 'romanized_cn' as const,
    };
    expect(resolveSortKey(card)).toBe('chan');
    expect(resolveSortBasis(card)).toBe('romanized_cn');
  });

  test('nothing to sort on lands in the Chinese bucket', () => {
    const card = { core_fields: core({ name: '陳大文' }) };
    expect(resolveSortKey(card)).toBe('');
    expect(sectionLetter(resolveSortKey(card))).toBe(CJK_SECTION);
  });
});

describe('sections', () => {
  test('keys without Latin letters sort after those with them', () => {
    const keys = ['wong', '', 'chiu', 'li'];
    expect([...keys].sort(compareBySortKey)).toEqual(['chiu', 'li', 'wong', '']);
  });

  test('the section letter is the first Latin character, uppercased', () => {
    expect(sectionLetter('huang')).toBe('H');
    expect(sectionLetter('  li')).toBe('L');
  });
});

describe('display while sorted by name', () => {
  const andy = core({ name: 'Andy Chan', first_name: 'Andy', last_name: 'Chan' });

  test('first-name sort reads given name first', () => {
    expect(sortedNameDisplay(andy, undefined, 'first')).toEqual({ lead: 'Andy', rest: ' Chan' });
  });

  test('last-name sort reads family name first, comma-separated', () => {
    expect(sortedNameDisplay(andy, undefined, 'last')).toEqual({ lead: 'Chan', rest: ', Andy' });
  });

  test('a printed family-first name follows the same pattern', () => {
    const fields = core({ name: 'Li Shan Shan', first_name: 'Shan Shan', last_name: 'Li' });
    expect(sortedNameDisplay(fields, undefined, 'first')).toEqual({
      lead: 'Shan Shan',
      rest: ' Li',
    });
    expect(sortedNameDisplay(fields, undefined, 'last')).toEqual({
      lead: 'Li',
      rest: ', Shan Shan',
    });
  });

  test('uses the parts from custom fields an older API stored', () => {
    const fields = core({ name: 'Wong Ka Ming' });
    const custom = { first_name: 'Ka Ming', last_name: 'Wong' };
    expect(sortedNameDisplay(fields, custom, 'last')).toEqual({ lead: 'Wong', rest: ', Ka Ming' });
  });

  test('a card with no last name shows the romanized surname', () => {
    const fields = core({ name: 'Andy 陳' });
    expect(sortedNameDisplay(fields, undefined, 'first')).toEqual({ lead: 'Andy', rest: ' Chan' });
    expect(sortedNameDisplay(fields, undefined, 'last')).toEqual({ lead: 'Chan', rest: ', Andy' });
  });

  test('a card stored with only a first name still inverts in last-name sort', () => {
    const fields = core({ name: 'Andy Chan', first_name: 'Andy' });
    expect(sortedNameDisplay(fields, undefined, 'last')).toEqual({ lead: 'Chan', rest: ', Andy' });
  });

  test('a single-word name stays as printed', () => {
    const fields = core({ name: 'Madonna' });
    expect(sortedNameDisplay(fields, undefined, 'first')).toEqual({ lead: 'Madonna', rest: null });
    expect(sortedNameDisplay(fields, undefined, 'last')).toEqual({ lead: 'Madonna', rest: null });
  });

  test('a name with no English parts stays whole', () => {
    expect(sortedNameDisplay(core({ name: '陳大文' }), undefined, 'last')).toEqual({
      lead: '陳大文',
      rest: null,
    });
  });

  test('defaults to last-name order', () => {
    expect(sortedNameDisplay(andy)).toEqual({ lead: 'Chan', rest: ', Andy' });
  });
});

describe('chinese name', () => {
  test('is offered when it differs from the printed name', () => {
    expect(getChineseName(core({ name: 'Li Shan Shan', name_cn: '李珊珊' }))).toBe('李珊珊');
  });

  test('is withheld when it is the printed name, to avoid showing it twice', () => {
    expect(getChineseName(core({ name: '陳大文', name_cn: '陳大文' }))).toBeNull();
  });
});
