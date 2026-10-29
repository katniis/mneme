import { random } from './random.ts';
import { TREE_LIMITS } from './profiles.ts';
import type { TreeSkeleton, Vec3 } from './types.ts';

export function colonize(seed: number, input: TreeSkeleton, attractors: readonly Vec3[]): TreeSkeleton {
  const tree = structuredClone(input), rng = random(seed ^ 0xa421);
  let points = attractors.slice(0, TREE_LIMITS.attractors);
  for (let iteration = 0; iteration < TREE_LIMITS.iterations && tree.nodes.length < TREE_LIMITS.nodes; iteration++) {
    const directions = new Map<number, Vec3>();
    points = points.filter(p => {
      let nearest = -1, distance = 1.2;
      tree.nodes.forEach((n, i) => {
        const d = Math.hypot(...p.map((v, a) => v - n.position[a]));
        if (d < distance) { nearest = i; distance = d; }
      });
      if (distance < .2) return false;
      if (nearest < 0) return true;
      const sum = directions.get(nearest) ?? [0, 0, 0];
      p.forEach((v, a) => { sum[a] += (v - tree.nodes[nearest].position[a]) / distance; });
      directions.set(nearest, sum); return true;
    });
    if (!directions.size) break;
    for (const [parent, d] of directions) {
      if (tree.nodes.length >= TREE_LIMITS.nodes) break;
      d[1] += .12; const length = Math.hypot(...d);
      if (length < 1e-8) continue;
      const position = tree.nodes[parent].position.map((v, a) => v + d[a] / length * .18) as Vec3;
      const node = tree.nodes.length;
      tree.nodes.push({ position, parent, radius: .014, organ: 'twig', order: tree.nodes[parent].order + 1 });
      tree.sites.push({ node, direction: [rng() - .5, .1, rng() - .5], organ: 'leaf', organId: tree.sites.length });
    }
  }
  return tree;
}

