import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rainSample, RAIN_LIMITS, terrainColour } from '../lib/environment.ts';
import { generateTerrain, placement, type Position } from '../lib/terrain.ts';
test('rain is deterministic, selects real grass columns and never descends below their top', () => {
  const plots: Position[] = [[0, 0]];
  while (plots.length < 49) plots.push(placement(plots));
  const terrain = generateTerrain(plots);
  const before = JSON.stringify(terrain);
  const ground = terrain.filter(v => v.kind === 'grass').map(v => ({ x: v.position[0], y: v.position[1] + v.size[1] / 2, z: v.position[2] }));
  let impacts = 0;
  for (let i = 0; i < 2000; i++) {
    const s = rainSample(i % 1200, i / 70, ground)!;
    assert.deepEqual(s, rainSample(i % 1200, i / 70, ground));
    const column = ground.find(g => g.x === s.x && g.z === s.z)!;
    assert.ok(column); assert.ok(Number.isFinite(s.y)); assert.ok(s.y >= column.y && s.y <= column.y + 12);
    if (s.impact) { assert.equal(s.y, column.y); impacts++; }
  }
  assert.ok(impacts > 0);
  for (const season of ['neutral', 'spring', 'summer', 'autumn', 'winter', 'tropical'] as const) terrain.forEach(v => terrainColour(v.color, v.kind, season));
  assert.equal(JSON.stringify(terrain), before);
});
test('empty rain is safe and particle pools are bounded for both device classes', () => {
  assert.equal(rainSample(0, 100, []), null);
  assert.deepEqual(RAIN_LIMITS, { desktop: { drops: 1200, splashes: 120 }, mobile: { drops: 450, splashes: 40 } });
});
