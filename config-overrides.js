const { removeModuleScopePlugin } = require("customize-cra");
const dotenv = require("dotenv");
const webpack = require("webpack");

module.exports = function override(config, env) {
  if (!config.plugins) {
    config.plugins = [];
  }
  removeModuleScopePlugin()(config);

  // Load environment variables from .env file
  const envVariables = dotenv.config().parsed;

  // Define environment variables to be passed to DefinePlugin
  const envKeys = Object.keys(envVariables).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(envVariables[next]);
    return prev;
  }, {});

  // Add DefinePlugin to inject environment variables
  config.plugins.push(new webpack.DefinePlugin(envKeys));

  return config;
};
