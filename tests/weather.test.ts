import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWeather, forecastUrl, geocodingUrl, normalizeWeather, searchPlaces } from '../lib/weather.ts';
import type { EnvironmentLocation } from '../lib/environment.ts';

const fetchedAt = Date.parse('2026-10-28T04:00:00Z');
const location: EnvironmentLocation = { name: 'Manila, Philippines', latitude: 14.5995, longitude: 120.9842, timeZone: 'Asia/Manila', source: 'city', deviceZoneAtSelection: 'Asia/Manila' };
const validRaw = {
  timezone: 'Asia/Manila',
  current: { time: 1793160000, rain: 1.2, showers: 0.3, weather_code: 61, cloud_cover: 40, temperature_2m: 29.5, is_day: 1 },
  daily: { sunrise: [1793130000, null], sunset: [1793173200] },
};

test('valid provider JSON normalizes seconds once and sums rain plus showers', () => {
  const snap = normalizeWeather(validRaw, fetchedAt)!;
  assert.equal(snap.observedAt, 1793160000000);
  assert.equal(snap.rainMm, 1.5);
  assert.equal(snap.cloudCover, 0.4);
  assert.equal(snap.isDay, true);
  assert.deepEqual(snap.sunrise, [1793130000000]);
  assert.deepEqual(snap.sunset, [1793173200000]);
});

test('malformed, missing, or out-of-range provider fields are rejected', () => {
  assert.equal(normalizeWeather(null, fetchedAt), null);
  assert.equal(normalizeWeather({}, fetchedAt), null);
  assert.equal(normalizeWeather({ ...validRaw, current: { ...validRaw.current, rain: null } }, fetchedAt), null);
  assert.equal(normalizeWeather({ ...validRaw, current: { ...validRaw.current, cloud_cover: 101 } }, fetchedAt), null);
  assert.equal(normalizeWeather({ ...validRaw, current: { ...validRaw.current, showers: -1 } }, fetchedAt), null);
  assert.equal(normalizeWeather({ ...validRaw, current: { ...validRaw.current, time: 1793160000 + 301 } }, fetchedAt), null);
  const polar = normalizeWeather({ timezone: 'Europe/Oslo', current: { ...validRaw.current, is_day: 0 }, daily: { sunrise: [null], sunset: [null] } }, fetchedAt)!;
  assert.deepEqual(polar.sunrise, []);
  assert.equal(polar.isDay, false);
});

test('provider URLs round coordinates, encode queries, and request bounded fields', () => {
  const url = forecastUrl(location);
  assert.match(url, /latitude=14\.6&longitude=120\.98/);
  assert.match(url, /timezone=auto/);
  assert.match(url, /timeformat=unixtime/);
  assert.match(url, /past_days=1/);
  assert.match(url, /forecast_days=2/);
  assert.match(url, /daily=sunrise%2Csunset|daily=sunrise,sunset/);
  assert.match(geocodingUrl('San José'), /name=San\+Jos%C3%A9/);
  assert.match(geocodingUrl('Manila'), /count=5/);
});

test('fetchWeather and searchPlaces use controlled responses and bounded failures', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify(validRaw), { status: 200 });
    const snap = await fetchWeather(location, new AbortController().signal);
    assert.equal(snap.code, 61);
    globalThis.fetch = async () => new Response('slow down', { status: 429 });
    await assert.rejects(() => fetchWeather(location, new AbortController().signal), /429/);
    globalThis.fetch = async () => new Response(JSON.stringify({ results: [
      { name: 'Manila', country: 'Philippines', latitude: 14.5995, longitude: 120.9842, timezone: 'Asia/Manila' },
      { name: 'Broken', latitude: 'x', longitude: 0, timezone: 'Asia/Manila' },
    ] }), { status: 200 });
    const places = await searchPlaces('Manila', 'Asia/Manila', new AbortController().signal);
    assert.equal(places.length, 1);
    assert.equal(places[0].latitude, 14.6);
    assert.equal(places[0].source, 'city');
    assert.deepEqual(await searchPlaces(' x ', 'Asia/Manila', new AbortController().signal), []);
  } finally {
    globalThis.fetch = original;
  }
});
