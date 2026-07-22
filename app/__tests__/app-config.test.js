const config = require('../app.json');

describe('Expo app configuration', () => {
  it('uses the expected product identity', () => {
    expect(config.expo.name).toBe('Fryslagerappen');
    expect(config.expo.slug).toBe('fryslagerappen');
    expect(config.expo.ios.bundleIdentifier).toBe('com.example.fryslagerappen');
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
});
