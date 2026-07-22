module.exports = ({ config }) => {
  const webBaseUrl = process.env.EXPO_WEB_BASE_URL;
  const iosBuildNumber = process.env.EXPO_IOS_BUILD_NUMBER;

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(iosBuildNumber ? { buildNumber: iosBuildNumber } : {}),
    },
    experiments: {
      ...config.experiments,
      ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}),
    },
  };
};
