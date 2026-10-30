import { random } from './trees/random.ts';
import { ALL_TREE_SPECIES, REAL_TREE_SPECIES, isTreeSpecies, type TreeSpecies } from './trees/profiles.ts';
import { buildMoonveilSkeleton } from './trees/moonveil.ts';
import { buildBroadleafSkeleton } from './trees/broadleaf.ts';
import { buildFloweringSkeleton } from './trees/flowering.ts';
import { buildPineSkeleton } from './trees/pine.ts';
import { buildSpruceSkeleton } from './trees/spruce.ts';
import { buildWillowSkeleton } from './trees/willow.ts';
import { voxelizeTree } from './trees/voxel-builder.ts';
import { applyIdentity, type BotanicalIdentity } from './meta-identity.ts';
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
export function generateTree(seed: number, explicitSpecies?: TreeSpecies, identity?: BotanicalIdentity): Voxel[] {
  const species = identity ? identity.species : treeFamily(seed, explicitSpecies);
  const skeleton = species === 'Oak' || species === 'Birch' || species === 'Maple' ? buildBroadleafSkeleton(seed, species, identity)
    : species === 'Cherry Blossom' || species === 'Jacaranda' ? buildFloweringSkeleton(seed, species, identity)
      : species === 'Pine' ? buildPineSkeleton(seed, identity) : species === 'Spruce' ? buildSpruceSkeleton(seed, identity) : species === 'Moonveil' ? buildMoonveilSkeleton(seed, identity) : buildWillowSkeleton(seed, identity);
  if (identity) applyIdentity(skeleton, identity, seed);
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

