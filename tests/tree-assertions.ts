import assert from 'node:assert/strict';
import { Euler, Matrix3, Matrix4, Vector3 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import type { Voxel } from '../lib/trees/types.ts';
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


