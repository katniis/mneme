import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Color } from 'three';
import { sampleDaylight, easeDaylight, type DaylightAppearance } from '../lib/daylight.ts';
import { DEFAULT_ENVIRONMENT, resolveEnvironment } from '../lib/environment.ts';

const at = (angle: number, cloudCover = 0) => sampleDaylight({ period: 'day', solarAngle: angle, daylight: (1 + Math.sin(angle)) / 2, cloudCover });
const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const values = (appearance: DaylightAppearance) => Object.values(appearance).flat() as number[];

test('dawn and dusk cast opposite long shadows with distinct warm palettes', () => {
  const dawn = at(0), day = at(Math.PI / 2), dusk = at(Math.PI);
  assert.notDeepEqual(dawn.horizon, dusk.horizon);
  assert.notDeepEqual(dawn.keyColour, dusk.keyColour);
  assert.ok(dawn.direction[0] < 0 && dusk.direction[0] > 0);
  assert.ok(day.direction[1] > dawn.direction[1] * 3);
  assert.ok(day.ambient < .5 && day.hemisphere < 1.2);
  close(at(0, 1).key, dawn.key * .45);
  assert.notDeepEqual(at(0, 1).keyColour, dawn.keyColour);
});

test('appearance stays finite and readable throughout clear and overcast days', () => {
  for (const cloudCover of [0, .35, 1]) for (let i = 0; i <= 288; i++) {
    const profile = at(i / 288 * Math.PI * 2, cloudCover);
    assert.ok(values(profile).every(Number.isFinite));
    for (const [key, value] of Object.entries(profile)) {
      if (Array.isArray(value) && key !== 'direction') assert.ok(value.every(n => n >= 0 && n <= 1));
    }
    close(Math.hypot(...profile.direction), 1);
    assert.ok(profile.ambient >= .3 && profile.key <= 2.5);
    assert.ok(profile.stars >= 0 && profile.stars <= .7);
  }
});

test('night and disabled daylight retain the existing readable atmosphere', () => {
  const night = at(Math.PI * 1.5);
  assert.deepEqual([night.ambient, night.hemisphere, night.key, night.fill], [.3, .6, .12, .3]);
  assert.deepEqual(night.horizon, new Color('#101b2e').toArray());
  close(night.stars, .7);
  const staticFrame = { period: 'static' as const, solarAngle: 0, daylight: 1, cloudCover: 0 };
  const neutral = sampleDaylight(staticFrame);
  assert.deepEqual([neutral.ambient, neutral.hemisphere, neutral.key, neutral.fill], [.8, 1.6, 2.5, .65]);
  assert.deepEqual(neutral.horizon, new Color('#e9eee5').toArray());
  assert.deepEqual(neutral.skyTop, neutral.horizon);
  assert.equal(neutral.stars, 0);
  const length = Math.hypot(-8, 14, 5);
  neutral.direction.forEach((n, i) => close(n, [-8, 14, 5][i] / length));
  close(sampleDaylight({ ...staticFrame, cloudCover: 1 }).key, 2.5 * .45);
  const off = resolveEnvironment(Date.parse('2026-10-29T04:00:00Z'), 'Asia/Manila', { ...DEFAULT_ENVIRONMENT, enabled: false, timeMode: 'dusk', weatherMode: 'heavy-rain' }, null);
  assert.deepEqual(sampleDaylight(off), neutral);
});

test('automatic night keeps its blue atmosphere until the actual twilight window', () => {
  const night = at(Math.PI * 1.5);
  for (const localHour of ['02', '20', '23']) {
    const now = Date.parse(`2026-10-29T${localHour}:00:00+08:00`);
    const frame = resolveEnvironment(now, 'Asia/Manila', DEFAULT_ENVIRONMENT, null);
    assert.equal(frame.daylight, 0);
    const profile = sampleDaylight(frame);
    values(profile).forEach((n, i) => close(n, values(night)[i]));
  }
});

test('clock and provider twilight boundaries change lighting continuously', () => {
  const date = (time: string) => Date.parse(`2026-10-29T${time}:00+08:00`);
  const prefs = { ...DEFAULT_ENVIRONMENT, weatherMode: 'clear' as const, location: { name: 'Synthetic Manila', latitude: 14.6, longitude: 120.98, timeZone: 'Asia/Manila', source: 'city' as const, deviceZoneAtSelection: 'Asia/Manila' } };
  const boundaries = [['05:29', '05:30'], ['05:59', '06:00'], ['06:30', '06:31'], ['17:29', '17:30'], ['17:59', '18:00'], ['18:30', '18:31'], ['23:59', '00:00']];
  for (const solar of [false, true]) for (const [before, after] of boundaries) {
    const profiles = [before, after].map(time => {
      const now = date(time);
      const weather = solar ? { fetchedAt: now, observedAt: now, timeZone: 'Asia/Manila', rainMm: 0, code: 0, cloudCover: 0, temperatureC: 28, isDay: time >= '06:00' && time < '18:00', sunrise: [-1, 0, 1].map(day => date('06:00') + day * 86400000), sunset: [-1, 0, 1].map(day => date('18:00') + day * 86400000) } : null;
      return values(sampleDaylight(resolveEnvironment(now, 'Asia/Manila', prefs, weather)));
    });
    profiles[0].forEach((n, i) => close(n, profiles[1][i], .1));
  }
});

test('automatic phase labels and midnight wrap do not introduce lighting jumps', () => {
  for (const clouds of [0, 1]) {
    const wrapped = values(at(2 * Math.PI - 1e-6, clouds));
    values(at(-1e-6, clouds)).forEach((n, i) => close(n, wrapped[i]));
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2]) {
      const before = values(at(angle - 1e-6, clouds)), after = values(at(angle + 1e-6, clouds));
      before.forEach((n, i) => close(n, after[i], 1e-4));
    }
  }
  const frame = { solarAngle: .1, daylight: .7, cloudCover: .3 };
  assert.deepEqual(sampleDaylight({ ...frame, period: 'dawn' }), sampleDaylight({ ...frame, period: 'day' }));
  assert.deepEqual(sampleDaylight({ ...frame, period: 'dusk' }), sampleDaylight({ ...frame, period: 'day' }));
});

test('phase easing approaches the selected appearance without a bright noon detour', () => {
  const current = at(0), start = structuredClone(current), target = at(Math.PI), savedTarget = structuredClone(target);
  easeDaylight(current, target, 0, false);
  assert.deepEqual(current, start);
  for (let i = 0; i < 180; i++) {
    easeDaylight(current, target, 1 / 60, false);
    close(Math.hypot(...current.direction), 1);
    assert.ok(values(current).every(Number.isFinite));
    for (const key of Object.keys(current) as (keyof DaylightAppearance)[]) {
      if (key === 'direction') continue;
      const a = [start[key]].flat(), b = [target[key]].flat(), c = [current[key]].flat();
      c.forEach((n, j) => assert.ok(n >= Math.min(a[j], b[j]) - 1e-9 && n <= Math.max(a[j], b[j]) + 1e-9));
    }
  }
  current.keyColour.forEach((n, i) => close(n, target.keyColour[i], .01));
  assert.deepEqual(target, savedTarget);
  const capped = at(0), resumed = at(0);
  easeDaylight(capped, target, .1, false);
  easeDaylight(resumed, target, 30, false);
  assert.deepEqual(capped, resumed);
  easeDaylight(current, target, 0, true);
  assert.deepEqual(current, target);
  assert.notEqual(current.direction, target.direction);
});
