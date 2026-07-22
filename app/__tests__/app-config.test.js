const config = require('../app.json');

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

  it('uses the branded icon on the splash screen', () => {
    const splashPlugin = config.expo.plugins.find(
      (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen',
    );

    expect(splashPlugin[1].image).toBe('./assets/images/fryslagerappen-icon.png');
  });

  it('exports web routes beneath the public GitHub Pages repository path', () => {
    expect(config.expo.web.output).toBe('static');
    expect(config.expo.experiments.baseUrl).toBe('/fryslagerappen');
  });
});
