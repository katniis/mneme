import { random } from './trees/random.ts';
import { ALL_TREE_SPECIES, REAL_TREE_SPECIES, isTreeSpecies, type TreeSpecies } from './trees/profiles.ts';
import { buildMoonveilSkeleton } from './trees/moonveil.ts';
import { buildBroadleafSkeleton } from './trees/broadleaf.ts';
import { buildFloweringSkeleton } from './trees/flowering.ts';
import { buildPineSkeleton } from './trees/pine.ts';
import { buildSpruceSkeleton } from './trees/spruce.ts';
import { buildWillowSkeleton } from './trees/willow.ts';
import { voxelizeTree } from './trees/voxel-builder.ts';
import type { Voxel } from './trees/types.ts';
export { random } from './trees/random.ts';
export type { Vec3, Voxel } from './trees/types.ts';

export const TREE_SPECIES: readonly string[] = ALL_TREE_SPECIES;
export function seedForTree(seed: number, species: string) {
  const index = (REAL_TREE_SPECIES as readonly string[]).indexOf(species);
  return index < 0 ? seed : seed - (seed % 8) + index;
}
export function treeFamily(seed: number, species?: TreeSpecies): TreeSpecies {
  return species ?? REAL_TREE_SPECIES[((seed % 8) + 8) % 8];
}
export function chooseTree(seed: number, requested: string): { seed: number; species: TreeSpecies } {
  const species = requested === '' ? ALL_TREE_SPECIES[Math.floor(random(seed)() * 9)] : isTreeSpecies(requested) ? requested : treeFamily(seed);
  return { seed: isTreeSpecies(requested) ? seedForTree(seed, requested) : seed, species };
}
export function generateTree(seed: number, explicitSpecies?: TreeSpecies): Voxel[] {
  const species = treeFamily(seed, explicitSpecies);
  const skeleton = species === 'Oak' || species === 'Birch' || species === 'Maple' ? buildBroadleafSkeleton(seed, species)
    : species === 'Cherry Blossom' || species === 'Jacaranda' ? buildFloweringSkeleton(seed, species)
      : species === 'Pine' ? buildPineSkeleton(seed) : species === 'Spruce' ? buildSpruceSkeleton(seed) : species === 'Moonveil' ? buildMoonveilSkeleton(seed) : buildWillowSkeleton(seed);
  return voxelizeTree(skeleton, seed, species);
}
export function elementProgress(
	voxel: Pick<Voxel, "start" | "end">,
	progress: number,
) {
	const t = Math.max(
		0,
		Math.min(1, (progress - voxel.start) / (voxel.end - voxel.start)),
	);
	return t * t * (3 - 2 * t);
}

