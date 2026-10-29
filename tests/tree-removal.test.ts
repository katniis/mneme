import test from 'node:test';
import assert from 'node:assert/strict';
import * as removal from '../lib/tree-removal.ts';
import type { Voxel } from '../lib/tree.ts';
import { generateTree } from '../lib/tree.ts';
import { groundHeight } from '../lib/terrain.ts';

const voxels: Voxel[] = [
  { position: [0, 1, 0], anchor: [0, 0, 0], size: [.4, .4, .4], color: '#765432', kind: 'wood', start: 0, end: .4, parent: -1 },
  { position: [0, 2, 0], anchor: [0, 1, 0], size: [.2, .1, .3], rotation: [.2, .3, .1], color: '#456732', kind: 'leaf', start: .6, end: .8, parent: 0 },
];

test('removal freezes only visible growth with its source colour and leaf rotation', () => {
  const young = removal.freezeBlocks(voxels, .4);
  assert.equal(young.length, 1);
  assert.equal(young[0].sourceIndex, 0);
  assert.equal(young[0].color, voxels[0].color);
  assert.deepEqual(young[0].position, voxels[0].position);
  assert.deepEqual(removal.freezeBlocks(voxels, 1)[1].rotation, voxels[1].rotation);
  assert.deepEqual(removal.freezeBlocks(voxels, 0), []);
});

test('fall accelerates, contacts ground, settles, and runs independently of demo time', () => {
  const contact = Math.PI / 2;
  assert.equal(removal.fallAngle(0, contact), 0);
  assert.ok(removal.fallAngle(550, contact) < Math.PI / 4);
  assert.equal(removal.fallAngle(1400, contact), contact);
  assert.equal(removal.fallAngle(9999, contact), contact);
  const blocks = removal.freezeBlocks(voxels, 1);
  const angle = removal.restAngle(blocks, [0, 0], 0, () => 0);
  assert.ok(angle > 1 && angle <= Math.PI / 2);
  const wood = blocks[0];
  const bottom = wood.position[1] * Math.cos(angle) - (wood.size[1] * Math.abs(Math.cos(angle)) + wood.size[2] * Math.abs(Math.sin(angle))) / 2;
  assert.ok(bottom >= -.02);
  const stepped = removal.restAngle(blocks, [0, 0], 0, (_x, z) => z > .5 ? .3 : 0);
  assert.ok(stepped < angle);
});

test('each visible block emits one particle when it disappears and all particles finish', () => {
  assert.equal(removal.blockRemovalFrame(1400, 0, 2).blockScale, 1);
  assert.equal(removal.blockRemovalFrame(1600, 0, 2).blockScale, 0);
  assert.equal(removal.blockRemovalFrame(1600, 0, 2).particleAge, 0);
  assert.equal(removal.blockRemovalFrame(3000, 1, 2).particleAge, 0);
  assert.equal(removal.blockRemovalFrame(3800, 1, 2).particleScale, 0);
  assert.equal(removal.blockRemovalFrame(3800, 1, 2).done, true);
  for (const count of [0, 1, 10000]) {
    for (let rank = 0; rank < count; rank++) {
      const birth = 1600 + 1400 * rank / Math.max(1, count - 1);
      assert.equal(removal.blockRemovalFrame(birth, rank, count).particleAge, 0);
      assert.equal(removal.blockRemovalFrame(birth - 1, rank, count).particleAge, null);
      assert.equal(removal.blockRemovalFrame(3800, rank, count).particleScale, 0);
    }
    assert.equal(removal.blockRemovalFrame(3800, 0, count).done, true);
  }
});

test('fall direction is deterministic and avoids a nearby surviving trunk', () => {
  const tree = { id: 'removed', seed: 123, position: [0, 0] as [number, number], planted: 0, reveal: 1 };
  const survivor = { ...tree, id: 'alive', position: [0, 5] as [number, number] };
  const plots: [number, number][] = [[0, 0], [0, 5], [0, -5]];
  const direction = removal.fallDirection(tree, [survivor], plots);
  assert.equal(direction, removal.fallDirection(tree, [survivor], plots));
  assert.ok(Math.cos(direction) < 0, 'fall away from the surviving trunk');
});

test('hanging willow twigs do not prevent the structural tree from falling', () => {
  for (const seed of [4, 12]) {
    const tree = { id: 'willow', seed, position: [0, 0] as [number, number], planted: 0, reveal: 1 };
    const blocks = removal.freezeBlocks(generateTree(seed), 1);
    const direction = removal.fallDirection(tree, [], [[0, 0]]);
    assert.ok(removal.restAngle(blocks, tree.position, direction, groundHeight) > .5, `willow ${seed} must visibly fall`);
  }
});

test('small tagged structural cubes support the fall while fruit cannot stop it', () => {
  const branch: removal.FrozenBlock = { sourceIndex: 0, position: [0, 2, 0], size: [.0808, .0808, .0808], rotation: [0, 0, 0], color: '#765432', kind: 'wood', organ: 'branch' };
  const angle = removal.restAngle([branch], [0, 0], 0, () => 0);
  assert.ok(angle > 1 && angle < Math.PI / 2);
  const fruit: removal.FrozenBlock = { ...branch, position: [0, .35, 4], organ: 'fruit' };
  assert.equal(removal.restAngle([branch, fruit], [0, 0], 0, () => 0), angle);
});
