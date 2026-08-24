export interface YoloDetection {
  box: [number, number, number, number]; // [x1, y1, x2, y2] in input image coordinates
  confidence: number;
  classId: number;
  rawMask: Float32Array; // dimensions [maskHeight, maskWidth], values in [0, 1]
  maskWidth: number;
  maskHeight: number;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export class Yolo26SegDecoder {
  /**
   * Decodes the YOLO26n-seg output tensors.
   * 
   * @param output0 Data from output0, shape [1, 300, 38]
   * @param output1 Data from output1, shape [1, 32, maskHeight, maskWidth]
   * @param maskWidth Width of prototype masks (160 for imgsz=640, 256 for imgsz=1024)
   * @param maskHeight Height of prototype masks
   * @param imgsz Input image resolution (640 or 1024)
   * @param confThreshold Confidence threshold (default 0.05)
   */
  static decode(
    output0: Float32Array | number[],
    output1: Float32Array | number[],
    maskWidth: number,
    maskHeight: number,
    imgsz: number,
    confThreshold: number = 0.05
  ): YoloDetection[] {
    const detections: YoloDetection[] = [];
    const numDetections = 300;
    const numFeatures = 38;

    const out0 = Array.isArray(output0) ? new Float32Array(output0) : output0;
    const out1 = Array.isArray(output1) ? new Float32Array(output1) : output1;

    // Loop through 300 candidates
    for (let i = 0; i < numDetections; i++) {
      const offset = i * numFeatures;
      const confidence = out0[offset + 4];

      if (confidence < confThreshold) {
        continue;
      }

      const x1 = out0[offset + 0];
      const y1 = out0[offset + 1];
      const x2 = out0[offset + 2];
      const y2 = out0[offset + 3];
      const classId = Math.round(out0[offset + 5]);

      // Extract coefficients: indices 6 to 37 (length 32)
      const coeffs = new Float32Array(32);
      for (let c = 0; c < 32; c++) {
        coeffs[c] = out0[offset + 6 + c];
      }

      // Reconstruct mask
      const rawMask = this.reconstructMask(
        coeffs,
        out1,
        maskWidth,
        maskHeight,
        [x1, y1, x2, y2],
        imgsz
      );

      detections.push({
        box: [x1, y1, x2, y2],
        confidence,
        classId,
        rawMask,
        maskWidth,
        maskHeight,
      });
    }

    return detections;
  }

  private static reconstructMask(
    coeffs: Float32Array,
    protos: Float32Array,
    maskW: number,
    maskH: number,
    box: [number, number, number, number],
    imgsz: number
  ): Float32Array {
    const mask = new Float32Array(maskW * maskH);

    // Linear combination and sigmoid
    for (let y = 0; y < maskH; y++) {
      for (let x = 0; x < maskW; x++) {
        let sum = 0;
        // Dot product of coefficients and prototype masks
        for (let c = 0; c < 32; c++) {
          // protos is shape [32, maskH, maskW]
          const protoIdx = c * (maskH * maskW) + y * maskW + x;
          sum += coeffs[c] * protos[protoIdx];
        }
        mask[y * maskW + x] = sigmoid(sum);
      }
    }

    // Crop mask by the bounding box scaled to mask resolution
    const scaleX = maskW / imgsz;
    const scaleY = maskH / imgsz;

    const mx1 = Math.max(0, Math.floor(box[0] * scaleX));
    const my1 = Math.max(0, Math.floor(box[1] * scaleY));
    const mx2 = Math.min(maskW - 1, Math.ceil(box[2] * scaleX));
    const my2 = Math.min(maskH - 1, Math.ceil(box[3] * scaleY));

    // Zero out pixels outside the bounding box
    for (let y = 0; y < maskH; y++) {
      for (let x = 0; x < maskW; x++) {
        if (x < mx1 || x > mx2 || y < my1 || y > my2) {
          mask[y * maskW + x] = 0;
        }
      }
    }

    return mask;
  }
}
