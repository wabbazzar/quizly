const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to run on port 8081
config.server = {
  ...config.server,
  port: 8081
};

module.exports = config;