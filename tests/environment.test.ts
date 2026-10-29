import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ENVIRONMENT as defaults, WEATHER_MODES, localDateParts, readEnvironmentPreferences, resolveEnvironment, requiresWeather, seasonFor, terrainColour, type WeatherSnapshot } from '../lib/environment.ts';

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
  const snow = resolveEnvironment(noon, 'Asia/Manila', { ...prefs, seasonMode: 'winter' }, { ...weather, code: 73 });
  assert.equal(snow.rainIntensity, 0);
  assert.equal(snow.snow, true);
});
test('partial polar events without a bracketing pair use fresh daylight observations', () => {
  const now = Date.parse('2026-06-01T23:00:00Z');
  const polar = { ...weather, fetchedAt: now, observedAt: now, timeZone: 'UTC', sunrise: [now - 86400000], sunset: [], isDay: true };
  assert.equal(resolveEnvironment(now, 'UTC', prefs, polar).period, 'day');
  assert.equal(resolveEnvironment(now, 'UTC', prefs, { ...polar, isDay: false }).period, 'night');
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
test('manual phases override local time and fresh provider daylight', () => {
  for (const [timeMode, period, angle, daylight] of [
    ['night', 'night', Math.PI * 1.5, 0], ['day', 'day', Math.PI / 2, 1],
    ['dawn', 'dawn', 0, .5], ['dusk', 'dusk', Math.PI, .5],
  ] as const) {
    const frame = resolveEnvironment(noon, 'Asia/Manila', { ...prefs, timeMode }, weather);
    assert.equal(frame.period, period); assert.equal(frame.solarAngle, angle); assert.equal(frame.daylight, daylight);
  }
  assert.equal(resolveEnvironment(noon + 43200000, 'Asia/Manila', { ...defaults, timeMode: 'day' }, null).period, 'day');
  assert.equal(resolveEnvironment(noon + 43200000, 'Asia/Manila', { ...defaults, timeMode: 'local' }, null).period, 'night');
});
test('manual weather needs no location and snow requires winter', () => {
  const p = { ...defaults, timeMode: 'night' as const, seasonMode: 'winter' as const, weatherMode: 'snow' as const };
  const frame = resolveEnvironment(noon, 'Asia/Manila', p, null);
  assert.equal(frame.season, 'winter'); assert.equal(frame.snow, true); assert.equal(frame.rainIntensity, 0); assert.equal(frame.source, 'manual');
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...p, seasons: false }, null).snow, false);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...p, rain: false }, null).snow, false);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...p, weatherMode: 'clear', seasonMode: 'winter' }, null).snow, false);
  for (const [weatherMode, clouds, rain] of [['clear', 0, 0], ['light-rain', .85, .35], ['heavy-rain', 1, 1]] as const) {
    const f = resolveEnvironment(noon, 'Asia/Manila', { ...p, weatherMode }, null);
    assert.equal(f.cloudCover, clouds); assert.equal(f.rainIntensity, rain);
  }
  const off = resolveEnvironment(noon, 'Asia/Manila', { ...p, enabled: false }, null);
  assert.equal(off.period, 'static'); assert.equal(off.season, 'neutral'); assert.equal(off.snow, false); assert.equal(off.cloudCover, 0);
});
test('v1 preferences migrate without losing choices and unknown mode fields fall back independently', () => {
  const legacy = { version: 1, enabled: true, dayNight: false, seasons: true, rain: false, location };
  const migrated = readEnvironmentPreferences(JSON.stringify(legacy));
  assert.equal(migrated.version, 3); assert.equal(migrated.dayNight, false); assert.equal(migrated.rain, false);
  assert.deepEqual(migrated.location, location); assert.equal(migrated.timeMode, 'local'); assert.equal(migrated.weatherMode, 'local');
  const raw = JSON.stringify({ ...migrated, timeMode: 'broken', seasonMode: 'winter', weatherMode: 'snow' });
  const p = readEnvironmentPreferences(raw); assert.equal(p.timeMode, 'local'); assert.equal(p.seasonMode, 'winter'); assert.equal(p.weatherMode, 'snow');
  assert.deepEqual(readEnvironmentPreferences(JSON.stringify(p)), p);
});
test('weather demand follows active local consumers, with no requests for calendar alone', () => {
  const manual = { ...prefs, timeMode: 'night' as const, seasonMode: 'winter' as const, weatherMode: 'clear' as const };
  assert.equal(requiresWeather(manual, 'Asia/Manila'), false);
  assert.equal(requiresWeather({ ...manual, weatherMode: 'local' }, 'Asia/Manila'), true);
  assert.equal(requiresWeather({ ...manual, timeMode: 'local' }, 'Asia/Manila'), true);
  assert.equal(requiresWeather({ ...manual, timeMode: 'local' }, 'UTC'), false);
  assert.equal(requiresWeather({ ...manual, seasonMode: 'local' }, 'Asia/Manila'), false);
  assert.equal(requiresWeather({ ...prefs, enabled: false }, 'Asia/Manila'), false);
  assert.equal(requiresWeather({ ...prefs, dayNight: false, seasons: false, rain: false, ambience: false }, 'Asia/Manila'), false);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', manual, weather).weatherStatus, 'off');
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...manual, timeMode: 'local' }, weather).source, 'mixed');
});

test('legacy cloudy becomes clear without losing manual choices or requesting weather', () => {
  const p = readEnvironmentPreferences(JSON.stringify({ ...prefs, version: 2, weatherMode: 'cloudy', timeMode: 'night', seasonMode: 'winter' }));
  assert.equal(p.version, 3); assert.equal(p.ambience, true); assert.equal(p.weatherMode, 'clear');
  assert.equal(p.timeMode, 'night'); assert.equal(p.seasonMode, 'winter'); assert.deepEqual(p.location, location);
  assert.equal(requiresWeather(p, 'Asia/Manila'), false);
  assert.deepEqual(WEATHER_MODES, ['local', 'clear', 'light-rain', 'heavy-rain', 'snow']);
  assert.equal(readEnvironmentPreferences(JSON.stringify({ ...p, ambience: false })).ambience, false);
  const malformed = readEnvironmentPreferences(JSON.stringify({ ...p, ambience: 'broken' }));
  assert.equal(malformed.ambience, true); assert.equal(malformed.timeMode, 'night');
});

test('living details are independent of precipitation and all four effects can be off', () => {
  const f = (changes: Partial<typeof defaults>) => resolveEnvironment(noon, 'Asia/Manila', { ...defaults, ...changes }, null);
  assert.equal(f({ ambience: false, seasonMode: 'winter', weatherMode: 'snow' }).snow, true);
  assert.equal(f({ rain: false, weatherMode: 'snow' }).snow, false);
  assert.equal(f({ enabled: false }).ambience, false);
  assert.equal(f({ ambience: false }).ambience, false);
  const off = { ...prefs, dayNight: false, seasons: false, rain: false, ambience: false };
  assert.equal(requiresWeather(off, 'Asia/Manila'), false);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', off, weather).source, 'static');
  assert.equal(requiresWeather({ ...off, ambience: true }, 'Asia/Manila'), true);
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', prefs, { ...weather, cloudCover: .7 }).cloudCover, .7);
});

test('snow follows resolved winter across saved choices, switches and hemispheres', () => {
  for (const seasonMode of ['neutral', 'tropical', 'spring', 'summer', 'autumn', 'winter'] as const) {
    const p = { ...defaults, seasonMode, weatherMode: 'snow' as const };
    const before = JSON.stringify(p), f = resolveEnvironment(noon, 'Asia/Manila', p, null);
    assert.equal(f.snow, seasonMode === 'winter');
    assert.equal(JSON.stringify(p), before);
    if (seasonMode !== 'winter') assert.deepEqual([f.rainIntensity, f.cloudCover], [0, 0]);
    assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...prefs, seasonMode }, { ...weather, code: 73 }).snow, seasonMode === 'winter');
  }
  const winter = { ...prefs, seasonMode: 'winter' as const, weatherMode: 'snow' as const };
  for (const off of [{ enabled: false }, { seasons: false }, { rain: false }])
    assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...winter, ...off }, null).snow, false);
  for (const bad of [{ fetchedAt: noon - 1800001 }, { observedAt: noon + 300001 }])
    assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...winter, weatherMode: 'local' }, { ...weather, code: 73, ...bad }).snow, false);
  const saved = readEnvironmentPreferences(JSON.stringify({ ...winter, seasonMode: 'autumn' }));
  assert.equal(saved.weatherMode, 'snow'); assert.equal(resolveEnvironment(noon, 'Asia/Manila', saved, null).snow, false);
  const july = Date.parse('2026-07-01T04:00:00Z');
  for (const latitude of [-40, 40]) {
    const p = { ...prefs, location: { ...location, latitude } };
    const w = { ...weather, code: 73, fetchedAt: july, observedAt: july };
    assert.equal(resolveEnvironment(july, 'Asia/Manila', p, w).snow, latitude === -40);
  }
});
