import assert from 'node:assert/strict';
import test from 'node:test';
import { parseProviderJson } from '@/lib/streamed';

test('parses a successful JSON provider response', async () => {
  const response = new Response('[{"id":"match-1"}]', {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

  assert.deepEqual(await parseProviderJson(response, 'Streamed fixtures'), [{ id: 'match-1' }]);
});

test('reports Streamed shutdown instead of parsing its HTML closure page', async () => {
  const response = new Response('<!doctype html><p>We are no longer operating Streamed.</p>', {
    headers: { 'content-type': 'text/html' }
  });

  await assert.rejects(
    parseProviderJson(response, 'Streamed fixtures'),
    /Streamed\.pk has shut down; live scores and fixtures are unavailable/
  );
});

test('rejects non-JSON provider responses without returning their body', async () => {
  const response = new Response('<!doctype html><p>Temporary error</p>', {
    headers: { 'content-type': 'text/html' }
  });

  await assert.rejects(
    parseProviderJson(response, 'Streamed fixtures'),
    /expected JSON but received text\/html/
  );
});

test('reports provider HTTP errors explicitly', async () => {
  const response = new Response('{"error":"unavailable"}', {
    status: 503,
    headers: { 'content-type': 'application/json' }
  });

  await assert.rejects(parseProviderJson(response, 'Streamed fixtures'), /HTTP 503/);
});
