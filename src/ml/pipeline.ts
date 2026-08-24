import { ModelLoader } from './inference/ModelLoader';
import { loadAndProcessImage } from './preprocessing/exif';
import { segmentCacao } from './segmentation/segmentationService';
import { selectBestMask } from './segmentation/maskSelection';
import { computeMaskPca } from './preprocessing/pca';
import { normalizeCacaoGeometry } from './preprocessing/geometry';
import { preprocessResNet18 } from './preprocessing/imagenet';
import { classifyCacao } from './classification/classifierService';
import { PipelineResult, SegmentationResult } from '../types';
import { YoloDetection } from './segmentation/Yolo26SegDecoder';
import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';
import { encodeBase64 } from '../utils/sha256';

/**
 * Upscales the raw probability float mask to the destination resolution,
 * applying bilinear interpolation and thresholding at 0.5.
 */
function upscaleMask(
  floatMask: Float32Array,
  maskW: number,
  maskH: number,
  dstW: number,
  dstH: number
): Uint8Array {
  const dstMask = new Uint8Array(dstW * dstH);
  const xRatio = maskW / dstW;
  const yRatio = maskH / dstH;

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const yLow = Math.floor(srcY);
    const yHigh = Math.min(maskH - 1, yLow + 1);
    const yWeight = srcY - yLow;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const xLow = Math.floor(srcX);
      const xHigh = Math.min(maskW - 1, xLow + 1);
      const xWeight = srcX - xLow;

      const val =
        floatMask[yLow * maskW + xLow] * (1 - xWeight) * (1 - yWeight) +
        floatMask[yLow * maskW + xHigh] * xWeight * (1 - yWeight) +
        floatMask[yHigh * maskW + xLow] * (1 - xWeight) * yWeight +
        floatMask[yHigh * maskW + xHigh] * xWeight * yWeight;

      dstMask[y * dstW + x] = val >= 0.5 ? 1 : 0;
    }
  }
  return dstMask;
}

/**
 * Runs the full offline inference pipeline for a cacao pod image.
 * 
 * @param imageUri URI of the image (camera capture or gallery pick)
 * @param onProgress Callback to notify UI of the current stage
 */
export async function runCacaoPipeline(
  imageUri: string,
  onProgress: (stage: string) => void
): Promise<PipelineResult> {
  const totalStartTime = Date.now();
  let preprocessingMs = 0;
  let segmentationMs = 0;
  let postprocessingMs = 0;
  let classificationMs = 0;

  // If ONNX Runtime native module is mocked (e.g. running in Expo Go/Web),
  // return a beautiful mock response to enable testing the full UI flow
  if ((globalThis as any).OrtApiIsMock) {
    console.log('[pipeline] ONNX Runtime is mocked. Generating mock inference pipeline results for UI testing...');
    
    onProgress('Preparando imagen...');
    const t0 = Date.now();
    const processedImg = await loadAndProcessImage(imageUri);
    const preprocessingTime = Date.now() - t0;

    onProgress('Detectando mazorca (640)...');
    await new Promise(resolve => setTimeout(resolve, 500)); // simulate detection delay
    
    onProgress('Segmentando...');
    await new Promise(resolve => setTimeout(resolve, 300)); // simulate segmentation delay
    
    // Draw a mock elliptical mask in the center
    const mask = new Uint8Array(processedImg.width * processedImg.height);
    const cx = processedImg.width / 2;
    const cy = processedImg.height / 2;
    const rx = processedImg.width / 4;
    const ry = processedImg.height / 3;
    for (let y = 0; y < processedImg.height; y++) {
      for (let x = 0; x < processedImg.width; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          mask[y * processedImg.width + x] = 1;
        }
      }
    }

    onProgress('Normalizando imagen...');
    await new Promise(resolve => setTimeout(resolve, 250)); // simulate normalization delay

    onProgress('Clasificando...');
    await new Promise(resolve => setTimeout(resolve, 400)); // simulate classification delay

    const totalMs = Date.now() - totalStartTime;

    return {
      segmentation: {
        detected: true,
        confidence: 0.92,
        box: [
          Math.floor(processedImg.width * 0.25),
          Math.floor(processedImg.height * 0.15),
          Math.floor(processedImg.width * 0.75),
          Math.floor(processedImg.height * 0.85)
        ] as [number, number, number, number],
        mask,
        maskWidth: processedImg.width,
        maskHeight: processedImg.height,
        inferenceSize: 640,
        inferenceMs: 120,
      },
      classification: {
        classId: 1,
        className: 'Sana',
        displayName: 'Sana',
        confidence: 0.945,
        probabilities: [
          { className: 'Fitoptora', probability: 0.02 },
          { className: 'Sana', probability: 0.945 },
          { className: 'Plaga_Chinche', probability: 0.015 },
          { className: 'Monilia', probability: 0.02 },
        ],
        inferenceMs: 45,
      },
      totalMs,
      preprocessingMs: preprocessingTime,
      postprocessingMs: 300,
      classificationMs: 45,
      preprocessedImageUri: processedImg.uri, // Use processed image for mock display
      originalImageUri: processedImg.uri,
    };
  }

  try {
    const modelLoader = ModelLoader.getInstance();
    
    // 0. Ensure models are loaded
    if (modelLoader.getState().status !== 'ready') {
      onProgress('Cargando modelos...');
      await modelLoader.loadModels();
    }

    // 1. Image loading and EXIF correction
    onProgress('Preparando imagen...');
    const t0 = Date.now();
    const processedImg = await loadAndProcessImage(imageUri);
    preprocessingMs += Date.now() - t0;

    const yoloBackend = modelLoader.getYoloBackend();
    let detections: YoloDetection[] = [];
    let yoloInferenceSize: 640 | 1024 = 640;

    // 2. Run YOLO segmentation (640x640)
    onProgress('Detectando mazorca (640)...');
    const seg640Res = await segmentCacao(
      yoloBackend,
      processedImg.rgba,
      processedImg.width,
      processedImg.height,
      640
    );
    segmentationMs += seg640Res.inferenceMs;
    detections = seg640Res.detections;

    // 3. Fallback to 1024x1024 if no detection
    if (detections.length === 0) {
      console.log('[pipeline] No cacao detected at 640. Trying fallback at 1024...');
      onProgress('Detectando mazorca (1024)...');
      yoloInferenceSize = 1024;
      const seg1024Res = await segmentCacao(
        yoloBackend,
        processedImg.rgba,
        processedImg.width,
        processedImg.height,
        1024
      );
      segmentationMs += seg1024Res.inferenceMs;
      detections = seg1024Res.detections;
    }

    const tPost0 = Date.now();

    // 4. Handle failed detection
    if (detections.length === 0) {
      postprocessingMs += Date.now() - tPost0;
      const totalMs = Date.now() - totalStartTime;
      const segResult: SegmentationResult = {
        detected: false,
        inferenceSize: yoloInferenceSize,
        inferenceMs: segmentationMs,
      };
      return {
        segmentation: segResult,
        totalMs,
        originalImageUri: processedImg.uri,
        error: 'No se pudo detectar una mazorca de cacao con suficiente confianza. Intenta tomar otra fotografía procurando que la mazorca sea claramente visible.',
      };
    }

    // 5. Select best mask
    onProgress('Segmentando...');
    const bestDet = selectBestMask(detections);
    if (!bestDet) {
      postprocessingMs += Date.now() - tPost0;
      const totalMs = Date.now() - totalStartTime;
      return {
        segmentation: {
          detected: false,
          inferenceSize: yoloInferenceSize,
          inferenceMs: segmentationMs,
        },
        totalMs,
        originalImageUri: processedImg.uri,
        error: 'No se pudo seleccionar una máscara confiable de cacao.',
      };
    }

    // 6. Upscale mask to original dimensions
    const upscaledMask = upscaleMask(
      bestDet.rawMask,
      bestDet.maskWidth,
      bestDet.maskHeight,
      processedImg.width,
      processedImg.height
    );

    // 7. Calculate orientation via PCA
    onProgress('Normalizando imagen...');
    const pcaRes = computeMaskPca(upscaledMask, processedImg.width, processedImg.height);
    postprocessingMs += Date.now() - tPost0;

    // 8. Geometric normalization (rotate, crop, padding, resize)
    const tGeom = Date.now();
    const geomResult = normalizeCacaoGeometry(
      processedImg.rgba,
      upscaledMask,
      processedImg.width,
      processedImg.height,
      pcaRes.theta,
      pcaRes.cx,
      pcaRes.cy
    );
    preprocessingMs += Date.now() - tGeom;

    // 9. Save preprocessed representation to file
    const tSave = Date.now();
    const jpegEncoded = jpeg.encode({
      width: 1024,
      height: 1024,
      data: geomResult.rgba1024,
    }, 90);
    const preprocessedUri = `${FileSystem.cacheDirectory}cacao_preprocessed_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(
      preprocessedUri,
      encodeBase64(jpegEncoded.data),
      { encoding: FileSystem.EncodingType.Base64 }
    );
    preprocessingMs += Date.now() - tSave;

    // 10. Classify using ResNet18
    onProgress('Clasificando...');
    const resnetInput = preprocessResNet18(geomResult.rgba1024, 1024);

    const resnetBackend = modelLoader.getResnetBackend();
    const classificationResult = await classifyCacao(resnetBackend, resnetInput);
    classificationMs = classificationResult.inferenceMs;

    const totalMs = Date.now() - totalStartTime;

    const segmentationResult: SegmentationResult = {
      detected: true,
      confidence: bestDet.confidence,
      box: bestDet.box,
      mask: upscaledMask,
      maskWidth: processedImg.width,
      maskHeight: processedImg.height,
      inferenceSize: yoloInferenceSize,
      inferenceMs: segmentationMs,
    };

    return {
      segmentation: segmentationResult,
      classification: classificationResult,
      totalMs,
      preprocessingMs,
      postprocessingMs,
      classificationMs,
      preprocessedImageUri: preprocessedUri,
      originalImageUri: processedImg.uri,
    };
  } catch (error) {
    console.error('[pipeline] Pipeline error:', error);
    const totalMs = Date.now() - totalStartTime;
    throw {
      segmentation: {
        detected: false,
        inferenceSize: 640,
        inferenceMs: segmentationMs,
      },
      totalMs,
      preprocessingMs,
      postprocessingMs,
      classificationMs,
      originalImageUri: imageUri,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
export default runCacaoPipeline;
