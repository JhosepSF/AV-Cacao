const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .onnx to assetExts so Metro bundles it as an asset instead of trying to resolve it as code
config.resolver.assetExts.push('onnx');

module.exports = config;
