import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleAmbience, leafSources, leafOrigin, spawnAmbient, sampleAmbientParticle, ambientSizeScale, AMBIENCE_LIMITS } from '../lib/ambience.ts';
import { DEFAULT_ENVIRONMENT, resolveEnvironment, type Season, type TimeMode } from '../lib/environment.ts';
import { generateTree, seedForTree, elementProgress } from '../lib/tree.ts';
import { groundHeight } from '../lib/terrain.ts';
import type { ParticlePose } from '../lib/atmosphere.ts';

const now = Date.parse('2026-10-29T04:00:00Z');
const frame = (season: Season, timeMode: TimeMode) => resolveEnvironment(now, 'Asia/Manila', { ...DEFAULT_ENVIRONMENT, seasonMode: season, timeMode, weatherMode: 'clear' }, null);
test('all seasonal phases are bounded, calm and respect weather and feature switches', () => {
  for (const season of ['neutral', 'spring', 'summer', 'autumn', 'winter', 'tropical'] as const) for (const time of ['dawn', 'day', 'dusk', 'night'] as const) {
    const f = frame(season, time), p = sampleAmbience(f);
    for (const n of [p.motes, p.debris, p.fireflies]) assert.ok(Number.isFinite(n) && n >= 0 && n <= 1);
    if (time === 'day' || season === 'winter') assert.equal(p.fireflies, 0);
    if (season === 'winter') assert.equal(p.debris, 0);
    for (const off of [{ snow: true }, { ambience: false }, { enabled: false }]) {
      const q = sampleAmbience({ ...f, ...off }); assert.deepEqual([q.motes, q.debris, q.fireflies], [0, 0, 0]);
    }
    const wet = sampleAmbience({ ...f, rainIntensity: 1, cloudCover: 1 });
    assert.ok(wet.motes <= p.motes * .15000001 && wet.debris <= p.debris * .15000001); assert.equal(wet.fireflies, 0);
  }
  const day = sampleAmbience(frame('summer', 'day')); assert.equal(day.motes, 1);
  assert.equal(sampleAmbience(frame('spring', 'dawn')).debris, .6);
  assert.equal(sampleAmbience(frame('autumn', 'dusk')).debris, .6);
  assert.equal(sampleAmbience({ ...frame('summer', 'day'), solarAngle: .1 }).fireflies, 0);
  const f = frame('summer', 'dawn');
  assert.deepEqual(sampleAmbience(f), sampleAmbience({ ...f, period: 'day' }));
  const before = sampleAmbience({ ...f, solarAngle: -1e-6 }), after = sampleAmbience({ ...f, solarAngle: 1e-6 });
  assert.ok(Math.abs(before.motes - after.motes) < 1e-4);
  assert.deepEqual(AMBIENCE_LIMITS, { desktop: { motes: 160, debris: 96, fireflies: 32 }, mobile: { motes: 56, debris: 32, fireflies: 8 } });
});

test('only visible, appropriate foliage supplies petals and leaves without mutating trees', () => {
  for (const species of ['Cherry Blossom', 'Jacaranda', 'Oak', 'Pine', 'Spruce']) {
    const seed = seedForTree(129, species), voxels = generateTree(seed), before = JSON.stringify(voxels);
    const tree = { id: species, seed, position: [2, 3] as [number, number], planted: 0, reveal: 100 };
    const sources = leafSources([{ tree, voxels }]); assert.ok(sources.length <= 16 && sources.length > 0);
    for (const source of sources) {
      assert.equal(source.voxel.kind, 'leaf'); assert.equal(leafOrigin(source, 0, 'autumn'), null);
      const petals = leafOrigin(source, 100, 'spring');
      assert.equal(!!petals, species === 'Cherry Blossom' || species === 'Jacaranda');
      const leaves = leafOrigin(source, 100, 'autumn'); assert.equal(!!leaves, species !== 'Pine' && species !== 'Spruce');
      if (leaves) { const v = source.voxel, g = elementProgress(v, 1); assert.deepEqual(leaves, [2 + v.anchor[0] + (v.position[0] - v.anchor[0]) * g, groundHeight(2, 3) + v.anchor[1] + (v.position[1] - v.anchor[1]) * g, 3 + v.anchor[2] + (v.position[2] - v.anchor[2]) * g]); }
    }
    assert.equal(JSON.stringify(voxels), before);
  }
  assert.deepEqual(leafSources([]), []);
});

test('ambient motion is seeded, reuses its pose and finishes without changing origins', () => {
  for (const kind of ['mote', 'petal', 'leaf', 'firefly'] as const) {
    const p = spawnAmbient(kind, 5, 2, [1, 3, 4]), before = JSON.stringify(p);
    assert.deepEqual(p, spawnAmbient(kind, 5, 2, [1, 3, 4]));
    const out: ParticlePose = { position: [0, 0, 0], rotation: [0, 0, 0], size: [0, 0, 0], opacity: 0, finished: false }, position = out.position;
    sampleAmbientParticle(p, 1, out); assert.ok([...out.position, ...out.rotation, ...out.size, out.opacity].every(Number.isFinite));
    assert.equal(out.position, position); assert.equal(JSON.stringify(p), before);
    sampleAmbientParticle(p, p.duration, out); assert.equal(out.finished, true); assert.equal(out.opacity, 0);
  }
});

test('distant fireflies keep a small readable angular size within the existing pool budget', () => {
  for (const distance of [40, 80, 200]) {
    const angularSize = .055 * ambientSizeScale('firefly', distance) / distance;
    assert.ok(angularSize >= .0018 && angularSize <= .0025);
    assert.ok(ambientSizeScale('mote', distance) <= 2.5);
  }
  assert.ok(ambientSizeScale('firefly', 2000) <= 12);
});
