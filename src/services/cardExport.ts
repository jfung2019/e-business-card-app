import { Image, PermissionsAndroid, Platform } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import RNBlobUtil from 'react-native-blob-util';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';

const STANDARD_CARD_ASPECT_RATIO = 1.586; // ISO/business-card width:height
const PDF_PAGE_WIDTH_POINTS = 400;

function dataUriMimeType(dataUri: string): string {
  const match = /^data:([^;]+);base64,/.exec(dataUri);
  return match?.[1] ?? 'image/jpeg';
}

function dataUriBase64(dataUri: string): string {
  const index = dataUri.indexOf('base64,');
  return index === -1 ? dataUri : dataUri.slice(index + 'base64,'.length);
}

function getImageAspectRatio(uri: string): Promise<number> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve(height > 0 ? width / height : STANDARD_CARD_ASPECT_RATIO),
      () => resolve(STANDARD_CARD_ASPECT_RATIO),
    );
  });
}

export async function exportCardAsPdf(
  images: string[],
  fileName: string,
  aspectRatioOverride?: number,
): Promise<void> {
  if (images.length === 0) {
    throw new Error('No scan image available to export.');
  }

  const aspectRatio = aspectRatioOverride ?? (await getImageAspectRatio(images[0]));
  const pageWidth = PDF_PAGE_WIDTH_POINTS;
  const pageHeight = Math.round(pageWidth / aspectRatio);

  const html = `
    <html>
      <body style="margin:0;padding:0;">
        ${images
          .map(
            uri =>
              `<div style="width:100%;height:100%;page-break-after:always;"><img src="${uri}" style="width:100%;height:100%;display:block;object-fit:cover;" /></div>`,
          )
          .join('')}
      </body>
    </html>
  `;

  const pdf = await generatePDF({
    html,
    fileName,
    base64: false,
    bgColor: '#FFFFFF',
    padding: 0,
    width: pageWidth,
    height: pageHeight,
  });

  if (!pdf.filePath) {
    throw new Error('Unable to generate PDF.');
  }

  const fileUrl = pdf.filePath.startsWith('file://') ? pdf.filePath : `file://${pdf.filePath}`;
  await Share.open({
    url: fileUrl,
    type: 'application/pdf',
    failOnCancel: false,
  });
}

async function hasAndroidGalleryWritePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version >= 29) {
    return true;
  }
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  if (granted) {
    return true;
  }
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function saveCardPhotosToAlbum(images: string[]): Promise<void> {
  if (images.length === 0) {
    throw new Error('No scan image available to save.');
  }

  if (!(await hasAndroidGalleryWritePermission())) {
    throw new Error('Photo library permission was denied.');
  }

  for (const [index, image] of images.entries()) {
    const mimeType = dataUriMimeType(image);
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const path = `${RNBlobUtil.fs.dirs.CacheDir}/card-export-${Date.now()}-${index}.${extension}`;
    await RNBlobUtil.fs.writeFile(path, dataUriBase64(image), 'base64');
    await CameraRoll.saveAsset(`file://${path}`, { type: 'photo' });
  }
}
