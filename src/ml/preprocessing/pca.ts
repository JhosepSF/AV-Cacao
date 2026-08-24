export interface PcaResult {
  theta: number; // Principal orientation angle in radians
  cx: number;    // Centroid X coordinate
  cy: number;    // Centroid Y coordinate
}

/**
 * Computes the principal orientation angle and centroid of a binary mask
 * using 2D image moments / covariance PCA.
 * 
 * @param mask 1D flat Uint8Array where values > 0 indicate mask pixels
 * @param width Width of the mask image
 * @param height Height of the mask image
 */
export function computeMaskPca(
  mask: Uint8Array,
  width: number,
  height: number
): PcaResult {
  let N = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      if (mask[rowOffset + x] > 0) {
        N++;
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumYY += y * y;
        sumXY += x * y;
      }
    }
  }

  if (N === 0) {
    throw new Error('PREPROCESSING_FAILED: Cannot calculate PCA on an empty mask.');
  }

  const cx = sumX / N;
  const cy = sumY / N;

  const covXX = (sumXX / N) - (cx * cx);
  const covYY = (sumYY / N) - (cy * cy);
  const covXY = (sumXY / N) - (cx * cy);

  // Moments orientation angle theta
  const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);

  return { theta, cx, cy };
}
