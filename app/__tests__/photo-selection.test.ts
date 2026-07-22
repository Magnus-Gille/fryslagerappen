import { describe, expect, it } from '@jest/globals';

import { capturePhotoFromAsset } from '../src/features/capture/photo-selection';

describe('photo library selection', () => {
  it('turns Expo image-picker JPEG data into a capture photo', () => {
    expect(capturePhotoFromAsset({ uri: 'file:///label.heic', base64: 'aGVq' })).toEqual({
      uri: 'file:///label.heic',
      base64: 'aGVq',
      mimeType: 'image/jpeg',
    });
  });

  it('rejects a picker result without image data', () => {
    expect(() => capturePhotoFromAsset({ uri: 'file:///label.jpg', base64: null })).toThrow(
      'Bildbiblioteket returnerade ingen bilddata.',
    );
  });
});
