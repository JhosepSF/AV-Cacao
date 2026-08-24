import { YoloDetection } from './Yolo26SegDecoder';

/**
 * Selects the principal cacao pod mask using the score formula:
 * score = 0.50 * confidence + 0.30 * area_score + 0.20 * centrality
 */
export function selectBestMask(detections: YoloDetection[]): YoloDetection | null {
  if (detections.length === 0) return null;

  let bestDetection: YoloDetection | null = null;
  let bestScore = -1;

  for (const det of detections) {
    const maskW = det.maskWidth;
    const maskH = det.maskHeight;

    let activePixels = 0;
    let sumX = 0;
    let sumY = 0;

    // Process mask to compute area and centroid
    for (let y = 0; y < maskH; y++) {
      for (let x = 0; x < maskW; x++) {
        const val = det.rawMask[y * maskW + x];
        if (val >= 0.5) {
          activePixels++;
          sumX += x;
          sumY += y;
        }
      }
    }

    if (activePixels === 0) {
      continue;
    }

    // 1. Area relative to image size and area_score
    const totalPixels = maskW * maskH;
    const areaRelative = activePixels / totalPixels;
    const areaScore = Math.min(areaRelative / 0.40, 1.0);

    // 2. Centroid of the mask
    const cx = sumX / activePixels;
    const cy = sumY / activePixels;

    // 3. Centrality
    const midX = maskW / 2;
    const midY = maskH / 2;
    const dx = (cx - midX) / midX;
    const dy = (cy - midY) / midY;
    
    // Normalized distance to the center (range [0, 1])
    const normalizedDistance = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(2);
    const centrality = 1 - Math.min(normalizedDistance, 1.0);

    // 4. Final score
    const score = 0.50 * det.confidence + 0.30 * areaScore + 0.20 * centrality;

    if (score > bestScore) {
      bestScore = score;
      bestDetection = det;
    }
  }

  return bestDetection;
}
