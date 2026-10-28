import test from 'node:test';
import assert from 'node:assert/strict';
import * as trees from '../lib/tree.ts';
import { readGarden } from '../lib/garden.ts';

test('each tree choice produces its species across the full random seed range', () => {
  assert.equal(typeof trees.seedForTree, 'function');
  for (const seed of [0, 7, 8, 1024, 4294967295]) {
    for (const species of trees.TREE_SPECIES) {
      const chosen = trees.seedForTree(seed, species);
      assert.equal(trees.treeFamily(chosen), species);
      assert.ok(Number.isInteger(chosen) && chosen >= 0 && chosen <= 4294967295);
      assert.equal(trees.seedForTree(chosen, species), chosen);
    }
    assert.equal(trees.seedForTree(seed, ''), seed);
    assert.equal(trees.seedForTree(seed, 'Unknown tree'), seed);
  }
  assert.notEqual(trees.seedForTree(0, 'Oak'), trees.seedForTree(1024, 'Oak'));
});

test('selected trees and existing trees retain their identity after storage reload', () => {
  assert.equal(typeof trees.seedForTree, 'function');
  const letters = [1025, trees.seedForTree(2048, 'Cherry Blossom')].map((seed, i) => ({
    id: `test-${i}`, title: 'Test letter', body: 'Synthetic test content.',
    planted: 1000, reveal: 2000, seed, position: [i * 6, 0],
  }));
  const saved = { version: 2, plots: letters.map(l => l.position), letters, time: 1000, rate: 20, playing: false, speed: 1 };
  const restored = readGarden(JSON.stringify(saved));
  assert.deepEqual(restored, saved);
  assert.equal(trees.treeFamily(restored!.letters[1].seed), 'Cherry Blossom');
});
