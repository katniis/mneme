import type { EnvironmentFrame, Season } from './environment.ts';
import { progress } from './garden.ts';
import { groundHeight } from './terrain.ts';
import { random, treeFamily, elementProgress, type Vec3, type Voxel } from './tree.ts';
import type { TreeRecord } from './tree-removal.ts';
import type { ParticlePose } from './atmosphere.ts';

export const AMBIENCE_LIMITS = { desktop: { motes: 160, debris: 96, fireflies: 32 }, mobile: { motes: 56, debris: 32, fireflies: 8 } } as const;
export type AmbienceKind = 'mote' | 'petal' | 'leaf' | 'firefly';
export type AmbienceProfile = { motes: number; debris: number; fireflies: number; debrisKind: 'petal' | 'leaf' | null };
export type LeafSource = { tree: TreeRecord; voxel: Voxel };
export type AmbientParticle = { kind: AmbienceKind; origin: Vec3; seed: number; duration: number };
const SEASONS = { neutral: [.25, 0, .35], spring: [.7, .6, .4], summer: [1, 0, 1], autumn: [.3, 1, .25], winter: [.12, 0, 0], tropical: [.6, .35, .85] } as const;
const TIMES = [[.6, 1, .1], [1, .8, 0], [.35, .6, 1], [.1, .2, .8]] as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function sampleAmbience(frame: EnvironmentFrame): AmbienceProfile {
  const result: AmbienceProfile = { motes: 0, debris: 0, fireflies: 0, debrisKind: frame.season === 'spring' ? 'petal' : frame.season === 'autumn' || frame.season === 'tropical' ? 'leaf' : null };
  if (!frame.enabled || !frame.ambience || frame.snow) return result;
  const angle = ((frame.solarAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), phase = angle / (Math.PI / 2);
  const index = frame.period === 'static' ? 1 : Math.floor(phase), next = (index + 1) % 4, t = frame.period === 'static' ? 0 : phase - index;
  const blend = t * t * (3 - 2 * t), darkness = frame.period === 'static' ? 0 : clamp(1 - frame.daylight * 2), night = darkness * darkness * (3 - 2 * darkness);
  const weather = Math.max(frame.cloudCover, frame.rainIntensity), season = SEASONS[frame.season];
  for (const [i, key] of (['motes', 'debris', 'fireflies'] as const).entries()) {
    const base = TIMES[index][i] + (TIMES[next][i] - TIMES[index][i]) * blend;
    result[key] = season[i] * (base + (TIMES[3][i] - base) * night) * (key === 'fireflies' ? 1 - weather : 1 - .85 * weather);
  }
  result.fireflies *= clamp((.85 - frame.daylight) / .35);
  return result;
}

export function leafSources(trees: readonly { tree: TreeRecord; voxels: readonly Voxel[] }[]): LeafSource[] {
  const result: LeafSource[] = [];
  for (const { tree, voxels } of trees) {
    const leaves = voxels.filter(v => v.kind === 'leaf'), count = Math.min(16, leaves.length), offset = Math.floor(random(tree.seed)() * leaves.length);
    for (let i = 0; i < count; i++) result.push({ tree, voxel: leaves[(offset + Math.floor(i * leaves.length / count)) % leaves.length] });
  }
  return result;
}

export function leafOrigin(source: LeafSource, time: number, season: Season): Vec3 | null {
  const family = treeFamily(source.tree.seed), v = source.voxel;
  if (v.kind !== 'leaf' || (season === 'spring' ? !['Cherry Blossom', 'Jacaranda'].includes(family) : !['autumn', 'tropical'].includes(season) || ['Pine', 'Spruce'].includes(family))) return null;
  const g = elementProgress(v, progress(source.tree, time));
  if (g < .95) return null;
  return [source.tree.position[0] + v.anchor[0] + (v.position[0] - v.anchor[0]) * g,
    groundHeight(...source.tree.position) + v.anchor[1] + (v.position[1] - v.anchor[1]) * g,
    source.tree.position[1] + v.anchor[2] + (v.position[2] - v.anchor[2]) * g];
}

export function spawnAmbient(kind: AmbienceKind, index: number, cycle: number, origin: Vec3): AmbientParticle {
  const rng = random(index * 73856093 + cycle * 19349663 + 619);
  return { kind, origin: [...origin], seed: Math.floor(rng() * 4294967296), duration: kind === 'leaf' || kind === 'petal' ? 4 + rng() * 3 : 6 + rng() * 4 };
}

export function sampleAmbientParticle(p: AmbientParticle, age: number, out: ParticlePose): void {
  const t = Math.max(0, age), phase = p.seed / 4294967296 * Math.PI * 2, debris = p.kind === 'leaf' || p.kind === 'petal';
  out.position[0] = p.origin[0] + t * (debris ? .16 : .04) + (Math.sin(phase + t * .7) - Math.sin(phase)) * (debris ? .3 : .5);
  out.position[2] = p.origin[2] + t * .04 + (Math.cos(phase + t * .6) - Math.cos(phase)) * .3;
  out.position[1] = p.origin[1] + (debris ? -t * (.55 + (p.seed % 7) * .04) : (Math.sin(phase + t * .8) - Math.sin(phase)) * .12);
  out.rotation[0] = phase + t * (debris ? 1.1 : .15); out.rotation[1] = t * .5; out.rotation[2] = phase + t * .6;
  out.finished = t >= p.duration;
  const fade = clamp(t / .4) * clamp((p.duration - t) / .4), pulse = p.kind === 'firefly' ? .25 + .75 * Math.sin(phase + t * 1.6) ** 2 : p.kind === 'mote' ? .45 : .85;
  out.opacity = out.finished ? 0 : fade * pulse;
  const size = p.kind === 'mote' ? .035 : p.kind === 'firefly' ? .055 : .13;
  out.size[0] = size; out.size[1] = debris ? .02 : size; out.size[2] = debris ? size * .55 : size;
}

export function ambientSizeScale(kind: AmbienceKind, distance: number): number {
  return kind === 'firefly' ? Math.max(1, Math.min(12, distance / 25)) : Math.min(2.5, 1 + Math.max(0, distance) / 90);
}
