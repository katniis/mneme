import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { SEASON_TRACKS } from '../lib/seasonal-tracks.ts';

test('all seasons map to four licensed local MP3 files', () => {
  assert.equal(Object.keys(SEASON_TRACKS).length, 6);
  assert.equal(new Set(Object.values(SEASON_TRACKS).map(t => t.src)).size, 4);
  assert.equal(SEASON_TRACKS.tropical, SEASON_TRACKS.summer);
  assert.equal(SEASON_TRACKS.neutral, SEASON_TRACKS.spring);
  const credits = readFileSync(new URL('../public/audio/seasons/CREDITS.md', import.meta.url), 'utf8');
  for (const track of Object.values(SEASON_TRACKS)) {
    assert.ok(track.src.startsWith('/audio/seasons/'));
    assert.ok(statSync(new URL(`../public${track.src}`, import.meta.url)).size > 10000);
    assert.equal(track.artist, 'Scott Buckley');
    assert.equal(track.licenseUrl, 'https://creativecommons.org/licenses/by/4.0/');
    assert.ok(track.sourceUrl.startsWith('https://www.scottbuckley.com.au/library/'));
    assert.ok(credits.includes(track.title));
  }
});
