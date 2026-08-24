import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import { decodeBase64 } from '../../utils/sha256';

export interface PreprocessedImage {
  uri: string;
  width: number;
  height: number;
  rgba: Uint8Array;
}

/**
 * Loads an image from a local URI, bakes EXIF orientation, limits the maximum
 * dimension to 1024px to prevent out-of-memory, and decodes JPEG raw pixels.
 */
export async function loadAndProcessImage(originalUri: string): Promise<PreprocessedImage> {
  // 1. Initial transpose/EXIF correction and get dimensions
  let manipResult = await manipulateAsync(originalUri, [], {
    format: SaveFormat.JPEG,
    compress: 0.95,
  });

  let { uri, width, height } = manipResult;

  // 2. Downscale if dimensions exceed 1024px (memory-safety)
  const MAX_DIM = 1024;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = MAX_DIM / Math.max(width, height);
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    console.log(`[exif] Downscaling image from ${width}x${height} to ${targetW}x${targetH}...`);
    manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: targetW, height: targetH } }],
      { format: SaveFormat.JPEG, compress: 0.95 }
    );
    uri = manipResult.uri;
    width = manipResult.width;
    height = manipResult.height;
  }

  // 3. Read image as base64 string
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryData = decodeBase64(base64);

  // 4. Decode JPEG raw RGBA pixels
  const decoded = jpeg.decode(binaryData, { useTArray: true, formatAsRGBA: true });

  return {
    uri,
    width: decoded.width,
    height: decoded.height,
    rgba: new Uint8Array(decoded.data),
  };
}
