/* eslint-disable @typescript-eslint/no-require-imports */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { OnnxBackend } from './OnnxBackend';
import { sha256, decodeBase64 } from '../../utils/sha256';
import { ModelLoaderState } from '../../types';

// Expected SHA-256 hashes of the model files
const YOLO_SHA256 = '935aedd5ba4bf3ea308ec6ab094aecb1f003fa2de346d805a97e0cad72c23453';
const RESNET_SHA256 = 'd98a2f83bdc5b037d42c21c931c1956e8aadb784effd84e519970ed830245ab7';

// Expected model file sizes in bytes
const YOLO_SIZE = 11415823;
const RESNET_SIZE = 44704765;

export class ModelLoader {
  private static instance: ModelLoader | null = null;

  private yoloBackend: OnnxBackend | null = null;
  private resnetBackend: OnnxBackend | null = null;
  private state: ModelLoaderState = { status: 'idle' };
  private listeners: ((state: ModelLoaderState) => void)[] = [];

  private constructor() {
    this.yoloBackend = new OnnxBackend('YOLO26n-seg');
    this.resnetBackend = new OnnxBackend('ResNet18');
  }

  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  getState(): ModelLoaderState {
    return this.state;
  }

  subscribe(listener: (state: ModelLoaderState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateState(newState: Partial<ModelLoaderState>) {
    this.state = { ...this.state, ...newState } as ModelLoaderState;
    this.listeners.forEach((l) => l(this.state));
  }

  getYoloBackend(): OnnxBackend {
    if (!this.yoloBackend) throw new Error('YOLO backend not initialized');
    return this.yoloBackend;
  }

  getResnetBackend(): OnnxBackend {
    if (!this.resnetBackend) throw new Error('ResNet backend not initialized');
    return this.resnetBackend;
  }

  async loadModels(forceIntegrityCheck: boolean = false): Promise<void> {
    if ((globalThis as any).OrtApiIsMock) {
      console.warn('[ModelLoader] ONNX Runtime native module is mocked. Skipping model loading.');
      this.updateState({ status: 'error', error: 'ONNX_RUNTIME_NOT_AVAILABLE: ONNX Runtime native module was not found. Inference is disabled in this environment (e.g. Expo Go or Web).' });
      return;
    }

    if (this.state.status === 'ready' && !forceIntegrityCheck) {
      return;
    }

    if (this.state.status === 'loading') {
      return new Promise<void>((resolve, reject) => {
        const unsubscribe = this.subscribe((state) => {
          if (state.status === 'ready') {
            unsubscribe();
            resolve();
          } else if (state.status === 'error') {
            unsubscribe();
            reject(new Error(state.error));
          }
        });
      });
    }

    this.updateState({ status: 'loading', progress: 0 });

    try {
      this.updateState({ progress: 10 });

      const yoloDestPath = `${FileSystem.documentDirectory}cacao_yolo26n_seg.onnx`;
      const resnetDestPath = `${FileSystem.documentDirectory}resnet18_cacao.onnx`;

      let yoloLocalUri = yoloDestPath;
      let resnetLocalUri = resnetDestPath;

      // 1. Resolve YOLO model
      const yoloFileInfo = await FileSystem.getInfoAsync(yoloDestPath);
      let yoloValid = false;
      if (yoloFileInfo.exists) {
        if (forceIntegrityCheck) {
          console.log('[ModelLoader] YOLO model exists in sandbox. Verifying checksum (forced)...');
          yoloValid = await this.verifySha256(yoloDestPath, YOLO_SHA256, 'YOLO26n-seg');
        } else if ((yoloFileInfo as any).size === YOLO_SIZE) {
          yoloValid = true;
          console.log('[ModelLoader] YOLO model verified locally in sandbox (by size).');
        } else {
          console.warn(`[ModelLoader] YOLO model size mismatch: expected ${YOLO_SIZE}, got ${(yoloFileInfo as any).size}`);
        }
      }

      if (yoloValid) {
        console.log('[ModelLoader] YOLO model verified locally in sandbox.');
      } else {
        console.log('[ModelLoader] YOLO model not found or invalid in sandbox. Downloading from module...');
        const yoloAsset = Asset.fromModule(require('../../../assets/models/cacao_yolo26n_seg.onnx'));
        await yoloAsset.downloadAsync();
        yoloLocalUri = await this.ensureLocalFile(yoloAsset, 'cacao_yolo26n_seg.onnx');
        // Validate downloaded file
        const checkFileInfo = await FileSystem.getInfoAsync(yoloLocalUri);
        if (!checkFileInfo.exists || (checkFileInfo as any).size !== YOLO_SIZE) {
          throw new Error(`YOLO model verification failed after download: expected size ${YOLO_SIZE}, got ${(checkFileInfo as any).size || 0}`);
        }
      }

      this.updateState({ progress: 40 });

      // 2. Resolve ResNet model
      const resnetFileInfo = await FileSystem.getInfoAsync(resnetDestPath);
      let resnetValid = false;
      if (resnetFileInfo.exists) {
        if (forceIntegrityCheck) {
          console.log('[ModelLoader] ResNet model exists in sandbox. Verifying checksum (forced)...');
          resnetValid = await this.verifySha256(resnetDestPath, RESNET_SHA256, 'ResNet18');
        } else if ((resnetFileInfo as any).size === RESNET_SIZE) {
          resnetValid = true;
          console.log('[ModelLoader] ResNet model verified locally in sandbox (by size).');
        } else {
          console.warn(`[ModelLoader] ResNet model size mismatch: expected ${RESNET_SIZE}, got ${(resnetFileInfo as any).size}`);
        }
      }

      if (resnetValid) {
        console.log('[ModelLoader] ResNet model verified locally in sandbox.');
      } else {
        console.log('[ModelLoader] ResNet model not found or invalid in sandbox. Downloading from module...');
        const resnetAsset = Asset.fromModule(require('../../../assets/models/resnet18_cacao.onnx'));
        await resnetAsset.downloadAsync();
        resnetLocalUri = await this.ensureLocalFile(resnetAsset, 'resnet18_cacao.onnx');
        // Validate downloaded file
        const checkFileInfo = await FileSystem.getInfoAsync(resnetLocalUri);
        if (!checkFileInfo.exists || (checkFileInfo as any).size !== RESNET_SIZE) {
          throw new Error(`ResNet model verification failed after download: expected size ${RESNET_SIZE}, got ${(checkFileInfo as any).size || 0}`);
        }
      }

      this.updateState({ progress: 80 });

      // Verify integrity (SHA-256) ONLY when explicitly forced (e.g. from the About screen)
      if (forceIntegrityCheck) {
        this.updateState({ progress: 85 });
        console.log('[ModelLoader] Running explicit SHA-256 integrity verification...');
        const yoloOk = await this.verifySha256(yoloLocalUri, YOLO_SHA256, 'YOLO26n-seg');
        const resnetOk = await this.verifySha256(resnetLocalUri, RESNET_SHA256, 'ResNet18');
        if (!yoloOk || !resnetOk) {
          throw new Error('Local files SHA-256 integrity verification failed.');
        }
      }

      this.updateState({ progress: 90 });
      // Initialize sessions in the background
      await this.yoloBackend!.load(yoloLocalUri);

      this.updateState({ progress: 95 });
      await this.resnetBackend!.load(resnetLocalUri);

      this.updateState({ status: 'ready', progress: 100 });
      console.log('[ModelLoader] All models loaded successfully.');
    } catch (e) {
      console.error('[ModelLoader] Failed loading models:', e);
      const errMsg = e instanceof Error ? e.message : String(e);
      this.updateState({ status: 'error', error: errMsg });
      throw e;
    }
  }

  private async ensureLocalFile(asset: Asset, filename: string): Promise<string> {
    const localUri = asset.localUri || asset.uri;
    const destPath = `${FileSystem.documentDirectory}${filename}`;

    if (!localUri) {
      throw new Error(`Asset URI for ${filename} is not resolved.`);
    }

    // Copy remote or asset URI to application document directory
    if (
      localUri.startsWith('http') ||
      localUri.startsWith('assets') ||
      !localUri.startsWith('file://')
    ) {
      const fileInfo = await FileSystem.getInfoAsync(destPath);
      if (!fileInfo.exists) {
        console.log(`[ModelLoader] Copying ${filename} to document sandbox...`);
        await FileSystem.copyAsync({ from: localUri, to: destPath });
      }
      return destPath;
    }

    // Local file path
    const fileInfo = await FileSystem.getInfoAsync(destPath);
    if (!fileInfo.exists) {
      console.log(`[ModelLoader] Copying ${filename} to local sandbox from ${localUri}...`);
      await FileSystem.copyAsync({ from: localUri, to: destPath });
    }
    return destPath;
  }

  private async verifySha256(fileUri: string, expectedHash: string, label: string): Promise<boolean> {
    try {
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryData = decodeBase64(base64Data);
      const calculatedHash = sha256(binaryData);
      console.log(`[ModelLoader] ${label} SHA-256: ${calculatedHash}`);
      return calculatedHash === expectedHash;
    } catch (e) {
      console.error(`[ModelLoader] Failed verification for ${label}:`, e);
      return false;
    }
  }
}
export default ModelLoader;
