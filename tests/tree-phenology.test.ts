import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree } from '../lib/tree.ts';
import { ALL_TREE_SPECIES, type TreeSpecies } from '../lib/trees/profiles.ts';
import { sampleTreeAppearance } from '../lib/trees/phenology.ts';
import { freezeBlocks } from '../lib/tree-removal.ts';
import { leafOrigin, leafSources } from '../lib/ambience.ts';
import type { Voxel } from '../lib/tree.ts';

const expected = [[.8, 1, .55, 0], [.75, 1, .45, 0], [.8, 1, .65, 0], [.25, 1, .6, 0], [.8, 1, .7, 0], [1, 1, 1, 1], [.2, 1, .8, .2], [1, 1, 1, 1], [1, 1, 1, 1]];
const v: Voxel = { position: [0, 1, 0], anchor: [0, 1, 0], size: [.06, .02, .06], start: .5, end: .6, parent: 0, color: '#527949', kind: 'leaf', organ: 'leaf', organId: 0 };

test('all six seasons resolve the specified whole-organ densities without changing anatomy', () => {
  ALL_TREE_SPECIES.forEach((species, index) => {
    for (const [s, season] of (['spring', 'summer', 'autumn', 'winter', 'neutral', 'tropical'] as const).entries()) {
      let visible = 0;
      for (let id = 0; id < 1000; id++) {
        const a = sampleTreeAppearance({ ...v, organId: id }, species, season);
        assert.deepEqual(a, sampleTreeAppearance({ ...v, position: [1, 2, 3], organId: id }, species, season));
        assert.ok(a.scale === 0 || a.scale === 1); visible += a.scale;
      }
      assert.ok(Math.abs(visible / 1000 - (s < 4 ? expected[index][s] : 1)) < .04, `${species} ${season} density ${visible / 1000}`);
    }
    const tree = generateTree(300, species), before = JSON.stringify(tree);
    tree.forEach(x => sampleTreeAppearance(x, species, 'autumn'));
    assert.equal(JSON.stringify(tree), before);
  });
});

test('flowers, needles, juvenile leaves and Moonveil emission follow their own cycles', () => {
  const flower = { ...v, organ: 'blossom' as const };
  for (const season of ['summer', 'autumn', 'winter', 'neutral', 'tropical'] as const) assert.equal(sampleTreeAppearance(flower, 'Cherry Blossom', season).scale, 0);
  assert.equal(sampleTreeAppearance(flower, 'Cherry Blossom', 'spring', .64).scale, 0);
  assert.equal(sampleTreeAppearance(flower, 'Cherry Blossom', 'spring', 1).scale, 1);
  assert.equal(sampleTreeAppearance({ ...v, organ: 'juvenile-leaf' }, 'Oak', 'summer', .21).scale, 0);
  assert.equal(sampleTreeAppearance({ ...v, organ: 'juvenile-leaf' }, 'Oak', 'winter', .1).scale, 0);
  assert.equal(sampleTreeAppearance({ ...v, organ: 'juvenile-leaf' }, 'Oak', 'summer', .1).scale, 1);
  const residual = Array.from({ length: 1000 }, (_, id) => sampleTreeAppearance({ ...flower, organId: id }, 'Jacaranda', 'summer').scale).reduce((a, b) => a + b, 0);
  assert.ok(residual > 70 && residual < 130);
  for (const species of ['Pine', 'Spruce'] as const) assert.equal(sampleTreeAppearance({ ...v, organ: 'needle' }, species, 'winter').scale, 1);
  assert.notEqual(sampleTreeAppearance(v, 'Maple', 'summer').color, sampleTreeAppearance(v, 'Maple', 'autumn').color);
  assert.equal(sampleTreeAppearance({ ...v, emissive: .6 }, 'Oak', 'winter').emissive, 0);
  assert.equal(sampleTreeAppearance({ ...v, organ: 'fruit', emissive: .6 }, 'Moonveil', 'winter').emissive, .6);
});

test('removal snapshots freeze exactly the visible seasonal set and colour once', () => {
  const tree = generateTree(2), appearance = tree.map(v => sampleTreeAppearance(v, 'Maple', 'winter'));
  const winter = freezeBlocks(tree, 1, appearance);
  assert.ok(winter.every(v => v.kind === 'wood'));
  const autumn = freezeBlocks(tree, 1, tree.map(v => sampleTreeAppearance(v, 'Maple', 'autumn'))), saved = JSON.stringify(autumn);
  assert.ok(autumn.some(v => v.kind === 'leaf' && v.color !== tree[v.sourceIndex].color));
  tree.forEach(v => sampleTreeAppearance(v, 'Maple', 'summer')); assert.equal(JSON.stringify(autumn), saved);
});

test('debris comes from matching visible organs and excludes needles and Moonveil', () => {
  for (const species of ALL_TREE_SPECIES) {
    const voxels = generateTree(100, species), tree = { id: species, seed: 100, species, position: [0, 0] as [number, number], planted: 0, reveal: 1 };
    const sources = leafSources([{ tree, voxels }]);
    for (const season of ['spring', 'autumn', 'winter', 'tropical'] as const) for (const source of sources) {
      const origin = leafOrigin(source, 1, season);
      if (!origin) continue;
      assert.ok(!(['Pine', 'Spruce', 'Moonveil'] as TreeSpecies[]).includes(species));
      assert.ok(sampleTreeAppearance(source.voxel, species, season).scale > 0);
      assert.equal(source.voxel.organ, season === 'spring' ? 'blossom' : 'leaf');
    }
  }
});
