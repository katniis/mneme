import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree } from '../lib/tree.ts';
import { TREE_PROFILES } from '../lib/trees/profiles.ts';
import { buildBroadleafSkeleton } from '../lib/trees/broadleaf.ts';
import { colonize } from '../lib/trees/colonization.ts';
import { assertTree } from './tree-assertions.ts';

for (const [species, seeds] of [['Oak', [0, 8, 16]], ['Birch', [1, 9, 17]], ['Maple', [2, 10, 18]]] as const) {
  test(`${species} has its researched proportions, branching and attached organs across seeds`, () => {
    for (const seed of seeds) {
      const tree = generateTree(seed), p = TREE_PROFILES[species];
      const height = Math.max(...tree.map(v => v.position[1] + v.size[1] / 2));
      const leaves = tree.filter(v => v.organ === 'leaf');
      const width = Math.max(...[0, 2].map(axis => Math.max(...leaves.map(v => v.position[axis] + v.size[axis] / 2)) - Math.min(...leaves.map(v => v.position[axis] - v.size[axis] / 2))));
      assert.ok(height >= p.height[0] && height <= p.height[1], `height ${height}`);
      assert.ok(width / height >= p.crownRatio[0] && width / height <= p.crownRatio[1], `ratio ${width / height}`);
      assert.ok(leaves.length > 500); assertTree(tree);
      const skeleton = buildBroadleafSkeleton(seed, species);
      assert.ok(skeleton.nodes.length <= 512);
      if (species === 'Birch') assert.ok(skeleton.nodes.some(n => n.organ === 'twig' && n.parent >= 0 && n.position[1] < skeleton.nodes[n.parent].position[1]));
      if (species === 'Maple') assert.ok(leaves.every(v => !['#c33d26', '#d95d28'].includes(v.color)), 'base foliage is green');
    }
  });
}

test('colonization ends for unreachable and coincident attractors without mutating its input', () => {
  const skeleton = buildBroadleafSkeleton(0, 'Oak'), before = JSON.stringify(skeleton);
  for (const points of [[], [[100, 100, 100]], [skeleton.nodes[0].position]]) {
    const result = colonize(0, skeleton, points as [number, number, number][]);
    assert.ok(result.nodes.length <= 512); assert.equal(JSON.stringify(skeleton), before);
  }
});

