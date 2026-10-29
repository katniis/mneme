import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELL } from '../lib/terrain.ts';
import { makeParticleField, type ParticlePose } from '../lib/atmosphere.ts';
import { SNOW_LIMITS, spawnSnow, sampleSnow, snowSize } from '../lib/snow.ts';

const field = makeParticleField([0, 0], 5, 10, { position: [0, 12, 20], target: [0, 0, 0], aspect: 1 });
const pose = (): ParticlePose => ({ position: [0, 0, 0], rotation: [0, 0, 0], size: [0, 0, 0], opacity: 0, finished: false });

test('seeded snow has bounded varied speed, phase, size and wind', () => {
  const phases = new Set<number>();
  for (let i = 0; i < 640; i++) {
    const p = spawnSnow(i, 0, field); assert.deepEqual(p, spawnSnow(i, 0, field));
    assert.equal(p.origin[1], field.top);
    assert.ok(Math.abs(p.origin[0]) <= field.halfWidth && Math.abs(p.origin[2]) <= field.halfDepth);
    assert.ok(p.speed >= 1.2 && p.speed <= 2.2 && p.size >= .045 && p.size <= .09 && p.wind >= .15 && p.wind <= .45);
    phases.add(p.phase);
  }
  assert.equal(phases.size, 640); assert.deepEqual(SNOW_LIMITS, { desktop: 640, mobile: 240 });
});

test('snow drifts from a latched origin and collides at its current horizontal position', () => {
  const p = spawnSnow(7, 0, field), original = JSON.stringify(p), out = pose(), ref = out.position;
  sampleSnow(p, 0, new Map(), out); assert.deepEqual(out.position, p.origin);
  sampleSnow(p, 5, new Map(), out); assert.ok(Math.abs(out.position[1] - (p.origin[1] - p.speed * 5)) < 1e-10);
  assert.notEqual(out.position[0], p.origin[0]); assert.equal(out.finished, false);
  const [x, y, z] = out.position, column = { x: Math.round(x / CELL) * CELL, y: y + .1, z: Math.round(z / CELL) * CELL };
  const columns = new Map([[`${Math.round(x / CELL)}:${Math.round(z / CELL)}`, column]]);
  sampleSnow(p, 5, columns, out); assert.equal(out.finished, true);
  makeParticleField([50, 20], 32, 20, { position: [100, 80, 100], target: [50, 0, 20], aspect: .5 });
  assert.equal(JSON.stringify(p), original); assert.equal(out.position, ref);
  sampleSnow(p, 1000, new Map(), out); assert.equal(out.finished, true);
});

test('snow remains readable at distance without oversized near-camera flakes', () => {
  for (const d of [0, 2, 40, 200, 2000]) {
    assert.equal(snowSize(.06, d), Math.max(.035, Math.min(.5, .06 * (1 + d / 45))));
  }
  assert.ok(snowSize(.06, 200) > .2); assert.equal(snowSize(.09, 2000), .5);
});
