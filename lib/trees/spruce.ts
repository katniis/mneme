import { anatomy } from './skeleton.ts';

export function buildSpruceSkeleton(seed: number, identity?: import('../meta-identity.ts').BotanicalIdentity) {
  const { skeleton, rng, height: h, radius: r, path, dress, site } = anatomy(seed, 'Spruce', identity);
  const phase = rng() * 6.28;
  let leader = 0;
  for (let tier = 0; tier < 9; tier++) {
    const y = h * (.17 + tier * .09);
    leader = path(leader, [.035 * Math.sin(tier), y, 0], .11 * (1 - tier / 11), 'trunk', 1);
    const reach = r * (1 - tier / 10);
    for (let b = 0; b < 5; b++) {
      const angle = phase + b * 1.257 + tier * .6;
      const arm = path(leader, [Math.cos(angle) * reach, y - .15 + rng() * .12, Math.sin(angle) * reach], .025, 'branch');
      dress(arm, angle, 5, 'needle');
      for (let t = 0; t < 3; t++) {
        const theta = angle + (t - 1) * .32, radial = reach * (.58 + t * .19);
        const tip = path(skeleton.nodes[arm].parent, [Math.cos(theta) * radial, y - .25 - rng() * .22, Math.sin(theta) * radial], .012, 'twig', 2, -.04);
        dress(tip, theta, 8, 'needle');
        if (tier > 4 && b % 3 === 0 && t === 1) site(tip, [0, -1, 0], 'fruit');
      }
    }
  }
  const top = path(leader, [0, h - .13, 0], .012, 'twig', 2);
  dress(top, phase, 5, 'needle');
  return skeleton;
}
