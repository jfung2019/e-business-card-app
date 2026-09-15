import { BarcodeFormat } from '@react-native-ml-kit/barcode-scanning';
import BarcodeScanning from '@react-native-ml-kit/barcode-scanning';
import QRKit from 'react-native-qr-kit';

import { detectWechatQrUrls, mergeWechatQrUrls } from '../src/services/qrDetect';

const scan = BarcodeScanning.scan as jest.Mock;
const decodeMultiple = QRKit.decodeMultiple as jest.Mock;

const qr = (value: string) => ({ format: BarcodeFormat.QR_CODE, value });
/** ZXing is tried first; make it find nothing so ML Kit cases still apply. */
const zxingFinds = (...values: string[]) =>
  decodeMultiple.mockResolvedValue({
    success: true,
    results: values.map(data => ({ data })),
  });

beforeEach(() => {
  scan.mockReset();
  decodeMultiple.mockReset();
  zxingFinds();
});

describe('detectWechatQrUrls', () => {
  it('returns the WeChat code from a card that has one', () => {
    scan.mockResolvedValue([qr('https://u.wechat.com/MJxxxxxx')]);
    return expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([
      'https://u.wechat.com/MJxxxxxx',
    ]);
  });

  it('ignores a WhatsApp code beside it', async () => {
    // The Gold Cycle card: WeChat and WhatsApp QRs side by side.
    scan.mockResolvedValue([
      qr('https://wa.me/qr/2XXXXXX'),
      qr('http://weixin.qq.com/r/wVxxxxxx'),
    ]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([
      'http://weixin.qq.com/r/wVxxxxxx',
    ]);
  });

  it('returns both codes when a card carries two WeChat QRs', async () => {
    // The LCCPAHK card. The caller decides what to do with the ambiguity.
    scan.mockResolvedValue([
      qr('http://weixin.qq.com/r/wVxxxxxx'),
      qr('http://weixin.qq.com/r/Nhxxxxxx'),
    ]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toHaveLength(2);
  });

  it('returns nothing for a card whose QR is just a website', async () => {
    // The ILIA card.
    scan.mockResolvedValue([qr('http://www.ilia.com.hk')]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([]);
  });

  it('ignores non-QR symbologies', async () => {
    scan.mockResolvedValue([
      { format: BarcodeFormat.CODE_128, value: 'https://u.wechat.com/spoof' },
    ]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([]);
  });

  it('never breaks a scan when the detector throws', async () => {
    // e.g. the native module is not linked in this build.
    scan.mockRejectedValue(new Error('not linked'));
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([]);
  });

  it('skips the scan entirely for an empty uri', async () => {
    await expect(detectWechatQrUrls('')).resolves.toEqual([]);
    expect(scan).not.toHaveBeenCalled();
  });
});

describe('mergeWechatQrUrls', () => {
  it('combines front and back, collapsing the same code on both sides', () => {
    const a = 'http://weixin.qq.com/r/wVxxxxxx';
    const b = 'https://u.wechat.com/MJxxxxxx';
    expect(mergeWechatQrUrls([a], [a, b])).toEqual([a, b]);
  });

  it('handles a card scanned front-only', () => {
    expect(mergeWechatQrUrls(['x'], [])).toEqual(['x']);
    expect(mergeWechatQrUrls([], [])).toEqual([]);
  });
});

describe('decoder selection', () => {
  it('prefers ZXing and skips ML Kit when it finds codes', async () => {
    zxingFinds('https://u.wechat.com/MJxxxxxx');
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([
      'https://u.wechat.com/MJxxxxxx',
    ]);
    expect(scan).not.toHaveBeenCalled();
  });

  it('falls back to ML Kit when ZXing finds nothing', async () => {
    zxingFinds();
    scan.mockResolvedValue([qr('http://weixin.qq.com/r/wVxxxxxx')]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([
      'http://weixin.qq.com/r/wVxxxxxx',
    ]);
    expect(scan).toHaveBeenCalled();
  });

  it('falls back to ML Kit when ZXing reports failure', async () => {
    decodeMultiple.mockResolvedValue({ success: false, message: 'no QR found' });
    scan.mockResolvedValue([qr('https://u.wechat.com/MJxxxxxx')]);
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toHaveLength(1);
  });

  it('survives both decoders throwing', async () => {
    decodeMultiple.mockRejectedValue(new Error('zxing boom'));
    scan.mockRejectedValue(new Error('mlkit boom'));
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toEqual([]);
  });

  it('reads both codes off the LCCPAHK card via ZXing', async () => {
    zxingFinds('http://weixin.qq.com/r/wVxxxxxx', 'http://weixin.qq.com/r/Nhxxxxxx');
    await expect(detectWechatQrUrls('file:///card.jpg')).resolves.toHaveLength(2);
  });
});
