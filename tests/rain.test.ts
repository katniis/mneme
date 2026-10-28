import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RAIN_POOLS, rainSample, resolveEnvironment, terrainColour, DEFAULT_ENVIRONMENT, type WeatherSnapshot } from '../lib/environment.ts';
import { generateTerrain } from '../lib/terrain.ts';
import { gardenPositions } from './fixtures.ts';

test('rain pools stay within the bounded ceilings', () => {
  assert.deepEqual(RAIN_POOLS.desktop, { drops: 1200, splashes: 120 });
  assert.deepEqual(RAIN_POOLS.mobile, { drops: 450, splashes: 40 });
});

test('rain lands on real grass tops for one-tree and 49-tree islands', () => {
  for (const count of [1, 49]) {
    const terrain = generateTerrain(gardenPositions(count));
    const tops = terrain.filter((v) => v.kind === 'grass').map((v) => ({ x: v.position[0], y: v.position[1] + v.size[1] / 2, z: v.position[2] }));
    assert.ok(tops.length > 0);
    const topKeys = new Set(tops.map((t) => `${t.x}:${t.y}:${t.z}`));
    for (let i = 0; i < 120; i++) {
      const sample = rainSample(i, i * 0.23, tops)!;
      assert.ok(Number.isFinite(sample.x) && Number.isFinite(sample.y) && Number.isFinite(sample.z));
      assert.ok(tops.some((t) => t.x === sample.x && t.z === sample.z), 'drop column is a real grass column');
      assert.ok(sample.y >= Math.min(...tops.map((t) => t.y)) - 0.001, 'drop never falls below the island surface band');
      if (sample.impact) assert.ok(topKeys.has(`${sample.x}:${sample.y}:${sample.z}`), 'impact is exactly on a grass top');
    }
  }
});

test('snow never enables rain and seasonal colour leaves stored voxels untouched', () => {
  const now = Date.parse('2026-10-28T04:00:00Z');
  const snowWeather: WeatherSnapshot = { fetchedAt: now, observedAt: now, timeZone: 'Asia/Manila', rainMm: 4, code: 75, cloudCover: 0.8, temperatureC: 1, isDay: true, sunrise: [], sunset: [] };
  const prefs = { ...DEFAULT_ENVIRONMENT, location: { name: 'Oslo, Norway', latitude: 59.9, longitude: 10.7, timeZone: 'Europe/Oslo', source: 'city' as const, deviceZoneAtSelection: 'Asia/Manila' } };
  const frame = resolveEnvironment(now, 'Asia/Manila', prefs, snowWeather);
  assert.equal(frame.rainIntensity, 0);
  assert.equal(frame.snow, true);
  const terrain = generateTerrain(gardenPositions(3));
  const before = terrain.map((v) => ({ ...v, position: [...v.position] as typeof v.position }));
  for (const voxel of terrain) terrainColour(voxel.color, voxel.kind, 'winter');
  assert.deepEqual(terrain, before, 'seasonal tinting never mutates terrain records');
  assert.equal(terrainColour(terrain[0].color, terrain[0].kind, 'neutral'), terrain[0].color);
});
