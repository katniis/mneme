export type Vec3 = [number, number, number];
export type Voxel = {
	position: Vec3;
	anchor: Vec3;
	size: Vec3;
	color: string;
	start: number;
	end: number;
	parent: number;
	kind: "wood" | "leaf";
};

export function random(seed: number) {
	let value = seed >>> 0;
	return () => {
		value += 0x6d2b79f5;
		let t = value;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function treeFamily(seed: number) {
	return ["Oak", "Birch", "Maple"][seed % 3];
}
const mix = (a: Vec3, b: Vec3, t: number): Vec3 =>
	a.map((n, i) => n + (b[i] - n) * t) as Vec3;
const add = (a: Vec3, b: Vec3): Vec3 => a.map((n, i) => n + b[i]) as Vec3;

export function generateTree(seed: number): Voxel[] {
	const rng = random(seed);
	const family = seed % 3;
	const height =
		(family === 1 ? 5.7 : family === 2 ? 4.7 : 4.3) + rng() * 0.8;
	const spread = family === 1 ? 1.45 : family === 2 ? 2.1 : 2.4;
	const bark =
		family === 1
			? ["#b4b39d", "#cecbb5", "#767467", "#d9d6bd"]
			: ["#69503a", "#795c40", "#574434", "#886b49"];
	const greens =
		family === 1
			? ["#6d923e", "#82a74d", "#9bb55b", "#527a35", "#739343"]
			: family === 2
				? ["#557a35", "#6e9443", "#809b48", "#466b32", "#95ad56"]
				: ["#547a36", "#638a3e", "#77994b", "#41662e", "#8ba455"];
	const voxels: Voxel[] = [];
	const put = (
		position: Vec3,
		size: Vec3,
		parent: number,
		kind: Voxel["kind"],
		duration = 0.006,
	) => {
		const start = parent >= 0 ? voxels[parent].end : 0;
		voxels.push({
			position,
			anchor:
				parent >= 0
					? [...voxels[parent].position]
					: [position[0], 0, position[2]],
			size,
			color:
				kind === "wood"
					? bark[
							family === 1
								? rng() < 0.08
									? 2
									: rng() < 0.5
										? 1
										: 3
								: Math.floor(rng() * bark.length)
						]
					: greens[Math.floor(rng() * greens.length)],
			start,
			end: start + duration,
			parent,
			kind,
		});
		return voxels.length - 1;
	};
	const path = (
		from: Vec3,
		to: Vec3,
		width: number,
		parent: number,
		bend = 0.08,
	) => {
		const distance = Math.hypot(...to.map((v, i) => v - from[i]));
		const count = Math.max(2, Math.ceil(distance / (width * 0.68)));
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
		}
		return nodes;
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
	const trunk = path(
		[0, 0.1, 0],
		[curveX, height, curveZ],
		family === 1 ? 0.24 : 0.34,
		base,
		0.22,
	);
	// Cotyledons stay attached to the young stem throughout its life.
	for (const side of [-1, 1]) {
		const support = trunk[0];
		put(
			add(voxels[support].position, [side * 0.1, 0.035, 0]),
			[0.18, 0.055, 0.1],
			support,
			"leaf",
			0.012,
		);
	}
	const branches = family === 1 ? 8 : 6 + Math.floor(rng() * 3);
	for (let b = 0; b < branches; b++) {
		const level = 0.32 + rng() * 0.57;
		const support =
			trunk[
				Math.min(
					trunk.length - 1,
					Math.floor(level * (trunk.length - 1)),
				)
			];
		const from = voxels[support].position;
		const angle = b * 2.39996 + rng() * 0.55;
		const length =
			spread * (0.65 + rng() * 0.35) * (1 - Math.max(0, level - 0.55));
		const end: Vec3 = [
			from[0] + Math.cos(angle) * length,
			from[1] + (family === 1 ? 1.25 : 0.65) + rng() * 0.8,
			from[2] + Math.sin(angle) * length,
		];
		const primary = path(
			from,
			end,
			family === 1 ? 0.15 : 0.2,
			support,
			0.16,
		);
		const sprays = 3 + Math.floor(rng() * 3);
		for (let s = 0; s < sprays; s++) {
			const root =
				primary[Math.floor((0.3 + rng() * 0.7) * (primary.length - 1))];
			const origin = voxels[root].position;
			const sa = angle + (s % 2 ? 1 : -1) * (0.5 + rng() * 0.6);
			const reach = 0.65 + rng() * 0.65;
			const tip: Vec3 = [
				origin[0] + Math.cos(sa) * reach,
				origin[1] + 0.5 + rng() * 0.75,
				origin[2] + Math.sin(sa) * reach,
			];
			const secondary = path(origin, tip, 0.115, root, 0.09);
			const twigs = 3 + Math.floor(rng() * 3);
			for (let t = 0; t < twigs; t++) {
				const joint =
					secondary[
						Math.floor((0.2 + rng() * 0.8) * (secondary.length - 1))
					];
				const attach = voxels[joint].position;
				const ta = sa + (t % 2 ? 1 : -1) * (0.8 + rng() * 0.6);
				const reach = 0.3 + rng() * 0.35;
				const twigEnd: Vec3 = [
					attach[0] + Math.cos(ta) * reach,
					attach[1] + 0.2 + rng() * 0.45,
					attach[2] + Math.sin(ta) * reach,
				];
				const twig = path(attach, twigEnd, 0.065, joint, 0.025);
				for (let l = 0; l < 6; l++) {
					const bud =
						twig[Math.floor((0.25 + l / 8) * (twig.length - 1))];
					const origin = voxels[bud].position;
					const la = ta + (l % 2 ? 1 : -1) * (1 + rng() * 0.5);
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
					const leafSize = 0.16 + rng() * 0.065;
					const leaf = put(
						add(origin, step.map((n) => n * 1.8) as Vec3),
						[leafSize, leafSize * 0.65, leafSize],
						petiole,
						"leaf",
						0.014 + rng() * 0.018,
					);
					put(
						add(voxels[leaf].position, step),
						[0.15, 0.1, 0.15],
						leaf,
						"leaf",
						0.012 + rng() * 0.015,
					);
					if (family !== 1 && rng() > 0.3)
						put(
							add(voxels[leaf].position, [
								-step[2] * 0.65,
								0.03,
								step[0] * 0.65,
							]),
							[0.15, 0.1, 0.15],
							leaf,
							"leaf",
							0.014,
						);
				}
			}
		}
	}
	const duration = Math.max(...voxels.map((v) => v.end));
	for (const v of voxels) {
		v.start /= duration;
		v.end /= duration;
	}
	return voxels;
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
