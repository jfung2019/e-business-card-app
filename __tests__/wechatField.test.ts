import {
  canonicalCustomFieldKey,
  findCustomFieldValue,
  normalizeCustomFields,
  sortCustomFieldKeys,
  WECHAT_ID_KEY,
} from '../src/utils/customFieldKeys';
import { formatCustomFieldLabel } from '../src/utils/formatCustomFieldLabel';
import { parseOcrOffline } from '../src/utils/parseOcrOffline';

describe('wechat custom field key', () => {
  it('folds the spellings cards and the LLM produce onto one key', () => {
    for (const alias of ['wechat', 'WeChat', 'WECHAT', 'weixin', 'wechat_no', '微信', '微信号']) {
      expect(canonicalCustomFieldKey(alias)).toBe(WECHAT_ID_KEY);
    }
  });

  it('leaves the canonical key and unrelated keys alone', () => {
    expect(canonicalCustomFieldKey(WECHAT_ID_KEY)).toBe(WECHAT_ID_KEY);
    expect(canonicalCustomFieldKey('WhatsApp')).toBe('WhatsApp');
  });

  it('merges aliased keys when normalizing stored fields', () => {
    expect(normalizeCustomFields({ WeChat: 'andy_hk' })).toEqual({
      [WECHAT_ID_KEY]: 'andy_hk',
    });
  });

  it('finds a value stored under an alias, since cards are normalized only on save', () => {
    // A card the LLM wrote as `wechat` must still light up the button.
    expect(findCustomFieldValue({ wechat: 'andy_hk' }, WECHAT_ID_KEY)).toBe('andy_hk');
    expect(findCustomFieldValue({ 微信: 'andy_hk' }, WECHAT_ID_KEY)).toBe('andy_hk');
    expect(findCustomFieldValue({ [WECHAT_ID_KEY]: 'andy_hk' }, WECHAT_ID_KEY)).toBe('andy_hk');
  });

  it('treats blank and absent values as no WeChat', () => {
    expect(findCustomFieldValue({ wechat: '   ' }, WECHAT_ID_KEY)).toBeNull();
    expect(findCustomFieldValue({ WhatsApp: '+852 6463 4333' }, WECHAT_ID_KEY)).toBeNull();
    expect(findCustomFieldValue({}, WECHAT_ID_KEY)).toBeNull();
  });

  it('labels the field WeChat rather than "wechat id"', () => {
    expect(formatCustomFieldLabel(WECHAT_ID_KEY)).toBe('WeChat');
    expect(formatCustomFieldLabel('微信')).toBe('WeChat');
  });

  it('sorts alongside the other prioritized contact fields', () => {
    expect(sortCustomFieldKeys(['fax', WECHAT_ID_KEY, 'address_en'])).toEqual([
      'address_en',
      WECHAT_ID_KEY,
      'fax',
    ]);
  });
});

describe('offline OCR wechat extraction', () => {
  const parse = (lines: string[]) => parseOcrOffline(lines.join('\n')).custom_fields;

  it('reads an ID printed on the label line', () => {
    expect(parse(['Andy Siu', 'WeChat: andy_goldcycle_hk'])[WECHAT_ID_KEY]).toBe(
      'andy_goldcycle_hk',
    );
  });

  it('reads a Chinese label with a full-width colon', () => {
    expect(parse(['徐宇晨', '微信：xuyuchen88'])[WECHAT_ID_KEY]).toBe('xuyuchen88');
  });

  it('falls through to the next line when the label stands alone', () => {
    expect(parse(['Andy Siu', 'WeChat', 'andy_goldcycle_hk'])[WECHAT_ID_KEY]).toBe(
      'andy_goldcycle_hk',
    );
  });

  it('accepts a phone number used as the WeChat ID', () => {
    expect(parse(['Andy Siu', 'WeChat: 13722558384'])[WECHAT_ID_KEY]).toBe('13722558384');
  });

  it('does not mistake an adjacent WhatsApp QR caption for an ID', () => {
    // The Gold Cycle card prints "WeChat" and "Whatsapp" as side-by-side captions.
    expect(parse(['Andy Siu', 'WeChat    Whatsapp'])[WECHAT_ID_KEY]).toBeUndefined();
    expect(parse(['Andy Siu', 'WeChat', 'Whatsapp'])[WECHAT_ID_KEY]).toBeUndefined();
  });

  it('does not let a url containing "wechat" claim the following line', () => {
    expect(parse(['Andy Siu', 'www.wechatpay.com', 'Marketing'])[WECHAT_ID_KEY]).toBeUndefined();
  });

  it('leaves the field unset on cards with no WeChat at all', () => {
    expect(parse(['Andy Siu', 'CEO', 'M: (+852) 6463 4333'])[WECHAT_ID_KEY]).toBeUndefined();
  });
});

describe('offline OCR alternate Chinese name', () => {
  it('writes the alternate Chinese name into custom_fields', () => {
    // Regression: this was read as `alternate_name_ch` and silently dropped.
    const { custom_fields } = parseOcrOffline(
      ['Xu Yuchen', 'Senior Sales Manager', '徐宇晨', '173 4270 0948'].join('\n'),
    );
    expect(custom_fields.alternate_name_cn).toBe('徐宇晨');
  });
});

describe('real card layouts', () => {
  const custom = (lines: string[]) => parseOcrOffline(lines.join('\n')).custom_fields;

  it('reads "WeChat ID: Sal0AB" (Eagle Red card)', () => {
    const fields = custom([
      'SALAH ABDO',
      'FOUNDER',
      '+1857-210-3171',
      'eagleredassociates@gmail.com',
      'WeChat ID: Sal0AB',
      'eagleredassociates.com',
    ]);
    expect(fields[WECHAT_ID_KEY]).toBe('Sal0AB');
  });

  it('reads "WeChat : lilyphuket" with a space before the colon (Qastle card)', () => {
    const fields = custom([
      'Li Shan Shan',
      '李珊珊',
      'Marketing Manager',
      'T: +66 80 513 3630',
      'M: newphuket8@gmail.com',
      'WeChat : lilyphuket',
      'W: www.theqastle.com',
    ]);
    expect(fields[WECHAT_ID_KEY]).toBe('lilyphuket');
  });

  it('does not confuse the email or website on those cards for a WeChat ID', () => {
    const fields = custom(['M: newphuket8@gmail.com', 'W: www.theqastle.com']);
    expect(fields[WECHAT_ID_KEY]).toBeUndefined();
  });
});

describe('scan -> display chain', () => {
  // The button appears iff CardDetailScreen's `wechat` value is non-null, so
  // this asserts the same read the screen performs on a freshly parsed card.
  const wechatShownFor = (lines: string[]) =>
    findCustomFieldValue(parseOcrOffline(lines.join('\n')).custom_fields, WECHAT_ID_KEY);

  it('shows the button for a card scanned with a WeChat ID', () => {
    expect(wechatShownFor(['SALAH ABDO', 'WeChat ID: Sal0AB'])).toBe('Sal0AB');
    expect(wechatShownFor(['Li Shan Shan', 'WeChat : lilyphuket'])).toBe('lilyphuket');
  });

  it('hides the button for a card with no WeChat', () => {
    expect(wechatShownFor(['SALAH ABDO', 'FOUNDER', '+1857-210-3171'])).toBeNull();
  });

  it('still shows the button when the server stored an alias key', () => {
    expect(findCustomFieldValue({ wechat: 'Sal0AB' }, WECHAT_ID_KEY)).toBe('Sal0AB');
  });
});

describe('prose containing the word WeChat', () => {
  const wechat = (lines: string[]) =>
    findCustomFieldValue(parseOcrOffline(lines.join('\n')).custom_fields, WECHAT_ID_KEY);

  it('does not mine an ID out of a marketing sentence', () => {
    // The LCCPAHK card headline. Previously yielded "Welcome".
    expect(wechat(['Welcome to contact us via WeChat.', 'Follow us'])).toBeNull();
    expect(wechat(['歡迎透過微信與我們聯繫'])).toBeNull();
    expect(wechat(['Scan our WeChat QR code below'])).toBeNull();
  });

  it('still finds the real ID further down the same card', () => {
    const lines = [
      'Welcome to contact us via WeChat.',
      '歡迎透過微信與我們聯繫',
      '追蹤我們',
      'Follow us',
      '微信 ID',
      'WeChat ID    LCCPAHK',
    ];
    expect(wechat(lines)).toBe('LCCPAHK');
  });

  it('finds the ID when the label and value are split across lines', () => {
    const lines = [
      'Welcome to contact us via WeChat.',
      'Follow us',
      '微信 ID',
      'WeChat ID',
      'LCCPAHK',
    ];
    expect(wechat(lines)).toBe('LCCPAHK');
  });
});

describe('alias coverage mirrors the API table', () => {
  // These spellings are listed in _CUSTOM_FIELD_KEY_ALIASES in the API
  // (app/services/openrouter.py). Both sides must fold them to wechat_id.
  const SERVER_ALIASES = [
    'wechat', 'we chat', 'wechat id', 'wechat no', 'wechat no.',
    'wechat number', 'wechat account', 'weixin', 'weixin id',
    '微信', '微信号', '微信號', '微信id',
  ];

  it.each(SERVER_ALIASES)('folds %s to the canonical key', alias => {
    expect(canonicalCustomFieldKey(alias)).toBe(WECHAT_ID_KEY);
  });

  it('handles the traditional form Hong Kong cards print', () => {
    expect(canonicalCustomFieldKey('微信號')).toBe(WECHAT_ID_KEY);
    expect(findCustomFieldValue({ 微信號: 'LCCPAHK' }, WECHAT_ID_KEY)).toBe('LCCPAHK');
  });
});
