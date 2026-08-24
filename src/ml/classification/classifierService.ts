/* eslint-disable import/namespace */
import '../inference/onnxSetup';
import * as ort from 'onnxruntime-react-native';
import { OnnxBackend } from '../inference/OnnxBackend';
import { softmax } from './softmax';
import { ClassificationResult, CacaoClass, ClassProbability } from '../../types';

const CLASS_NAMES: CacaoClass[] = ['Fitoptora', 'Sana', 'Plaga_Chinche', 'Monilia'];
const DISPLAY_NAMES: Record<CacaoClass, string> = {
  Fitoptora: 'Fitóftora',
  Sana: 'Sana',
  Plaga_Chinche: 'Daño por chinche',
  Monilia: 'Moniliasis',
};

export async function classifyCacao(
  backend: OnnxBackend,
  preprocessedTensorData: Float32Array
): Promise<ClassificationResult> {
  const startTime = Date.now();

  // Create ONNX Tensor
  const inputTensor = new ort.Tensor('float32', preprocessedTensorData, [1, 3, 224, 224]);

  // Run model
  const outputs = await backend.run({ input: inputTensor });

  // Get logits output.
  // The output node name is 'logits' as per the model manifest.
  const logitsTensor = outputs.logits;
  if (!logitsTensor) {
    throw new Error('CLASSIFICATION_FAILED: Logits output was not found in ResNet18 execution.');
  }

  const logits = logitsTensor.data as Float32Array;

  // Apply Softmax
  const probabilities = softmax(logits);

  // Map probabilities to classes
  const classProbabilities: ClassProbability[] = CLASS_NAMES.map((className, index) => ({
    className,
    probability: probabilities[index],
  }));

  // Find class with highest probability
  let maxIdx = 0;
  let maxProb = -1;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      maxIdx = i;
    }
  }

  const predictedClass = CLASS_NAMES[maxIdx];
  const inferenceMs = Date.now() - startTime;

  return {
    classId: maxIdx,
    className: predictedClass,
    displayName: DISPLAY_NAMES[predictedClass],
    confidence: maxProb,
    probabilities: classProbabilities,
    inferenceMs,
  };
}
