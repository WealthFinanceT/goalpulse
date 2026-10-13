import assert from 'node:assert/strict';
import test from 'node:test';
import type { StreamedStream } from '@/lib/streamed';
import { supportsPictureInPicture } from '@/lib/media-capabilities';
import {
  getPlaybackPositionKey,
  getSavedPlaybackPosition,
  getStreamSelectionKey,
  resolveSavedStreamIndex,
  serializeStreamSelection
} from '@/lib/stream-player-state';

const streams: StreamedStream[] = [
  { id: 'first', streamNo: 1, language: 'English', hd: true, embedUrl: 'https://example.com/first', source: 'provider-a' },
  { id: 'second', streamNo: 2, language: 'English', hd: false, embedUrl: 'https://example.com/second', source: 'provider-b' }
];

test('resolves and serializes the selected stream by provider identity', () => {
  assert.equal(resolveSavedStreamIndex(streams, serializeStreamSelection(streams[1])), 1);
});

test('resolves a saved stream by URL when provider identity changed', () => {
  const saved = JSON.stringify({ id: 'old-id', source: 'provider-b', embedUrl: streams[1].embedUrl });
  assert.equal(resolveSavedStreamIndex(streams, saved), 1);
});

test('ignores malformed or unavailable saved stream selections', () => {
  assert.equal(resolveSavedStreamIndex(streams, '{invalid'), null);
  assert.equal(resolveSavedStreamIndex(streams, JSON.stringify({ id: 'missing', source: 'missing', embedUrl: 'https://example.com/missing' })), null);
});

test('accepts only non-negative finite saved playback positions', () => {
  assert.equal(getSavedPlaybackPosition('42.5'), 42.5);
  assert.equal(getSavedPlaybackPosition('NaN'), null);
  assert.equal(getSavedPlaybackPosition('-1'), null);
  assert.equal(getSavedPlaybackPosition(null), null);
});

test('scopes saved state to its match and native media source', () => {
  assert.notEqual(getStreamSelectionKey('match-a'), getStreamSelectionKey('match-b'));
  assert.notEqual(getPlaybackPositionKey('match-a', 'video-a'), getPlaybackPositionKey('match-a', 'video-b'));
});

test('enables picture-in-picture only when the document and native video support it', () => {
  assert.equal(supportsPictureInPicture(true, () => Promise.resolve()), true);
  assert.equal(supportsPictureInPicture(false, () => Promise.resolve()), false);
  assert.equal(supportsPictureInPicture(true, undefined), false);
});
