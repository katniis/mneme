import { random, type Vec3 } from './tree.ts';
export const CELL = .65;
export type TerrainVoxel = { key: string; position: Vec3; size: Vec3; color: string; kind: string; birth: number };
export type Position = [number, number];

export function placement(index: number): Position {
  if (index === 0) return [0, 0];
  // A square spiral preserves mature crown spacing and adds land beside the previous ring.
  let x = 0, z = 0, dx = 0, dz = -1;
  for (let i = 0; i < index; i++) {
    if (x === z || (x < 0 && x === -z) || (x > 0 && x === 1 - z)) [dx, dz] = [-dz, dx];
    x += dx; z += dz;
  }
  return [x * CELL * 9, z * CELL * 9];
}
export function groundHeight(x: number, z: number) {
  x = Math.round(x / CELL) * CELL; z = Math.round(z / CELL) * CELL;
  return Math.round((Math.sin(x * .55) * .22 + Math.cos(z * .6) * .18 + Math.sin((x + z) * .9) * .11) / .13) * .13;
}
function edge(x: number, z: number, center: Position, radius: number) {
  const angle = Math.atan2(z - center[1], x - center[0]);
  const phase = center[0] * .73 + center[1] * 1.17;
  const coastline = Math.sin(x * 1.7 + z * .8) * .37 + Math.sin(z * 2.1 - x * .6) * .24;
  return radius + Math.sin(angle * 5 + .6 + phase) * .35 + Math.cos(angle * 3 - .2 - phase) * .25 + coastline - Math.hypot(x - center[0], z - center[1]);
}
export function generateTerrain(positions: Position[]): TerrainVoxel[] {
  const centers: Position[] = [[0, 0], ...positions.slice(1)];
  const result: TerrainVoxel[] = [];
  const columns: { ix: number; iz: number; x: number; z: number; birth: number }[] = [];
  const footprint = new Set<string>();
  const extent = Math.max(0, ...centers.flat().map(Math.abs)) + 6;
  const extentCells = Math.ceil(extent / CELL);
  for (let ix = -extentCells; ix <= extentCells; ix++) for (let iz = -extentCells; iz <= extentCells; iz++) {
    const x = ix * CELL, z = iz * CELL;
    const distances = centers.map((c, i) => edge(x, z, c, i === 0 ? 4.25 : 3.9));
    if (Math.max(...distances) < 0) continue;
    const birth = distances.findIndex(d => d >= 0);
    columns.push({ ix, iz, x, z, birth });
    footprint.add(`${ix}:${iz}`);
  }
  const shoreline = columns.filter(({ ix, iz }) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => !footprint.has(`${ix + dx}:${iz + dz}`)),
  );
  const joins: [Position, Position][] = [];
  for (let i = 0; i < centers.length; i++) for (let j = 0; j < i; j++) {
    if (Math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1]) <= CELL * 9 + .01) joins.push([centers[j], centers[i]]);
  }
  for (const { ix, iz, x, z, birth } of columns) {
    let distance = Infinity;
    // shortcut: direct shoreline distances suit small gardens; use a distance transform for large gardens.
    for (const coast of shoreline) distance = Math.min(distance, Math.hypot(ix - coast.ix, iz - coast.iz));
    const depth = (distance + .5) * CELL;
    let reinforcement = 0;
    // A shared rock spine keeps narrow shoreline notches from splitting the deep core.
    for (const [a, b] of joins) {
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
      reinforcement = Math.max(reinforcement, 6.4 - Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) * 1.7);
    }
    const rand = random((ix * 73856093 ^ iz * 19349663) >>> 0);
    const rockRand = random((ix * 73856093 ^ iz * 19349663 ^ 0x5F3759DF) >>> 0);
    const y = groundHeight(x, z);
    const patch = Math.sin(x * .9 + z * .6) + Math.cos(z * 1.2 - x * .3);
    const grasses = patch > .5 ? ['#7c9254', '#879b5a', '#8c9f60'] : patch < -.6 ? ['#566f40', '#657d45', '#70874c'] : ['#738a4c', '#7b9053', '#81955a'];
    const put = (key: string, position: Vec3, size: Vec3, color: string, kind: string) => result.push({ key: `${ix}:${iz}:${key}`, position, size, color, kind, birth });
    put('grass', [x, y - .1, z], [CELL, .2, CELL], grasses[Math.floor(rand() * 3)], 'grass');
    put('soil', [x, y - .48, z], [CELL, .56, CELL], ['#8c7554', '#9a805c', '#806b50'][Math.floor(rand() * 3)], 'soil');
    const geology = Math.sin(x * .45 + z * .32) * .3 + Math.cos(z * .5 - x * .2) * .22;
    const layers = Math.max(1, Math.floor(Math.min(10.4, Math.max(1.2 + depth * 1.75 + geology, reinforcement))));
    for (let layer = 0; layer < layers; layer++) {
      const colors = layer < 1 ? ['#827968', '#777361', '#95856c'] : ['#74776c', '#666d65', '#898a7c', '#59635d'];
      put(`stone${layer}`, [x, y - 1.05 - layer * .57, z], [CELL, .57, CELL], colors[Math.floor(rockRand() * colors.length)], 'stone');
      if (rockRand() > .84) put(`mineral${layer}`, [x + .327, y - 1.05 - layer * .57, z + .05], [.025, .12, .17], layer < 2 ? '#a79877' : '#9c9c87', 'mineral');
    }
    const nearTree = positions.some(p => Math.hypot(x - p[0], z - p[1]) < .75);
    if (!nearTree && rand() > .64) {
      for (let j = 0; j < 3; j++) {
        const dx = (rand() - .5) * .4, dz = (rand() - .5) * .4;
        const h = .12 + rand() * .17;
        put(`tuft${j}`, [x + dx, y + h / 2, z + dz], [.045, h, .045], j === 0 ? '#98a865' : '#647d41', 'tuft');
      }
    }
    if (!nearTree && rand() > .93) {
      const h = .18 + rand() * .12;
      const dx = (rand() - .5) * .4;
      put('flowerStem', [x + dx, y + h / 2, z], [.035, h, .035], '#587340', 'tuft');
      put('flower', [x + dx, y + h, z], [.115, .06, .115], rand() > .4 ? '#e7deaf' : '#d7c56e', 'flower');
    }
    if (!nearTree && rand() > .93) put('pebble', [x + .1, y + .09, z - .13], [.25, .18, .22], '#a1a28b', 'pebble');
  }
  return result;
}
