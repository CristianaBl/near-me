// Metro config with assert polyfill to avoid Node core resolution errors
const { getDefaultConfig } = require("expo/metro-config");
const { resolve } = require("metro-resolver");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver = config.resolver || {};
const assertPolyfill = path.resolve(__dirname, "polyfills/assert.js");

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  assert: assertPolyfill,
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "assert") {
    return {
      type: "sourceFile",
      filePath: assertPolyfill,
    };
  }
  // Fallback to Metro's default resolver
  return resolve(context, moduleName, platform);
};

module.exports = config;
