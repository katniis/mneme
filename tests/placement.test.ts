import test from 'node:test';
import assert from 'node:assert/strict';
import { placement, type Position } from '../lib/terrain.ts';
import { gardenPositions } from './fixtures.ts';

test('planting is deterministic, irregular, and spaced for mature trees', () => {
  const positions = gardenPositions(49);
  assert.deepEqual(positions, gardenPositions(49));
  assert.deepEqual(positions[0], [0, 0]);
  for (let i = 1; i < positions.length; i++) {
    const distances = positions.slice(0, i).map(p => Math.hypot(p[0] - positions[i][0], p[1] - positions[i][1]));
    assert.ok(Math.min(...distances) >= 4.8, `tree ${i} crowds an existing tree`);
    assert.ok(Math.min(...distances) <= 6, `tree ${i} is too far from the garden`);
  }
  assert.ok(new Set(positions.map(p => p[0].toFixed(2))).size > 40, 'trees must not form repeated columns');
  assert.ok(new Set(positions.map(p => p[1].toFixed(2))).size > 40, 'trees must not form repeated rows');
});

test('new planting respects the actual positions in an older grid garden', () => {
  const saved: Position[] = [[0, 0], [5.85, 0], [5.85, 5.85], [0, 5.85]];
  const original = structuredClone(saved);
  const next = placement(saved);
  assert.deepEqual(saved, original);
  assert.deepEqual(next, placement(saved));
  for (const p of saved) assert.ok(Math.hypot(p[0] - next[0], p[1] - next[1]) >= 4.8);
});
