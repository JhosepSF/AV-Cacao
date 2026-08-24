export interface InferenceBackend {
  load(localPath: string): Promise<void>;
  run(inputs: Record<string, any>): Promise<Record<string, any>>;
  release(): void;
}
