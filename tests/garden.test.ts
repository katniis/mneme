import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree, treeFamily, elementProgress } from '../lib/tree.ts';
import { CELL, generateTerrain, groundHeight, placement } from '../lib/terrain.ts';
import { progress, advanceTime, validateLetter, readGarden } from '../lib/garden.ts';

test('a seed preserves every tree voxel; different seeds produce different anatomy', () => {
  assert.deepEqual(generateTree(1024), generateTree(1024));
  assert.notDeepEqual(generateTree(1024), generateTree(1025));
  assert.equal(new Set([0, 1, 2].map(treeFamily)).size, 3);
});
test('every growing tree element is attached to a completed support', () => {
  for (const seed of [1024, 0, 1, 2, 57, 999, 1746370156]) {
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
test('terrain expands without moving trees or removing old ground; every tree has ground', () => {
  const a = generateTerrain([placement(0)]);
  const positions = Array.from({ length: 8 }, (_, i) => placement(i));
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
    const ground = generateTerrain(Array.from({ length: count }, (_, i) => placement(i))).filter(v => v.kind === 'grass');
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
  let previousRock = generateTerrain([placement(0)]).filter(v => v.kind === 'stone').map(v => v.key);
  for (let count = 2; count <= 8; count++) {
    const positions = Array.from({ length: count }, (_, i) => placement(i));
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
