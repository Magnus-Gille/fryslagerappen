const config = require('../app.json');
const resolveConfig = require('../app.config');

describe('Expo app configuration', () => {
  it('uses the expected product identity', () => {
    expect(config.expo.name).toBe('Fryslagerappen');
    expect(config.expo.slug).toBe('fryslagerappen');
    expect(config.expo.icon).toBe('./assets/images/fryslagerappen-icon.png');
    expect(config.expo.ios.bundleIdentifier).toBe('ai.gille.fryslagerappen');
    expect(config.expo.ios.icon).toBe('./assets/images/fryslagerappen-icon.png');
    expect(config.expo.android.package).toBe('ai.gille.fryslagerappen');
    expect(config.expo.web.favicon).toBe('./assets/images/fryslagerappen-icon.png');
  });

  it('configures the native capabilities needed by the MVP', () => {
    const pluginNames = config.expo.plugins.map((plugin) =>
      Array.isArray(plugin) ? plugin[0] : plugin,
    );

    expect(pluginNames).toEqual(
      expect.arrayContaining([
        'expo-audio',
        'expo-camera',
        'expo-image-picker',
        'expo-notifications',
        'expo-secure-store',
        'expo-sqlite',
      ]),
    );
  });

  it('declares that the app does not use non-exempt encryption', () => {
    expect(config.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false);
  });

  it('uses the branded icon on the splash screen', () => {
    const splashPlugin = config.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(splashPlugin[1].image).toBe('./assets/images/fryslagerappen-icon.png');
  });

  it('keeps the GitHub Pages base path out of native bundles', () => {
    expect(config.expo.web.output).toBe('static');
    expect(resolveConfig({ config: config.expo }).experiments.baseUrl).toBeUndefined();
  });

  it('adds the public repository path when explicitly building the website', () => {
    process.env.EXPO_WEB_BASE_URL = '/fryslagerappen';

    try {
      expect(resolveConfig({ config: config.expo }).experiments.baseUrl).toBe('/fryslagerappen');
    } finally {
      delete process.env.EXPO_WEB_BASE_URL;
    }
  });

  it('allows a monotonically increasing iOS build number for TestFlight', () => {
    process.env.EXPO_IOS_BUILD_NUMBER = '260723005501';

    try {
      expect(resolveConfig({ config: config.expo }).ios.buildNumber).toBe('260723005501');
    } finally {
      delete process.env.EXPO_IOS_BUILD_NUMBER;
    }
  });
});
