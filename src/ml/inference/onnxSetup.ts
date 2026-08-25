if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = require('buffer/index.js').Buffer;
}

const rn = require('react-native');

// Check if Onnxruntime is already defined in NativeModules (e.g. in development build)
if (!rn.NativeModules.Onnxruntime) {
  console.warn(
    '[Onnxruntime Setup] Onnxruntime native module is not available in this environment. ' +
    'Creating a prototype-delegating mock wrapper for NativeModules and global OrtApi to prevent startup crashes.'
  );

  // 1. Create a plain object that delegates to the original NativeModules proxy
  const mockNativeModules = Object.create(rn.NativeModules);

  // Add the mock Onnxruntime to our wrapper object
  mockNativeModules.Onnxruntime = {
    install: () => {
      console.warn('[Onnxruntime Setup] Onnxruntime.install() mock was invoked.');
    },
  };

  // Redefine NativeModules on the react-native exports object to point to our wrapper
  Object.defineProperty(rn, 'NativeModules', {
    value: mockNativeModules,
    configurable: true,
    enumerable: true,
    writable: true,
  });

  // 2. Define a mock global OrtApi object to prevent the library from crashing when accessing top-level exports
  (globalThis as any).OrtApi = {
    listSupportedBackends: () => ['cpu'],
    initOrtOnce: () => {},
    createInferenceSession: () => {
      throw new Error(
        'ONNX Runtime native module was not found. ' +
        'Inference is disabled in this environment (e.g. Expo Go or Web).'
      );
    },
  };
  (globalThis as any).OrtApiIsMock = true;
} else {
  console.log('[Onnxruntime Setup] ONNX Runtime Native Module is AVAILABLE in this binary.');
}
