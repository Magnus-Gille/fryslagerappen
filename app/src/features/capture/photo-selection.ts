import type { CapturePhoto } from './capture-service';

type ImagePickerAsset = {
  uri: string;
  base64?: string | null;
};

export function capturePhotoFromAsset(asset: ImagePickerAsset): CapturePhoto {
  if (!asset.base64) throw new Error('Bildbiblioteket returnerade ingen bilddata.');

  // Expo ImagePicker documents base64 output as JPEG data, including when the
  // original library asset uses a format such as HEIC.
  return {
    uri: asset.uri,
    base64: asset.base64,
    mimeType: 'image/jpeg',
  };
}
