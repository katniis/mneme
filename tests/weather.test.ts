import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeather, fetchWeather, searchPlaces, readWeatherCache } from '../lib/weather.ts';
const now = Date.now();
const location = { name: 'Test city', latitude: 14.59951, longitude: 120.98422, timeZone: 'Asia/Manila', source: 'city' as const, deviceZoneAtSelection: 'Asia/Manila' };
const raw = { timezone: 'Asia/Manila', current: { time: Math.floor(now / 1000), rain: 1, showers: .5, weather_code: 61, cloud_cover: 80, temperature_2m: 28, is_day: 1 }, daily: { sunrise: [null, Math.floor(now / 1000) - 21600], sunset: [Math.floor(now / 1000) + 21600, null] } };
test('normalization validates boundaries and converts seconds once including nullable polar events', () => {
  const w = normalizeWeather(raw, now)!;
  assert.equal(w.rainMm, 1.5); assert.equal(w.cloudCover, .8);
  assert.equal(w.observedAt, raw.current.time * 1000); assert.equal(w.sunrise.length, 1);
  for (const patch of [{ rain: -1 }, { showers: null }, { cloud_cover: 101 }, { time: (now + 600000) / 1000 }, { is_day: 2 }, { temperature_2m: 'hot' }]) {
    assert.equal(normalizeWeather({ ...raw, current: { ...raw.current, ...patch } }, now), null);
  }
  assert.equal(normalizeWeather(null, now), null);
  assert.equal(normalizeWeather({ ...raw, timezone: 'bad' }, now), null);
});
test('weather cache binds normalized values to location and rejects malformed entries', () => {
  const weather = normalizeWeather(raw, now)!;
  const cache = JSON.stringify({ location: [14.6, 120.98, 'Asia/Manila'], weather });
  assert.deepEqual(readWeatherCache(cache, location), weather);
  assert.equal(readWeatherCache(cache, { ...location, latitude: 0 }), null);
  assert.equal(readWeatherCache(JSON.stringify({ location: [14.6, 120.98, 'Asia/Manila'], weather: { ...weather, sunrise: ['oops'] } }), location), null);
});
test('forecast requests round location and reject HTTP failures without sending letter content', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      const parsed = new URL(String(url));
      assert.equal(parsed.searchParams.get('latitude'), '14.6');
      assert.equal(parsed.searchParams.get('longitude'), '120.98');
      assert.equal(parsed.searchParams.get('timeformat'), 'unixtime');
      return Response.json(raw);
    };
    assert.equal((await fetchWeather(location, new AbortController().signal)).rainMm, 1.5);
    for (const status of [429, 500]) {
      globalThis.fetch = async () => new Response('', { status });
      await assert.rejects(fetchWeather(location, new AbortController().signal), /Weather/);
    }
    const aborted = new AbortController(); aborted.abort();
    globalThis.fetch = async (_url, options) => { options?.signal?.throwIfAborted(); return Response.json(raw); };
    await assert.rejects(fetchWeather(location, aborted.signal));
  } finally { globalThis.fetch = previous; }
});
test('city search encodes names and filters invalid results', async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async url => {
      assert.equal(new URL(String(url)).searchParams.get('name'), 'A & B');
      return Response.json({ results: [{ name: 'Test', country: 'Country', latitude: 14.599, longitude: 120.984, timezone: 'Asia/Manila' }, { name: 'Bad', latitude: 1000 }] });
    };
    const places = await searchPlaces('A & B', 'Asia/Manila', new AbortController().signal);
    assert.equal(places.length, 1); assert.equal(places[0].latitude, 14.6);
    await assert.rejects(searchPlaces('a', 'UTC', new AbortController().signal));
  } finally { globalThis.fetch = previous; }
});
