import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { generateTree } from '../lib/tree.ts';
import { ALL_TREE_SPECIES, TREE_PROFILES, isTreeSpecies } from '../lib/trees/profiles.ts';
import { assertTree } from '../tests/tree-assertions.ts';
import { buildBroadleafSkeleton } from '../lib/trees/broadleaf.ts';
import { buildFloweringSkeleton } from '../lib/trees/flowering.ts';
import { buildWillowSkeleton } from '../lib/trees/willow.ts';
import { buildPineSkeleton } from '../lib/trees/pine.ts';
import { buildSpruceSkeleton } from '../lib/trees/spruce.ts';
import { buildMoonveilSkeleton } from '../lib/trees/moonveil.ts';
const builders = [seed => buildBroadleafSkeleton(seed, 'Oak'), seed => buildBroadleafSkeleton(seed, 'Birch'), seed => buildBroadleafSkeleton(seed, 'Maple'), seed => buildFloweringSkeleton(seed, 'Cherry Blossom'), buildWillowSkeleton, buildPineSkeleton, seed => buildFloweringSkeleton(seed, 'Jacaranda'), buildSpruceSkeleton, buildMoonveilSkeleton];
const seeds = [[0, 8, 16], [1, 9, 17], [2, 10, 18], [3, 11, 19], [4, 12, 20], [5, 13, 21], [6, 14, 22], [7, 15, 23], [100, 200, 300]];
const references = ['https://landscapeplants.oregonstate.edu/plants/quercus-robur', 'https://landscapeplants.oregonstate.edu/plants/betula-pendula', 'https://plants.ces.ncsu.edu/plants/acer-palmatum/', 'https://landscapeplants.oregonstate.edu/plants/prunus-serrulata-kanzan', 'https://landscapeplants.oregonstate.edu/plants/salix-babylonica', 'https://landscapeplants.oregonstate.edu/plants/pinus-sylvestris', 'https://plants.ces.ncsu.edu/plants/jacaranda-mimosifolia/', 'https://landscapeplants.oregonstate.edu/plants/picea-abies', null];
if (process.argv.includes('--check')) {
  const cases = [];
  for (const [i, species] of ALL_TREE_SPECIES.entries())
    for (const seed of seeds[i]) {
      const start = performance.now(), data = generateTree(seed, species), generationMs = performance.now() - start;
      assertTree(data);
      const skeleton = builders[i](seed);
      assert.ok(skeleton.nodes.length <= 512);
      assert.deepEqual(data, generateTree(seed, species));
      const height = Math.max(...data.map(v => v.position[1] + v.size[1] / 2));
      const foliage = data.filter(v => v.organ === 'leaf' || v.organ === 'needle');
      const width = Math.max(...[0, 2].map(a => Math.max(...foliage.map(v => v.position[a])) - Math.min(...foliage.map(v => v.position[a]))));
      const profile = TREE_PROFILES[species];
      assert.ok(height >= profile.height[0] && height <= profile.height[1], `${species} height ${height}`);
      assert.ok(width / height >= profile.crownRatio[0] && width / height <= profile.crownRatio[1], `${species} crown ${width / height}`);
      cases.push({ species, seed, voxels: data.length, nodes: skeleton.nodes.length, wood: data.filter(v => v.kind === 'wood').length, height, crownRatio: width / height, generationMs, reference: references[i] });
    }
  const runs = [], mixRuns = [];
  for (let run = 0; run < 8; run++) {
    let start = performance.now();
    for (let i = 0; i < 49; i++)
      generateTree(1000 + i);
    if (run)
      runs.push(performance.now() - start);
    start = performance.now();
    for (let i = 0; i < 49; i++)
      generateTree(1000 + i, ALL_TREE_SPECIES[i % 9]);
    if (run)
      mixRuns.push(performance.now() - start);
  }
  const median = values => [...values].sort((a, b) => a - b)[3];
  const report = { node: process.version, cases, legacy49: { runs, medianMs: median(runs), voxels: Array.from({ length: 49 }, (_, i) => generateTree(1000 + i).length).reduce((a, b) => a + b, 0) }, moonveilMix49: { runs: mixRuns, medianMs: median(mixRuns) } };
  await writeFile('research/tree-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ cases: cases.length, maxVoxels: Math.max(...cases.map(c => c.voxels)), legacyMedianMs: report.legacy49.medianMs, mixMedianMs: report.moonveilMix49.medianMs }));
}
else if (process.argv.includes('--serve')) {
  const port = Number(process.env.TREE_STUDY_PORT || 3105);
  createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${port}`);
      if (url.pathname === '/specimen') {
        const seed = Number(url.searchParams.get('seed')), species = url.searchParams.get('species');
        if (!Number.isInteger(seed) || seed < 0 || !isTreeSpecies(species)) {
          res.writeHead(400).end();
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(generateTree(seed, species)));
        return;
      }
      const files = { '/': 'scripts/tree-study.html', '/three.module.js': 'node_modules/three/build/three.module.js', '/three.core.js': 'node_modules/three/build/three.core.js',
        '/tree-botany-2026-10-29.md': 'research/tree-botany-2026-10-29.md', '/tree-verification.json': 'research/tree-verification.json', '/tree-browser-verification.json': 'research/tree-browser-verification.json' };
      if (url.pathname === '/board') {
        res.setHeader('Content-Type', 'text/html');
        res.end(await readFile('research/tree-actual-studies.html'));
        return;
      }
      const study = url.pathname.match(/^\/screenshots\/tree-studies\/([0-8]-\d{1,3}-(?:structure|seasons|growth|close)\.jpg)$/);
      if (study) {
        res.setHeader('Content-Type', 'image/jpeg');
        res.end(await readFile(`screenshots/tree-studies/${study[1]}`));
        return;
      }
      const file = files[url.pathname];
      if (!file) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.json') ? 'application/json' : file.endsWith('.md') ? 'text/plain' : 'text/javascript');
      res.end(await readFile(file));
    }
    catch {
      res.writeHead(500).end();
    }
  }).listen(port, '127.0.0.1', () => console.log(`Tree geometry studies: http://localhost:${port}`));
}
else {
  console.log('Use --check for the deterministic 27-specimen audit, or --serve for the local geometry study renderer.');
}
