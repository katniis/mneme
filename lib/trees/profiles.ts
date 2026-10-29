export const REAL_TREE_SPECIES = ['Oak', 'Birch', 'Maple', 'Cherry Blossom', 'Weeping Willow', 'Pine', 'Jacaranda', 'Spruce'] as const;
export const ALL_TREE_SPECIES = [...REAL_TREE_SPECIES, 'Moonveil'] as const;
export type TreeSpecies = typeof ALL_TREE_SPECIES[number];
export type TreeProfile = {
  height: readonly [number, number]; crownRatio: readonly [number, number];
  bark: readonly string[]; leaf: readonly string[]; blossom?: readonly string[];
};
export const TREE_LIMITS = { voxels: 12000, nodes: 512, attractors: 256, iterations: 128, attempts: 512 } as const;
export const TREE_PROFILES: Record<TreeSpecies, TreeProfile> = {
  Oak: { height: [5.9, 6.9], crownRatio: [.9, 1.2], bark: ['#635247', '#756354', '#51463c'], leaf: ['#426937', '#557e43', '#71934f'] },
  Birch: { height: [6.5, 7.5], crownRatio: [.4, .65], bark: ['#d6d6c7', '#b8bcae', '#e2dfce', '#635e54'], leaf: ['#628542', '#7b9b50', '#99ad61'] },
  Maple: { height: [4.2, 5], crownRatio: [.9, 1.3], bark: ['#797265', '#8b8172', '#655e54'], leaf: ['#527949', '#6f9456', '#829f60'] },
  'Cherry Blossom': { height: [4.8, 5.6], crownRatio: [.9, 1.2], bark: ['#6c4e42', '#815d4c', '#a17a64'], leaf: ['#537b43', '#6d9150', '#86a55b'], blossom: ['#efbbd0', '#e5a2bf', '#f5cfde'] },
  'Weeping Willow': { height: [5.6, 6.4], crownRatio: [1, 1.25], bark: ['#675a48', '#7b6b54', '#50483d'], leaf: ['#7a9b52', '#92ab64', '#a8ba78'] },
  Pine: { height: [6.9, 8.1], crownRatio: [.55, .8], bark: ['#796048', '#a36f4b', '#bc895e'], leaf: ['#436b5c', '#567e6a', '#6b927b'] },
  Jacaranda: { height: [5.9, 6.9], crownRatio: [.85, 1.2], bark: ['#77736a', '#8b8375', '#635f57'], leaf: ['#477b4b', '#5b8e56', '#76a065'], blossom: ['#9b83c9', '#b09bdb', '#826cb5'] },
  Spruce: { height: [7.4, 8.6], crownRatio: [.35, .55], bark: ['#655446', '#786450', '#51473d'], leaf: ['#335e4c', '#44745a', '#5c8867'] },
  Moonveil: { height: [6.7, 7.7], crownRatio: [.75, 1], bark: ['#bec1b5', '#dbd8c5', '#979fa0'], leaf: ['#507d8c', '#6b9d9b', '#8585a7'] },
};

export function isTreeSpecies(value: unknown): value is TreeSpecies {
  return typeof value === 'string' && (ALL_TREE_SPECIES as readonly string[]).includes(value);
}
