import { random } from './trees/random.ts';
import { buildBroadleafSkeleton } from './trees/broadleaf.ts';
import { buildFloweringSkeleton } from './trees/flowering.ts';
import { voxelizeTree } from './trees/voxel-builder.ts';
import type { Vec3, Voxel } from './trees/types.ts';
export { random } from './trees/random.ts';
export type { Vec3, Voxel } from './trees/types.ts';
type SpeciesProfile = {
	name: string;
	form: "broadleaf" | "conifer" | "willow";
	bark: string[];
	leaf: string[];
	blossom?: string[];
	blossomRatio?: number;
	blossomTop?: boolean;
	barkFleck?: boolean;
	barkBand?: boolean;
	height: number;
	spread: number;
	trunkWidth: number;
	branches: [number, number];
	levelBase: number;
	levelRange: number;
	lift: number;
	primaryWidth: number;
	leafFootprint: Vec3;
	opposite?: boolean;
	autumn?: boolean;
	compound?: boolean;
	extraLeaf: boolean;
	leaderCount: number;
	leaderReach: number;
	forkHeight?: number;
	forkCount?: number;
	crownPeak?: number;
	crownTop?: number;
	droop?: number;
	whorlDropout?: number;
	tipLift?: number;
	branchletDroop?: boolean;
	reachFloor?: number;
	reachExponent?: number;
	tiers?: number;
	perTier?: number;
	canopyBase?: number;
	branchWood?: number;
	needleSize?: Vec3;
	needleEvery?: number;
	needleMode?: "fascicle" | "single";
	cones?: boolean;
};

const palettes: SpeciesProfile[] = [
	{
		name: "Oak",
		form: "broadleaf",
		bark: ["#69503a", "#795c40", "#574434", "#886b49"],
		leaf: ["#547a36", "#638a3e", "#77994b", "#41662e", "#8ba455"],
		height: 4.3,
		spread: 2.4,
		trunkWidth: 0.34,
		branches: [6, 8],
		levelBase: 0.32,
		levelRange: 0.57,
		lift: 0.65,
		primaryWidth: 0.2,
		leafFootprint: [0.3, 0.09, 0.18],
		extraLeaf: true,
		leaderCount: 7,
		leaderReach: 0.8,
		forkHeight: 0.3,
		forkCount: 4,
		crownPeak: 0.45,
		crownTop: 0.6,
	},
	{
		name: "Birch",
		form: "broadleaf",
		bark: ["#b4b39d", "#cecbb5", "#767467", "#d9d6bd"],
		leaf: ["#6d923e", "#82a74d", "#9bb55b", "#527a35", "#739343"],
		barkFleck: true,
		height: 5.7,
		spread: 1.45,
		trunkWidth: 0.24,
		branches: [8, 8],
		levelBase: 0.32,
		levelRange: 0.57,
		lift: 1.25,
		primaryWidth: 0.15,
		leafFootprint: [0.2, 0.07, 0.16],
		extraLeaf: false,
		leaderCount: 6,
		leaderReach: 0.5,
		crownPeak: 0.45,
		crownTop: 0.3,
		droop: 0.7,
	},
	{
		name: "Maple",
		form: "broadleaf",
		bark: ["#6e6259", "#7d7168", "#5d534c", "#8a7d72"],
		leaf: ["#c33d26", "#d95d28", "#e08a35", "#a92c22", "#e5a44a"],
		height: 4.7,
		spread: 2.2,
		trunkWidth: 0.3,
		branches: [7, 9],
		levelBase: 0.32,
		levelRange: 0.57,
		lift: 0.8,
		primaryWidth: 0.18,
		leafFootprint: [0.26, 0.08, 0.26],
		opposite: true,
		autumn: true,
		extraLeaf: true,
		leaderCount: 7,
		leaderReach: 0.8,
		crownPeak: 0.55,
		crownTop: 0.45,
	},
	{
		name: "Cherry Blossom",
		form: "broadleaf",
		bark: ["#5d4034", "#6b4a3a", "#4e3428", "#a9826d"],
		leaf: ["#7fae56", "#93bc66", "#6d9a49"],
		blossom: ["#f6c6d9", "#f9dbe6", "#f2a9c4", "#e98fb5"],
		blossomRatio: 0.85,
		barkBand: true,
		height: 3.8,
		spread: 2.7,
		trunkWidth: 0.3,
		branches: [6, 7],
		levelBase: 0.3,
		levelRange: 0.5,
		lift: 0.3,
		primaryWidth: 0.17,
		leafFootprint: [0.28, 0.07, 0.14],
		extraLeaf: false,
		leaderCount: 5,
		leaderReach: 0.9,
		forkHeight: 0.22,
		forkCount: 4,
		crownPeak: 0.5,
		crownTop: 0.85,
	},
	{
		name: "Weeping Willow",
		form: "willow",
		bark: ["#55483a", "#635442", "#483c30", "#71604c"],
		leaf: ["#7f9f4d", "#93b05e", "#6d9142", "#a8bf6f"],
		height: 5.0,
		spread: 2.3,
		trunkWidth: 0.38,
		branches: [8, 8],
		levelBase: 0.3,
		levelRange: 0.5,
		lift: 0.7,
		primaryWidth: 0.16,
		leafFootprint: [0.045, 0.42, 0.045],
		extraLeaf: false,
		leaderCount: 0,
		leaderReach: 0,
	},
	{
		name: "Pine",
		form: "conifer",
		bark: ["#7a5236", "#8a5f3d", "#66452e", "#96684a"],
		leaf: ["#2f5d33", "#3a6b3a", "#2a5230", "#477a42"],
		height: 6.6,
		spread: 2.1,
		trunkWidth: 0.3,
		branches: [0, 0],
		levelBase: 0,
		levelRange: 0,
		lift: 0,
		primaryWidth: 0.09,
		leafFootprint: [0.3, 0.045, 0.045],
		extraLeaf: false,
		leaderCount: 0,
		leaderReach: 0,
		tiers: 9,
		perTier: 3,
		canopyBase: 0.3,
		branchWood: 0.09,
		needleSize: [0.3, 0.045, 0.045],
		needleEvery: 1,
		needleMode: "fascicle",
		cones: true,
		whorlDropout: 0.35,
		tipLift: 0.28,
		reachFloor: 0.45,
		reachExponent: 0.85,
	},
	{
		name: "Jacaranda",
		form: "broadleaf",
		bark: ["#7b7268", "#877d72", "#695f55", "#968a7d"],
		leaf: ["#4f7d3a", "#5f8f45", "#6fa050", "#426e32"],
		blossom: ["#8b6fc7", "#a58ae0", "#7a5fb8", "#b7a3e8"],
		blossomTop: true,
		height: 4.9,
		spread: 2.7,
		trunkWidth: 0.28,
		branches: [6, 8],
		levelBase: 0.48,
		levelRange: 0.38,
		lift: 0.35,
		primaryWidth: 0.16,
		leafFootprint: [0.16, 0.05, 0.1],
		compound: true,
		extraLeaf: true,
		leaderCount: 4,
		leaderReach: 1.0,
		forkHeight: 0.48,
		forkCount: 5,
		crownPeak: 0.7,
		crownTop: 0.95,
	},
	{
		name: "Spruce",
		form: "conifer",
		bark: ["#5a4632", "#665038", "#4c3a2a", "#73593d"],
		leaf: ["#24483a", "#2d5a44", "#3a6b52", "#1f4034"],
		height: 7.2,
		spread: 1.7,
		trunkWidth: 0.26,
		branches: [0, 0],
		levelBase: 0,
		levelRange: 0,
		lift: 0,
		primaryWidth: 0.105,
		leafFootprint: [0.22, 0.04, 0.04],
		extraLeaf: false,
		leaderCount: 0,
		leaderReach: 0,
		tiers: 12,
		perTier: 4,
		canopyBase: 0.14,
		branchWood: 0.105,
		needleSize: [0.22, 0.04, 0.04],
		needleEvery: 1,
		needleMode: "single",
		tipLift: 0.2,
		branchletDroop: true,
		reachFloor: 0.22,
		reachExponent: 1.15,
	},
];

export const TREE_SPECIES = palettes.map((profile) => profile.name);

export function seedForTree(seed: number, species: string) {
  const index = TREE_SPECIES.indexOf(species);
  return index < 0 ? seed : seed - (seed % TREE_SPECIES.length) + index;
}

export function treeFamily(seed: number) {
	return palettes[((seed % 8) + 8) % 8].name;
}
const mix = (a: Vec3, b: Vec3, t: number): Vec3 =>
	a.map((n, i) => n + (b[i] - n) * t) as Vec3;
const add = (a: Vec3, b: Vec3): Vec3 => a.map((n, i) => n + b[i]) as Vec3;

export function generateTree(seed: number): Voxel[] {
  const species = treeFamily(seed);
  if (species === 'Oak' || species === 'Birch' || species === 'Maple') return voxelizeTree(buildBroadleafSkeleton(seed, species), seed, species);
  if (species === 'Cherry Blossom' || species === 'Jacaranda') return voxelizeTree(buildFloweringSkeleton(seed, species), seed, species);
	const rng = random(seed);
	const family = ((seed % 8) + 8) % 8;
	const profile = palettes[family];
	const height = profile.height + rng() * 0.8;
	const spread = profile.spread;
	const bark = profile.bark;
	const greens = profile.leaf;
	const voxels: Voxel[] = [];
	const occupied = new Map<string, number[]>();
	const OCC_CELL = 0.06;
	const OCC_DIST = 0.035;
	const occKey = (p: Vec3) =>
		`${Math.floor(p[0] / OCC_CELL)}:${Math.floor(p[1] / OCC_CELL)}:${Math.floor(p[2] / OCC_CELL)}`;
	const findOccupied = (
		position: Vec3,
		parent: number,
		intendedSize: number,
	) => {
		const cx = Math.floor(position[0] / OCC_CELL);
		const cy = Math.floor(position[1] / OCC_CELL);
		const cz = Math.floor(position[2] / OCC_CELL);
		let best = -1;
		let bestDist = OCC_DIST;
		for (let dx = -1; dx <= 1; dx++)
			for (let dy = -1; dy <= 1; dy++)
				for (let dz = -1; dz <= 1; dz++) {
					for (const idx of occupied.get(
						`${cx + dx}:${cy + dy}:${cz + dz}`,
					) ?? []) {
						if (idx === parent) continue;
						if (voxels[idx].size[0] < intendedSize * 0.8) continue;
						const other = voxels[idx].position;
						const d = Math.hypot(
							position[0] - other[0],
							position[1] - other[1],
							position[2] - other[2],
						);
						if (d < bestDist) {
							bestDist = d;
							best = idx;
						}
					}
				}
		return best;
	};
	const luminance = (hex: string) => {
		const n = parseInt(hex.slice(1), 16);
		return (
			(0.2126 * ((n >> 16) & 255) +
				0.7152 * ((n >> 8) & 255) +
				0.0722 * (n & 255)) /
			255
		);
	};
	const sortedGreens = [...greens].sort(
		(a, b) => luminance(a) - luminance(b),
	);
	const lightAt = (p: Vec3) =>
		Math.max(
			0,
			Math.min(
				1,
				(Math.hypot(p[0], p[2]) / (spread * 1.25)) * 0.6 +
					(p[1] / height) * 0.4,
			),
		);
	const put = (
		position: Vec3,
		size: Vec3,
		parent: number,
		kind: Voxel["kind"],
		duration = 0.006,
		colorOverride?: string,
		rotation?: Vec3,
	) => {
		if (kind === "wood" && size[0] >= 0.12) {
			const hit = findOccupied(position, parent, size[0]);
			if (hit >= 0) return hit;
		}
		const start = parent >= 0 ? voxels[parent].end : 0;
		const light = lightAt(position);
		let finalSize: Vec3 = [...size] as Vec3;
		if (kind === "leaf") {
			const scaleXZ = 1.28 - light * 0.52;
			finalSize = [
				size[0] * scaleXZ,
				size[1] * (1 - (1 - light) * 0.15),
				size[2] * scaleXZ,
			] as Vec3;
			if (parent >= 0) {
				const parentSize = voxels[parent].size;
				for (let axis = 0; axis < 3; axis++) {
					const needed =
						2 *
							Math.abs(
								position[axis] - voxels[parent].position[axis],
							) -
						parentSize[axis] +
						0.004;
					if (finalSize[axis] < needed) finalSize[axis] = needed;
				}
			}
		}
		let color = colorOverride;
		if (!color) {
			if (kind === "wood") {
				if (
					profile.barkBand &&
					Math.floor(position[1] / 0.12) % 3 === 0
				)
					color = bark[3];
				else if (profile.barkFleck && position[1] < height * 0.15)
					color = bark[2];
				else if (profile.barkFleck)
					color = bark[rng() < 0.08 ? 2 : rng() < 0.5 ? 1 : 3];
				else color = bark[Math.floor(rng() * bark.length)];
			} else if (profile.autumn) {
				const reds = ["#c33d26", "#d95d28", "#a92c22"];
				const ambers = ["#e08a35", "#e5a44a"];
				const pool = rng() < light ? reds : ambers;
				color = pool[Math.floor(rng() * pool.length)];
			} else {
				const target = Math.max(
					0,
					Math.min(
						sortedGreens.length - 1,
						Math.round(
							light * (sortedGreens.length - 1) +
								(rng() - 0.5) * 0.8,
						),
					),
				);
				color = sortedGreens[target];
			}
		}
		const leafRotation: Vec3 | undefined =
			kind === "leaf"
				? (rotation ?? [
						0.15 +
							0.75 *
								Math.max(0, Math.min(1, position[1] / height)) +
							(rng() - 0.5) * 0.15,
						-Math.atan2(position[2], position[0]),
						(rng() - 0.5) * 0.2,
					])
				: undefined;
		voxels.push({
			position,
			anchor:
				parent >= 0
					? [...voxels[parent].position]
					: [position[0], 0, position[2]],
			size: finalSize,
			color,
			start,
			end: start + duration,
			parent,
			kind,
			...(leafRotation ? { rotation: leafRotation } : {}),
		});
		const index = voxels.length - 1;
		if (kind === "wood") {
			const key = occKey(position);
			occupied.set(key, [...(occupied.get(key) ?? []), index]);
		}
		return index;
	};
	const path = (
		from: Vec3,
		to: Vec3,
		width: number,
		parent: number,
		bend = 0.08,
		shell = false,
	) => {
		const distance = Math.hypot(...to.map((v, i) => v - from[i]));
		const count = Math.max(2, Math.ceil(distance / (width * 0.6)));
		const nodes: number[] = [];
		const sway = rng() * Math.PI * 2;
		for (let i = 1; i <= count; i++) {
			const t = i / count;
			const p = mix(from, to, t);
			p[0] += Math.sin(t * Math.PI) * Math.cos(sway) * bend;
			p[2] += Math.sin(t * Math.PI) * Math.sin(sway) * bend;
			const w = width * (1 - t * 0.27);
			parent = put(p, [w, w, w], parent, "wood", 0.004 + width * 0.008);
			nodes.push(parent);
			if (shell && w > 0.18) {
				const centre = voxels[parent];
				const filler = w * 0.9;
				const offset = w * 0.52;
				for (const off of [
					[offset, 0, 0],
					[-offset, 0, 0],
					[0, 0, offset],
					[0, 0, -offset],
				] as Vec3[]) {
					put(
						add(centre.position, off),
						[filler, filler, filler],
						parent,
						"wood",
						0.004 + width * 0.008,
						centre.color,
					);
				}
			}
		}
		return nodes;
	};
	const finish = () => {
		const duration = Math.max(...voxels.map((v) => v.end));
		for (const v of voxels) {
			v.start /= duration;
			v.end /= duration;
		}
		return voxels;
	};
	const growConifer = () => {
		const tiers = profile.tiers ?? 9;
		const perTier = profile.perTier ?? 3;
		const needleSize = profile.needleSize ?? [0.22, 0.04, 0.04];
		for (let tier = 0; tier < tiers; tier++) {
			const f = tiers === 1 ? 0 : tier / (tiers - 1);
			const baseLevel = profile.canopyBase ?? 0.2;
			const level = baseLevel + f * (0.92 - baseLevel);
			const support =
				trunk[
					Math.min(
						trunk.length - 1,
						Math.floor(level * (trunk.length - 1)),
					)
				];
			const from = voxels[support].position;
			for (let k = 0; k < perTier; k++) {
				if (profile.whorlDropout && rng() < profile.whorlDropout)
					continue;
				const angle =
					tier * 0.85 + (k * Math.PI * 2) / perTier + rng() * 0.35;
				const reachFloor = profile.reachFloor ?? 0.22;
				const reach =
					spread *
					(1 -
						Math.pow(f, profile.reachExponent ?? 1.15) *
							(1 - reachFloor)) *
					(0.85 + rng() * 0.3);
				const mid: Vec3 = [
					from[0] + Math.cos(angle) * reach * 0.65,
					from[1] - 0.06 + rng() * 0.08,
					from[2] + Math.sin(angle) * reach * 0.65,
				];
				const end: Vec3 = [
					from[0] + Math.cos(angle) * reach,
					mid[1] + (profile.tipLift ?? 0) + rng() * 0.08,
					from[2] + Math.sin(angle) * reach,
				];
				const branchFirst = path(
					from,
					mid,
					profile.branchWood ?? 0.1,
					support,
					0.03,
				);
				const branch = [
					...branchFirst,
					...path(
						[...voxels[branchFirst.at(-1)!].position] as Vec3,
						end,
						(profile.branchWood ?? 0.1) * 0.95,
						branchFirst.at(-1)!,
						0.01,
					),
				];
				for (
					let n = 0;
					n < branch.length;
					n += profile.needleEvery ?? 1
				) {
					const node = branch[n];
					const pos = voxels[node].position;
					if (
						profile.needleMode === "fascicle" &&
						n < branch.length * 0.4 &&
						rng() < 0.65
					) {
						if (profile.cones && rng() < 0.07)
							put(
								add(pos, [0, -0.09, 0]),
								[0.09, 0.15, 0.09],
								node,
								"wood",
								0.01,
								"#7a4a2b",
							);
						continue;
					}
					if (profile.needleMode === "fascicle") {
						for (const fan of [-0.32, 0, 0.32]) {
							const a = angle + fan;
							put(
								add(pos, [
									Math.cos(a) * 0.05,
									-0.02,
									Math.sin(a) * 0.05,
								]),
								needleSize,
								node,
								"leaf",
								0.012,
								undefined,
								[0.25, -a, fan],
							);
						}
					} else {
						for (let s = 0; s < 4; s++) {
							const phase = n * 0.9 + s * (Math.PI / 2);
							put(
								add(pos, [
									-Math.sin(angle) * Math.cos(phase) * 0.05,
									Math.sin(phase) * 0.05,
									Math.cos(angle) * Math.cos(phase) * 0.05,
								]),
								needleSize,
								node,
								"leaf",
								0.012,
								undefined,
								[0.2, -angle, phase * 0.2],
							);
						}
					}
					if (profile.cones && rng() < 0.07)
						put(
							add(pos, [0, -0.09, 0]),
							[0.09, 0.15, 0.09],
							node,
							"wood",
							0.01,
							"#7a4a2b",
						);
				}
				if (profile.branchletDroop) {
					for (const frac of [0.45, 0.65, 0.85]) {
						const node =
							branch[Math.floor(frac * (branch.length - 1))];
						const pos = voxels[node].position;
						const branchlet = path(
							pos,
							[
								pos[0] + Math.cos(angle) * 0.15,
								pos[1] - 0.3 - rng() * 0.15,
								pos[2] + Math.sin(angle) * 0.15,
							],
							0.055,
							node,
							0.02,
						);
						for (const bnode of branchlet) {
							put(
								add(voxels[bnode].position, [0.04, -0.02, 0.04]),
								needleSize,
								bnode,
								"leaf",
								0.012,
								undefined,
								[0.2, -angle, 0.3],
							);
						}
					}
				}
			}
		}
		const tip = trunk.at(-1)!;
		const tipPos = voxels[tip].position;
		for (let i = 0; i < 14; i++) {
			const a = i * 1.05 + rng() * 0.3;
			put(
				add(tipPos, [Math.cos(a) * 0.1, 0.02, Math.sin(a) * 0.1]),
				needleSize,
				tip,
				"leaf",
				0.012,
			);
		}
		put(add(tipPos, [0, 0.14, 0]), [0.12, 0.16, 0.12], tip, "leaf", 0.012);
	};
	const growWillow = () => {
		const branchCount = 8;
		for (let b = 0; b < branchCount; b++) {
			const level = Math.min(
				0.85,
				Math.max(
					0.3,
					0.3 + (b / branchCount) * 0.52 + (rng() - 0.5) * 0.04,
				),
			);
			const support =
				trunk[
					Math.min(
						trunk.length - 1,
						Math.floor(level * (trunk.length - 1)),
					)
				];
			const from = voxels[support].position;
			const angle = b * 2.39996 + rng() * 0.5;
			const reach = 1.7 + rng() * 0.7;
			const apex: Vec3 = [
				from[0] + Math.cos(angle) * reach * 0.52,
				from[1] + 0.75 + rng() * 0.4,
				from[2] + Math.sin(angle) * reach * 0.52,
			];
			const first = path(from, apex, 0.16, support, 0.05, true);
			const droopEnd: Vec3 = [
				from[0] + Math.cos(angle) * reach,
				Math.max(
					reach > 1.9 ? 0.15 : 0.35,
					from[1] - 0.9 - rng() * 1.3,
				),
				from[2] + Math.sin(angle) * reach,
			];
			const second = path(
				[...voxels[first.at(-1)!].position] as Vec3,
				droopEnd,
				0.085,
				first.at(-1)!,
				0.03,
			);
			const willowLeaf: Vec3 = [0.045, 0.42, 0.045];
			const willowRotation = (): Vec3 => [
				(rng() - 0.5) * 0.2,
				rng() * Math.PI * 2,
				(rng() - 0.5) * 0.2,
			];
			for (let n = 0; n < first.length; n += 2) {
				const node = first[n];
				put(
					add(voxels[node].position, [0, -0.12, 0]),
					willowLeaf,
					node,
					"leaf",
					0.012,
					undefined,
					willowRotation(),
				);
			}
			for (let n = 0; n < second.length; n++) {
				const node = second[n];
				const pos = voxels[node].position;
				if (n % 2 === 0)
					put(
						add(pos, [n % 4 === 0 ? 0.025 : -0.025, -0.14, 0]),
						willowLeaf,
						node,
						"leaf",
						0.012,
						undefined,
						willowRotation(),
					);
				if (n % 2 === 0 && pos[1] > 0.8) {
					let parent = node;
					let x = pos[0];
					let z = pos[2];
					const len = Math.min(
						4 + Math.floor(rng() * 5),
						Math.floor((pos[1] - 0.12) / 0.2),
					);
					for (let s = 1; s <= len; s++) {
						x += (rng() - 0.5) * 0.02 + (s % 2 ? 0.012 : -0.012);
						z += (rng() - 0.5) * 0.02;
						parent = put(
							[x, pos[1] - s * 0.2, z],
							willowLeaf,
							parent,
							"leaf",
							0.01,
							undefined,
							willowRotation(),
						);
					}
				}
			}
		}
		// Crown tufts hide the trunk tip so the dome reads as foliage, not a pole.
		for (const node of trunk.slice(-6)) {
			for (let k = 0; k < 4; k++) {
				const a = rng() * Math.PI * 2;
				put(
					add(voxels[node].position, [
						Math.cos(a) * 0.09,
						-0.04,
						Math.sin(a) * 0.09,
					]),
					[0.045, 0.42, 0.045],
					node,
					"leaf",
					0.012,
					undefined,
					[(rng() - 0.5) * 0.2, a, (rng() - 0.5) * 0.2],
				);
			}
		}
	};
	const leafRotationFor = (angle: number, y: number): Vec3 => [
		0.15 +
			0.75 * Math.max(0, Math.min(1, y / height)) +
			(rng() - 0.5) * 0.15,
		-angle,
		(rng() - 0.5) * 0.2,
	];
	const emitBlossomCluster = (
		parent: number,
		centre: Vec3,
		count: number,
		size: Vec3,
	) => {
		if (!profile.blossom?.length) return;
		const colour =
			profile.blossom[Math.floor(rng() * profile.blossom.length)];
		for (let c = 0; c < count; c++) {
			const a = c * 2.39996 + rng() * 0.4;
			put(
				add(centre, [
					Math.cos(a) * 0.07,
					(c % 2) * 0.045,
					Math.sin(a) * 0.07,
				]),
				size,
				parent,
				"leaf",
				0.012,
				colour,
				[(rng() - 0.5) * 0.4, -a, (rng() - 0.5) * 0.4],
			);
		}
	};
	const base = put([0, 0.1, 0], [0.38, 0.22, 0.38], -1, "wood", 0.006);
	for (let j = 0; j < 5; j++) {
		const angle = j * 2.4 + rng() * 0.2;
		path(
			[0, 0.09, 0],
			[Math.cos(angle) * 0.55, 0.03, Math.sin(angle) * 0.55],
			0.18,
			base,
			0,
		);
	}
	const curveX = (rng() - 0.5) * 0.6,
		curveZ = (rng() - 0.5) * 0.5;
	const forked =
		profile.form === "broadleaf" && profile.forkHeight !== undefined;
	const trunkTop = forked ? height * (profile.forkHeight ?? 1) : height;
	const trunk = path(
		[0, 0.1, 0],
		[
			curveX * (forked ? (profile.forkHeight ?? 1) : 1),
			trunkTop,
			curveZ * (forked ? (profile.forkHeight ?? 1) : 1),
		],
		profile.trunkWidth,
		base,
		0.22,
		true,
	);
	const limbs: number[][] = [];
	const limbAngles: number[] = [];
	if (forked) {
		const forkNode = trunk.at(-1)!;
		const forkPos = voxels[forkNode].position;
		const forkCount = profile.forkCount ?? 4;
		for (let f = 0; f < forkCount; f++) {
			const a = f * 2.39996 + rng() * 0.4;
			limbAngles.push(a);
			const target: Vec3 = [
				forkPos[0] + Math.cos(a) * spread * 0.5,
				height * (0.9 + rng() * 0.07),
				forkPos[2] + Math.sin(a) * spread * 0.5,
			];
			limbs.push(
				path(forkPos, target, profile.trunkWidth * 0.7, forkNode, 0.12, true),
			);
		}
	}
	// Cotyledons stay attached to the young stem throughout its life.
	for (const side of [-1, 1]) {
		const support = trunk[0];
		if (profile.form === "conifer") {
			put(
				add(voxels[support].position, [side * 0.08, 0.03, 0]),
				[0.14, 0.05, 0.14],
				support,
				"leaf",
				0.012,
			);
		} else {
			put(
				add(voxels[support].position, [side * 0.1, 0.035, 0]),
				[0.18, 0.055, 0.1],
				support,
				"leaf",
				0.012,
			);
		}
	}
	if (profile.form === "conifer") {
		growConifer();
		return finish();
	}
	if (profile.form === "willow") {
		growWillow();
		return finish();
	}
	const branches =
		profile.branches[0] +
		Math.floor(rng() * (profile.branches[1] - profile.branches[0] + 1));
	for (let b = 0; b < branches; b++) {
		const structuralIndex = profile.opposite ? Math.floor(b / 2) : b;
		const structuralCount = profile.opposite
			? Math.ceil(branches / 2)
			: branches;
		const level = Math.min(
			0.89,
			Math.max(
				profile.levelBase,
				profile.levelBase +
					(structuralIndex / Math.max(1, structuralCount)) *
						profile.levelRange +
					(rng() - 0.5) * 0.06,
			),
		);
		let support: number;
		let limbBaseAngle: number | undefined;
		if (limbs.length) {
			const limb = limbs[b % limbs.length];
			const forkH = profile.forkHeight ?? 0;
			const t = Math.min(
				0.97,
				Math.max(0.08, (level - forkH) / Math.max(0.1, 0.89 - forkH)),
			);
			support = limb[Math.floor(t * (limb.length - 1))];
			limbBaseAngle = limbAngles[b % limbs.length];
		} else {
			support =
				trunk[
					Math.min(
						trunk.length - 1,
						Math.floor(level * (trunk.length - 1)),
					)
				];
		}
		const from = voxels[support].position;
		const angle = profile.opposite
			? structuralIndex * (Math.PI / 2) + (b % 2) * Math.PI + (rng() - 0.5) * 0.2
			: limbBaseAngle !== undefined
				? limbBaseAngle + (rng() - 0.5) * 1.1
				: b * 2.39996 + rng() * 0.55;
		const peak = profile.crownPeak ?? 0.55;
		const topMult = profile.crownTop ?? 0.55;
		const crownFactor =
			level <= peak
				? 0.8 +
					0.2 *
						((level - profile.levelBase) /
							Math.max(0.01, peak - profile.levelBase))
				: 1 -
					(1 - topMult) *
						((level - peak) / Math.max(0.01, 0.89 - peak));
		const length =
		spread *
		(0.65 + rng() * 0.35) *
		crownFactor *
		(limbs.length ? 0.62 : 1);
		const end: Vec3 = [
			from[0] + Math.cos(angle) * length,
			from[1] + profile.lift + rng() * 0.8,
			from[2] + Math.sin(angle) * length,
		];
		const mid: Vec3 = [
			from[0] + (end[0] - from[0]) * 0.45,
			from[1] + (end[1] - from[1]) * 0.62,
			from[2] + (end[2] - from[2]) * 0.45,
		];
		const primaryFirst = path(
			from,
			mid,
			profile.primaryWidth,
			support,
			0.04,
			true,
		);
		const primary = [
			...primaryFirst,
			...path(
				[...voxels[primaryFirst.at(-1)!].position] as Vec3,
				end,
				profile.primaryWidth * 0.8,
				primaryFirst.at(-1)!,
				0.025,
				true,
			),
		];
		const sprays = profile.opposite
			? 2 + Math.floor(rng() * 2)
			: 3 + Math.floor(rng() * 3);
		for (let s = 0; s < sprays; s++) {
			const root =
				primary[Math.floor((0.3 + rng() * 0.7) * (primary.length - 1))];
			const origin = voxels[root].position;
			const sa = profile.opposite
				? angle +
					Math.floor(s / 2) * (Math.PI / 2) +
					(s % 2) * Math.PI +
					(rng() - 0.5) * 0.2
				: angle + (s % 2 ? 1 : -1) * (0.5 + rng() * 0.6);
			const reach = 0.65 + rng() * 0.65;
			const tip: Vec3 = [
				origin[0] + Math.cos(sa) * reach,
				origin[1] +
					(profile.droop
						? 0.45 - profile.droop * 1.05 + rng() * 0.15
						: 0.5 + rng() * 0.75),
				origin[2] + Math.sin(sa) * reach,
			];
			const secondary = path(origin, tip, 0.115, root, 0.04);
			const twigs = 3 + Math.floor(rng() * 3);
			for (let t = 0; t < twigs; t++) {
				const joint =
					secondary[
						Math.floor((0.2 + rng() * 0.8) * (secondary.length - 1))
					];
				const attach = voxels[joint].position;
				const ta = profile.opposite
					? sa +
						Math.floor(t / 2) * (Math.PI / 2) +
						(t % 2) * Math.PI +
						(rng() - 0.5) * 0.2
					: sa + (t % 2 ? 1 : -1) * (0.8 + rng() * 0.6);
				const reach = 0.3 + rng() * 0.35;
				const twigEnd: Vec3 = [
					attach[0] + Math.cos(ta) * reach,
					attach[1] +
						(profile.droop
							? -profile.droop * reach * 2.0 - rng() * 0.3
							: 0.2 + rng() * 0.45),
					attach[2] + Math.sin(ta) * reach,
				];
				const twig = path(attach, twigEnd, 0.065, joint, 0.025);
				for (let l = 0; l < 6; l++) {
					const bud =
						twig[Math.floor((0.25 + l / 8) * (twig.length - 1))];
					const origin = voxels[bud].position;
					if (lightAt(origin) < 0.38 && rng() < 0.42) continue;
					if (profile.compound && l % 3 !== 0) continue;
					const la = profile.opposite
						? ta + l * (Math.PI / 2) + (rng() - 0.5) * 0.15
						: ta + l * 2.39996 + (rng() - 0.5) * 0.2;
					const step: Vec3 = [
						Math.cos(la) * 0.105,
						(rng() - 0.3) * 0.13,
						Math.sin(la) * 0.105,
					];
					const petiole = path(
						origin,
						add(origin, step),
						0.055,
						bud,
						0,
					).at(-1)!;
					if (profile.compound) {
						let rachisParent = petiole;
						let rachisPos = [...voxels[petiole].position] as Vec3;
						const dir: Vec3 = [
							Math.cos(la) * 0.032,
							0.006,
							Math.sin(la) * 0.032,
						];
						for (let r = 0; r < 5; r++) {
							rachisPos = add(rachisPos, dir);
							const node = put(
								rachisPos,
								[0.035, 0.035, 0.035],
								rachisParent,
								"wood",
								0.006,
								"#4a6b32",
							);
							rachisParent = node;
							for (const side of [-1, 1]) {
								const perp = la + side * (Math.PI / 2);
								put(
									add(rachisPos, [
										Math.cos(perp) * 0.045,
										0.01,
										Math.sin(perp) * 0.045,
									]),
									[0.11, 0.03, 0.07],
									node,
									"leaf",
									0.01,
									undefined,
									[0.1, -perp, (rng() - 0.5) * 0.2],
								);
							}
						}
						if (rng() < (origin[1] > height * 0.72 ? 0.9 : 0.25))
							emitBlossomCluster(
								rachisParent,
								rachisPos,
								origin[1] > height * 0.72 ? 6 : 3,
								[0.1, 0.07, 0.1],
							);
						continue;
					}
					const variation = 0.88 + rng() * 0.3;
					const footprint = profile.leafFootprint.map(
						(n) => n * variation,
					) as Vec3;
					const leaf = put(
						add(
							voxels[petiole].position,
							step.map((n) => n * 0.55) as Vec3,
						),
						footprint,
						petiole,
						"leaf",
						0.014 + rng() * 0.018,
						undefined,
						leafRotationFor(la, origin[1]),
					);
					if (profile.opposite) {
						const step2: Vec3 = [-step[0], step[1], -step[2]];
						put(
							add(
								voxels[petiole].position,
								step2.map((n) => n * 0.55) as Vec3,
							),
							footprint,
							petiole,
							"leaf",
							0.014 + rng() * 0.018,
							undefined,
							leafRotationFor(la + Math.PI, origin[1]),
						);
					} else {
						put(
							add(
								voxels[leaf].position,
								step.map((n) => n * 0.55) as Vec3,
							),
							profile.leafFootprint.map(
								(n) => n * variation * 0.9,
							) as Vec3,
							leaf,
							"leaf",
							0.012 + rng() * 0.015,
							undefined,
							leafRotationFor(la, origin[1]),
						);
						if (profile.extraLeaf && rng() > 0.3)
							put(
								add(voxels[leaf].position, [
									-step[2] * 0.55,
									0.03,
									step[0] * 0.55,
								]),
								profile.leafFootprint.map(
									(n) => n * variation * 0.9,
								) as Vec3,
								leaf,
								"leaf",
								0.014,
								undefined,
								leafRotationFor(la + Math.PI / 2, origin[1]),
							);
					}
					if (profile.blossom?.length) {
						const clusterProb = profile.blossomTop
							? origin[1] > height * 0.72
								? 0.75
								: 0.25
							: (profile.blossomRatio ?? 0);
						if (rng() < clusterProb)
							emitBlossomCluster(
								petiole,
								voxels[petiole].position,
								profile.blossomTop ? 3 : 4,
								profile.blossomTop
									? [0.1, 0.07, 0.1]
									: [0.11, 0.08, 0.11],
							);
					}
				}
			}
		}
	}
	// Leader finish: shoots close the crown from the trunk tip or limb tips.
	const leaderCount = profile.leaderCount;
	for (let s = 0; s < leaderCount; s++) {
		const leaderRoot = limbs.length
			? limbs[s % limbs.length].at(-1)!
			: trunk[
					Math.min(trunk.length - 1, Math.floor((trunk.length - 1) * 0.88))
				];
		const leaderFrom = voxels[leaderRoot].position;
		const a = limbs.length
			? limbAngles[s % limbs.length] + (rng() - 0.5) * 0.6
			: s * 2.39996 + rng() * 0.5;
		const reach =
			(profile.leaderReach + rng() * 0.35) * (limbs.length ? 0.7 : 1);
		const tip: Vec3 = [
			leaderFrom[0] + Math.cos(a) * reach,
			leaderFrom[1] + (limbs.length ? 0.22 : 0.45) + rng() * 0.35,
			leaderFrom[2] + Math.sin(a) * reach,
		];
		const shoot = path(leaderFrom, tip, 0.065, leaderRoot, 0.04);
		for (let l = 0; l < 3; l++) {
			const bud =
				shoot[Math.floor((0.3 + l / 3.5) * (shoot.length - 1))] ??
				shoot.at(-1)!;
			const origin = voxels[bud].position;
			const la = profile.opposite
				? a + l * (Math.PI / 2) + (rng() - 0.5) * 0.15
				: a + l * 2.39996 + (rng() - 0.5) * 0.2;
			const step: Vec3 = [
				Math.cos(la) * 0.105,
				(rng() - 0.3) * 0.13,
				Math.sin(la) * 0.105,
			];
			const petiole = path(origin, add(origin, step), 0.055, bud, 0).at(
				-1,
			)!;
			const variation = 0.88 + rng() * 0.3;
			put(
				add(
					voxels[petiole].position,
					step.map((n) => n * 0.55) as Vec3,
				),
				profile.leafFootprint.map((n) => n * variation) as Vec3,
				petiole,
				"leaf",
				0.014 + rng() * 0.018,
			);
			if (profile.blossom?.length) {
				const clusterProb = profile.blossomTop
					? 0.85
					: (profile.blossomRatio ?? 0);
				if (rng() < clusterProb)
					emitBlossomCluster(
						petiole,
						voxels[petiole].position,
						profile.blossomTop ? 7 : 4,
						profile.blossomTop
							? [0.1, 0.07, 0.1]
							: [0.11, 0.08, 0.11],
					);
			}
		}
	}
	return finish();
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
