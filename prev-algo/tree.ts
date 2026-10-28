import { random, mix } from "./random";
import type { Vec3, Voxel } from "./types";

const U = 0.12;
const palettes = [
	{
		name: "Oak",
		bark: ["#6d5741", "#725b43", "#66513d", "#7d6449"],
		leaf: ["#537838", "#698a42", "#7c9a4b", "#8ba553", "#476d35"],
	},
	{
		name: "Birch",
		bark: ["#d4d0b9", "#bbbca5", "#e2deca", "#666b5a"],
		leaf: ["#779b49", "#8fae59", "#a2b965", "#648a40", "#839f50"],
	},
	{
		name: "Maple",
		bark: ["#77634e", "#8b745a", "#665443", "#998063"],
		leaf: ["#577b43", "#6d914e", "#86a55c", "#75964c", "#4f713c"],
	},
];
export type TreeShape = { voxels: Voxel[]; species: string; height: number };
const cache = new Map<number, TreeShape>();
export function generateTree(seed: number): TreeShape {
	const cached = cache.get(seed);
	if (cached) return cached;
	const rng = random(seed),
		family = seed % 3,
		palette = palettes[family];
	const height = (family === 1 ? 5.4 : 4.3) + rng() * 1.2;
	const spread = family === 1 ? 1.45 : 2.35 + rng() * 0.4;
	const voxels: Voxel[] = [],
		occupied = new Map<string, number>();
	const snap = (v: Vec3): Vec3 => [
		Math.round(v[0] / U),
		Math.round((v[1] - U / 2) / U),
		Math.round(v[2] / U),
	];
	const world = (v: Vec3): Vec3 => [v[0] * U, v[1] * U + U / 2, v[2] * U];
	const bark = () =>
		palette.bark[
			family === 1
				? rng() > 0.92
					? 3
					: Math.floor(rng() * 3)
				: Math.floor(rng() * palette.bark.length)
		];
	function cube(cell: Vec3, from: Vec3, start: number, duration: number) {
		const key = cell.join(",");
		if (occupied.has(key)) return occupied.get(key)!;
		const center = world(cell),
			support = world(from);
		const anchor = center.map((n, i) => (n + support[i]) / 2) as Vec3;
		voxels.push({
			center,
			anchor,
			size: [U, U, U],
			color: bark(),
			start,
			duration,
			kind: "wood",
		});
		occupied.set(key, start + duration);
		return start + duration;
	}
	function branch(
		a: Vec3,
		b: Vec3,
		start: number,
		duration: number,
		width: number,
	): { end: Vec3; time: number } {
		let first = snap(a);
		const target = snap(b);
		// Quantized branch junctions inherit an existing voxel and its completion time.
		if (!occupied.has(first.join(",")) && occupied.size) {
			let nearest: Vec3 | null = null,
				best = Infinity;
			for (let x = -2; x <= 2; x++)
				for (let y = -2; y <= 2; y++)
					for (let z = -2; z <= 2; z++) {
						const cell: Vec3 = [
								first[0] + x,
								first[1] + y,
								first[2] + z,
							],
							d = x * x + y * y + z * z;
						if (d < best && occupied.has(cell.join(","))) {
							nearest = cell;
							best = d;
						}
					}
			if (nearest) first = nearest;
		}
		start = Math.max(start, occupied.get(first.join(",")) ?? start);
		const current: Vec3 = [...first];
		const distance =
			Math.abs(target[0] - first[0]) +
			Math.abs(target[1] - first[1]) +
			Math.abs(target[2] - first[2]);
		let step = 0,
			previous: Vec3 = [...current],
			time = start;
		while (true) {
			const t = distance ? step / distance : 0;
			const born = start + t * duration;
			time = cube([...current], previous, born, 0.008);
			const radius = Math.max(0, Math.round(width * (1 - t * 0.65)));
			// Fill outward from the connected centerline; each shell follows its supporting shell.
			for (let shell = 1; shell <= radius * 2; shell++)
				for (let dx = -radius; dx <= radius; dx++)
					for (let dz = -radius; dz <= radius; dz++) {
						if (
							Math.abs(dx) + Math.abs(dz) !== shell ||
							dx * dx + dz * dz > radius * radius + 1
						)
							continue;
						const cell: Vec3 = [
							current[0] + dx,
							current[1],
							current[2] + dz,
						];
						const from: Vec3 = dx
							? [
									current[0] + dx - Math.sign(dx),
									current[1],
									current[2] + dz,
								]
							: [
									current[0],
									current[1],
									current[2] + dz - Math.sign(dz),
								];
						cube(cell, from, born + 0.01 + shell * 0.012, 0.025);
					}
			if (current.every((n, i) => n === target[i])) break;
			previous = [...current];
			let axis = 0,
				largest = -Infinity;
			for (let i = 0; i < 3; i++) {
				const remaining = Math.abs(target[i] - current[i]);
				const desired =
					(Math.abs(target[i] - first[i]) * (step + 1)) /
						(distance || 1) -
					Math.abs(current[i] - first[i]);
				if (remaining && desired > largest) {
					largest = desired;
					axis = i;
				}
			}
			current[axis] += Math.sign(target[axis] - current[axis]);
			step++;
		}
		return { end: world(current), time };
	}
	function leaves(at: Vec3, angle: number, start: number, size = 1) {
		const length = (0.22 + rng() * 0.12) * size;
		const tip: Vec3 = [
			at[0] + Math.cos(angle) * length,
			at[1] + 0.08 * size,
			at[2] + Math.sin(angle) * length,
		];
		const stem = branch(at, tip, start, 0.015, 0);
		const center: Vec3 = [
			stem.end[0] + Math.cos(angle) * 0.1 * size,
			stem.end[1] + 0.035,
			stem.end[2] + Math.sin(angle) * 0.1 * size,
		];
		voxels.push({
			center,
			anchor: stem.end,
			size: [0.42 * size, 0.12 * size, 0.3 * size],
			rotation: [(rng() - 0.5) * 0.5, -angle, (rng() - 0.5) * 0.45],
			color: palette.leaf[Math.floor(rng() * palette.leaf.length)],
			start: stem.time + 0.005,
			duration: 0.055 + rng() * 0.045,
			kind: "leaf",
		});
		if (size > 0.8) {
			const side: Vec3 = [
				center[0] + Math.cos(angle) * 0.19,
				center[1] + 0.06,
				center[2] + Math.sin(angle) * 0.19,
			];
			voxels.push({
				center: side,
				anchor: center,
				size: [0.3, 0.12, 0.24],
				rotation: [0, -angle, 0],
				color: palette.leaf[Math.floor(rng() * palette.leaf.length)],
				start: stem.time + 0.11,
				duration: 0.055,
				kind: "leaf",
			});
		}
	}
	// The first two leaves remain on the same stem throughout its life.
	branch([0, -U / 2, 0], [0, 0.22, 0], -0.035, 0.025, 0);
	voxels.push({
		center: [0.13, 0.18, 0],
		anchor: [0, 0.18, 0],
		size: [0.26, 0.08, 0.15],
		color: palette.leaf[2],
		start: -0.12,
		duration: 0.06,
		kind: "leaf",
	});
	voxels.push({
		center: [-0.12, 0.24, 0],
		anchor: [0, 0.24, 0],
		size: [0.24, 0.08, 0.14],
		color: palette.leaf[1],
		start: -0.12,
		duration: 0.06,
		kind: "leaf",
	});
	for (let i = 0; i < 5; i++) {
		const a = i * 1.256 + rng() * 0.4;
		branch(
			[0, 0, 0],
			[
				Math.cos(a) * (0.35 + rng() * 0.3),
				0,
				Math.sin(a) * (0.35 + rng() * 0.3),
			],
			0.04,
			0.09,
			1,
		);
	}
	const bend = rng() * Math.PI * 2,
		lean = 0.18 + rng() * 0.4;
	const trunkHeight =
		height * (family === 1 ? 1 : family === 0 ? 0.72 : 0.82);
	const trunk = (t: number): Vec3 => [
		Math.sin(t * 2) * Math.cos(bend) * lean,
		trunkHeight * t,
		Math.sin(t * 2.6) * Math.sin(bend) * lean,
	];
	for (let i = 0; i < 12; i++)
		branch(
			trunk(i / 12),
			trunk((i + 1) / 12),
			0.015 + i * 0.024,
			0.024,
			family === 1 ? (i < 7 ? 1 : 0) : i < 5 ? 2 : i < 10 ? 1 : 0,
		);
	const count = family === 1 ? 10 : 8 + Math.floor(rng() * 3);
	for (let i = 0; i < count; i++) {
		const h =
				(family === 0 ? 0.45 : 0.34) +
				(i / count) * (family === 0 ? 0.35 : 0.53) +
				rng() * 0.04,
			origin = trunk(h),
			a = i * 2.399 + seed * 0.01 + rng() * 0.55;
		const reach =
			spread *
			(0.75 + rng() * 0.3) *
			(family === 1 ? 1 - Math.max(0, h - 0.7) * 1.5 : 1);
		const end: Vec3 = [
			origin[0] + Math.cos(a) * reach,
			origin[1] + (0.65 + rng() * 0.65),
			origin[2] + Math.sin(a) * reach,
		];
		const start = 0.035 + h * 0.31;
		const mid: Vec3 = [
			mix(origin[0], end[0], 0.45),
			mix(origin[1], end[1], 0.6),
			mix(origin[2], end[2], 0.45),
		];
		branch(origin, mid, start, 0.075, family === 1 ? 0 : 1);
		branch(mid, end, start + 0.075, 0.075, 0);
		for (let j = 0; j < 5; j++) {
			const t = 0.3 + j * 0.16,
				attach: Vec3 = [
					mix(mid[0], end[0], t),
					mix(mid[1], end[1], t),
					mix(mid[2], end[2], t),
				];
			const aa = a + (j % 2 ? 1 : -1) * (0.5 + rng() * 0.85),
				len = 0.55 + rng() * 0.65;
			const tip: Vec3 = [
				attach[0] + Math.cos(aa) * len,
				attach[1] + 0.3 + rng() * 0.6,
				attach[2] + Math.sin(aa) * len,
			];
			const born = start + 0.075 + t * 0.075 + 0.012;
			branch(attach, tip, born, 0.085, 0);
			for (let k = 0; k < 4; k++) {
				const tt = 0.25 + k * 0.24,
					base: Vec3 = [
						mix(attach[0], tip[0], tt),
						mix(attach[1], tip[1], tt),
						mix(attach[2], tip[2], tt),
					];
				const theta = aa + (k % 2 ? -1 : 1) * (0.65 + rng() * 0.8),
					twiglen = 0.28 + rng() * 0.38;
				const twig: Vec3 = [
					base[0] + Math.cos(theta) * twiglen,
					base[1] + 0.12 + rng() * 0.22,
					base[2] + Math.sin(theta) * twiglen,
				];
				const time = born + tt * 0.085 + 0.012;
				branch(base, twig, time, 0.05, 0);
				for (let l = 0; l < 4; l++) {
					const f = 0.2 + l * 0.25;
					const pos: Vec3 = [
						mix(base[0], twig[0], f),
						mix(base[1], twig[1], f),
						mix(base[2], twig[2], f),
					];
					leaves(
						pos,
						theta + (l % 2 ? 1.15 : -1.15),
						time + f * 0.05 + 0.015 + rng() * 0.025,
						0.85 + rng() * 0.35,
					);
				}
			}
		}
	}
	// Finish the leader with smaller, upward-facing shoots.
	for (let i = 0; i < 8; i++) {
		const a = i * 2.399,
			base = trunk(0.88),
			reach = family === 1 ? 0.65 : 1.05,
			tip: Vec3 = [
				base[0] + Math.cos(a) * reach,
				height * (family === 1 ? 1 : 0.84) + 0.25 + rng() * 0.3,
				base[2] + Math.sin(a) * reach,
			];
		branch(base, tip, 0.32, 0.13, 0);
		for (let j = 0; j < 6; j++) {
			const t = 0.25 + j * 0.13;
			leaves(
				[
					mix(base[0], tip[0], t),
					mix(base[1], tip[1], t),
					mix(base[2], tip[2], t),
				],
				a + (j % 2 ? 1 : -1),
				0.34 + t * 0.15,
				1,
			);
		}
	}
	// Normalize the final growth schedule without changing dependency order.
	const last = Math.max(...voxels.map((v) => v.start + v.duration));
	for (const voxel of voxels) {
		voxel.start /= last;
		voxel.duration /= last;
	}
	const result = { voxels, species: palette.name, height };
	cache.set(seed, result);
	return result;
}
