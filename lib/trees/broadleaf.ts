import { anatomy } from './skeleton.ts';
import { colonize } from './colonization.ts';
import type { Vec3 } from './types.ts';

export function buildBroadleafSkeleton(seed: number, species: 'Oak' | 'Birch' | 'Maple') {
  const a = anatomy(seed, species), { skeleton, rng, height: h, radius: r, path, dress } = a;
  const phase = rng() * Math.PI * 2;
  if (species === 'Birch') {
    let leader = 0;
    for (let tier = 0; tier < 10; tier++) {
      const y = h * (.18 + tier * .082);
      leader = path(leader, [.1 * Math.sin(tier * .6), y, .07 * Math.cos(tier)], .09 * (1 - tier / 12), 'trunk', 1);
      if (tier < 2) continue;
      for (let b = 0; b < 3; b++) {
        const angle = phase + tier * 2.4 + b * 2.09, reach = r * Math.sin((tier - 1) / 10 * Math.PI) * (.85 + rng() * .15);
        const end = path(leader, [Math.cos(angle) * reach * .8, Math.min(h - .4, y + .7), Math.sin(angle) * reach * .8], .04);
        for (let t = 0; t < 4; t++) {
          const theta = angle + (t - 1.5) * .3;
          const tip = path(end, [Math.cos(theta) * reach, y + .3 - rng() * .4, Math.sin(theta) * reach], .014, 'twig');
          dress(tip, theta, 4);
        }
      }
    }
    const tip = path(leader, [.06, h - .15, 0], .014, 'twig'); dress(tip, phase, 3);
    return skeleton;
  }
  const oak = species === 'Oak', forkHeight = h * (oak ? .27 : .2);
  const bole = path(0, [.08, forkHeight, -.06], oak ? .22 : .13, 'trunk', 4);
  const attractors: Vec3[] = [];
  for (let b = 0; b < 6; b++) {
    const angle = phase + b * Math.PI / 3 + (rng() - .5) * .25;
    const arm = path(bole, [Math.cos(angle) * r * .48, h * (.52 + rng() * .08), Math.sin(angle) * r * .48], oak ? .105 : .07, 'branch', 3, .15);
    for (let f = 0; f < 4; f++) {
      const theta = angle + (f - 1.5) * .35, reach = r * (.72 + rng() * .25);
      const y = h * (.64 + rng() * .16) - (f % 2) * h * .07;
      const fan = path(arm, [Math.cos(theta) * reach * .8, y, Math.sin(theta) * reach * .8], .028, 'branch', 2);
      for (let t = 0; t < 4; t++) {
        const phi = theta + (t - 1.5) * .17;
        const tip = path(fan, [Math.cos(phi) * reach, y + .25 + rng() * .35, Math.sin(phi) * reach], .014, 'twig', 2);
        dress(tip, phi, oak ? 3 : 2);
      }
      if (oak) attractors.push([Math.cos(theta) * reach * .9, y + .5, Math.sin(theta) * reach * .9]);
    }
  }
  const top = path(bole, [.15, h - .25, -.1], .045, 'branch', 5);
  dress(top, phase, 4);
  for (let i = 0; i < 6; i++) {
    const angle = phase + i * Math.PI / 3;
    const tip = path(top, [Math.cos(angle) * .65, h - .35, Math.sin(angle) * .65], .014, 'twig'); dress(tip, angle, 3);
  }
  return oak ? colonize(seed, skeleton, attractors) : skeleton;
}

