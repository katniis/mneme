import { Euler, Quaternion, Vector3 } from 'three';
import { random } from './random.ts';
import { TREE_LIMITS, TREE_PROFILES, type TreeSpecies } from './profiles.ts';
import type { Organ, Vec3, Voxel, WoodOrgan } from './types.ts';

type Site = { parent: number; direction: Vec3; organ: Exclude<Organ, WoodOrgan>; organId: number };
type Tile = { position: Vec3; size: Vec3; rotation?: Vec3 };
const motifs = new Map<string, (Tile & { parent: number })[]>();

function organTemplate(species: TreeSpecies, organ: Site['organ']) {
  const key = `${species}:${organ}`;
  if (!motifs.has(key)) {
    const tiles = motif(species, organ);
    motifs.set(key, tiles.map((tile, index) => {
      let parent = -1, distance = Infinity;
      for (let i = 0; i < index; i++) {
        const other = tiles[i], p = other.position;
        if (!tile.rotation && !other.rotation && p.some((v, a) => Math.abs(v - tile.position[a]) > (tile.size[a] + other.size[a]) / 2 + .00001)) continue;
        const d = (p[0] - tile.position[0]) ** 2 + (p[1] - tile.position[1]) ** 2 + (p[2] - tile.position[2]) ** 2;
        if (d < distance) { distance = d; parent = i; }
      }
      return { ...tile, parent };
    }));
  }
  return motifs.get(key)!;
}

function blade(species: TreeSpecies): Tile[] {
  if (species === 'Weeping Willow') return [
    { position: [0, 0, 0], size: [.0608, .026, .0608] },
    { position: [0, 0, .18], size: [.0908, .026, .3008] },
    { position: [0, 0, .36], size: [.0408, .026, .0608] },
  ];
  const rows = species === 'Oak' ? [0, 1, 1, 2, 1, 2, 1, 0]
    : species === 'Maple' ? [0, 1, 2, 3, 2, 2, 0]
      : species === 'Birch' ? [0, 1, 1, 0] : [0, 1, 1, 1, 0];
  const tiles: Tile[] = [];
  for (let row = 0; row < rows.length; row++) {
    // Merge coplanar cells without changing the lobed voxel outline.
    if (species === 'Maple' && row === 5) {
      for (const x of [-2, 0, 2]) tiles.push({ position: [x * .06, 0, row * .06], size: [.0608, .026, .0608] });
    } else tiles.push({ position: [0, 0, row * .06], size: [(rows[row] * 2 + 1) * .06 + .0008, .026, .0608] });
  }
  return tiles;
}

function motif(species: TreeSpecies, organ: Site['organ']): Tile[] {
  if (organ === 'blossom') {
    if (species === 'Jacaranda') {
      const tiles: Tile[] = [];
      for (let i = 0; i < 6; i++) {
        tiles.push({ position: [0, 0, i * .055], size: [.06, .06, .065] });
        if (i < 5) for (const side of [-1, 1]) tiles.push({ position: [side * .045, .02, i * .055], size: [.06, .07, .065] });
      }
      return tiles;
    }
    const tiles: Tile[] = [{ position: [0, 0, 0], size: [.07, .07, .07] }];
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      tiles.push({ position: [Math.cos(a) * .055, .025 + (i % 2) * .035, Math.sin(a) * .055], size: [.08, .07, .08] });
    }
    return tiles;
  }
  if (organ === 'fruit' || organ === 'bud') return [{ position: [0, 0, organ === 'fruit' ? .1 : 0], size: organ === 'bud' ? [.045, .06, .045] : [.08, .08, .16] }];
  if (organ === 'needle') {
    const tiles: Tile[] = [];
    const count = species === 'Pine' ? 2 : 5;
    for (let i = 0; i < count; i++) {
      const angle = species === 'Pine' ? (i ? .18 : -.18) : i * Math.PI * 2 / count;
      const half = species === 'Pine' ? .1 : .05;
      tiles.push({ position: [Math.sin(angle) * half, 0, Math.cos(angle) * half], size: [.028, .026, half * 2 + .065], rotation: [0, angle, 0] });
    }
    return tiles;
  }
  if (species === 'Jacaranda') {
    const tiles: Tile[] = [{ position: [0, 0, .18], size: [.026, .02, .386] }];
    for (const z of [.07, .14, .21, .28]) for (const side of [-1, 1]) {
      tiles.push({ position: [side * .07, 0, z], size: [.151, .018, .02] });
      for (const x of [.035, .075, .115]) for (const pair of [-1, 1])
        tiles.push({ position: [side * x, 0, z + pair * .032], size: [.022, .018, .048] });
    }
    return tiles;
  }
  return blade(species);
}

export function appendOrgans(voxels: Voxel[], sites: readonly Site[], seed: number, species: TreeSpecies): void {
  const profile = TREE_PROFILES[species], rng = random(seed ^ 0x519bc43);
  const vector = new Vector3();
  for (const site of sites) {
    if (!voxels[site.parent]) continue;
    const tiles = organTemplate(species, site.organ);
    if (voxels.length + tiles.length > TREE_LIMITS.voxels) continue;
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...site.direction).normalize())
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (rng() - .5) * .3));
    const euler = new Euler().setFromQuaternion(orientation), rotation: Vec3 = [euler.x, euler.y, euler.z], origin = voxels[site.parent].position;
    const group: Voxel[] = [];
    const rotations = new Map<number, Vec3>();
    const colors = site.organ === 'blossom' ? profile.blossom ?? profile.leaf : profile.leaf;
    const color = site.organ === 'fruit' ? species === 'Moonveil' ? '#e5c68b' : '#88664a' : colors[Math.floor(rng() * colors.length)];
    for (const tile of tiles) {
      vector.fromArray(tile.position).applyQuaternion(orientation);
      const position: Vec3 = [vector.x + origin[0], vector.y + origin[1], vector.z + origin[2]];
      const parent = tile.parent < 0 ? site.parent : voxels.length + tile.parent;
      const support = parent < voxels.length ? voxels[parent] : group[parent - voxels.length];
      const start = Math.max(support.end, site.organ === 'blossom' ? .65 : 0);
      let localRotation = rotation;
      if (tile.rotation) {
        const yaw = tile.rotation[1];
        if (!rotations.has(yaw)) {
          const e = new Euler().setFromQuaternion(orientation.clone().multiply(new Quaternion().setFromEuler(new Euler(...tile.rotation))));
          rotations.set(yaw, [e.x, e.y, e.z]);
        }
        localRotation = rotations.get(yaw)!;
      }
      group.push({ position, size: [...tile.size], anchor: [...support.position], parent, kind: site.organ === 'fruit' ? 'wood' : 'leaf',
        organ: site.organ, organId: site.organId, color, rotation: localRotation, start, end: start + .012,
        ...(species === 'Moonveil' ? { emissive: site.organ === 'fruit' ? .6 : site.organId % 11 === 0 ? .12 : 0 } : {}),
      });
    }
    voxels.push(...group);
  }
}
