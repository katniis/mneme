import test from 'node:test';
import assert from 'node:assert/strict';
import * as garden from '../lib/garden.ts';
import { generateTerrain } from '../lib/terrain.ts';
import { gardenPositions } from './fixtures.ts';

function fixture() {
  const plots = gardenPositions(3);
  return { version: 2 as const, plots, letters: plots.map((position, i) => ({
    id: `letter-${i}`, title: 'Synthetic letter', body: 'Synthetic content.',
    planted: 1000, reveal: 2000, seed: i, position,
  })), time: 1500, rate: 10, playing: false, speed: 2 };
}

test('legacy gardens migrate to permanent plots without changing letters or the clock', () => {
  const state = fixture();
  const { plots, ...legacy } = { ...state, version: 1 };
  const migrated = garden.readGarden(JSON.stringify(legacy));
  assert.deepEqual(migrated, state);
  assert.deepEqual(garden.readGarden(JSON.stringify(state)), state);
  assert.equal(garden.readGarden(null), null);
});

test('deleting middle, last, and all letters retains plots and exact surviving records', () => {
  assert.equal(typeof garden.deleteLetter, 'function');
  const state = fixture();
  const copy = structuredClone(state);
  let next = garden.deleteLetter(state, state.letters[1].id);
  assert.deepEqual(next, { ...state, letters: [state.letters[0], state.letters[2]] });
  assert.equal(garden.deleteLetter(next, state.letters[1].id), next);
  assert.equal(garden.deleteLetter(next, 'missing'), next);
  next = garden.deleteLetter(next, state.letters[2].id);
  next = garden.deleteLetter(next, state.letters[0].id);
  assert.deepEqual(next, { ...state, letters: [] });
  assert.deepEqual(garden.readGarden(JSON.stringify(next)), next);
  assert.deepEqual(generateTerrain(next.plots), generateTerrain(state.plots));
  assert.deepEqual(state, copy);
});

test('planting reuses the first historical vacancy before expanding land', () => {
  assert.equal(typeof garden.nextPlanting, 'function');
  const state = fixture();
  const vacant = { ...state, letters: [state.letters[2]] };
  const first = garden.nextPlanting(vacant);
  assert.deepEqual(first, { position: state.plots[0], plots: state.plots });
  const second = garden.nextPlanting({ ...vacant, letters: [state.letters[0], state.letters[2]] });
  assert.deepEqual(second.position, state.plots[1]);
  const full = garden.nextPlanting(state);
  assert.equal(full.plots.length, 4);
  assert.deepEqual(full.plots.slice(0, 3), state.plots);
  assert.deepEqual(full.position, full.plots[3]);
  assert.ok(state.plots.every(p => Math.hypot(p[0] - full.position[0], p[1] - full.position[1]) >= 4.8));
  assert.deepEqual(garden.nextPlanting({ ...state, plots: [], letters: [] }), { position: [0, 0], plots: [[0, 0]] });
});

test('storage rejects invalid plots, overlapping occupants, and unsupported versions', () => {
  const state = fixture();
  for (const invalid of [
    { ...state, version: 3 }, { ...state, plots: null }, { ...state, plots: [[null, 0]] },
    { ...state, plots: [...state.plots, state.plots[0]] },
    { ...state, plots: state.plots.slice(1) },
    { ...state, letters: [...state.letters, { ...state.letters[0], id: 'overlap' }] },
    { ...state, letters: [null] },
  ]) assert.equal(garden.readGarden(JSON.stringify(invalid)), null);
});
