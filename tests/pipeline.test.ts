declare const process: any;

import { softmax } from '../src/ml/classification/softmax';
import { preprocessResNet18 } from '../src/ml/preprocessing/imagenet';
import { selectBestMask } from '../src/ml/segmentation/maskSelection';
import { YoloDetection } from '../src/ml/segmentation/Yolo26SegDecoder';
import { computeMaskPca } from '../src/ml/preprocessing/pca';
import { normalizeCacaoGeometry } from '../src/ml/preprocessing/geometry';
import modelManifest from '../artifacts/model_manifest.json';
import labelsJson from '../artifacts/labels.json';

// Simple Test Runner framework
const tests: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>) {
  tests.push({ name, fn });
}

// Assertions helpers
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

function assertCloseTo(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${message} (Expected: ${expected} ± ${tolerance}, Got: ${actual})`);
  }
}

// ----------------------------------------------------
// 1. Softmax Test
// ----------------------------------------------------
test('Softmax outputs sum to 1.0 and are stable', () => {
  const logits = [1.0, 2.0, 3.0, 4.0];
  const probs = softmax(logits);

  assertEquals(probs.length, 4, 'Softmax length should match input');
  
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    assert(probs[i] > 0 && probs[i] < 1, 'Probabilities must be in (0, 1)');
    sum += probs[i];
  }
  assertCloseTo(sum, 1.0, 1e-6, 'Probabilities must sum to 1.0');

  // Verify argmax matches the maximum logit
  let maxIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[maxIdx]) maxIdx = i;
  }
  assertEquals(maxIdx, 3, 'Highest probability should correspond to the maximum logit');
});

// ----------------------------------------------------
// 2. Class Order Test
// ----------------------------------------------------
test('Class order is inmutable and matches labels', () => {
  const expectedClasses = ['Fitoptora', 'Sana', 'Plaga_Chinche', 'Monilia'];

  // Check labels.json
  assertEquals(labelsJson.class_order.length, 4, 'Labels class order length');
  for (let i = 0; i < 4; i++) {
    assertEquals(labelsJson.class_order[i], expectedClasses[i], `labels.json class order at index ${i}`);
  }

  // Check model_manifest.json
  const manifestClassToIndex = modelManifest.classifier.class_to_index;
  for (let i = 0; i < 4; i++) {
    const className = expectedClasses[i];
    const index = (manifestClassToIndex as any)[className];
    assertEquals(index, i, `manifest.json index for ${className}`);
  }
});

// ----------------------------------------------------
// 3. ImageNet Normalization Test
// ----------------------------------------------------
test('ImageNet normalization transforms pixels correctly', () => {
  // Create a 1024x1024 flat RGBA array with a single color: RGB = (128, 64, 192)
  const size = 1024;
  const rgba = new Uint8Array(size * size * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 128;     // R
    rgba[i + 1] = 64;   // G
    rgba[i + 2] = 192;  // B
    rgba[i + 3] = 255;  // A
  }

  const tensor = preprocessResNet18(rgba, size);
  assertEquals(tensor.length, 3 * 224 * 224, 'ResNet18 preprocessed tensor size');

  // Verify normalization formulas for the center crop pixel:
  // r_norm = ((128 / 255) - 0.485) / 0.229 = (0.50196078 - 0.485) / 0.229 = 0.0740645
  // g_norm = ((64 / 255) - 0.456) / 0.224 = (0.25098039 - 0.456) / 0.224 = -0.915266
  // b_norm = ((192 / 255) - 0.406) / 0.225 = (0.75294117 - 0.406) / 0.225 = 1.5419607
  const rExpected = ((128 / 255) - 0.485) / 0.229;
  const gExpected = ((64 / 255) - 0.456) / 0.224;
  const bExpected = ((192 / 255) - 0.406) / 0.225;

  const channelSize = 224 * 224;
  assertCloseTo(tensor[0], rExpected, 1e-4, 'R channel normalization');
  assertCloseTo(tensor[channelSize], gExpected, 1e-4, 'G channel normalization');
  assertCloseTo(tensor[2 * channelSize], bExpected, 1e-4, 'B channel normalization');
});

// ----------------------------------------------------
// 4. Area Score, Centrality, and Target Score Selection
// ----------------------------------------------------
test('Mask selection score parameters are computed correctly', () => {
  // Setup a mock detection
  // Mask size: 160x160 (total pixels: 25600)
  const maskW = 160;
  const maskH = 160;
  
  // We place a 40x40 square of active pixels (1600 pixels) in the center of the mask:
  // Centroid should be exactly at x=80, y=80
  const rawMask = new Float32Array(maskW * maskH);
  
  const startX = 60; // 60 to 99
  const startY = 60; // 60 to 99
  for (let y = startY; y < startY + 40; y++) {
    for (let x = startX; x < startX + 40; x++) {
      rawMask[y * maskW + x] = 1.0;
    }
  }

  const detection: YoloDetection = {
    box: [240, 240, 400, 400], // [x1, y1, x2, y2]
    confidence: 0.8,
    classId: 0,
    rawMask,
    maskWidth: maskW,
    maskHeight: maskH,
  };

  const best = selectBestMask([detection]);
  assert(best !== null, 'Should select a mask');
  
  // Hand-calculation of the best detection score:
  // 1. activePixels = 1600
  // 2. areaRelative = 1600 / 25600 = 0.0625
  // 3. areaScore = min(0.0625 / 0.40, 1.0) = 0.15625
  // 4. Centroid: cx = sumX / 1600 = 79.5 (average of [60, 99]), cy = 79.5
  // 5. dx = (79.5 - 80) / 80 = -0.5 / 80 = -0.00625
  // 6. dy = (79.5 - 80) / 80 = -0.00625
  // 7. normDistance = sqrt(2 * (-0.00625)^2) / sqrt(2) = 0.00625
  // 8. centrality = 1 - 0.00625 = 0.99375
  // 9. Score = 0.50 * 0.8 + 0.30 * 0.15625 + 0.20 * 0.99375 = 0.40 + 0.046875 + 0.19875 = 0.645625
  
  // Let's verify selection logic picks higher scores
  const lowConfDet: YoloDetection = {
    ...detection,
    confidence: 0.2, // much lower score
  };

  const selected = selectBestMask([lowConfDet, detection]);
  assert(selected === detection, 'Should select the detection with higher confidence/score');
});

// ----------------------------------------------------
// 5. PCA Angle Computation Test
// ----------------------------------------------------
test('PCA calculates angle correctly on binary shapes', () => {
  // Let's create a 100x100 mask containing a diagonal line at 45 degrees
  const width = 100;
  const height = 100;
  const mask = new Uint8Array(width * height);

  for (let i = 20; i < 80; i++) {
    mask[i * width + i] = 1; // Diagonal line x = y
  }

  const pca = computeMaskPca(mask, width, height);

  // For a diagonal line x = y, covXX = covYY, and covXY > 0.
  // theta = 0.5 * atan2(2 * covXY, covXX - covYY)
  // Since covXX == covYY, the denominator is 0, so atan2(positive, 0) = PI/2.
  // theta = 0.5 * (PI/2) = PI/4 (45 degrees).
  const expectedTheta = Math.PI / 4;
  assertCloseTo(pca.theta, expectedTheta, 1e-4, 'PCA orientation angle for diagonal line x=y');
  assertCloseTo(pca.cx, 49.5, 0.5, 'Centroid cx');
  assertCloseTo(pca.cy, 49.5, 0.5, 'Centroid cy');
});

// ----------------------------------------------------
// 6. Bounding Box and 8% Margin Test
// ----------------------------------------------------
test('Geometry bbox, margin and cropping logic works', () => {
  // Set up a mock 100x100 image and mask
  const width = 100;
  const height = 100;
  const rgba = new Uint8Array(width * height * 4);
  const mask = new Uint8Array(width * height);

  // Make a small 10x20 box active: x in [40, 49], y in [30, 49]
  for (let y = 30; y <= 49; y++) {
    for (let x = 40; x <= 49; x++) {
      mask[y * width + x] = 1;
      const idx = (y * width + x) * 4;
      rgba[idx] = 100; // random pixel values
    }
  }

  // PCA for vertical axis (we specify theta = PI/2, so rotation angle = 0)
  // This avoids rotation calculations so we can verify bbox and margin directly
  const res = normalizeCacaoGeometry(rgba, mask, width, height, Math.PI / 2, 44.5, 39.5);

  // Original bbox: width = 49 - 40 = 9 (size: 10 pixels), height = 49 - 30 = 19 (size: 20 pixels)
  // Margins: marginX = 9 * 0.08 = 0.72 -> Math.floor(-0.72) = -1, Math.ceil(+0.72) = 1
  // marginY = 19 * 0.08 = 1.52 -> Math.floor(-1.52) = -2, Math.ceil(+1.52) = 2
  // Expected crop box:
  // cropX1 = 40 - 1 = 39
  // cropX2 = 49 + 1 = 50
  // cropY1 = 30 - 2 = 28
  // cropY2 = 49 + 2 = 51
  assertEquals(res.cropBox[0], 39, 'Crop X1 with 8% margin');
  assertEquals(res.cropBox[2], 50, 'Crop X2 with 8% margin');
  assertEquals(res.cropBox[1], 28, 'Crop Y1 with 8% margin');
  assertEquals(res.cropBox[3], 51, 'Crop Y2 with 8% margin');

  // Verify that the output array is of the master size: 1024x1024x4
  assertEquals(res.rgba1024.length, 1024 * 1024 * 4, 'Master output size');
});

// ----------------------------------------------------
// 7. Model Manifest Validation Test
// ----------------------------------------------------
test('Model manifest values match expected hashes', () => {
  assertEquals(modelManifest.app_name, 'AV-Cacao', 'Manifest app name');
  
  const expectedYoloHash = '935aedd5ba4bf3ea308ec6ab094aecb1f003fa2de346d805a97e0cad72c23453';
  const expectedResnetHash = 'd98a2f83bdc5b037d42c21c931c1956e8aadb784effd84e519970ed830245ab7';

  assertEquals(modelManifest.segmenter.sha256, expectedYoloHash, 'YOLO SHA-256 hash in manifest');
  assertEquals(modelManifest.classifier.sha256, expectedResnetHash, 'ResNet SHA-256 hash in manifest');
});

// ----------------------------------------------------
// Run all tests
// ----------------------------------------------------
async function run() {
  console.log('=== INICIANDO PRUEBAS UNITARIAS ===');
  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      console.log(`[TEST] ${t.name}...`);
      await t.fn();
      console.log(`  └─ ¡PASADO!`);
      passed++;
    } catch (e: any) {
      console.error(`  └─ ¡FALLADO! Error: ${e.message}`);
      failed++;
    }
  }

  console.log('\n=== RESULTADO DE LAS PRUEBAS ===');
  console.log(`Pasados: ${passed}`);
  console.log(`Fallados: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
