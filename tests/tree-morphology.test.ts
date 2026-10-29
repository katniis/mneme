import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree } from '../lib/tree.ts';
import { TREE_PROFILES } from '../lib/trees/profiles.ts';
import { buildBroadleafSkeleton } from '../lib/trees/broadleaf.ts';
import { colonize } from '../lib/trees/colonization.ts';
import { buildFloweringSkeleton } from '../lib/trees/flowering.ts';
import { buildPineSkeleton } from '../lib/trees/pine.ts';
import { buildSpruceSkeleton } from '../lib/trees/spruce.ts';
import { buildWillowSkeleton } from '../lib/trees/willow.ts';
import { buildMoonveilSkeleton } from '../lib/trees/moonveil.ts';
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

test('Moonveil has connected twisting stems, offset crowns and attached glowing pods', () => {
  for (const seed of [100, 200, 300]) {
    const tree = generateTree(seed, 'Moonveil'), s = buildMoonveilSkeleton(seed);
    assertTree(tree);
    const h = Math.max(...tree.map(v => v.position[1] + v.size[1] / 2));
    assert.ok(h >= 6.7 && h <= 7.7, `height ${h}`);
    assert.ok(s.nodes.filter(n => n.organ === 'trunk').length > 12);
    assert.ok(tree.filter(v => v.organ === 'fruit').length >= 12);
    assert.ok(tree.every(v => (v.emissive ?? 0) <= .6));
  }
  for (let seed = 0; seed < 8; seed++) assert.ok(generateTree(seed).every(v => !v.emissive));
});

test('budgeted oak foliage reaches the crown and willow carries leaves above its curtains', () => {
  for (const seed of [0, 8, 16, 4, 12, 20]) {
    const tree = generateTree(seed), h = Math.max(...tree.map(v => v.position[1]));
    const leaves = tree.filter(v => v.organ === 'leaf');
    assert.ok(leaves.some(v => v.position[1] > h * .94), `seed ${seed} has a bare crown`);
    if (seed % 8 === 0) assert.ok(Math.min(...leaves.map(v => v.position[1])) < h * .6, 'oak has a deep rounded crown');
  }
});

test('jacaranda fronds subdivide into fine paired leaflets on separate pinna rachises', () => {
  const tree = generateTree(6), leaf = tree.find(v => v.organ === 'leaf')!;
  const frond = tree.filter(v => v.organId === leaf.organId);
  assert.ok(frond.some(v => v.size[0] < .025 && v.size[2] > .04), 'tiny paired leaflets');
  assert.ok(frond.some(v => v.size[0] > .1), 'transverse pinna rachises');
  assert.ok(frond.some(v => v.size[2] > .3), 'main frond rachis');
});

test('oak leaves occupy multiple points along shoots instead of gathering at terminal knots', () => {
  const tree = generateTree(0), leaves = tree.filter(v => v.organ === 'leaf' && tree[v.parent]?.kind === 'wood');
  assert.ok(new Set(leaves.map(v => v.parent)).size > leaves.length * .4);
});

test('broadleaf scaffolds preserve a stout oak bole and opposite maple leaf attachment', () => {
  const bole = (seed: number) => generateTree(seed).filter(v => v.kind === 'wood' && Math.abs(v.position[1] - .52) < .001).length;
  assert.ok(bole(0) > bole(1) && bole(0) > bole(2));
  const sites = buildBroadleafSkeleton(2, 'Maple').sites;
  for (const site of sites) assert.ok(sites.some(other => other !== site && other.node === site.node && other.along === site.along
    && Math.abs(other.direction[0] + site.direction[0]) < 1e-8 && Math.abs(other.direction[2] + site.direction[2]) < 1e-8));
});

test('pine needles occur in pairs while spruce needles surround tapering shoots', () => {
  for (const seed of [5, 13, 21, 7, 15, 23]) {
    const tree = generateTree(seed), needles = tree.filter(v => v.organ === 'needle'), groups = new Map<number, number>();
    for (const v of needles) groups.set(v.organId!, (groups.get(v.organId!) ?? 0) + 1);
    assert.ok([...groups.values()].every(n => n === (seed % 8 === 5 ? 2 : 5)));
    if (seed % 8 === 7) {
      const h = Math.max(...tree.map(v => v.position[1])), radius = (low: number, high: number) => Math.max(...needles.filter(v => v.position[1] > h * low && v.position[1] < h * high).map(v => Math.hypot(v.position[0], v.position[2])));
      assert.ok(radius(.2, .5) > radius(.75, 1));
    }
  }
});

test('colonization ends for unreachable and coincident attractors without mutating its input', () => {
  const skeleton = buildBroadleafSkeleton(0, 'Oak'), before = JSON.stringify(skeleton);
  for (const points of [[], [[100, 100, 100]], [skeleton.nodes[0].position]]) {
    const result = colonize(0, skeleton, points as [number, number, number][]);
    assert.ok(result.nodes.length <= 512); assert.equal(JSON.stringify(skeleton), before);
  }
});

test('a crown with cancelling attraction directions stops when no shoot can advance', () => {
  let reads = 0;
  const points = [-1, 1].map(side => new Proxy([side * Math.sqrt(1 - .06 ** 2), -.02, 0], {
    get(target, property, receiver) { if (['0', '1', '2'].includes(String(property))) reads++; return Reflect.get(target, property, receiver); },
  }) as [number, number, number]);
  const result = colonize(0, { nodes: [{ position: [0, .04, 0], parent: -1, radius: .02, organ: 'root', order: 0 }], sites: [] }, points);
  assert.equal(result.nodes.length, 1); assert.ok(reads < 100, `no-progress crown re-read its attractors ${reads} times`);
});

for (const [species, seeds] of [['Cherry Blossom', [3, 11, 19]], ['Jacaranda', [6, 14, 22]]] as const) {
  test(`${species} has distinct supported foliage and late flowering organs`, () => {
    for (const seed of seeds) {
      const tree = generateTree(seed), p = TREE_PROFILES[species];
      const h = Math.max(...tree.map(v => v.position[1] + v.size[1] / 2));
      const width = Math.max(...[0, 2].map(a => Math.max(...tree.map(v => v.position[a])) - Math.min(...tree.map(v => v.position[a]))));
      assert.ok(h >= p.height[0] && h <= p.height[1], `height ${h}`);
      assert.ok(width / h >= p.crownRatio[0] && width / h <= p.crownRatio[1], `ratio ${width / h}`);
      const blooms = tree.filter(v => v.organ === 'blossom'), leaves = tree.filter(v => v.organ === 'leaf');
      assert.ok(blooms.length > 100 && leaves.length > 500);
      assert.ok(blooms.every(v => v.start >= .65));
      const ids = new Set(leaves.map(v => v.organId)); assert.ok(blooms.every(v => !ids.has(v.organId)));
      const skeleton = buildFloweringSkeleton(seed, species);
      if (species === 'Cherry Blossom') assert.ok(!skeleton.nodes.some(v => v.position[1] > h * .8 && Math.hypot(v.position[0], v.position[2]) < .4));
      else assert.ok(skeleton.nodes.filter(v => v.organ === 'trunk').some(v => v.position[1] > h * .4));
      assertTree(tree);
    }
  });
}

for (const [species, seeds, build] of [['Pine', [5, 13, 21], buildPineSkeleton], ['Spruce', [7, 15, 23], buildSpruceSkeleton], ['Weeping Willow', [4, 12, 20], buildWillowSkeleton]] as const) {
  test(`${species} keeps its diagnostic crown, organs and connected bare structure`, () => {
    for (const seed of seeds) {
      const tree = generateTree(seed), p = TREE_PROFILES[species], s = build(seed);
      const h = Math.max(...tree.map(v => v.position[1] + v.size[1] / 2));
      const foliage = tree.filter(v => v.organ === (species === 'Weeping Willow' ? 'leaf' : 'needle'));
      const width = Math.max(...[0, 2].map(a => Math.max(...foliage.map(v => v.position[a])) - Math.min(...foliage.map(v => v.position[a]))));
      assert.ok(h >= p.height[0] && h <= p.height[1], `height ${h}`);
      assert.ok(width / h >= p.crownRatio[0] && width / h <= p.crownRatio[1], `ratio ${width / h}`);
      assert.ok(foliage.length > 500); assert.ok(tree.every(v => v.position[1] - v.size[1] / 2 > -.04));
      if (species === 'Pine') {
        assert.ok(foliage.filter(v => v.position[1] < h * .4).length / foliage.length < .15);
        assert.ok(tree.some(v => v.organ === 'trunk' && v.position[1] > h * .45 && v.color === p.bark[1]));
      } else {
        assert.ok(s.nodes.some(n => n.organ === 'twig' && n.position[1] < s.nodes[n.parent].position[1]));
        if (species === 'Weeping Willow') assert.ok(foliage.filter(v => v.position[1] < h * .35).length / foliage.length >= .2);
        else assert.ok(tree.some(v => v.organ === 'fruit'));
      }
      assertTree(tree);
    }
  });
}

