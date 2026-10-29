import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundscapeProfile, soundEvents, makeNoise, readAudioSettings, AUDIO_KEY } from '../lib/soundscape.ts';
import { DEFAULT_ENVIRONMENT, resolveEnvironment, type Season, type TimeMode } from '../lib/environment.ts';
const now = Date.parse('2026-10-29T04:00:00Z');
const frame = (season: Season, timeMode: TimeMode) => resolveEnvironment(now, 'Asia/Manila', { ...DEFAULT_ENVIRONMENT, seasonMode: season, timeMode, weatherMode: 'clear' }, null);

test('sound mixes follow time and season while suppressing calls in winter and precipitation', () => {
  for (const season of ['neutral', 'spring', 'summer', 'autumn', 'winter', 'tropical'] as const) for (const time of ['dawn', 'day', 'dusk', 'night'] as const) {
    const f = frame(season, time), p = soundscapeProfile(f);
    for (const gain of [p.wind, p.birds, p.insects, p.rain]) assert.ok(gain >= 0 && gain <= 1 && Number.isFinite(gain));
    if (season === 'winter' || time === 'night') assert.equal(p.birds, 0);
    for (const override of [{ rainIntensity: 1 }, { snow: true }, { enabled: false }]) {
      const muted = soundscapeProfile({ ...f, ...override }); assert.equal(muted.birds, 0); assert.equal(muted.insects, 0);
      if (override.enabled === false) assert.deepEqual([muted.wind, muted.rain], [0, 0]);
    }
  }
  assert.equal(soundscapeProfile(frame('spring', 'dawn')).birds, 1);
  assert.equal(soundscapeProfile(frame('summer', 'dusk')).insects, .75);
  assert.ok(soundscapeProfile(frame('summer', 'night')).insects > soundscapeProfile(frame('summer', 'day')).insects);
  const f = frame('autumn', 'dawn'); assert.deepEqual(soundscapeProfile(f), soundscapeProfile({ ...f, period: 'day' }));
  const a = soundscapeProfile({ ...f, solarAngle: -1e-6 }), b = soundscapeProfile({ ...f, solarAngle: 1e-6 });
  assert.ok(Math.abs(a.wind - b.wind) < 1e-4);
});

test('original noise is repeatable, bounded, unbiased and independent of audio sample rate', () => {
  const a = makeNoise(1977, 48000); assert.equal(a.length, 48000); assert.deepEqual(a, makeNoise(1977, 48000));
  let sum = 0, squares = 0;
  for (const value of a) { assert.ok(Number.isFinite(value) && Math.abs(value) <= 1); sum += value; squares += value * value; }
  assert.ok(Math.abs(sum / a.length) < .03 && Math.sqrt(squares / a.length) > .1);
});

test('only a valid volume preference survives reload, never a saved enabled flag', () => {
  assert.equal(AUDIO_KEY, 'mneme-audio-v1');
  for (const volume of [0, .3, 1]) assert.deepEqual(readAudioSettings(JSON.stringify({ version: 1, volume, enabled: true })), { version: 1, volume });
  for (const raw of [null, 'bad', 'null', '{"version":1,"volume":1e999}', '{"version":1,"volume":".2"}', '{"version":1,"volume":2}', '{"version":2,"volume":.2}']) assert.equal(readAudioSettings(raw).volume, .3);
});

test('scheduled calls vary in sparse bounded windows without same-voice overlap', () => {
  const p = { wind: .2, birds: 1, insects: 1, rain: 0, filterHz: 500 }, distinct = new Set<string>();
  for (let window = 0; window < 1000; window++) {
    const events = soundEvents(p, 1977, window); assert.deepEqual(events, soundEvents(p, 1977, window)); distinct.add(JSON.stringify(events));
    assert.ok(events.length <= 8 && events.filter(e => e.voice < 2).length <= 2 && events.filter(e => e.voice >= 2).length <= 6);
    for (const e of events) {
      const bird = e.voice < 2;
      assert.ok(e.at >= 0 && e.at + e.duration <= 2 && Math.abs(e.pan) <= .6);
      assert.ok(e.duration >= (bird ? .12 : .025) && e.duration <= (bird ? .28 : .05));
      assert.ok(e.fromHz >= (bird ? 1800 : 3600) && e.fromHz <= (bird ? 3600 : 4800));
      assert.ok(e.toHz >= (bird ? 1800 : 3600) && e.toHz <= (bird ? 3600 : 4800));
      assert.ok(e.gain > 0 && e.gain <= (bird ? .3 : .08));
    }
    for (const voice of [0, 1, 2, 3]) { const same = events.filter(e => e.voice === voice).sort((a, b) => a.at - b.at); for (let i = 1; i < same.length; i++) assert.ok(same[i].at >= same[i - 1].at + same[i - 1].duration); }
  }
  assert.ok(distinct.size > 100);
  assert.deepEqual(soundEvents({ ...p, birds: 0, insects: 0 }, 1977, 0), []);
});
