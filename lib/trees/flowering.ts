import { anatomy } from './skeleton.ts';

export function buildFloweringSkeleton(seed: number, species: 'Cherry Blossom' | 'Jacaranda') {
  const { skeleton, rng, height: h, radius: r, path, dress, site } = anatomy(seed, species);
  const cherry = species === 'Cherry Blossom', phase = rng() * 6.28;
  const bole = path(0, [.06, h * (cherry ? .26 : .46), -.04], cherry ? .15 : .17, 'trunk', 5);
  for (let b = 0; b < 6; b++) {
    const angle = phase + b * Math.PI / 3 + (rng() - .5) * .2;
    const arm = path(bole, [Math.cos(angle) * r * .55, h * (cherry ? .69 : .72), Math.sin(angle) * r * .55], .07, 'branch', 3, .15);
    for (let f = 0; f < 4; f++) {
      const theta = angle + (f - 1.5) * .3, reach = r * (.78 + rng() * .22);
      const y = h - .4 - (f % 2) * .4 - rng() * .15;
      const fan = path(arm, [Math.cos(theta) * reach * .85, y - .2, Math.sin(theta) * reach * .85], .03, 'branch');
      for (let t = 0; t < 3; t++) {
        const phi = theta + (t - 1) * .22;
        const tip = path(fan, [Math.cos(phi) * reach, y + rng() * .12, Math.sin(phi) * reach], .014, 'twig');
        dress(tip, phi, cherry ? 3 : 2);
        site(tip, [Math.cos(phi), .3, Math.sin(phi)], 'blossom');
        if (cherry) site(skeleton.nodes[tip].parent, [Math.sin(phi), .3, -Math.cos(phi)], 'blossom');
      }
    }
  }
  return skeleton;
}
