import BarcodeScanning, {
  BarcodeFormat,
} from '@react-native-ml-kit/barcode-scanning';
import QRKit from 'react-native-qr-kit';

import { findWechatQrs } from '../utils/classifyQrPayload';

/**
 * Read every QR payload from an image using ZXing (via react-native-qr-kit).
 *
 * ZXing binarises the image at full resolution and searches for finder
 * patterns directly, and GenericMultipleBarcodeReader subdivides the frame to
 * look for further codes. That matters here: ML Kit locates barcodes with an
 * SSD MobileNet model that runs on a heavily downscaled copy of the input, so
 * a business-card QR occupying ~8% of a 1600px photo shrinks to a couple of
 * dozen pixels and is never found -- it returns an empty list, with no error.
 */
async function decodeWithZxing(imageUri: string): Promise<string[]> {
  const response = await QRKit.decodeMultiple(imageUri);
  if (!response.success) {
    // qr-kit resolves failures instead of rejecting, so "could not read the
    // file" and "no QR in this image" look identical unless we read the
    // message. BitmapFactory.decodeFile only accepts real file paths, so a
    // content:// uri fails here while ML Kit's ContentResolver path succeeds.
    if (__DEV__) {
      console.log('[qrDetect] zxing no result:', JSON.stringify(response));
    }
    return [];
  }
  return response.results
    .map(result => result.data)
    .filter((value): value is string => Boolean(value));
}

/** Fallback decoder, kept because it handles some images ZXing rejects. */
async function decodeWithMlKit(imageUri: string): Promise<string[]> {
  const barcodes = await BarcodeScanning.scan(imageUri);
  return barcodes
    .filter(barcode => barcode.format === BarcodeFormat.QR_CODE)
    .map(barcode => barcode.value)
    .filter((value): value is string => Boolean(value));
}

/**
 * WeChat QR codes found on a card image.
 *
 * Runs on the captured still rather than the live camera. Note the image
 * picker has already capped this image at SCAN_IMAGE_MAX_EDGE_PX/quality, so
 * it is not the full-resolution original -- but it is larger than the
 * compressed upload copy.
 *
 * A failure here must never break a scan: QR detection is an enhancement, and
 * a card with unreadable codes should still parse its text normally.
 */
export async function detectWechatQrUrls(imageUri: string): Promise<string[]> {
  if (!imageUri) {
    return [];
  }

  if (__DEV__) {
    console.log('[qrDetect] scanning uri:', imageUri);
  }

  const values: string[] = [];

  try {
    values.push(...(await decodeWithZxing(imageUri)));
  } catch (error) {
    if (__DEV__) {
      console.log('[qrDetect] zxing failed:', String(error));
    }
  }

  // Only pay for the second decoder when the first found nothing.
  if (values.length === 0) {
    try {
      values.push(...(await decodeWithMlKit(imageUri)));
    } catch (error) {
      if (__DEV__) {
        console.log('[qrDetect] mlkit failed:', String(error));
      }
    }
  }

  const wechat = findWechatQrs(values);
  if (__DEV__) {
    console.log(
      '[qrDetect] payloads:',
      JSON.stringify(values),
      '-> wechat:',
      JSON.stringify(wechat),
    );
  }
  return wechat;
}

/**
 * Merge WeChat QR codes from the front and back of one card.
 *
 * Both sides belong to a single contact, and the same code often appears on
 * both, so duplicates are collapsed.
 */
export function mergeWechatQrUrls(...groups: string[][]): string[] {
  const merged: string[] = [];
  for (const group of groups) {
    for (const url of group) {
      if (!merged.includes(url)) {
        merged.push(url);
      }
    }
  }
  return merged;
}
