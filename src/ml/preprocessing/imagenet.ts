export function resizeBilinear(
  srcData: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const dstData = new Uint8Array(dstW * dstH * 4);
  const xRatio = srcW / dstW;
  const yRatio = srcH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const yLow = Math.floor(srcY);
    const yHigh = Math.min(srcH - 1, yLow + 1);
    const yWeight = srcY - yLow;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const xLow = Math.floor(srcX);
      const xHigh = Math.min(srcW - 1, xLow + 1);
      const xWeight = srcX - xLow;

      const idx00 = (yLow * srcW + xLow) * 4;
      const idx10 = (yLow * srcW + xHigh) * 4;
      const idx01 = (yHigh * srcW + xLow) * 4;
      const idx11 = (yHigh * srcW + xHigh) * 4;

      const dstIdx = (y * dstW + x) * 4;

      for (let c = 0; c < 4; c++) {
        const val =
          srcData[idx00 + c] * (1 - xWeight) * (1 - yWeight) +
          srcData[idx10 + c] * xWeight * (1 - yWeight) +
          srcData[idx01 + c] * (1 - xWeight) * yWeight +
          srcData[idx11 + c] * xWeight * yWeight;
        dstData[dstIdx + c] = Math.round(val);
      }
    }
  }
  return dstData;
}

export function preprocessResNet18(
  squareRgbaData: Uint8Array,
  size: number
): Float32Array {
  // 1. Resize to 256x256
  const resized = resizeBilinear(squareRgbaData, size, size, 256, 256);

  // 2. Center crop to 224x224
  const cropSize = 224;
  const startX = 16; // (256 - 224) / 2
  const startY = 16; // (256 - 224) / 2

  const tensorData = new Float32Array(3 * cropSize * cropSize);

  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  const channelSize = cropSize * cropSize;

  for (let y = 0; y < cropSize; y++) {
    const srcY = startY + y;
    for (let x = 0; x < cropSize; x++) {
      const srcX = startX + x;
      const srcIdx = (srcY * 256 + srcX) * 4;

      const r = resized[srcIdx] / 255.0;
      const g = resized[srcIdx + 1] / 255.0;
      const b = resized[srcIdx + 2] / 255.0;

      const rNorm = (r - mean[0]) / std[0];
      const gNorm = (g - mean[1]) / std[1];
      const bNorm = (b - mean[2]) / std[2];

      const destPixelIdx = y * cropSize + x;
      tensorData[destPixelIdx] = rNorm;                 // R channel
      tensorData[channelSize + destPixelIdx] = gNorm;     // G channel
      tensorData[2 * channelSize + destPixelIdx] = bNorm; // B channel
    }
  }

  return tensorData;
}
