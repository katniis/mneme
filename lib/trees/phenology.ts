import type { Season } from '../environment.ts';
import type { TreeSpecies } from './profiles.ts';
import type { Voxel, VoxelAppearance } from './types.ts';

const DENSITY: Record<TreeSpecies, readonly number[]> = {
  Oak: [.8, 1, .55, 0], Birch: [.75, 1, .45, 0], Maple: [.8, 1, .65, 0],
  'Cherry Blossom': [.25, 1, .6, 0], 'Weeping Willow': [.8, 1, .7, 0],
  Pine: [1, 1, 1, 1], Jacaranda: [.2, 1, .8, .2], Spruce: [1, 1, 1, 1], Moonveil: [1, 1, 1, 1],
};
const AUTUMN: Record<string, readonly string[]> = {
  Oak: ['#aa914c', '#927340', '#b49b58'], Birch: ['#c5ab4c', '#d8bd5e', '#b49a44'],
  Maple: ['#b84630', '#d47a35', '#d1a442'], 'Cherry Blossom': ['#b67948', '#ac6144', '#c49253'],
  'Weeping Willow': ['#a7ad5b', '#bbc478', '#9ca756'], Jacaranda: ['#7c9252', '#8fa565', '#6a854a'],
};
function fraction(id: number) {
  let n = Math.imul(id ^ 0x45d9f3b, 0x45d9f3b); n = Math.imul(n ^ n >>> 16, 0x45d9f3b);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
}

export function sampleTreeAppearance(v: Voxel, species: TreeSpecies, season: Season, growth = 1): VoxelAppearance {
  const organ = v.organ ?? (v.kind === 'leaf' ? 'leaf' : 'branch'), id = v.organId ?? 0, pick = fraction(id);
  const stage = season === 'spring' ? 0 : season === 'autumn' ? 2 : season === 'winter' ? 3 : 1;
  let density = 1, color = v.color;
  if (organ === 'juvenile-leaf') density = growth > .2 ? 0 : DENSITY[species][stage];
  else if (organ === 'blossom') density = growth < .65 ? 0 : stage === 0 ? 1 : species === 'Jacaranda' && season === 'summer' ? .1 : 0;
  else if (organ === 'leaf') density = DENSITY[species][stage];
  const foliage = organ === 'leaf' || organ === 'needle' || organ === 'juvenile-leaf';
  if (foliage && species === 'Moonveil') {
    const colors = stage === 0 ? ['#83b5b0', '#6b9aa6', '#abc2b8'] : stage === 2 ? ['#8b78a6', '#a191b7', '#b7a277'] : stage === 3 ? ['#b5d1ce', '#87b6c3', '#c6d8d7'] : ['#507d8c', '#6b9d9b', '#8585a7'];
    color = colors[Math.floor(pick * colors.length)];
  } else if (foliage && stage === 2 && AUTUMN[species]) color = AUTUMN[species][Math.floor(pick * 3)];
  else if (foliage && stage === 0) {
    if (species === 'Cherry Blossom') color = ['#9d7754', '#aa8a62', '#87945a'][Math.floor(pick * 3)];
    else if (organ !== 'needle' || pick < .18) color = ['#819d58', '#95ad6a', '#a3b779'][Math.floor(pick * 3)];
  }
  return { scale: pick < density ? 1 : 0, color, emissive: species === 'Moonveil' ? Math.min(.6, Math.max(0, v.emissive ?? 0)) : 0 };
}
