import {
  classifyQrPayload,
  findWechatQrs,
  parseWechatQrUrls,
  pickWechatQr,
  serializeWechatQrUrls,
  WECHAT_QR_KEY,
  withWechatQrUrls,
} from '../src/utils/classifyQrPayload';

const kind = (payload: string) => classifyQrPayload(payload).kind;

describe('classifyQrPayload', () => {
  it('recognises WeChat QR payloads', () => {
    expect(kind('http://weixin.qq.com/r/Ep0XL1zEBtq0rSm-925R')).toBe('wechat');
    expect(kind('https://weixin.qq.com/r/abc123')).toBe('wechat');
    expect(kind('https://u.wechat.com/EBtest123')).toBe('wechat');
    expect(kind('https://mp.weixin.qq.com/mp/profile')).toBe('wechat');
    expect(kind('weixin://dl/add_contact')).toBe('wechat');
  });

  it('recognises the payload shapes real cards actually produce', () => {
    // Formats confirmed by decoding real WeChat/WhatsApp QR codes. Tokens are
    // replaced with placeholders -- a live token identifies a real person.
    expect(kind('https://u.wechat.com/ILxxxxxxxxxxxxxxxxxxxxxx')).toBe('wechat');
    // WeChat appends a source param on some codes.
    expect(kind('https://u.wechat.com/MJxxxxxxxxxxxxxxxxxxxxxx?s=2')).toBe('wechat');
    // WhatsApp's QR links use a /qr/ path, not the /<number>` form.
    expect(kind('https://wa.me/qr/2XXXXXXXXXXXXX')).toBe('whatsapp');
  });

  it('recognises WhatsApp QR payloads', () => {
    expect(kind('https://wa.me/85264634333')).toBe('whatsapp');
    expect(kind('https://api.whatsapp.com/send?phone=85264634333')).toBe('whatsapp');
    expect(kind('https://chat.whatsapp.com/ABCDEF')).toBe('whatsapp');
  });

  it('treats everything else as other', () => {
    expect(kind('https://www.theqastle.com')).toBe('other');
    expect(kind('BEGIN:VCARD\nFN:Andy Siu\nEND:VCARD')).toBe('other');
    expect(kind('lilyphuket')).toBe('other');
    expect(kind('')).toBe('other');
    expect(kind('   ')).toBe('other');
  });

  it('is not fooled by look-alike hosts', () => {
    // A substring check would wrongly accept all of these.
    expect(kind('https://wechat.com.attacker.net/r/x')).toBe('other');
    expect(kind('https://notwechat.com/r/x')).toBe('other');
    expect(kind('https://fake-wa.me/85264634333')).toBe('other');
    expect(kind('https://evil.net/?next=https://weixin.qq.com/r/x')).toBe('other');
  });

  it('ignores port and userinfo when matching the host', () => {
    expect(kind('https://weixin.qq.com:8443/r/abc')).toBe('wechat');
    expect(kind('https://user:pass@weixin.qq.com/r/abc')).toBe('wechat');
  });

  it('keeps the trimmed payload for storage', () => {
    expect(classifyQrPayload('  https://u.wechat.com/X  ').value).toBe(
      'https://u.wechat.com/X',
    );
  });
});

describe('pickWechatQr', () => {
  it('picks WeChat out of a card carrying both codes', () => {
    // The Gold Cycle card prints WeChat and WhatsApp QRs side by side, and the
    // barcode scanner returns them in arbitrary order.
    const codes = ['https://wa.me/85264634333', 'http://weixin.qq.com/r/Ep0XL1zE'];
    expect(pickWechatQr(codes)).toBe('http://weixin.qq.com/r/Ep0XL1zE');
    expect(pickWechatQr([...codes].reverse())).toBe('http://weixin.qq.com/r/Ep0XL1zE');
  });

  it('returns null when a card has QRs but none are WeChat', () => {
    expect(pickWechatQr(['https://wa.me/85264634333', 'https://theqastle.com'])).toBeNull();
  });

  it('returns null when the card has no QR at all', () => {
    expect(pickWechatQr([])).toBeNull();
  });

  it('declines rather than guessing when a card carries two WeChat QRs', () => {
    // The LCCPAHK card: a "Follow us" official-account code beside a contact
    // code, both on weixin.qq.com/r/. Picking one at random would be wrong
    // half the time, so the caller must fall back to showing the card image.
    const codes = [
      'http://weixin.qq.com/r/wVxxxxxxxxxxxxxxxxxx',
      'http://weixin.qq.com/r/Nhxxxxxxxxxxxxxxxxxx',
    ];
    expect(pickWechatQr(codes)).toBeNull();
    expect(findWechatQrs(codes)).toHaveLength(2);
  });
});

describe('findWechatQrs', () => {
  it('returns every WeChat code, ignoring the others', () => {
    expect(
      findWechatQrs([
        'https://wa.me/qr/2XXXXXX',
        'http://weixin.qq.com/r/wVxxxxxx',
        'http://www.ilia.com.hk',
        'https://u.wechat.com/ILxxxxxx',
      ]),
    ).toEqual(['http://weixin.qq.com/r/wVxxxxxx', 'https://u.wechat.com/ILxxxxxx']);
  });

  it('de-duplicates a code decoded more than once', () => {
    // Two detectors scanning several image variants report repeats.
    const dup = 'http://weixin.qq.com/r/wVxxxxxx';
    expect(findWechatQrs([dup, dup])).toEqual([dup]);
  });

  it('returns an empty list for a card whose only QR is a website', () => {
    // The ILIA card: its QR is just http://www.ilia.com.hk
    expect(findWechatQrs(['http://www.ilia.com.hk'])).toEqual([]);
  });
});

describe('storing WeChat QR codes in custom_fields', () => {
  it('round-trips a single code', () => {
    const one = ['https://u.wechat.com/MJxxxxxx'];
    const stored = serializeWechatQrUrls(one);
    expect(stored).toBe(one[0]);
    expect(parseWechatQrUrls(stored)).toEqual(one);
  });

  it('round-trips the two codes a card can carry', () => {
    const two = ['http://weixin.qq.com/r/wVxxxxxx', 'http://weixin.qq.com/r/Nhxxxxxx'];
    expect(parseWechatQrUrls(serializeWechatQrUrls(two))).toEqual(two);
  });

  it('stores nothing when no WeChat QR was found', () => {
    expect(serializeWechatQrUrls([])).toBeNull();
    expect(serializeWechatQrUrls(['  '])).toBeNull();
  });

  it('reads back an absent or blank field as no codes', () => {
    expect(parseWechatQrUrls(undefined)).toEqual([]);
    expect(parseWechatQrUrls(null)).toEqual([]);
    expect(parseWechatQrUrls('')).toEqual([]);
  });
});

describe('ID takes priority over QR', () => {
  it('keeps both fields so the screen can prefer the ID', () => {
    const fields = withWechatQrUrls(
      { wechat_id: 'LCCPAHK' },
      ['http://weixin.qq.com/r/wVxxxxxx', 'http://weixin.qq.com/r/Nhxxxxxx'],
    );
    expect(fields.wechat_id).toBe('LCCPAHK');
    expect(parseWechatQrUrls(fields[WECHAT_QR_KEY])).toHaveLength(2);

    // The screen shows the QR prompt only when there is no ID.
    const showQrPrompt = !fields.wechat_id && parseWechatQrUrls(fields[WECHAT_QR_KEY]).length > 0;
    expect(showQrPrompt).toBe(false);
  });

  it('falls back to the QR when the card prints no ID', () => {
    const fields = withWechatQrUrls({}, ['https://u.wechat.com/MJxxxxxx']);
    const showQrPrompt = !fields.wechat_id && parseWechatQrUrls(fields[WECHAT_QR_KEY]).length > 0;
    expect(showQrPrompt).toBe(true);
  });

  it('leaves custom_fields untouched for a card with no WeChat QR', () => {
    const original = { phone_2: '123' };
    expect(withWechatQrUrls(original, [])).toBe(original);
    expect(withWechatQrUrls(original, undefined)).toBe(original);
  });
});
