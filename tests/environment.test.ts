import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ENVIRONMENT,
  localDateParts,
  rainSample,
  readEnvironmentPreferences,
  resolveEnvironment,
  seasonFor,
  terrainColour,
  type EnvironmentPreferences,
  type WeatherSnapshot,
} from '../lib/environment.ts';

const prefs = (over: Partial<EnvironmentPreferences> = {}): EnvironmentPreferences => ({
  ...DEFAULT_ENVIRONMENT,
  location: { name: 'Manila, Philippines', latitude: 14.6, longitude: 121, timeZone: 'Asia/Manila', source: 'city', deviceZoneAtSelection: 'Asia/Manila' },
  ...over,
});
const weather = (over: Partial<WeatherSnapshot> = {}): WeatherSnapshot => ({
  fetchedAt: Date.parse('2026-10-28T04:00:00Z'),
  observedAt: Date.parse('2026-10-28T04:00:00Z'),
  timeZone: 'Asia/Manila',
  rainMm: 0,
  code: 0,
  cloudCover: 0.1,
  temperatureC: 30,
  isDay: true,
  sunrise: [],
  sunset: [],
  ...over,
});

test('device-local clock gives Manila day and night without weather', () => {
  const noon = resolveEnvironment(Date.parse('2026-10-28T04:00:00Z'), 'Asia/Manila', prefs({ location: null }), null);
  assert.equal(noon.period, 'day');
  assert.equal(noon.daylight, 1);
  assert.equal(noon.source, 'local-clock');
  assert.equal(noon.weatherStatus, 'needs-location');
  const midnight = resolveEnvironment(Date.parse('2026-10-28T16:00:00Z'), 'Asia/Manila', prefs({ location: null }), null);
  assert.equal(midnight.period, 'night');
  assert.equal(midnight.daylight, 0);
});

test('seasons follow latitude and hemisphere; tropics and unknown stay simple', () => {
  assert.equal(seasonFor(3, 40), 'spring');
  assert.equal(seasonFor(3, -40), 'autumn');
  assert.equal(seasonFor(12, -40), 'summer');
  assert.equal(seasonFor(6, 14.6), 'tropical');
  assert.equal(seasonFor(6, null), 'neutral');
});

test('New York parts survive DST transitions and year rollover', () => {
  assert.deepEqual(localDateParts(Date.parse('2026-03-08T06:30:00Z'), 'America/New_York'), { year: 2026, month: 3, day: 8, minutes: 90 });
  assert.deepEqual(localDateParts(Date.parse('2026-03-08T07:30:00Z'), 'America/New_York'), { year: 2026, month: 3, day: 8, minutes: 210 });
  assert.equal(localDateParts(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York').minutes, 90);
  assert.equal(localDateParts(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York').minutes, 90);
  assert.deepEqual(localDateParts(Date.parse('2027-01-01T05:00:00Z'), 'America/New_York'), { year: 2027, month: 1, day: 1, minutes: 0 });
  assert.deepEqual(localDateParts(Date.parse('2026-01-01T04:59:00Z'), 'America/New_York'), { year: 2025, month: 12, day: 31, minutes: 1439 });
  const dstNoon = resolveEnvironment(Date.parse('2026-03-08T17:00:00Z'), 'America/New_York', prefs({ location: null }), null);
  assert.equal(dstNoon.period, 'day');
});

test('master and feature switches gate period, season, and rain independently', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  const rainy = weather({ code: 61, rainMm: 3 });
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ enabled: false }), rainy).period, 'static');
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ enabled: false }), rainy).season, 'neutral');
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ enabled: false }), rainy).rainIntensity, 0);
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ enabled: false }), rainy).weatherStatus, 'off');
  const noDay = resolveEnvironment(now, 'Asia/Manila', prefs({ dayNight: false }), rainy);
  assert.equal(noDay.period, 'static');
  assert.equal(noDay.season, 'tropical');
  assert.ok(noDay.rainIntensity > 0);
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ seasons: false }), rainy).season, 'neutral');
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs({ rain: false }), rainy).rainIntensity, 0);
});

test('invalid stored preferences fall back to fresh defaults', () => {
  assert.deepEqual(readEnvironmentPreferences(null), DEFAULT_ENVIRONMENT);
  assert.deepEqual(readEnvironmentPreferences('{broken'), DEFAULT_ENVIRONMENT);
  assert.deepEqual(readEnvironmentPreferences(JSON.stringify({ version: 1, enabled: 'yes', dayNight: true, seasons: true, rain: true, location: null })), DEFAULT_ENVIRONMENT);
  assert.deepEqual(readEnvironmentPreferences(JSON.stringify({ version: 1, enabled: true, dayNight: true, seasons: true, rain: true, location: { name: 'X', latitude: 91, longitude: 0, timeZone: 'Asia/Manila', source: 'city', deviceZoneAtSelection: 'Asia/Manila' } })), DEFAULT_ENVIRONMENT);
  assert.deepEqual(readEnvironmentPreferences(JSON.stringify({ version: 1, enabled: true, dayNight: true, seasons: true, rain: true, location: { name: 'X', latitude: 0, longitude: 0, timeZone: 'Nowhere/Place', source: 'city', deviceZoneAtSelection: 'Asia/Manila' } })), DEFAULT_ENVIRONMENT);
  const ok = readEnvironmentPreferences(JSON.stringify(prefs()));
  assert.equal(ok.location?.name, 'Manila, Philippines');
});

test('foreign-timezone solar data never overrides browser-local daylight', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  const foreign = weather({ timeZone: 'America/New_York', sunrise: [now + 3600000], sunset: [now + 7200000], isDay: false });
  const frame = resolveEnvironment(now, 'Asia/Manila', prefs(), foreign);
  assert.equal(frame.period, 'day');
  assert.equal(frame.source, 'local-clock');
});

test('matching fresh solar events bracket the day and polar absence uses isDay', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  const solar = weather({ sunrise: [now - 3600000], sunset: [now + 3600000] });
  const frame = resolveEnvironment(now, 'Asia/Manila', prefs(), solar);
  assert.equal(frame.source, 'local-weather');
  assert.ok(Math.abs(frame.solarAngle - Math.PI / 2) < 0.01);
  const polarNight = resolveEnvironment(now, 'Asia/Manila', prefs(), weather({ isDay: false }));
  assert.equal(polarNight.period, 'night');
  const polarDay = resolveEnvironment(now, 'Asia/Manila', prefs(), weather({ isDay: true }));
  assert.equal(polarDay.period, 'day');
});

test('stale or future weather cannot cause rain or snow', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  const stale = weather({ fetchedAt: now - 1800001, observedAt: now - 1800001, code: 61, rainMm: 3 });
  const staleFrame = resolveEnvironment(now, 'Asia/Manila', prefs(), stale);
  assert.equal(staleFrame.weatherStatus, 'stale');
  assert.equal(staleFrame.rainIntensity, 0);
  const future = weather({ fetchedAt: now, observedAt: now + 300001, code: 61, rainMm: 3 });
  assert.equal(resolveEnvironment(now, 'Asia/Manila', prefs(), future).rainIntensity, 0);
  const snow = resolveEnvironment(now, 'Asia/Manila', prefs(), weather({ code: 71, rainMm: 5 }));
  assert.equal(snow.rainIntensity, 0);
  assert.equal(snow.snow, true);
  const stormDry = resolveEnvironment(now, 'Asia/Manila', prefs(), weather({ code: 95, rainMm: 0 }));
  assert.equal(stormDry.rainIntensity, 0);
});

test('seasonal terrain colours preserve neutral and stone exactly', () => {
  assert.equal(terrainColour('#7c9254', 'grass', 'neutral'), '#7c9254');
  assert.equal(terrainColour('#827968', 'stone', 'autumn'), '#827968');
  assert.notEqual(terrainColour('#7c9254', 'grass', 'autumn'), '#7c9254');
  assert.notEqual(terrainColour('#7c9254', 'grass', 'spring'), terrainColour('#7c9254', 'grass', 'autumn'));
});

test('rain sampling is deterministic, bounded by the cycle, and lands on real tops', () => {
  const ground = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }];
  assert.equal(rainSample(0, 0, []), null);
  assert.deepEqual(rainSample(3, 2.2, ground), rainSample(3, 2.2, ground));
  for (let i = 0; i < 40; i++) {
    const s = rainSample(i, i * 0.37, ground)!;
    assert.ok(ground.some(g => g.x === s.x && g.z === s.z));
    assert.ok(s.y >= Math.min(...ground.map(g => g.y)) - 0.001);
    if (s.impact) assert.ok(ground.some(g => g.y === s.y));
  }
  const cycles = new Set(Array.from({ length: 20 }, (_, i) => rainSample(1, i * 0.4, ground)!.cycle));
  assert.ok(cycles.size > 3);
});
