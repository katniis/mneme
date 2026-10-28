import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree, treeFamily, elementProgress } from '../lib/tree.ts';
import { CELL, generateTerrain, groundHeight } from '../lib/terrain.ts';
import { gardenPositions, LEGACY_POSITIONS } from './fixtures.ts';
import { progress, advanceTime, validateLetter, readGarden } from '../lib/garden.ts';

test('a seed preserves every tree voxel; different seeds produce different anatomy', () => {
  assert.deepEqual(generateTree(1024), generateTree(1024));
  assert.notDeepEqual(generateTree(1024), generateTree(1025));
  assert.equal(new Set([0, 1, 2].map(treeFamily)).size, 3);
});
test('eight species are assigned by seed with legacy names preserved', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7].map(treeFamily), ['Oak', 'Birch', 'Maple', 'Cherry Blossom', 'Weeping Willow', 'Pine', 'Jacaranda', 'Spruce']);
});
test('each new species has its real-world voxel signature', () => {
  const leaves = (seed: number) => generateTree(seed).filter(v => v.kind === 'leaf');
  const share = (seed: number, colors: string[]) => { const leaf = leaves(seed); return leaf.filter(v => colors.includes(v.color)).length / leaf.length; };
  const cherry = generateTree(3);
  assert.ok(share(3, ['#f6c6d9', '#f9dbe6', '#f2a9c4', '#e98fb5']) > 0.5, 'cherry is blossom-dominant');
  assert.ok((Math.max(...cherry.map(v => v.position[0])) - Math.min(...cherry.map(v => v.position[0]))) / Math.max(...cherry.map(v => v.position[1])) > 0.9, 'cherry canopy is wide and low');
  assert.ok(share(2, ['#c33d26', '#d95d28', '#e08a35', '#a92c22', '#e5a44a']) > 0.8, 'maple leaves are autumn red and amber');
  const willow = generateTree(4);
  const willowMax = Math.max(...willow.map(v => v.position[1]));
  assert.ok(leaves(4).filter(v => v.size[1] > v.size[0] * 2).length / leaves(4).length > 0.3, 'willow leaves are long and narrow');
  assert.ok(leaves(4).filter(v => v.position[1] < willowMax * 0.3).length > 40, 'willow foliage hangs low');
  for (const seed of [5, 7]) {
    const tree = generateTree(seed);
    const maxY = Math.max(...tree.map(v => v.position[1]));
    const radius = Math.max(...tree.filter(v => v.kind === 'leaf').map(v => Math.hypot(v.position[0], v.position[2])));
    assert.ok(maxY > 6 && radius < maxY * 0.45, `seed ${seed} conifer is tall and narrow`);
    const low = tree.filter(v => v.kind === 'leaf' && v.position[1] < maxY * 0.4);
    const high = tree.filter(v => v.kind === 'leaf' && v.position[1] > maxY * 0.75);
    const avg = (list: typeof low) => list.reduce((sum, v) => sum + Math.hypot(v.position[0], v.position[2]), 0) / Math.max(1, list.length);
    assert.ok(avg(low) > avg(high), `seed ${seed} conifer tiers shrink upward`);
  }
  assert.ok(leaves(7).length > leaves(5).length, 'spruce is denser than pine');
  const jacaranda = leaves(6);
  const jMax = Math.max(...generateTree(6).map(v => v.position[1]));
  const topPurple = jacaranda.filter(v => v.position[1] > jMax * 0.65 && ['#8b6fc7', '#a58ae0', '#7a5fb8', '#b7a3e8'].includes(v.color)).length;
  assert.ok(topPurple / Math.max(1, jacaranda.filter(v => v.position[1] > jMax * 0.65).length) > 0.35, 'jacaranda blossom crowns the top');
});
test('every growing tree element is attached to a completed support', () => {
  for (const seed of [1024, 0, 1, 2, 3, 4, 5, 6, 7, 57, 999, 1746370156]) {
  const tree = generateTree(seed);
  assert.ok(tree.length > 1000);
  for (const [i, voxel] of tree.entries()) {
    assert.ok(voxel.end > voxel.start && voxel.end <= 1);
    if (voxel.parent >= 0) {
      assert.ok(voxel.parent < i);
      assert.ok(voxel.start >= tree[voxel.parent].end - 1e-8);
      assert.deepEqual(voxel.anchor, tree[voxel.parent].position);
      for (let axis = 0; axis < 3; axis++) assert.ok(
        Math.abs(voxel.position[axis] - tree[voxel.parent].position[axis]) <= (voxel.size[axis] + tree[voxel.parent].size[axis]) / 2 + .001,
        `${voxel.kind} ${i} must physically meet its supporting voxel on axis ${axis}`,
      );
    }
    assert.equal(elementProgress(voxel, 0), 0);
    assert.equal(elementProgress(voxel, 1), 1);
  }
  assert.ok(tree.some(v => v.kind === 'leaf' && v.start < .7));
  }
});
test('merged tree has no near-duplicate structural wood and keeps a sane voxel budget', () => {
  // Structural wood (trunk/primary, >=0.12) follows the variant occupancy rule.
  // Twig and petiole wood is intentionally spaced tighter than this so
  // consecutive nodes physically touch, so it is excluded here.
  for (const seed of [1024, 0, 1, 2, 3, 4, 5, 6, 7, 57]) {
    const tree = generateTree(seed);
    assert.ok(tree.length > 1000 && tree.length < 12000, `seed ${seed} has ${tree.length} voxels`);
    const cell = 0.03;
    const buckets = new Map<string, typeof tree>();
    for (const voxel of tree) {
      if (voxel.kind !== 'wood' || voxel.size[0] < 0.12) continue;
      const cx = Math.floor(voxel.position[0] / cell), cy = Math.floor(voxel.position[1] / cell), cz = Math.floor(voxel.position[2] / cell);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        for (const other of buckets.get(`${cx + dx}:${cy + dy}:${cz + dz}`) ?? []) {
          const distance = Math.hypot(voxel.position[0] - other.position[0], voxel.position[1] - other.position[1], voxel.position[2] - other.position[2]);
          assert.ok(distance >= 0.03, `seed ${seed} has near-duplicate structural wood ${distance.toFixed(4)} apart`);
        }
      }
      const key = `${cx}:${cy}:${cz}`;
      buckets.set(key, [...(buckets.get(key) ?? []), voxel]);
    }
  }
});
test('tree canopy reaches the leader zone in every family', () => {
  for (const seed of [0, 1, 2, 3, 4, 5, 6, 7, 57, 999]) {
    const tree = generateTree(seed);
    const maxY = Math.max(...tree.map(v => v.position[1]));
    assert.ok(tree.filter(v => v.kind === 'leaf' && v.position[1] > maxY * 0.9).length >= 10, `seed ${seed} has no leader canopy`);
    assert.ok(tree.filter(v => v.kind === 'wood' && v.position[1] > maxY * 0.9).length >= 5, `seed ${seed} has no leader wood`);
  }
});
test('leaves carry rotation while wood stays axis-aligned', () => {
  for (const seed of [0, 2, 3, 4, 5, 6, 7]) {
    const tree = generateTree(seed);
    assert.ok(tree.filter(v => v.kind === 'leaf').every(v => Array.isArray(v.rotation) && v.rotation.length === 3 && v.rotation.every(Number.isFinite)), `seed ${seed} leaves must carry rotation`);
    assert.ok(tree.filter(v => v.kind === 'wood').every(v => v.rotation === undefined), `seed ${seed} wood must stay unrotated`);
  }
});
test('interior leaves are larger and darker than shell leaves', () => {
  const tree = generateTree(0);
  const leaves = tree.filter(v => v.kind === 'leaf');
  const maxR = Math.max(...leaves.map(v => Math.hypot(v.position[0], v.position[2])));
  const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
  const inner = leaves.filter(v => Math.hypot(v.position[0], v.position[2]) < maxR * 0.4);
  const outer = leaves.filter(v => Math.hypot(v.position[0], v.position[2]) > maxR * 0.75);
  const avg = (list: typeof leaves, fn: (v: typeof leaves[number]) => number) => list.reduce((sum, v) => sum + fn(v), 0) / list.length;
  assert.ok(avg(inner, v => v.size[0] * v.size[2]) > avg(outer, v => v.size[0] * v.size[2]), 'shade leaves have larger footprints');
  assert.ok(avg(inner, v => lum(v.color)) < avg(outer, v => lum(v.color)), 'shade leaves are darker');
});
test('maple shell is redder than its interior and pine cones are wood', () => {
  const maple = generateTree(2).filter(v => v.kind === 'leaf');
  const maxR = Math.max(...maple.map(v => Math.hypot(v.position[0], v.position[2])));
  const reds = ['#c33d26', '#d95d28', '#a92c22'];
  const share = (list: typeof maple) => list.filter(v => reds.includes(v.color)).length / list.length;
  assert.ok(share(maple.filter(v => Math.hypot(v.position[0], v.position[2]) > maxR * 0.75)) > share(maple.filter(v => Math.hypot(v.position[0], v.position[2]) < maxR * 0.4)), 'maple reds sit at the lit shell');
  const pine = generateTree(5);
  assert.ok(pine.some(v => v.kind === 'wood' && v.color === '#7a4a2b'), 'pine cones are wood voxels');
  assert.ok(!pine.some(v => v.kind === 'leaf' && v.color === '#7a4a2b'), 'no leaf is a cone');
});
test('cherry vase centre is open, birch twigs droop, and willow curtains reach low', () => {
  const cherry = generateTree(3);
  const cherryMax = Math.max(...cherry.map(v => v.position[1]));
  assert.ok(cherry.filter(v => v.kind === 'wood' && Math.hypot(v.position[0], v.position[2]) < 0.5 && v.position[1] > cherryMax * 0.8).length < 20, 'cherry has no central pole above the vase');
  const birch = generateTree(1);
  const birchMax = Math.max(...birch.map(v => v.position[1]));
  assert.ok(birch.filter(v => v.kind === 'leaf' && v.position[1] < birchMax * 0.35).length > 20, 'birch outer branchlets droop into the lower crown');
  const willow = generateTree(4);
  assert.ok(willow.filter(v => v.kind === 'leaf' && v.position[1] < 0.35).length > 30, 'willow curtains sweep close to the ground');
});
test('terrain expands without moving trees or removing old ground; every tree has ground', () => {
  const a = generateTerrain(gardenPositions(1));
  const positions = gardenPositions(8);
  const b = generateTerrain(positions);
  assert.ok(b.length > a.length);
  const keys = new Set(b.map(v => v.key));
  assert.ok(a.filter(v => ['grass', 'soil', 'stone'].includes(v.kind)).every(v => keys.has(v.key)));
  const originalGround = a.filter(v => v.kind === 'grass');
  for (const v of originalGround) assert.deepEqual(b.find(next => next.key === v.key)?.position, v.position);
  const cells = new Set(b.filter(v => v.kind === 'grass').map(v => v.key.split(':').slice(0, 2).join(':')));
  const visited = new Set(['0:0']);
  const queue = ['0:0'];
  for (let n = 0; n < queue.length; n++) {
    const [x, z] = queue[n].split(':').map(Number);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx}:${z + dz}`;
      if (cells.has(key) && !visited.has(key)) { visited.add(key); queue.push(key); }
    }
  }
  assert.equal(visited.size, cells.size, 'every terrain column is connected to the original island');
  for (const [x, z] of positions) {
    assert.ok(b.some(v => v.kind === 'grass' && Math.abs(v.position[0] - x) < .4 && Math.abs(v.position[2] - z) < .4));
    assert.ok(Number.isFinite(groundHeight(x, z)));
  }
  for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
    assert.ok(Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1]) > 4.8);
  }
});
test('a shared clock matures trees monotonically and ignores hidden or paused time', () => {
  const letter = { planted: 1000, reveal: 52000 };
  assert.equal(progress(letter, 1000), 0);
  assert.equal(progress(letter, 26500), .5);
  assert.equal(progress(letter, 99999), 1);
  assert.equal(advanceTime(1000, 1, 1, 1000, false, true), 1000);
  assert.equal(advanceTime(1000, 1, 1, 1000, true, false), 1000);
  assert.equal(advanceTime(1000, 1, 2, 1000, true, true), 3000);
});
test('expanded coastlines do not join into long ruler-straight walls', () => {
  for (const count of [1, 3, 8]) {
    const ground = generateTerrain(LEGACY_POSITIONS.slice(0, count)).filter(v => v.kind === 'grass');
    const keys = new Set(ground.map(v => v.key.split(':').slice(0, 2).join(':')));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const v of ground) {
      const [x, z] = v.key.split(':').map(Number);
      if (keys.has(`${x + dx}:${z + dz}`)) continue;
      let run = 0;
      while (keys.has(`${x + run * dz}:${z + run * dx}`) && !keys.has(`${x + run * dz + dx}:${z + run * dx + dz}`)) run++;
      assert.ok(run <= 6, `${count}-tree island has a straight cliff ${run} blocks long`);
    }
  }
});
test('new planting areas join the existing deep rock core instead of forming separate cones', () => {
  let previousRock = generateTerrain(gardenPositions(1)).filter(v => v.kind === 'stone').map(v => v.key);
  for (let count = 2; count <= 8; count++) {
    const positions = gardenPositions(count);
    const terrain = generateTerrain(positions);
    const rock = new Set(terrain.filter(v => v.kind === 'stone').map(v => v.key));
    assert.ok(previousRock.every(key => rock.has(key)), `adding tree ${count} must not remove existing rock`);
    previousRock = [...rock];
    const core = new Set(terrain.filter(v => v.key.endsWith(':stone4')).map(v => v.key.split(':').slice(0, 2).join(':')));
    const queue = ['0:0'];
    const visited = new Set(queue);
    for (let n = 0; n < queue.length; n++) {
      const [x, z] = queue[n].split(':').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const key = `${x + dx}:${z + dz}`;
        if (core.has(key) && !visited.has(key)) { visited.add(key); queue.push(key); }
      }
    }
    for (const [x, z] of positions) assert.ok(visited.has(`${Math.round(x / CELL)}:${Math.round(z / CELL)}`), `${count}-tree island has a separate deep cone at ${x},${z}`);
  }
});
test('validation preserves content and rejects blank bodies and nonfuture dates', () => {
  assert.ok(validateLetter('', '2026-10-28', Date.parse('2026-10-27')).body);
  assert.ok(validateLetter('Remember\n  this exactly. ', '2026-10-26', Date.parse('2026-10-27')).date);
  assert.deepEqual(validateLetter('hello', '2026-10-28', Date.parse('2026-10-27')), {});
  assert.ok(validateLetter('hello', '2027-02-31', Date.parse('2026-10-27')).date);
  assert.equal(readGarden('{broken'), null);
  assert.equal(readGarden(JSON.stringify({version: 1, letters: [{seed: 'bad'}]})), null);
});
