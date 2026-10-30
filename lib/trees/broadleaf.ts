import { anatomy } from './skeleton.ts';
import { colonize } from './colonization.ts';
import type { Vec3 } from './types.ts';

export function buildBroadleafSkeleton(seed: number, species: 'Oak' | 'Birch' | 'Maple', identity?: import('../meta-identity.ts').BotanicalIdentity) {
  const a = anatomy(seed, species, identity), { skeleton, rng, height: h, radius: r, path, dress } = a;
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
          dress(tip, theta, 8);
        }
      }
    }
    const tip = path(leader, [.06, h - .15, 0], .014, 'twig'); dress(tip, phase, 3);
    return skeleton;
  }
  const oak = species === 'Oak', forkHeight = h * (oak ? .27 : .2);
  const bole = path(0, [.08, forkHeight, -.06], oak ? .22 : .13, 'trunk', 4);
  const attractors: Vec3[] = [];
  let upperArm = bole;
  for (let b = 0; b < 6; b++) {
    const angle = phase + b * Math.PI / 3 + (rng() - .5) * .25;
    const level = oak ? .45 + rng() * .15 : .33 + (b % 3) * .16;
    const arm = path(bole, [Math.cos(angle) * r * .42, h * level, Math.sin(angle) * r * .42], oak ? .105 : .055, 'branch', 3, .15);
    if (b === 0) upperArm = arm;
    for (let f = 0; f < 4; f++) {
      const theta = angle + (f - 1.5) * .35;
      const crownLevel = oak ? .46 + rng() * .36 : level + .15 + rng() * .1;
      const reach = r * (.78 + rng() * .22) * (oak ? Math.sqrt(1 - ((crownLevel - .61) / .51) ** 2) : 1 - (b % 3) * .08);
      const y = h * crownLevel;
      const fan = path(arm, [Math.cos(theta) * reach * .8, y, Math.sin(theta) * reach * .8], .028, 'branch', 2);
      for (let t = 0; t < 4; t++) {
        const phi = theta + (t - 1.5) * .17;
        const tipY = Math.min(h - (oak ? .25 : .4), y + .25 + rng() * .35);
        const tip = path(fan, [Math.cos(phi) * reach, tipY, Math.sin(phi) * reach], .014, 'twig', 2);
        dress(tip, phi, oak ? 8 : 6);
      }
      if (oak) attractors.push([Math.cos(theta) * reach * .9, y + .5, Math.sin(theta) * reach * .9]);
    }
    for (let k = 0; k < 3; k++) {
      const p = skeleton.nodes[arm].position, a = angle + (k - 1) * .7;
      const inner = path(arm, [p[0] + Math.cos(a) * .55, p[1] + .4 + rng() * .6, p[2] + Math.sin(a) * .55], .014, 'twig');
      dress(inner, a, oak ? 7 : 4);
    }
  }
  const top = path(upperArm, [.35, h - (oak ? .25 : .45), -.25], .03, 'branch', 5);
  dress(top, phase, 4);
  for (let i = 0; i < 6; i++) {
    const angle = phase + i * Math.PI / 3;
    const tip = path(top, [Math.cos(angle) * (oak ? 1.15 : .8), h - (oak ? .35 : .55) - rng() * .2, Math.sin(angle) * (oak ? 1.15 : .8)], .014, 'twig'); dress(tip, angle, 4);
  }
  return oak ? colonize(seed, skeleton, attractors) : skeleton;
}

