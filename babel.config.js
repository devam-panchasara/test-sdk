module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["@ruttl/mobile-sdk/babel-plugin-ruttl-targets"],
  };
};
