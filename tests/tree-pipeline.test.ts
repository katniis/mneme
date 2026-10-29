import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Euler, Matrix3, Matrix4, Vector3 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { voxelizeTree } from '../lib/trees/voxel-builder.ts';
import { appendOrgans } from '../lib/trees/foliage.ts';
import { random } from '../lib/tree.ts';
import type { TreeSkeleton, Voxel } from '../lib/trees/types.ts';

export function assertTree(tree: readonly Voxel[]) {
  assert.ok(tree.length > 0 && tree.length <= 12000);
  assert.equal(tree.filter(v => v.parent < 0).length, 1);
  const box = (v: Voxel) => new OBB(new Vector3(...v.position), new Vector3(...v.size).multiplyScalar(.5), new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromEuler(new Euler(...(v.rotation ?? [0, 0, 0])))));
  const cells = new Set<string>();
  for (const [i, v] of tree.entries()) {
    assert.ok([...v.position, ...v.size, v.start, v.end].every(Number.isFinite));
    assert.ok(v.size.every(n => n > 0));
    assert.ok(v.start >= 0 && v.end > v.start && v.end <= 1 + 1e-12);
    if (v.parent >= 0) {
      assert.ok(v.parent < i); assert.deepEqual(v.anchor, tree[v.parent].position);
      assert.ok(v.start >= tree[v.parent].end - 1e-12);
      assert.ok(box(v).intersectsOBB(box(tree[v.parent]), 1e-5), `voxel ${i} (${v.organ}) does not meet ${v.parent}`);
    }
    if (v.kind === 'wood') {
      const key = v.position.map(n => n.toFixed(5)).join(':');
      assert.ok(!cells.has(key), 'duplicate wood'); cells.add(key);
    }
  }
}

const skeleton: TreeSkeleton = { nodes: [
  { position: [0, .04, 0], parent: -1, radius: .16, organ: 'root', order: 0 },
  { position: [.08, .8, 0], parent: 0, radius: .12, organ: 'trunk', order: 1 },
  { position: [-.5, 1.35, .1], parent: 1, radius: .05, organ: 'branch', order: 2 },
  { position: [.6, 1.5, -.1], parent: 1, radius: .05, organ: 'branch', order: 2 },
], sites: [{ node: 2, direction: [-.7, .3, .4], organ: 'leaf', organId: 1 }, { node: 3, direction: [.6, .2, -.5], organ: 'leaf', organId: 2 }] };

test('the unchanged seeded random stream protects existing terrain and identities', () => {
  const r = random(0);
  assert.deepEqual(Array.from({ length: 4 }, () => r()), [.26642920868471265, .0003297457005828619, .2232720274478197, .1462021479383111]);
});

test('tapered branching volumes and oriented leaf motifs stay connected and deterministic', () => {
  const before = JSON.stringify(skeleton), a = voxelizeTree(skeleton, 0, 'Oak');
  assert.deepEqual(a, voxelizeTree(skeleton, 0, 'Oak')); assert.equal(JSON.stringify(skeleton), before);
  assertTree(a); assert.ok(a.some(v => v.organ === 'leaf' && v.organId === 1));
  assert.ok(a.filter(v => v.organ === 'leaf').every(v => v.rotation?.every(Number.isFinite)));
});

test('an organ is omitted whole at the voxel ceiling rather than severing its support graph', () => {
  const wood = voxelizeTree({ ...skeleton, sites: [] }, 0, 'Oak');
  while (wood.length < 11999) wood.push({ ...wood[0], position: [...wood[0].position], size: [...wood[0].size], anchor: [...wood[0].anchor] });
  appendOrgans(wood, [{ parent: 0, direction: [1, 0, 0], organ: 'leaf', organId: 20 }], 0, 'Maple');
  assert.equal(wood.length, 11999); assert.ok(!wood.some(v => v.organId === 20));
});
