import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4, Vector3 } from 'three';
import { fitShadowBounds } from '../lib/atmosphere.ts';
import type { Vec3 } from '../lib/tree.ts';
import { sampleDaylight } from '../lib/daylight.ts';

test('shadow bounds retain padding around the garden without sky geometry', () => {
  const fit = fitShadowBounds([[-4, -6, -20], [4, 12, -10]], new Matrix4().elements);
  assert.deepEqual(fit, { left: -6, right: 6, bottom: -8, top: 14, near: 8, far: 22 });
});

test('low dawn and dusk lights cover retained land and tree tops on large islands', () => {
  for (const radius of [4.6, 32]) for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const { direction } = sampleDaylight({ period: 'day', solarAngle: angle, daylight: .5, cloudCover: 0 });
    const span = radius + 6, treeTop = 12;
    const distance = Math.max(40, Math.hypot(span, treeTop + 8) * 3);
    const position = new Vector3(...direction).multiplyScalar(distance);
    const light = new Matrix4().lookAt(position, new Vector3(), new Vector3(0, 1, 0)).setPosition(position).invert();
    const corners: Vec3[] = [];
    for (const x of [-span, span]) for (const y of [-Math.max(16, radius * .8), treeTop + 2]) for (const z of [-span, span]) corners.push([x, y, z]);
    const fit = fitShadowBounds(corners, light.elements);
    for (const point of corners) {
      const p = new Vector3(...point).applyMatrix4(light);
      assert.ok(p.x > fit.left && p.x < fit.right && p.y > fit.bottom && p.y < fit.top);
      assert.ok(-p.z > fit.near && -p.z < fit.far);
    }
  }
});
test('moving daylight shadow camera covers trees and retained small and large islands', () => {
  for (const radius of [4.6, 32]) {
    const corners: Vec3[] = [];
    for (const x of [-radius - 6, radius + 6]) for (const y of [-Math.max(16, radius * .8), 14]) for (const z of [-radius - 6, radius + 6]) corners.push([x, y, z]);
    const view = new Matrix4().lookAt(new Vector3(150, 200, 150), new Vector3(), new Vector3(0, 1, 0)).setPosition(150, 200, 150).invert();
    const fit = fitShadowBounds(corners, view.elements);
    for (const p of corners) {
      const q = new Vector3(...p).applyMatrix4(view);
      assert.ok(q.x > fit.left && q.x < fit.right && q.y > fit.bottom && q.y < fit.top);
      assert.ok(-q.z > fit.near && -q.z < fit.far);
    }
  }
});
