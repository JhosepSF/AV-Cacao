export type CacaoClass =
  | 'Fitoptora'
  | 'Sana'
  | 'Plaga_Chinche'
  | 'Monilia';

export interface ClassProbability {
  className: CacaoClass;
  probability: number;
}

export interface SegmentationResult {
  detected: boolean;
  confidence?: number;
  box?: [number, number, number, number]; // [x1, y1, x2, y2]
  mask?: Uint8Array; // 1D flat binary mask corresponding to the output image size
  maskWidth?: number;
  maskHeight?: number;
  inferenceSize: 640 | 1024;
  inferenceMs: number;
}

export interface ClassificationResult {
  classId: number;
  className: CacaoClass;
  displayName: string;
  confidence: number;
  probabilities: ClassProbability[];
  inferenceMs: number;
}

export interface PipelineResult {
  segmentation: SegmentationResult;
  classification?: ClassificationResult;
  totalMs: number;
  preprocessingMs?: number;
  postprocessingMs?: number;
  classificationMs?: number;
  preprocessedImageUri?: string;
  originalImageUri: string;
  error?: string;
}

export interface ModelLoaderState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

export interface HistoryItem {
  id: string;
  date: string;
  originalImageUri: string;
  preprocessedImageUri?: string;
  predictedClass: CacaoClass;
  confidence: number;
  probabilities: ClassProbability[];
  totalInferenceMs: number;
}
