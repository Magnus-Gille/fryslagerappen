module.exports = ({ config }) => {
  const webBaseUrl = process.env.EXPO_WEB_BASE_URL;

  return {
    ...config,
    experiments: {
      ...config.experiments,
      ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}),
    },
  };
};
