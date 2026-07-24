import { describe, expect, test } from '@jest/globals';

import {
  audioMimeTypeForUri,
  bytesToBase64,
  captureFailureMessage,
} from '@/features/capture/capture-upload';

describe('bytesToBase64', () => {
  test('matches the standard base64 encoding across padding cases', () => {
    const samples = ['', 'a', 'ab', 'abc', 'abcd', 'synthetic audio bytes'];
    for (const sample of samples) {
      const bytes = new Uint8Array(Buffer.from(sample, 'utf8'));
      expect(bytesToBase64(bytes)).toBe(Buffer.from(sample, 'utf8').toString('base64'));
    }
  });

  test('handles binary content', () => {
    const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
  });
});

describe('audioMimeTypeForUri', () => {
  test('recognizes web recordings', () => {
    expect(audioMimeTypeForUri('blob:https://example.test/clip.webm')).toBe('audio/webm');
  });

  test('defaults to m4a for native recordings', () => {
    expect(audioMimeTypeForUri('file:///caches/recording-1.m4a')).toBe('audio/m4a');
    expect(audioMimeTypeForUri('file:///caches/recording-1')).toBe('audio/m4a');
  });
});

describe('captureFailureMessage', () => {
  test('explains client-side transport failures and that media is kept', () => {
    const message = captureFailureMessage({ status: 0, message: 'Something went wrong.' });
    expect(message).toContain('Kontrollera anslutningen');
    expect(message).toContain('finns kvar');
  });

  test('maps the PocketBase SDK fallback message even without a status', () => {
    expect(captureFailureMessage({ message: 'Something went wrong.' })).toContain(
      'Kontrollera anslutningen',
    );
  });

  test('asks for a new sign-in on auth failures', () => {
    expect(captureFailureMessage({ status: 401, message: 'unauthorized' })).toBe(
      'Logga in igen innan tolkningen kan köras.',
    );
  });

  test('suggests waiting on server errors', () => {
    expect(captureFailureMessage({ status: 500, message: 'boom' })).toContain('en liten stund');
  });

  test('passes through Swedish backend messages', () => {
    expect(captureFailureMessage({ status: 429, message: 'Kvoten för tolkningar är slut.' })).toBe(
      'Kvoten för tolkningar är slut.',
    );
  });

  test('falls back to a generic Swedish message', () => {
    expect(captureFailureMessage(undefined)).toBe('Tolkningen misslyckades. Försök igen.');
    expect(captureFailureMessage(new Error(''))).toBe('Tolkningen misslyckades. Försök igen.');
  });
});
