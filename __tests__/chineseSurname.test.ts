import { romanizeChineseSurname } from '../src/utils/chineseSurname';
import { filterCardsByQuery } from '../src/utils/filterCards';

describe('romanizeChineseSurname', () => {
  test('uses the Hong Kong spelling of common surnames', () => {
    expect(romanizeChineseSurname('陳大文')).toBe('Chan');
    expect(romanizeChineseSurname('黃小明')).toBe('Wong');
    expect(romanizeChineseSurname('張偉')).toBe('Cheung');
    expect(romanizeChineseSurname('李珊珊')).toBe('Lee');
  });

  test('accepts simplified characters', () => {
    expect(romanizeChineseSurname('陈大文')).toBe('Chan');
    expect(romanizeChineseSurname('张伟')).toBe('Cheung');
  });

  test('checks two-character surnames before one-character ones', () => {
    expect(romanizeChineseSurname('歐陽志明')).toBe('Au Yeung');
    expect(romanizeChineseSurname('司徒美玲')).toBe('Szeto');
  });

  test('reads a lone surname, and ignores English before it', () => {
    expect(romanizeChineseSurname('陳')).toBe('Chan');
    expect(romanizeChineseSurname('Andy 陳')).toBe('Chan');
  });

  test('returns null for an unknown surname or no Chinese at all', () => {
    expect(romanizeChineseSurname('㐀大文')).toBeNull();
    expect(romanizeChineseSurname('Andy')).toBeNull();
    expect(romanizeChineseSurname('')).toBeNull();
    expect(romanizeChineseSurname(null)).toBeNull();
  });
});

describe('search finds a romanized family name', () => {
  test('"chan" finds a card printed "Andy 陳"', () => {
    const card = { core_fields: { name: 'Andy 陳' }, custom_fields: {} };
    expect(filterCardsByQuery([card], 'chan')).toEqual([card]);
  });
});
