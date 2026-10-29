import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundscapeProfile, soundEvents, readAudioSettings, AUDIO_KEY } from '../lib/soundscape.ts';
import { DEFAULT_ENVIRONMENT, resolveEnvironment, type Season, type TimeMode } from '../lib/environment.ts';
const now = Date.parse('2026-10-29T04:00:00Z');
const frame = (season: Season, timeMode: TimeMode) => resolveEnvironment(now, 'Asia/Manila', { ...DEFAULT_ENVIRONMENT, seasonMode: season, timeMode, weatherMode: 'clear' }, null);

test('sound mixes follow time and season while suppressing calls in winter and precipitation', () => {
  for (const season of ['neutral', 'spring', 'summer', 'autumn', 'winter', 'tropical'] as const) for (const time of ['dawn', 'day', 'dusk', 'night'] as const) {
    const f = frame(season, time), p = soundscapeProfile(f);
    for (const gain of [p.birds, p.insects]) assert.ok(gain >= 0 && gain <= 1 && Number.isFinite(gain));
    if (season === 'winter' || time === 'night') assert.equal(p.birds, 0);
    for (const override of [{ rainIntensity: 1 }, { snow: true }, { enabled: false }]) {
      const muted = soundscapeProfile({ ...f, ...override }); assert.equal(muted.birds, 0); assert.equal(muted.insects, 0);
    }
  }
  assert.equal(soundscapeProfile(frame('spring', 'dawn')).birds, 1);
  assert.equal(soundscapeProfile(frame('summer', 'dusk')).insects, .75);
  assert.ok(soundscapeProfile(frame('summer', 'night')).insects > soundscapeProfile(frame('summer', 'day')).insects);
  const f = frame('autumn', 'dawn'); assert.deepEqual(soundscapeProfile(f), soundscapeProfile({ ...f, period: 'day' }));
  const a = soundscapeProfile({ ...f, solarAngle: -1e-6 }), b = soundscapeProfile({ ...f, solarAngle: 1e-6 });
  assert.ok(Math.abs(a.birds - b.birds) < 1e-4);
});

test('only a valid volume preference survives reload, never a saved enabled flag', () => {
  assert.equal(AUDIO_KEY, 'mneme-audio-v1');
  for (const volume of [0, .3, 1]) assert.deepEqual(readAudioSettings(JSON.stringify({ version: 1, volume, enabled: true })), { version: 1, volume });
  for (const raw of [null, 'bad', 'null', '{"version":1,"volume":1e999}', '{"version":1,"volume":".2"}', '{"version":1,"volume":2}', '{"version":2,"volume":.2}']) assert.equal(readAudioSettings(raw).volume, .3);
});

test('scheduled calls vary in sparse bounded windows without same-voice overlap', () => {
  const p = { birds: 1, insects: 1 }, distinct = new Set<string>();
  for (let window = 0; window < 1000; window++) {
    const events = soundEvents(p, 1977, window); assert.deepEqual(events, soundEvents(p, 1977, window)); distinct.add(JSON.stringify(events));
    assert.ok(events.length <= 12 && events.filter(e => e.voice < 2).length <= 6 && events.filter(e => e.voice >= 2).length <= 6);
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

test('bird phrases and cricket pulses vary without adding voices or continuous noise', () => {
  const birds = new Set<number>(), insects = new Set<number>(), contours = new Set<string>();
  let birdWindows = 0, insectWindows = 0;
  for (let window = 0; window < 1000; window++) {
    const events = soundEvents({ birds: 1, insects: 1 }, 1977, window);
    const b = events.filter(e => e.voice < 2), c = events.filter(e => e.voice >= 2);
    if (b.length) { birds.add(b.length); birdWindows++; contours.add(b[0].toHz > b[0].fromHz ? 'rising' : 'falling'); }
    if (c.length) { insects.add(c.length); insectWindows++; }
  }
  assert.deepEqual([...birds].sort(), [2, 4, 6]); assert.deepEqual([...insects].sort(), [3, 6]);
  assert.equal(contours.size, 2); assert.ok(birdWindows > 450 && birdWindows < 650); assert.ok(insectWindows > 750 && insectWindows < 950);
});
