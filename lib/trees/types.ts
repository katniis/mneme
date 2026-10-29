export type Vec3 = [number, number, number];
export type WoodOrgan = 'root' | 'trunk' | 'branch' | 'twig';
export type Organ = WoodOrgan | 'leaf' | 'needle' | 'blossom' | 'fruit' | 'bud' | 'juvenile-leaf';
export type Voxel = {
  position: Vec3; anchor: Vec3; size: Vec3; color: string;
  start: number; end: number; parent: number; kind: 'wood' | 'leaf';
  rotation?: Vec3; organ?: Organ; organId?: number; emissive?: number;
};
export type SkeletonNode = { position: Vec3; parent: number; radius: number; organ: WoodOrgan; order: number };
export type OrganSite = { node: number; direction: Vec3; organ: Exclude<Organ, WoodOrgan>; organId: number };
export type TreeSkeleton = { nodes: SkeletonNode[]; sites: OrganSite[] };
export type VoxelAppearance = { scale: number; color: string; emissive: number };
