import test from 'node:test';
import assert from 'node:assert/strict';
import * as trees from '../lib/tree.ts';
import { readGarden } from '../lib/garden.ts';

test('each tree choice produces its species across the full random seed range', () => {
  assert.equal(typeof trees.seedForTree, 'function');
  for (const seed of [0, 7, 8, 1024, 4294967295]) {
    for (const species of trees.TREE_SPECIES) {
      const chosen = trees.chooseTree(seed, species);
      assert.equal(trees.treeFamily(chosen.seed, chosen.species), species);
      assert.ok(Number.isInteger(chosen.seed) && chosen.seed >= 0 && chosen.seed <= 4294967295);
      assert.equal(trees.seedForTree(chosen.seed, species), chosen.seed);
    }
    assert.equal(trees.seedForTree(seed, ''), seed);
    assert.equal(trees.seedForTree(seed, 'Unknown tree'), seed);
  }
  assert.notEqual(trees.seedForTree(0, 'Oak'), trees.seedForTree(1024, 'Oak'));
});

test('nine-way surprise and explicit identity preserve every legacy seed mapping', () => {
  const names = ['Oak', 'Birch', 'Maple', 'Cherry Blossom', 'Weeping Willow', 'Pine', 'Jacaranda', 'Spruce'];
  assert.equal(trees.TREE_SPECIES.length, 9);
  const choices = new Set();
  for (const seed of [...Array.from({ length: 4096 }, (_, i) => i), 2 ** 32, 2 ** 40 + 3, Number.MAX_SAFE_INTEGER]) {
    assert.equal(trees.treeFamily(seed), names[seed % 8]);
    assert.deepEqual(trees.chooseTree(seed, ''), trees.chooseTree(seed, ''));
    choices.add(trees.chooseTree(seed, '').species);
    assert.deepEqual(trees.chooseTree(seed, 'Bad tree'), { seed, species: names[seed % 8] });
  }
  assert.equal(choices.size, 9);
  assert.notDeepEqual(trees.generateTree(100, 'Oak'), trees.generateTree(100, 'Moonveil'));
});

test('optional species survives reload and invalid metadata cannot discard a valid letter', () => {
  for (const species of ['Moonveil', 'Oak', 'Bad tree', 10, null]) {
    const letter = { id: 'synthetic', title: '', body: 'Synthetic content', seed: 100, species, planted: 1, reveal: 2, position: [0, 0] };
    const restored = readGarden(JSON.stringify({ version: 2, plots: [[0, 0]], letters: [letter], time: 1, rate: 1, playing: false, speed: 1 }));
    assert.ok(restored); assert.equal(restored.letters[0].body, letter.body);
    assert.equal(restored.letters[0].species, species === 'Moonveil' || species === 'Oak' ? species : undefined);
  }
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
