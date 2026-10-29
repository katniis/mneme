import { random, type Vec3 } from './tree.ts';
import { CELL } from './terrain.ts';
import type { GroundColumn, ParticleField, ParticlePose } from './atmosphere.ts';

export const SNOW_LIMITS = { desktop: 640, mobile: 240 } as const;
export type SnowParticle = { origin: Vec3; bottom: number; phase: number; speed: number; size: number; wind: number };

export function spawnSnow(index: number, cycle: number, field: ParticleField): SnowParticle {
  const rng = random(index * 73856093 + cycle * 19349663 + 1827);
  const across = (rng() * 2 - 1) * field.halfWidth, along = (rng() * 2 - 1) * field.halfDepth;
  return { origin: [field.center[0] + field.right[0] * across + field.forward[0] * along, field.top, field.center[1] + field.right[1] * across + field.forward[1] * along],
    bottom: field.bottom, phase: rng() * Math.PI * 2, speed: 1.2 + rng(), size: .045 + rng() * .045, wind: .15 + rng() * .3 };
}

export function sampleSnow(p: SnowParticle, age: number, columns: ReadonlyMap<string, GroundColumn>, out: ParticlePose): void {
  const t = Math.max(0, age), drift = t * p.wind / Math.hypot(1, .35);
  out.position[0] = p.origin[0] + drift + (Math.sin(p.phase + t * .8) - Math.sin(p.phase)) * .19;
  out.position[1] = p.origin[1] - p.speed * t;
  out.position[2] = p.origin[2] + drift * .35 + (Math.cos(p.phase + t * .6) - Math.cos(p.phase)) * .19;
  const column = columns.get(`${Math.round(out.position[0] / CELL)}:${Math.round(out.position[2] / CELL)}`);
  const hit = column && Math.abs(out.position[0] - column.x) <= CELL / 2 && Math.abs(out.position[2] - column.z) <= CELL / 2 && out.position[1] <= column.y;
  out.finished = !!hit || out.position[1] <= p.bottom;
  out.opacity = out.finished ? 0 : 1;
  out.rotation[0] = p.phase + t * .35; out.rotation[1] = p.phase + t * .2; out.rotation[2] = t * .45;
  out.size[0] = p.size; out.size[1] = p.size * .65; out.size[2] = p.size;
}

export function snowSize(base: number, distance: number): number {
  return Math.max(.035, Math.min(.5, base * (1 + Math.max(0, distance) / 45)));
}
