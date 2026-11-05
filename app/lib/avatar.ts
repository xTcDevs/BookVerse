// Profile photos are shown at most a few hundred pixels wide, so every photo
// is resized on the device before upload. That also turns phone photos that
// are large or in formats the bucket doesn't accept (e.g. iPhone HEIC) into a
// small JPEG or WebP.

export const AVATAR_MAX_SIDE = 512;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const PASS_THROUGH: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export type PreparedAvatar = { blob: Blob; type: string; ext: string };

export class AvatarError extends Error {}

async function decode(
  file: Blob,
): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // fall back to <img>, which some browsers decode more formats with
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new AvatarError('This image couldn’t be read. Please choose a JPEG, PNG or WebP photo.');
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Returns an upload-ready photo, or throws AvatarError with a readable message. */
export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new AvatarError('Please choose an image file.');
  }
  const passExt = PASS_THROUGH[file.type];

  let image: Awaited<ReturnType<typeof decode>>;
  try {
    image = await decode(file);
  } catch (error) {
    // Small files in an accepted format can still go up as they are.
    if (passExt && file.size <= AVATAR_MAX_BYTES) return { blob: file, type: file.type, ext: passExt };
    throw error;
  }

  try {
    const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(image.width, image.height));
    if (passExt && scale === 1 && file.size <= AVATAR_MAX_BYTES) {
      return { blob: file, type: file.type, ext: passExt };
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new AvatarError('This browser couldn’t prepare the image. Please try another photo.');
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    const webp = await toBlob(canvas, 'image/webp', 0.86);
    if (webp && webp.type === 'image/webp') return { blob: webp, type: 'image/webp', ext: 'webp' };
    const jpeg = await toBlob(canvas, 'image/jpeg', 0.86);
    if (jpeg) return { blob: jpeg, type: 'image/jpeg', ext: 'jpg' };
    throw new AvatarError('This browser couldn’t prepare the image. Please try another photo.');
  } finally {
    image.close();
  }
}
