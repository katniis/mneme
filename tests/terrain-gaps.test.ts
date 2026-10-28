import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, generateTerrain } from '../lib/terrain.ts';
import { gardenPositions, LEGACY_POSITIONS } from './fixtures.ts';

test('rock faces have no small mineral plates attached to their centres', () => {
  const terrain = generateTerrain(gardenPositions(3));
  assert.ok(terrain.some(v => v.kind === 'stone'));
  assert.equal(terrain.filter(v => v.kind === 'mineral').length, 0);
});

for (const initial of [[], LEGACY_POSITIONS]) {
test(`joining ${initial.length ? 'existing grid' : 'natural'} planting areas fill enclosed gaps and retain supported ground through expansion`, () => {
  let previous = new Map<string, number[]>();
  const positions = gardenPositions(49, initial);
  for (let count = 1; count <= 49; count++) {
    const terrain = generateTerrain(positions.slice(0, count));
    const ground = terrain.filter(v => v.kind === 'grass');
    const cells = new Set(ground.map(v => v.key.split(':').slice(0, 2).join(':')));
    const xs = ground.map(v => Math.round(v.position[0] / CELL));
    const zs = ground.map(v => Math.round(v.position[2] / CELL));
    const connected = new Set(['0:0']);
    const land = [[0, 0]];
    for (let i = 0; i < land.length; i++) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = land[i][0] + dx, z = land[i][1] + dz, key = `${x}:${z}`;
        if (!cells.has(key) || connected.has(key)) continue;
        connected.add(key);
        land.push([x, z]);
      }
    }
    assert.equal(connected.size, cells.size, `${count} trees must form one connected island`);
    const minX = Math.min(...xs) - 1, maxX = Math.max(...xs) + 1;
    const minZ = Math.min(...zs) - 1, maxZ = Math.max(...zs) + 1;
    const outside = new Set([`${minX}:${minZ}`]);
    const queue = [[minX, minZ]];
    for (let i = 0; i < queue.length; i++) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = queue[i][0] + dx, z = queue[i][1] + dz, key = `${x}:${z}`;
        if (x < minX || x > maxX || z < minZ || z > maxZ || cells.has(key) || outside.has(key)) continue;
        outside.add(key);
        queue.push([x, z]);
      }
    }
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        assert.ok(cells.has(`${x}:${z}`) || outside.has(`${x}:${z}`), `${count} trees leave an unfilled gap at ${x}:${z}`);
      }
    }
    const solids = new Map(terrain.filter(v => ['grass', 'soil', 'stone'].includes(v.kind)).map(v => [v.key, v.position]));
    for (const [key, position] of previous) assert.deepEqual(solids.get(key), position, `${count} trees must retain ${key}`);
    for (const cell of cells) {
      assert.ok(solids.has(`${cell}:soil`), `${cell} needs soil support`);
      assert.ok(solids.has(`${cell}:stone0`), `${cell} needs rock support`);
    }
    previous = solids;
  }
});
}
