import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ENVIRONMENT as defaults, localDateParts, readEnvironmentPreferences, resolveEnvironment, seasonFor, terrainColour, type WeatherSnapshot } from '../lib/environment.ts';

const noon = Date.parse('2026-10-28T04:00:00Z');
const location = { name: 'Manila', latitude: 14.6, longitude: 120.98, timeZone: 'Asia/Manila', source: 'city' as const, deviceZoneAtSelection: 'Asia/Manila' };
const prefs = { ...defaults, location };
const weather: WeatherSnapshot = { fetchedAt: noon, observedAt: noon, timeZone: 'Asia/Manila', rainMm: 3, code: 61, cloudCover: .8, temperatureC: 28, isDay: true, sunrise: [], sunset: [] };

test('real local daylight follows device time through midnight and DST boundaries', () => {
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', defaults, null).period, 'day');
  assert.equal(resolveEnvironment(noon + 43200000, 'Asia/Manila', defaults, null).period, 'night');
  assert.equal(localDateParts(Date.parse('2026-01-01T00:00:00Z'), 'UTC').minutes, 0);
  assert.equal(localDateParts(Date.parse('2026-03-08T06:59:00Z'), 'America/New_York').minutes, 119);
  assert.equal(localDateParts(Date.parse('2026-03-08T07:00:00Z'), 'America/New_York').minutes, 180);
  assert.equal(localDateParts(Date.parse('2026-11-01T05:30:00Z'), 'America/New_York').minutes, 90);
  assert.equal(localDateParts(Date.parse('2026-11-01T06:30:00Z'), 'America/New_York').minutes, 90);
  assert.deepEqual(localDateParts(Date.parse('2025-12-31T16:00:00Z'), 'Asia/Manila'), { year: 2026, month: 1, day: 1, minutes: 0 });
});
test('seasons respect hemispheres, tropical latitude, and unknown location', () => {
  assert.equal(seasonFor(3, 40), 'spring');
  assert.equal(seasonFor(3, -40), 'autumn');
  assert.equal(seasonFor(10, 14.6), 'tropical');
  assert.equal(seasonFor(12, null), 'neutral');
  assert.equal(seasonFor(12, 40), 'winter');
});
test('all sixteen feature combinations preserve independent settings and static master', () => {
  for (let bits = 0; bits < 16; bits++) {
    const p = { ...prefs, enabled: !!(bits & 8), dayNight: !!(bits & 4), seasons: !!(bits & 2), rain: !!(bits & 1) };
    const f = resolveEnvironment(noon, 'Asia/Manila', p, weather);
    assert.equal(f.period, p.enabled && p.dayNight ? 'day' : 'static');
    assert.equal(f.season, p.enabled && p.seasons ? 'tropical' : 'neutral');
    assert.equal(f.rainIntensity, p.enabled && p.rain ? 1 : 0);
  }
});
test('foreign solar events cannot override local noon and changed device locations become inactive', () => {
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, timeZone: 'America/New_York', isDay: false }).period, 'day');
  const moved = { ...prefs, location: { ...location, source: 'device' as const, deviceZoneAtSelection: 'UTC' } };
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', moved, weather).rainIntensity, 0);
});
test('fresh matching solar events bracket day and night; absent polar events use isDay', () => {
  const sunrise = [noon - 21600000, noon + 64800000];
  const sunset = [noon - 64800000, noon + 21600000];
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, sunrise, sunset }).solarAngle, Math.PI / 2);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, isDay: false }).period, 'night');
});
test('rain requires fresh observation, allowed code and amount; snow is distinct', () => {
  for (const bad of [{ fetchedAt: noon - 1800001 }, { observedAt: noon - 1800001 }, { observedAt: noon + 300001 }, { fetchedAt: noon + 300001 }, { rainMm: 0 }, { code: 0 }]) {
    assert.equal(resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, ...bad }).rainIntensity, 0);
  }
  const snow = resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, code: 73 });
  assert.equal(snow.rainIntensity, 0);
  assert.equal(snow.snow, true);
});
test('invalid saved preferences fail closed to fresh defaults', () => {
  for (const bad of [{ ...prefs, enabled: 'yes' }, { ...prefs, location: { ...location, latitude: 999 } }, { ...prefs, location: { ...location, timeZone: 'invalid' } }]) {
    assert.deepEqual(readEnvironmentPreferences(JSON.stringify(bad)), defaults);
  }
  assert.deepEqual(readEnvironmentPreferences(JSON.stringify(prefs)), prefs);
});
test('seasonal colours preserve original neutral and stone colours without mutating inputs', () => {
  assert.equal(terrainColour('#668844', 'grass', 'neutral'), '#668844');
  assert.equal(terrainColour('#668844', 'stone', 'winter'), '#668844');
  assert.notEqual(terrainColour('#668844', 'grass', 'autumn'), '#668844');
});
