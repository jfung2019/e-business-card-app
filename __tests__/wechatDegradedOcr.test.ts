import { parseOcrOffline } from '../src/utils/parseOcrOffline';
import { findCustomFieldValue, WECHAT_ID_KEY } from '../src/utils/customFieldKeys';

/**
 * Known limitation of the offline parser: it is label-driven.
 *
 * Cards like The Qastle print "WeChat" in red on dark blue. That label barely
 * survives a camera scan, so OCR can return the white value while dropping or
 * mangling the red label beside it -- and with no label there is nothing to
 * distinguish "lilyphuket" from any other word on the card.
 *
 * The online path does better here: the LLM sees the whole card as context.
 * These tests pin the offline boundary so it is a known edge, not a surprise.
 */
describe('offline parser is label-driven', () => {
  const wechat = (lines: string[]) =>
    findCustomFieldValue(parseOcrOffline(lines.join('\n')).custom_fields, WECHAT_ID_KEY);

  it('detects the ID when the label survives OCR', () => {
    expect(wechat(['Li Shan Shan', 'WeChat : lilyphuket'])).toBe('lilyphuket');
  });

  it('cannot detect the ID when OCR drops the label', () => {
    expect(wechat(['Li Shan Shan', ': lilyphuket'])).toBeNull();
    expect(wechat(['Li Shan Shan', 'lilyphuket'])).toBeNull();
  });

  it('cannot detect the ID when OCR mangles the label', () => {
    expect(wechat(['Li Shan Shan', 'WeCher : lilyphuket'])).toBeNull();
    expect(wechat(['Li Shan Shan', 'V/eChat : lilyphuket'])).toBeNull();
  });

  it('still surfaces the unmatched value as a custom field the user can fix', () => {
    // Not silently lost: it lands in line_N, so it stays visible and editable.
    const { custom_fields } = parseOcrOffline(
      [
        'Li Shan Shan',
        '李珊珊',
        'Marketing Manager',
        'T: +66 80 513 3630',
        'M: newphuket8@gmail.com',
        ': lilyphuket',
        'W: www.theqastle.com',
      ].join('\n'),
    );
    expect(Object.values(custom_fields).join('|')).toContain('lilyphuket');
  });
});
