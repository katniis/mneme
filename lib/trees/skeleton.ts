import { random } from './random.ts';
import { TREE_LIMITS, TREE_PROFILES, type TreeSpecies } from './profiles.ts';
import type { OrganSite, TreeSkeleton, Vec3, WoodOrgan } from './types.ts';

export function anatomy(seed: number, species: TreeSpecies) {
  const rng = random(seed), profile = TREE_PROFILES[species];
  const height = profile.height[0] + .25 + rng() * (profile.height[1] - profile.height[0] - .5);
  const radius = height * (profile.crownRatio[0] + profile.crownRatio[1]) / 4 - .22;
  const skeleton: TreeSkeleton = { nodes: [{ position: [0, .04, 0], radius: .14, parent: -1, organ: 'root', order: 0 }], sites: [] };
  function path(parent: number, to: Vec3, radius: number, organ: WoodOrgan = 'branch', steps = 2, bend = .08) {
    if (skeleton.nodes.length + steps > TREE_LIMITS.nodes) return parent;
    const from = skeleton.nodes[parent].position;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const position = from.map((v, a) => v + (to[a] - v) * t + (a === 1 ? bend * Math.sin(t * Math.PI) : 0)) as Vec3;
      skeleton.nodes.push({ position, parent, radius: radius * (1.2 - .2 * t), organ, order: skeleton.nodes[parent].order + 1 });
      parent = skeleton.nodes.length - 1;
    }
    return parent;
  }
  function site(node: number, direction: Vec3, organ: OrganSite['organ'] = 'leaf') {
    skeleton.sites.push({ node, direction, organ, organId: skeleton.sites.length });
  }
  function dress(node: number, angle: number, count = 3, organ: OrganSite['organ'] = 'leaf') {
    const p = skeleton.nodes[node].parent;
    for (let j = 0; j < count; j++) site(j === 0 && p >= 0 ? p : node,
      [Math.cos(angle + j * (species === 'Maple' ? Math.PI : 2.4)), (rng() - .5) * .7, Math.sin(angle + j * (species === 'Maple' ? Math.PI : 2.4))], organ);
  }
  return { skeleton, rng, height, radius, path, site, dress };
}

