import { anatomy } from './skeleton.ts';

export function buildWillowSkeleton(seed: number) {
  const { skeleton, rng, height: h, radius: r, path, site, dress } = anatomy(seed, 'Weeping Willow');
  const phase = rng() * 6.28;
  const bole = path(0, [.1, h * .36, -.05], .2, 'trunk', 5);
  for (let b = 0; b < 8; b++) {
    const angle = phase + b * Math.PI / 4;
    const arm = path(bole, [Math.cos(angle) * r * .6, h - .25 - (b % 3) * .2, Math.sin(angle) * r * .6], .065, 'branch', 3, .25);
    dress(arm, angle, 8);
    dress(skeleton.nodes[arm].parent, angle, 12);
    dress(skeleton.nodes[skeleton.nodes[arm].parent].parent, angle, 12);
    const crown = skeleton.nodes[arm].position;
    for (let k = 0; k < 2; k++) {
      let node = arm;
      for (let t = 1; t <= 5; t++) {
        node = path(node, [crown[0] + Math.cos(angle + k) * .25, crown[1] - t * .65, crown[2] + Math.sin(angle + k) * .25], .012, 'twig', 1);
        for (let j = 0; j < 3; j++) site(node, [Math.cos(angle + j * 2), -.8, Math.sin(angle + j * 2)]);
      }
    }
    for (let f = 0; f < 5; f++) {
      const theta = angle + (f - 2) * .2, reach = r * 1.04 * (.7 + rng() * .3);
      const fan = path(arm, [Math.cos(theta) * reach, h * (.65 + rng() * .15), Math.sin(theta) * reach], .025, 'branch');
      const from = skeleton.nodes[fan].position, floor = .55 + rng() * .75;
      let parent = fan;
      for (let t = 1; t <= 6; t++) {
        const k = t / 6;
        parent = path(parent, [from[0] + Math.cos(theta) * .12 * Math.sin(k * Math.PI), from[1] * (1 - k) + floor * k, from[2] + Math.sin(theta) * .12 * Math.sin(k * Math.PI)], .012, 'twig', 1);
        site(parent, [.15 * Math.cos(theta), -1, .15 * Math.sin(theta)]);
        site(parent, [-.3 * Math.sin(theta), -.8, .3 * Math.cos(theta)]);
        site(parent, [.3 * Math.sin(theta), -.8, -.3 * Math.cos(theta)]);
      }
    }
  }
  return skeleton;
}
