import { anatomy } from './skeleton.ts';

export function buildMoonveilSkeleton(seed: number) {
  const { skeleton, rng, height: h, radius: r, path, dress, site } = anatomy(seed, 'Moonveil');
  const phase = rng() * 6.28;
  for (const strand of [0, 1]) {
    let stem = 0;
    for (let level = 1; level <= 12; level++) {
      const a = phase + level * .5 + strand * Math.PI, y = (h - .25) * level / 12;
      stem = path(stem, [Math.cos(a) * .22, y, Math.sin(a) * .22], .075, 'trunk', 1);
      if (![5, 8, 11].includes(level)) continue;
      const reach = r * (level === 5 ? 1 : level === 8 ? .82 : .56) * (strand ? .85 : 1);
      const angle = a + strand * .7;
      const arm = path(stem, [Math.cos(angle) * reach * .45, y + .24, Math.sin(angle) * reach * .45], .04, 'branch', 2, .2);
      for (let f = 0; f < 9; f++) {
        const theta = angle + (f - 4) * .29;
        const tip = path(arm, [Math.cos(theta) * reach, y + .12 + rng() * .18, Math.sin(theta) * reach], .014, 'twig', 3, .12);
        dress(tip, theta, 12);
        if (f % 2 === 0) {
          const p = skeleton.nodes[tip].position;
          const hanging = path(tip, [p[0], p[1] - .35 - rng() * .25, p[2]], .012, 'twig', 2);
          site(hanging, [0, -1, 0], 'fruit');
        }
      }
    }
    dress(stem, phase, 4);
  }
  return skeleton;
}
