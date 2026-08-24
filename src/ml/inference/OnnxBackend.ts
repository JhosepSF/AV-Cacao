/* eslint-disable import/namespace */
import './onnxSetup';
import * as ort from 'onnxruntime-react-native';
import { InferenceBackend } from './InferenceBackend';

export class OnnxBackend implements InferenceBackend {
  private session: ort.InferenceSession | null = null;
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
  }

  async load(localPath: string): Promise<void> {
    if (this.session) return;
    try {
      console.log(`[OnnxBackend] Loading session for ${this.modelName} from ${localPath}...`);
      
      // Check if OrtApi is initialized in the global scope
      if (typeof (globalThis as any).OrtApi !== 'undefined') {
        console.log(`[OnnxBackend] OrtApi is initialized successfully on globalThis. ready to create session for ${this.modelName}.`);
      } else {
        console.warn(`[OnnxBackend] WARNING: OrtApi is undefined. Session creation for ${this.modelName} may fail if native module is not present.`);
      }

      this.session = await ort.InferenceSession.create(localPath);
      console.log(`[OnnxBackend] Session loaded successfully for ${this.modelName}`);
    } catch (e) {
      console.error(`[OnnxBackend] Error loading model ${this.modelName}:`, e);
      throw new Error(`MODEL_LOAD_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async run(inputs: Record<string, any>): Promise<Record<string, any>> {
    if (!this.session) {
      throw new Error(`MODEL_NOT_FOUND: Session for ${this.modelName} is not loaded`);
    }
    try {
      const onnxInputs: Record<string, ort.Tensor> = {};
      for (const key of Object.keys(inputs)) {
        const val = inputs[key];
        if (val instanceof ort.Tensor) {
          onnxInputs[key] = val;
        } else {
          // If it's a descriptor, create a new Tensor
          onnxInputs[key] = new ort.Tensor(val.type, val.data, val.dims);
        }
      }
      const outputs = await this.session.run(onnxInputs);
      return outputs;
    } catch (e) {
      console.error(`[OnnxBackend] Inference error for ${this.modelName}:`, e);
      throw new Error(`INFERENCE_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  release(): void {
    this.session = null;
    console.log(`[OnnxBackend] Session released for ${this.modelName}`);
  }
}
