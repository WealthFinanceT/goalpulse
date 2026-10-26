import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAuthorizedStreamSource } from '@/lib/streaming/config';

test('returns an unavailable configuration when no source is set', () => {
  assert.deepEqual(resolveAuthorizedStreamSource(), { source: null, error: null });
});

test('requires both a URL and an explicit media type', () => {
  assert.match(resolveAuthorizedStreamSource('https://provider.example/embed').error || '', /both/i);
  assert.match(resolveAuthorizedStreamSource(undefined, 'iframe').error || '', /both/i);
});

test('accepts an HTTPS iframe source and explicit stream kind', () => {
  assert.deepEqual(resolveAuthorizedStreamSource('https://provider.example/embed?id=event', 'iframe'), {
    source: { src: 'https://provider.example/embed?id=event', kind: 'iframe' },
    error: null,
  });
});

test('supports explicit HLS and DASH source configuration', () => {
  assert.equal(resolveAuthorizedStreamSource('https://provider.example/live.m3u8', 'hls').source?.kind, 'hls');
  assert.equal(resolveAuthorizedStreamSource('https://provider.example/live.mpd', 'dash').source?.kind, 'dash');
});

test('rejects unsupported media types, invalid URLs, insecure URLs, and credentials', () => {
  assert.match(resolveAuthorizedStreamSource('https://provider.example/embed', 'auto').error || '', /unsupported/i);
  assert.match(resolveAuthorizedStreamSource('not a URL', 'iframe').error || '', /invalid/i);
  assert.match(resolveAuthorizedStreamSource('http://provider.example/embed', 'iframe').error || '', /HTTPS/i);
  assert.match(resolveAuthorizedStreamSource('https://user:pass@provider.example/embed', 'iframe').error || '', /credentials/i);
});
