/* eslint-disable import/namespace */
import '../inference/onnxSetup';
import * as ort from 'onnxruntime-react-native';
import { OnnxBackend } from '../inference/OnnxBackend';
import { Yolo26SegDecoder, YoloDetection } from './Yolo26SegDecoder';
import { resizeBilinear } from '../preprocessing/imagenet';

/**
 * Preprocesses an image for YOLO segmenter (resizing and NCHW format, divided by 255.0).
 */
export function preprocessYolo(
  rgbaData: Uint8Array,
  srcW: number,
  srcH: number,
  imgsz: number
): Float32Array {
  const resized = resizeBilinear(rgbaData, srcW, srcH, imgsz, imgsz);
  const tensorData = new Float32Array(3 * imgsz * imgsz);
  const channelSize = imgsz * imgsz;

  for (let y = 0; y < imgsz; y++) {
    for (let x = 0; x < imgsz; x++) {
      const srcIdx = (y * imgsz + x) * 4;
      const r = resized[srcIdx] / 255.0;
      const g = resized[srcIdx + 1] / 255.0;
      const b = resized[srcIdx + 2] / 255.0;

      const destIdx = y * imgsz + x;
      tensorData[destIdx] = r;                 // R Channel
      tensorData[channelSize + destIdx] = g;     // G Channel
      tensorData[2 * channelSize + destIdx] = b; // B Channel
    }
  }

  return tensorData;
}

/**
 * Runs instance segmentation on the input image using the YOLO26n-seg session.
 */
export async function segmentCacao(
  backend: OnnxBackend,
  rgbaData: Uint8Array,
  width: number,
  height: number,
  imgsz: number
): Promise<{ detections: YoloDetection[]; inferenceMs: number }> {
  const startTime = Date.now();

  // 1. Preprocess
  const preprocessedData = preprocessYolo(rgbaData, width, height, imgsz);

  // 2. Wrap into ONNX Tensor
  const inputTensor = new ort.Tensor('float32', preprocessedData, [1, 3, imgsz, imgsz]);

  // 3. Inference
  const outputs = await backend.run({ images: inputTensor });

  const output0Tensor = outputs.output0;
  const output1Tensor = outputs.output1;

  if (!output0Tensor || !output1Tensor) {
    throw new Error('SEGMENTATION_FAILED: Model output0 or output1 tensors were not found.');
  }

  const output0 = output0Tensor.data as Float32Array;
  const output1 = output1Tensor.data as Float32Array;

  // Retrieve prototype dimensions dynamically from the output1 shape
  // output1 shape is [batch, 32, maskHeight, maskWidth]
  const dims1 = output1Tensor.dims;
  const maskH = dims1[2];
  const maskW = dims1[3];

  // 4. Decode
  const detections = Yolo26SegDecoder.decode(
    output0,
    output1,
    maskW,
    maskH,
    imgsz,
    0.05
  );

  const inferenceMs = Date.now() - startTime;

  return {
    detections,
    inferenceMs,
  };
}
