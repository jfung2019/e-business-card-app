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

  test('case 3: English given name beside a Chinese full name', () => {
    const card = {
      core_fields: core({ name: 'Lily', first_name: 'Lily', name_cn: '李珊珊' }),
    };
    expect(resolveSortKey(card)).toBe('lily');
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
  test('a printed family-first name is left exactly as printed', () => {
    const fields = core({ name: 'Li Shan Shan', first_name: 'Shan Shan', last_name: 'Li' });
    expect(sortedNameDisplay(fields)).toEqual({ lead: 'Li', rest: 'Shan Shan' });
  });

  test('a western name inverts so the eye lands on the family name', () => {
    const fields = core({ name: 'Chris Huang', first_name: 'Chris', last_name: 'Huang' });
    expect(sortedNameDisplay(fields)).toEqual({ lead: 'Huang', rest: ', Chris' });
  });

  test('a name with no known family name stays whole', () => {
    expect(sortedNameDisplay(core({ name: '陳大文' }))).toEqual({ lead: '陳大文', rest: null });
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
