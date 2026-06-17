export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return (globalThis as unknown as { btoa: (input: string) => string }).btoa(binary);
}

export async function readImageAsBase64(localUri: string): Promise<string> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0) {
    throw new Error('The selected image is empty.');
  }
  return arrayBufferToBase64(buffer);
}
