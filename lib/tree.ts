import { random } from './trees/random.ts';
import { REAL_TREE_SPECIES } from './trees/profiles.ts';
import { buildBroadleafSkeleton } from './trees/broadleaf.ts';
import { buildFloweringSkeleton } from './trees/flowering.ts';
import { buildPineSkeleton } from './trees/pine.ts';
import { buildSpruceSkeleton } from './trees/spruce.ts';
import { buildWillowSkeleton } from './trees/willow.ts';
import { voxelizeTree } from './trees/voxel-builder.ts';
import type { Voxel } from './trees/types.ts';
export { random } from './trees/random.ts';
export type { Vec3, Voxel } from './trees/types.ts';

export const TREE_SPECIES: readonly string[] = REAL_TREE_SPECIES;
export function seedForTree(seed: number, species: string) {
  const index = TREE_SPECIES.indexOf(species);
  return index < 0 ? seed : seed - (seed % 8) + index;
}
export function treeFamily(seed: number) {
  return REAL_TREE_SPECIES[((seed % 8) + 8) % 8];
}
export function generateTree(seed: number): Voxel[] {
  const species = treeFamily(seed);
  const skeleton = species === 'Oak' || species === 'Birch' || species === 'Maple' ? buildBroadleafSkeleton(seed, species)
    : species === 'Cherry Blossom' || species === 'Jacaranda' ? buildFloweringSkeleton(seed, species)
      : species === 'Pine' ? buildPineSkeleton(seed) : species === 'Spruce' ? buildSpruceSkeleton(seed) : buildWillowSkeleton(seed);
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

