import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeParticleField, rainSpawn, rainPosition, rainStreakSize } from '../lib/atmosphere.ts';
import { RAIN_LIMITS, terrainColour } from '../lib/environment.ts';
import { CELL, generateTerrain, placement, type Position } from '../lib/terrain.ts';

test('rain covers surrounding void and only impacts actual grass cells', () => {
  const field = makeParticleField([0, 0], 4, 8, { position: [0, 12, 20], target: [0, 0, 0], aspect: 1 });
  const ground = new Map([['0:0', { x: 0, y: .4, z: 0 }]]);
  let land = 0, voids = 0;
  for (let i = 0; i < 10000; i++) {
    const spawn = rainSpawn(i, 0, field, ground);
    assert.deepEqual(spawn, rainSpawn(i, 0, field, ground));
    assert.ok(Math.abs(spawn.x) <= field.halfWidth && Math.abs(spawn.z) <= field.halfDepth);
    if (spawn.impactY !== null) { land++; assert.equal(spawn.impactY, .4); assert.ok(Math.abs(spawn.x) <= CELL / 2); }
    else voids++;
  }
  assert.ok(land > 0 && voids > land);
  const empty = rainSpawn(3, 0, field, new Map());
  assert.equal(empty.impactY, null);
  assert.ok(Math.abs(rainPosition(empty, (empty.top + 2) / 12).y + 2) < 1e-10);
  assert.equal(rainPosition(empty, 100).impact, false);
});
test('rain stops on land, falls below void and finishes without duplicate impacts', () => {
  const spawn = { x: 0, z: 0, top: 12, bottom: -16, impactY: 0 };
  assert.equal(rainPosition(spawn, -.5).y, 12);
  assert.equal(rainPosition(spawn, .5).y, 6);
  assert.deepEqual(rainPosition(spawn, 1), { x: 0, y: 0, z: 0, impact: true, finished: false });
  assert.equal(rainPosition(spawn, 1.11).finished, true);
  assert.equal(rainPosition(spawn, 1.11).impact, false);
  assert.equal(rainPosition({ ...spawn, impactY: null }, 1.5).y, -6);
  assert.equal(rainPosition({ ...spawn, impactY: null }, 3).finished, true);
});
test('field bounds and degenerate camera directions are finite and existing spawns stay latched', () => {
  const first = makeParticleField([0, 0], 4, 8, { position: [0, 20, 0], target: [0, 0, 0], aspect: 1 });
  assert.deepEqual(first.forward, [0, 1]); assert.deepEqual(first.right, [1, 0]);
  assert.equal(first.halfDepth, 13); assert.equal(first.top, 32); assert.equal(first.bottom, -16);
  const spawn = rainSpawn(7, 1, first, new Map()), before = JSON.stringify(spawn);
  const second = makeParticleField([50, 20], 30, 14, { position: [80, 80, 100], target: [50, 0, 20], aspect: 2 });
  assert.ok(second.halfDepth >= 54); assert.ok(second.halfWidth >= 108);
  assert.ok(Math.abs(second.forward[0] * second.right[0] + second.forward[1] * second.right[1]) < 1e-12);
  rainPosition(spawn, 1); assert.equal(JSON.stringify(spawn), before);
  assert.notDeepEqual(rainSpawn(7, 2, second, new Map()), spawn);
});
test('distant and near-camera rain stays readable without huge streaks', () => {
  assert.ok(rainStreakSize(200).width >= .1 && rainStreakSize(200).length >= .7);
  assert.ok(rainStreakSize(2).length < .03);
  assert.ok(rainStreakSize(1000).length <= 1.5 && rainStreakSize(1000).width <= .16);
  const high = makeParticleField([0, 0], 32, 12, { position: [100, 100, 100], target: [0, 0, 0], aspect: .5 });
  assert.ok(high.top > 200 && high.bottom < -50);
});
test('atmospheric effects never mutate retained 49-plot ground and keep pool ceilings', () => {
  const plots: Position[] = [[0, 0]];
  while (plots.length < 49) plots.push(placement(plots));
  const terrain = generateTerrain(plots), before = JSON.stringify(terrain);
  for (const season of ['neutral', 'spring', 'summer', 'autumn', 'winter', 'tropical'] as const) terrain.forEach(v => terrainColour(v.color, v.kind, season));
  assert.equal(JSON.stringify(terrain), before);
  assert.ok(RAIN_LIMITS.desktop.drops <= 1200 && RAIN_LIMITS.mobile.drops <= 450);
  assert.ok(RAIN_LIMITS.desktop.splashes <= 120 && RAIN_LIMITS.mobile.splashes <= 40);
});
