import { anatomy } from './skeleton.ts';

export function buildPineSkeleton(seed: number) {
  const { skeleton, rng, height: h, radius: r, path, dress, site } = anatomy(seed, 'Pine');
  const phase = rng() * 6.28;
  const bole = path(0, [.15, h * .58, -.1], .13, 'trunk', 8);
  for (let b = 0; b < 6; b++) {
    const angle = phase + b * 2.4, reach = r * (.77 + rng() * .23);
    const arm = path(bole, [Math.cos(angle) * reach * .65, h * (.67 + rng() * .15), Math.sin(angle) * reach * .65], .055, 'branch', 3);
    for (let f = 0; f < 4; f++) {
      const theta = angle + (f - 1.5) * .36;
      const fan = path(arm, [Math.cos(theta) * reach, h * (.8 + rng() * .1), Math.sin(theta) * reach], .025, 'branch');
      for (let t = 0; t < 3; t++) {
        const phi = theta + (t - 1) * .25;
        const tip = path(fan, [Math.cos(phi) * reach, skeleton.nodes[fan].position[1] + .3, Math.sin(phi) * reach], .012, 'twig');
        dress(tip, phi, 5, 'needle');
        if ((b + f + t) % 7 === 0) site(fan, [0, -1, 0], 'fruit');
      }
    }
  }
  const top = path(bole, [.3, h - .25, -.15], .025, 'branch', 4);
  for (let i = 0; i < 6; i++) {
    const a = phase + i * 1.047, tip = path(top, [Math.cos(a) * .6, h - .23, Math.sin(a) * .6], .012, 'twig');
    dress(tip, a, 4, 'needle');
  }
  return skeleton;
}
