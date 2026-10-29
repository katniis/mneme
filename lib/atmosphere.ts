import { CELL, type TerrainVoxel } from './terrain.ts';
import type { Vec3 } from './tree.ts';

export type GroundColumn = { x: number; y: number; z: number };
export type ParticleField = { center: [number, number]; right: [number, number]; forward: [number, number]; halfWidth: number; halfDepth: number; top: number; bottom: number };
export type ParticlePose = { position: Vec3; rotation: Vec3; size: Vec3; opacity: number; finished: boolean };
export type RainSpawn = { x: number; z: number; top: number; bottom: number; impactY: number | null };
function hash(n: number) { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; }
export function groundColumns(terrain: readonly TerrainVoxel[]): ReadonlyMap<string, GroundColumn> {
  return new Map(terrain.filter(v => v.kind === 'grass').map(v => [
    `${Math.round(v.position[0] / CELL)}:${Math.round(v.position[2] / CELL)}`,
    { x: v.position[0], y: v.position[1] + v.size[1] / 2, z: v.position[2] },
  ]));
}
export function makeParticleField(center: [number, number], radius: number, treeTop: number, camera: { position: Vec3; target: Vec3; aspect: number }): ParticleField {
  const dx = camera.target[0] - camera.position[0], dz = camera.target[2] - camera.position[2];
  const horizontal = Math.hypot(dx, dz), distance = Math.hypot(dx, camera.target[1] - camera.position[1], dz);
  const forward: [number, number] = horizontal > .001 ? [dx / horizontal, dz / horizontal] : [0, 1];
  const right: [number, number] = horizontal > .001 ? [-forward[1], forward[0]] : [1, 0];
  const halfDepth = Math.max(12, radius * 1.8, distance * .65);
  return { center: [camera.target[0] ?? center[0], camera.target[2] ?? center[1]], forward, right, halfDepth,
    halfWidth: halfDepth * Math.max(.7, Math.min(2, camera.aspect)), top: Math.max(treeTop + 12, 16, camera.position[1] + distance * .6), bottom: Math.min(-16, -.8 * radius, camera.position[1] - distance * .9) };
}
export function rainSpawn(index: number, cycle: number, field: ParticleField, ground: ReadonlyMap<string, GroundColumn>): RainSpawn {
  const seed = hash(index + cycle * 1201 + 71);
  const across = (seed / 4294967296 * 2 - 1) * field.halfWidth;
  const along = (hash(seed) / 4294967296 * 2 - 1) * field.halfDepth;
  const x = field.center[0] + field.right[0] * across + field.forward[0] * along;
  const z = field.center[1] + field.right[1] * across + field.forward[1] * along;
  const column = ground.get(`${Math.round(x / CELL)}:${Math.round(z / CELL)}`);
  const onGround = column && Math.abs(column.x - x) <= CELL / 2 && Math.abs(column.z - z) <= CELL / 2;
  return { x, z, top: field.top, bottom: field.bottom, impactY: onGround ? column.y : null };
}
export function rainPosition(spawn: RainSpawn, ageSeconds: number) {
  const floor = spawn.impactY ?? spawn.bottom, duration = (spawn.top - floor) / 12;
  const age = Math.max(0, ageSeconds), finished = age >= duration + (spawn.impactY === null ? 0 : .1);
  return { x: spawn.x, y: Math.max(floor, spawn.top - age * 12), z: spawn.z, impact: spawn.impactY !== null && age >= duration && !finished, finished };
}
export function rainStreakSize(distance: number) {
  const d = Math.max(0, distance);
  return { width: Math.min(.16, Math.max(.014, d * .00055), d * .002), length: Math.min(1.5, Math.max(.32, d * .0035), d * .012) };
}

export function fitShadowBounds(points: readonly Vec3[], lightView: readonly number[]) {
  const projected = points.map(([x, y, z]) => [lightView[0] * x + lightView[4] * y + lightView[8] * z + lightView[12], lightView[1] * x + lightView[5] * y + lightView[9] * z + lightView[13], lightView[2] * x + lightView[6] * y + lightView[10] * z + lightView[14]]);
  const near = Math.max(.1, -Math.max(...projected.map(p => p[2])) - 2);
  return { left: Math.min(...projected.map(p => p[0])) - 2, right: Math.max(...projected.map(p => p[0])) + 2, bottom: Math.min(...projected.map(p => p[1])) - 2, top: Math.max(...projected.map(p => p[1])) + 2, near, far: Math.max(near + 1, -Math.min(...projected.map(p => p[2])) + 2) };
}
