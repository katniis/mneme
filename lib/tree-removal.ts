import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Letter } from './garden.ts';
import type { Position } from './terrain.ts';
import { elementProgress, random, type Vec3, type Voxel } from './tree.ts';
import type { Organ } from './trees/types.ts';

export type TreeRecord = Pick<Letter, 'id' | 'seed' | 'position' | 'planted' | 'reveal'>;
export type Removal = { tree: TreeRecord; startedAt: number };
export type FrozenBlock = {
  sourceIndex: number; position: Vec3; size: Vec3; rotation: Vec3;
  color: string; kind: 'wood' | 'leaf'; organ?: Organ;
};

export function freezeBlocks(data: Voxel[], displayedGrowth: number): FrozenBlock[] {
  const blocks: FrozenBlock[] = [];
  data.forEach((v, sourceIndex) => {
    const g = elementProgress(v, displayedGrowth);
    if (g <= 0) return;
    const girth = v.kind === 'wood' && v.size[0] > .22 ? .25 + .75 * Math.min(1, displayedGrowth / .5) : 1;
    blocks.push({ sourceIndex, color: v.color, kind: v.kind, organ: v.organ,
      position: v.position.map((n, axis) => v.anchor[axis] + (n - v.anchor[axis]) * g) as Vec3,
      size: [v.size[0] * g * girth, v.size[1] * g, v.size[2] * g * girth],
      rotation: v.rotation ?? [0, 0, 0],
    });
  });
  return blocks;
}

export function blockRemovalFrame(elapsedMs: number, rank: number, count: number) {
  const birth = 1600 + 1400 * rank / Math.max(1, count - 1);
  const t = Math.max(0, Math.min(1, (elapsedMs - birth + 200) / 200));
  const particleAge = elapsedMs < birth || !count ? null : elapsedMs - birth;
  return {
    blockScale: count ? 1 - t * t * (3 - 2 * t) : 0,
    particleAge,
    particleScale: particleAge === null ? 0 : Math.max(0, 1 - particleAge / 800),
    done: !count || elapsedMs >= 3800,
  };
}

export function fallAngle(elapsedMs: number, contactAngle: number) {
  if (elapsedMs <= 1100) return contactAngle * Math.max(0, elapsedMs / 1100) ** 2;
  if (elapsedMs >= 1400) return contactAngle;
  const t = (elapsedMs - 1100) / 300;
  return Math.max(0, contactAngle - .035 * Math.abs(Math.sin(t * Math.PI * 3)) * (1 - t));
}

export function fallDirection(tree: TreeRecord, survivors: TreeRecord[], plots: Position[]) {
  const center = plots.reduce((sum, p) => [sum[0] + p[0], sum[1] + p[1]], [0, 0]);
  const dx = center[0] / Math.max(1, plots.length) - tree.position[0];
  const dz = center[1] / Math.max(1, plots.length) - tree.position[1];
  const rng = random(tree.seed);
  const toward = dx || dz ? Math.atan2(dx, dz) : rng() * Math.PI * 2;
  if (!survivors.length) return toward;
  let best = toward, score = -Infinity;
  const phase = rng() * Math.PI * 2;
  for (let i = 0; i < 12; i++) {
    const angle = phase + i * Math.PI / 6;
    const x = tree.position[0] + Math.sin(angle) * 5, z = tree.position[1] + Math.cos(angle) * 5;
    const clearance = Math.min(...survivors.map(p => Math.hypot(x - p.position[0], z - p.position[1])));
    const landDistance = Math.min(...plots.map(p => Math.hypot(x - p[0], z - p[1])));
    const candidate = clearance - landDistance + .5 * Math.cos(angle - toward);
    if (candidate > score) { best = angle; score = candidate; }
  }
  return best;
}

export function restAngle(blocks: FrozenBlock[], position: Position, direction: number, sampleGround: (x: number, z: number) => number) {
  const axis = new Vector3(Math.cos(direction), 0, -Math.sin(direction));
  const fall = new Quaternion(), rotation = new Quaternion(), matrix = new Matrix4(), center = new Vector3();
  const base = sampleGround(...position);
  // Fine twigs bend on impact; only structural wood can support the fallen tree.
  const wood = blocks.filter(b => (b.organ ? b.organ === 'trunk' || b.organ === 'branch' : b.kind === 'wood' && Math.min(b.size[0], b.size[2]) >= .12) && b.position[1] - b.size[1] / 2 > .3);
  const touches = (angle: number) => {
    fall.setFromAxisAngle(axis, angle);
    return wood.some(b => {
      center.set(...b.position).applyQuaternion(fall);
      rotation.setFromEuler(new Euler(...b.rotation)).premultiply(fall);
      const m = matrix.makeRotationFromQuaternion(rotation).elements;
      const radius = (Math.abs(m[1]) * b.size[0] + Math.abs(m[5]) * b.size[1] + Math.abs(m[9]) * b.size[2]) / 2;
      return base + center.y - radius < sampleGround(position[0] + center.x, position[1] + center.z);
    });
  };
  let previous = 0;
  for (let i = 1; i <= 24; i++) {
    let high = i * Math.PI / 48;
    if (touches(high)) {
      let low = previous;
      for (let j = 0; j < 8; j++) {
        const middle = (low + high) / 2;
        if (touches(middle)) high = middle; else low = middle;
      }
      return low;
    }
    previous = high;
  }
  return Math.PI / 2;
}
