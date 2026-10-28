import { random, type Vec3 } from "./tree.ts";
export const CELL = 0.65;
export type TerrainVoxel = {
	key: string;
	position: Vec3;
	size: Vec3;
	color: string;
	kind: string;
	birth: number;
};
export type Position = [number, number];

export function placement(positions: Position[]): Position {
  if (!positions.length) return [0, 0];
  const rng = random(positions.length * 73856093);
  const rightmost = positions.reduce((a, b) => b[0] > a[0] ? b : a);
  // The outward fallback always has room, even when every sampled candidate is occupied.
  let best: Position = [rightmost[0] + 5.5, rightmost[1]];
  let bestScore = Infinity;
  for (const anchor of positions) {
    const phase = rng() * Math.PI * 2;
    for (let i = 0; i < 24; i++) {
      const angle = phase + i * Math.PI * 2 / 24;
      const distance = 5 + rng() * 0.8;
      const candidate: Position = [
        anchor[0] + Math.cos(angle) * distance,
        anchor[1] + Math.sin(angle) * distance,
      ];
      if (positions.some(p => Math.hypot(p[0] - candidate[0], p[1] - candidate[1]) < 4.8)) continue;
      // Prefer nearby open ground with enough variation to avoid rows or regular rings.
      const score = Math.hypot(...candidate) + rng() * 2.5;
      if (score < bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
  }
  return best;
}
export function groundHeight(x: number, z: number) {
	x = Math.round(x / CELL) * CELL;
	z = Math.round(z / CELL) * CELL;
	return (
		Math.round(
			(Math.sin(x * 0.55) * 0.22 +
				Math.cos(z * 0.6) * 0.18 +
				Math.sin((x + z) * 0.9) * 0.11) /
				0.13,
		) * 0.13
	);
}
function edge(x: number, z: number, center: Position, radius: number) {
	const angle = Math.atan2(z - center[1], x - center[0]);
	const phase = center[0] * 0.73 + center[1] * 1.17;
	const coastline =
		Math.sin(x * 1.7 + z * 0.8) * 0.37 + Math.sin(z * 2.1 - x * 0.6) * 0.24;
	return (
		radius +
		Math.sin(angle * 5 + 0.6 + phase) * 0.35 +
		Math.cos(angle * 3 - 0.2 - phase) * 0.25 +
		coastline -
		Math.hypot(x - center[0], z - center[1])
	);
}
export function generateTerrain(positions: Position[]): TerrainVoxel[] {
	const centers: Position[] = [[0, 0], ...positions.slice(1)];
	const result: TerrainVoxel[] = [];
	const columns: {
		ix: number;
		iz: number;
		x: number;
		z: number;
		birth: number;
	}[] = [];
	const footprint = new Set<string>();
	const extent = Math.max(0, ...centers.flat().map(Math.abs)) + 6;
	const extentCells = Math.ceil(extent / CELL);
	for (let ix = -extentCells; ix <= extentCells; ix++)
		for (let iz = -extentCells; iz <= extentCells; iz++) {
			const x = ix * CELL,
				z = iz * CELL;
			const distances = centers.map((c, i) =>
				edge(x, z, c, i === 0 ? 4.25 : 3.9),
			);
			if (Math.max(...distances) < 0) continue;
			const birth = distances.findIndex((d) => d >= 0);
			columns.push({ ix, iz, x, z, birth });
			footprint.add(`${ix}:${iz}`);
		}
	// Empty cells reachable from outside are coastline; enclosed pockets need solid ground.
	const outside = new Set([`${-extentCells}:${-extentCells}`]);
	const queue: Position[] = [[-extentCells, -extentCells]];
	for (let i = 0; i < queue.length; i++) {
		for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
			const ix = queue[i][0] + dx, iz = queue[i][1] + dz;
			const key = `${ix}:${iz}`;
			if (Math.abs(ix) > extentCells || Math.abs(iz) > extentCells || footprint.has(key) || outside.has(key)) continue;
			outside.add(key);
			queue.push([ix, iz]);
		}
	}
	for (let ix = -extentCells; ix <= extentCells; ix++) {
		for (let iz = -extentCells; iz <= extentCells; iz++) {
			const key = `${ix}:${iz}`;
			if (footprint.has(key) || outside.has(key)) continue;
			columns.push({ ix, iz, x: ix * CELL, z: iz * CELL, birth: centers.length - 1 });
			footprint.add(key);
		}
	}
	const shoreline = columns.filter(({ ix, iz }) =>
		[
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1],
		].some(([dx, dz]) => !footprint.has(`${ix + dx}:${iz + dz}`)),
	);
	const joins: [Position, Position][] = [];
	for (let i = 0; i < centers.length; i++)
		for (let j = 0; j < i; j++) {
			if (
				Math.hypot(
					centers[i][0] - centers[j][0],
					centers[i][1] - centers[j][1],
				) <=
				CELL * 9 + 0.01
			)
				joins.push([centers[j], centers[i]]);
		}
	for (const { ix, iz, x, z, birth } of columns) {
		let distance = Infinity;
		// shortcut: direct shoreline distances suit small gardens; use a distance transform for large gardens.
		for (const coast of shoreline)
			distance = Math.min(
				distance,
				Math.hypot(ix - coast.ix, iz - coast.iz),
			);
		const depth = (distance + 0.5) * CELL;
		let reinforcement = 0;
		// A shared rock spine keeps narrow shoreline notches from splitting the deep core.
		for (const [a, b] of joins) {
			const dx = b[0] - a[0],
				dz = b[1] - a[1];
			const t = Math.max(
				0,
				Math.min(
					1,
					((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz),
				),
			);
			reinforcement = Math.max(
				reinforcement,
				6.4 - Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) * 1.7,
			);
		}
		const rand = random(((ix * 73856093) ^ (iz * 19349663)) >>> 0);
		const rockRand = random(
			((ix * 73856093) ^ (iz * 19349663) ^ 0x5f3759df) >>> 0,
		);
		const y = groundHeight(x, z);
		const patch = Math.sin(x * 0.9 + z * 0.6) + Math.cos(z * 1.2 - x * 0.3);
		const grasses =
			patch > 0.5
				? ["#7c9254", "#879b5a", "#8c9f60"]
				: patch < -0.6
					? ["#566f40", "#657d45", "#70874c"]
					: ["#738a4c", "#7b9053", "#81955a"];
		const put = (
			key: string,
			position: Vec3,
			size: Vec3,
			color: string,
			kind: string,
		) =>
			result.push({
				key: `${ix}:${iz}:${key}`,
				position,
				size,
				color,
				kind,
				birth,
			});
		put(
			"grass",
			[x, y - 0.1, z],
			[CELL, 0.2, CELL],
			grasses[Math.floor(rand() * 3)],
			"grass",
		);
		put(
			"soil",
			[x, y - 0.48, z],
			[CELL, 0.56, CELL],
			["#8c7554", "#9a805c", "#806b50"][Math.floor(rand() * 3)],
			"soil",
		);
		const geology =
			Math.sin(x * 0.45 + z * 0.32) * 0.3 +
			Math.cos(z * 0.5 - x * 0.2) * 0.22;
		const layers = Math.max(
			1,
			Math.floor(
				Math.min(
					10.4,
					Math.max(1.2 + depth * 1.75 + geology, reinforcement),
				),
			),
		);
		for (let layer = 0; layer < layers; layer++) {
			const colors =
				layer < 1
					? ["#827968", "#777361", "#95856c"]
					: ["#74776c", "#666d65", "#898a7c", "#59635d"];
			put(
				`stone${layer}`,
				[x, y - 1.05 - layer * 0.57, z],
				[CELL, 0.57, CELL],
				colors[Math.floor(rockRand() * colors.length)],
				"stone",
			);
		}
		const nearTree = positions.some(
			(p) => Math.hypot(x - p[0], z - p[1]) < 0.75,
		);
		if (!nearTree && rand() > 0.64) {
			for (let j = 0; j < 3; j++) {
				const dx = (rand() - 0.5) * 0.4,
					dz = (rand() - 0.5) * 0.4;
				const h = 0.12 + rand() * 0.17;
				put(
					`tuft${j}`,
					[x + dx, y + h / 2, z + dz],
					[0.045, h, 0.045],
					j === 0 ? "#98a865" : "#647d41",
					"tuft",
				);
			}
		}
		if (!nearTree && rand() > 0.93) {
			const h = 0.18 + rand() * 0.12;
			const dx = (rand() - 0.5) * 0.4;
			put(
				"flowerStem",
				[x + dx, y + h / 2, z],
				[0.035, h, 0.035],
				"#587340",
				"tuft",
			);
			put(
				"flower",
				[x + dx, y + h, z],
				[0.115, 0.06, 0.115],
				rand() > 0.4 ? "#e7deaf" : "#d7c56e",
				"flower",
			);
		}
		if (!nearTree && rand() > 0.93)
			put(
				"pebble",
				[x + 0.1, y + 0.09, z - 0.13],
				[0.25, 0.18, 0.22],
				"#a1a28b",
				"pebble",
			);
	}
	return result;
}
