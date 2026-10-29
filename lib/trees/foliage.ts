import { Euler, Quaternion, Vector3 } from 'three';
import { random } from './random.ts';
import { TREE_LIMITS, TREE_PROFILES, type TreeSpecies } from './profiles.ts';
import type { Organ, Vec3, Voxel, WoodOrgan } from './types.ts';

type Site = { parent: number; direction: Vec3; organ: Exclude<Organ, WoodOrgan>; organId: number };
type Tile = { position: Vec3; size: Vec3; rotation?: Vec3 };

function blade(species: TreeSpecies): Tile[] {
  const rows = species === 'Oak' ? [0, 1, 1, 2, 1, 2, 1, 0]
    : species === 'Maple' ? [0, 1, 2, 3, 2, 2, 0]
      : species === 'Weeping Willow' ? [0, 0, 0, 0, 0, 0, 0]
        : species === 'Birch' ? [0, 1, 1, 0] : [0, 1, 1, 1, 0];
  const tiles: Tile[] = [];
  for (let row = 0; row < rows.length; row++) for (let x = -rows[row]; x <= rows[row]; x++) {
    if (species === 'Maple' && row === 5 && Math.abs(x) === 1) continue;
    tiles.push({ position: [x * .06, 0, row * .06], size: [.0608, .026, .0608] });
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
      for (let j = 0; j < (species === 'Pine' ? 5 : 3); j++) tiles.push({
        position: [Math.sin(angle) * j * .05, 0, Math.cos(angle) * j * .05], size: [.028, .026, .065], rotation: [0, angle, 0],
      });
    }
    return tiles;
  }
  if (species === 'Jacaranda') {
    const tiles: Tile[] = [];
    for (let z = 0; z <= 10; z++) {
      tiles.push({ position: [0, 0, z * .03], size: [.036, .022, .037] });
      if (z > 1 && z < 10 && z % 2 === 0) for (const side of [-1, 1]) for (let x = 1; x <= 3; x++)
        tiles.push({ position: [side * x * .03, 0, z * .03], size: [.037, .025, .05] });
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
    const tiles = motif(species, site.organ);
    if (voxels.length + tiles.length > TREE_LIMITS.voxels) continue;
    const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(...site.direction).normalize())
      .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (rng() - .5) * .3));
    const euler = new Euler().setFromQuaternion(orientation), rotation: Vec3 = [euler.x, euler.y, euler.z], origin = voxels[site.parent].position;
    const group: Voxel[] = [];
    const colors = site.organ === 'blossom' ? profile.blossom ?? profile.leaf : profile.leaf;
    const color = site.organ === 'fruit' ? species === 'Moonveil' ? '#e5c68b' : '#88664a' : colors[Math.floor(rng() * colors.length)];
    for (const tile of tiles) {
      vector.fromArray(tile.position).applyEuler(euler);
      const position = vector.toArray().map((n, axis) => n + origin[axis]) as Vec3;
      let parent = site.parent, distance = Infinity;
      for (let i = 0; i < group.length; i++) {
        const other = group[i], d = Math.hypot(...tile.position.map((n, axis) => n - tiles[i].position[axis]));
        if (d < distance) { distance = d; parent = voxels.length + i; }
      }
      const support = parent < voxels.length ? voxels[parent] : group[parent - voxels.length];
      const start = Math.max(support.end, site.organ === 'blossom' ? .65 : 0);
      const localEuler = tile.rotation ? new Euler().setFromQuaternion(orientation.clone().multiply(new Quaternion().setFromEuler(new Euler(...tile.rotation)))) : euler;
      const localRotation: Vec3 = tile.rotation ? [localEuler.x, localEuler.y, localEuler.z] : rotation;
      group.push({ position, size: [...tile.size], anchor: [...support.position], parent, kind: site.organ === 'fruit' ? 'wood' : 'leaf',
        organ: site.organ, organId: site.organId, color, rotation: localRotation, start, end: start + .012,
        ...(species === 'Moonveil' ? { emissive: site.organ === 'fruit' ? .6 : site.organId % 11 === 0 ? .12 : 0 } : {}),
      });
    }
    voxels.push(...group);
  }
}
