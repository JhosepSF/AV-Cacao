import { resizeBilinear } from './imagenet';

export interface GeometricPipelineResult {
  rgba1024: Uint8Array;
  cropBox: [number, number, number, number]; // [x1, y1, x2, y2] of cropped area
  rotationAngleDeg: number;
}

/**
 * Rotates the image and mask bilinear-wise around (cx, cy) by alpha.
 */
export function rotateImageAndMask(
  srcRgba: Uint8Array,
  srcMask: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  alpha: number
): { rotatedRgba: Uint8Array; rotatedMask: Uint8Array } {
  const rotatedRgba = new Uint8Array(width * height * 4);
  const rotatedMask = new Uint8Array(width * height);

  const cos = Math.cos(alpha);
  const sin = Math.sin(alpha);

  for (let yDst = 0; yDst < height; yDst++) {
    const yDiff = yDst - cy;
    for (let xDst = 0; xDst < width; xDst++) {
      const xDiff = xDst - cx;

      // Inverse rotation to find source pixels
      const xSrc = cx + xDiff * cos + yDiff * sin;
      const ySrc = cy - xDiff * sin + yDiff * cos;

      const dstIdx = (yDst * width + xDst) * 4;
      const dstMaskIdx = yDst * width + xDst;

      if (xSrc < 0 || xSrc >= width - 1 || ySrc < 0 || ySrc >= height - 1) {
        // Out of bounds: fill with white background and empty mask
        rotatedRgba[dstIdx] = 255;
        rotatedRgba[dstIdx + 1] = 255;
        rotatedRgba[dstIdx + 2] = 255;
        rotatedRgba[dstIdx + 3] = 255;
        rotatedMask[dstMaskIdx] = 0;
      } else {
        // Bilinear interpolation coordinates
        const xLow = Math.floor(xSrc);
        const yLow = Math.floor(ySrc);
        const xHigh = xLow + 1;
        const yHigh = yLow + 1;

        const xW = xSrc - xLow;
        const yW = ySrc - yLow;

        const idx00 = (yLow * width + xLow) * 4;
        const idx10 = (yLow * width + xHigh) * 4;
        const idx01 = (yHigh * width + xLow) * 4;
        const idx11 = (yHigh * width + xHigh) * 4;

        // Interpolate RGBA color
        for (let c = 0; c < 4; c++) {
          const val =
            srcRgba[idx00 + c] * (1 - xW) * (1 - yW) +
            srcRgba[idx10 + c] * xW * (1 - yW) +
            srcRgba[idx01 + c] * (1 - xW) * yW +
            srcRgba[idx11 + c] * xW * yW;
          rotatedRgba[dstIdx + c] = Math.round(val);
        }

        // Interpolate Mask value
        const m00 = srcMask[yLow * width + xLow];
        const m10 = srcMask[yLow * width + xHigh];
        const m01 = srcMask[yHigh * width + xLow];
        const m11 = srcMask[yHigh * width + xHigh];

        const mVal =
          m00 * (1 - xW) * (1 - yW) +
          m10 * xW * (1 - yW) +
          m01 * (1 - xW) * yW +
          m11 * xW * yW;

        rotatedMask[dstMaskIdx] = mVal >= 0.5 ? 1 : 0;
      }
    }
  }

  return { rotatedRgba, rotatedMask };
}

/**
 * Runs the geometric normalization pipeline on the input image.
 */
export function normalizeCacaoGeometry(
  originalRgba: Uint8Array,
  binaryMask: Uint8Array,
  width: number,
  height: number,
  theta: number,
  cx: number,
  cy: number
): GeometricPipelineResult {
  // 1. Replace background with white where mask is false
  const maskedRgba = new Uint8Array(originalRgba.length);
  for (let i = 0; i < originalRgba.length; i += 4) {
    const maskIdx = i / 4;
    if (binaryMask[maskIdx] === 0) {
      maskedRgba[i] = 255;
      maskedRgba[i + 1] = 255;
      maskedRgba[i + 2] = 255;
      maskedRgba[i + 3] = 255; // White background
    } else {
      maskedRgba[i] = originalRgba[i];
      maskedRgba[i + 1] = originalRgba[i + 1];
      maskedRgba[i + 2] = originalRgba[i + 2];
      maskedRgba[i + 3] = originalRgba[i + 3];
    }
  }

  // 2. Rotate image and mask to vertical axis (90 degrees / PI/2)
  // To rotate theta to PI/2, we rotate by (PI/2 - theta)
  const rotationAngle = Math.PI / 2 - theta;
  const { rotatedRgba, rotatedMask } = rotateImageAndMask(
    maskedRgba,
    binaryMask,
    width,
    height,
    cx,
    cy,
    rotationAngle
  );

  // 3. Calculate bounding box of the rotated mask
  let xMin = width - 1;
  let yMin = height - 1;
  let xMax = 0;
  let yMax = 0;
  let hasActive = false;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (rotatedMask[rowOffset + x] > 0) {
        hasActive = true;
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
    }
  }

  // Fallback if mask is empty after rotation
  if (!hasActive) {
    xMin = 0;
    yMin = 0;
    xMax = width - 1;
    yMax = height - 1;
  }

  // 4. Add 8% margin
  const w = xMax - xMin;
  const h = yMax - yMin;
  const marginX = w * 0.08;
  const marginY = h * 0.08;

  const cropX1 = Math.max(0, Math.floor(xMin - marginX));
  const cropY1 = Math.max(0, Math.floor(yMin - marginY));
  const cropX2 = Math.min(width - 1, Math.ceil(xMax + marginX));
  const cropY2 = Math.min(height - 1, Math.ceil(yMax + marginY));

  // 5. Crop and Pad to square with white background
  const cropW = cropX2 - cropX1 + 1;
  const cropH = cropY2 - cropY1 + 1;
  const squareSize = Math.max(cropW, cropH);

  const squareRgba = new Uint8Array(squareSize * squareSize * 4);
  squareRgba.fill(255); // White background

  const offsetX = Math.floor((squareSize - cropW) / 2);
  const offsetY = Math.floor((squareSize - cropH) / 2);

  for (let y = 0; y < cropH; y++) {
    const srcRowIdx = ((cropY1 + y) * width + cropX1) * 4;
    const destRowIdx = ((offsetY + y) * squareSize + offsetX) * 4;
    squareRgba.set(
      rotatedRgba.subarray(srcRowIdx, srcRowIdx + cropW * 4),
      destRowIdx
    );
  }

  // 6. Resize to master output size of 1024x1024
  const rgba1024 = resizeBilinear(squareRgba, squareSize, squareSize, 1024, 1024);

  return {
    rgba1024,
    cropBox: [cropX1, cropY1, cropX2, cropY2],
    rotationAngleDeg: rotationAngle * (180 / Math.PI),
  };
}
