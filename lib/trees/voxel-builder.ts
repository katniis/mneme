import { appendOrgans } from './foliage.ts';
import { TREE_LIMITS, TREE_PROFILES, type TreeSpecies } from './profiles.ts';
import type { SkeletonNode, TreeSkeleton, Vec3, Voxel } from './types.ts';

const CELL = .08;
const key = (x: number, y: number, z: number) => `${x}:${y}:${z}`;
const positionKey = (p: Vec3) => key(Math.round(p[0] / CELL), Math.round((p[1] - CELL / 2) / CELL), Math.round(p[2] / CELL));
type Cell = { x: number; y: number; z: number; node: number };

function rasterize(nodes: readonly SkeletonNode[], radii: readonly number[]) {
  const cells = new Map<string, Cell>();
  for (let n = 0; n < nodes.length; n++) {
    const node = nodes[n], from = nodes[node.parent]?.position ?? node.position, to = node.position;
    const length = Math.hypot(...to.map((v, axis) => v - from[axis]));
    const steps = Math.max(1, Math.ceil(length / (CELL * .5)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, p = from.map((v, axis) => v + (to[axis] - v) * t) as Vec3;
      const r = (radii[node.parent] ?? radii[n]) * (1 - t) + radii[n] * t;
      const gx = Math.round(p[0] / CELL), gy = Math.round((p[1] - CELL / 2) / CELL), gz = Math.round(p[2] / CELL), reach = Math.ceil((r + .045) / CELL);
      const centerKey = key(gx, Math.max(0, gy), gz);
      if (!cells.has(centerKey)) cells.set(centerKey, { x: gx, y: Math.max(0, gy), z: gz, node: n });
      for (let x = gx - reach; x <= gx + reach; x++) for (let y = Math.max(0, gy - reach); y <= gy + reach; y++) for (let z = gz - reach; z <= gz + reach; z++) {
        if ((x * CELL - p[0]) ** 2 + (y * CELL + CELL / 2 - p[1]) ** 2 + (z * CELL - p[2]) ** 2 > (r + .03) ** 2) continue;
        const k = key(x, y, z);
        if (!cells.has(k)) cells.set(k, { x, y, z, node: n });
      }
    }
  }
  return cells;
}

export function voxelizeTree(skeleton: TreeSkeleton, seed: number, species: TreeSpecies): Voxel[] {
  if (!skeleton.nodes.length) throw new Error('Tree skeleton requires a root');
  let count = Math.min(skeleton.nodes.length, TREE_LIMITS.nodes), cells: Map<string, Cell>;
  do {
    const radii = skeleton.nodes.slice(0, count).map(n => Math.max(.012, n.radius));
    const sums = new Float64Array(count);
    for (let i = count - 1; i >= 0; i--) {
      radii[i] = Math.max(radii[i], sums[i] ** (1 / 2.3));
      const parent = skeleton.nodes[i].parent;
      if (parent >= 0) sums[parent] += radii[i] ** 2.3;
    }
    cells = rasterize(skeleton.nodes.slice(0, count), radii);
    if (cells.size <= 9000 || count <= 1) break;
    count--;
  } while (count);
  const voxels: Voxel[] = [], indices = new Map<string, number>(), queue: string[] = [];
  const rootKey = positionKey(skeleton.nodes[0].position);
  if (!cells.has(rootKey)) throw new Error('Root is outside voxelized wood');
  const parents = new Map<string, number>([[rootKey, -1]]), depths: number[] = [];
  queue.push(rootKey);
  const bark = TREE_PROFILES[species].bark;
  for (let q = 0; q < queue.length; q++) {
    const k = queue[q], cell = cells.get(k)!, parent = parents.get(k)!;
    const position: Vec3 = [cell.x * CELL, cell.y * CELL + CELL / 2, cell.z * CELL];
    const node = skeleton.nodes[cell.node], depth = parent < 0 ? 0 : depths[parent] + 1;
    const index = voxels.length; indices.set(k, index); depths.push(depth);
    let shade = Math.abs(Math.floor(cell.y / 3) + Math.floor(Math.atan2(cell.z, cell.x) * 3)) % bark.length;
    if (species === 'Birch') shade = position[1] < .65 ? 3 : (cell.y % 13 === 0 && (cell.x + cell.z) % 3 === 0 ? 3 : Math.abs(cell.x + cell.z) % 3);
    if (species === 'Pine') shade = position[1] > 2.9 ? 1 + Math.abs(cell.x + cell.y + cell.z) % 2 : 0;
    if (species === 'Cherry Blossom') shade = cell.y % 9 === 0 ? 2 : Math.abs(cell.x + cell.z) % 2;
    voxels.push({ position, anchor: parent < 0 ? [position[0], 0, position[2]] : [...voxels[parent].position], size: [CELL * 1.01, CELL * 1.01, CELL * 1.01],
      parent, kind: 'wood', organ: node.organ, color: bark[shade], start: depth, end: depth + 1 });
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dy && !dz) continue;
      const next = key(cell.x + dx, cell.y + dy, cell.z + dz);
      if (cells.has(next) && !parents.has(next)) { parents.set(next, index); queue.push(next); }
    }
  }
  if (voxels.length !== cells.size) throw new Error('Disconnected tree skeleton');
  const maxDepth = Math.max(...depths) + 1;
  for (const v of voxels) { v.start = v.start / maxDepth * .53; v.end = v.end / maxDepth * .53; }
  const sites = skeleton.sites.filter(s => s.node < count).flatMap(site => {
    const parent = indices.get(positionKey(skeleton.nodes[site.node].position));
    return parent === undefined ? [] : [{ parent, direction: site.direction, organ: site.organ, organId: (site.organId ^ (seed >>> 0)) >>> 0 }];
  });
  appendOrgans(voxels, [
    { parent: 0, direction: [.7, .7, .2], organ: 'juvenile-leaf', organId: (0x7ffffffe ^ seed) >>> 0 },
    { parent: 0, direction: [-.7, .7, -.2], organ: 'juvenile-leaf', organId: (0x7fffffff ^ seed) >>> 0 },
    ...sites,
  ], seed, species);
  const duration = Math.max(...voxels.map(v => v.end));
  for (const v of voxels) { v.start /= duration; v.end /= duration; }
  return voxels;
}

