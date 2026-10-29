import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { generateTree } from '../lib/tree.ts';
import { sampleTreeAppearance } from '../lib/trees/phenology.ts';
import { ALL_TREE_SPECIES } from '../lib/trees/profiles.ts';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
const seeds = [[0, 8, 16], [1, 9, 17], [2, 10, 18], [3, 11, 19], [4, 12, 20], [5, 13, 21], [6, 14, 22], [7, 15, 23], [100, 200, 300]];
await fs.mkdir('screenshots/tree-studies', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1700 } });
  page.on('pageerror', e => console.log('ERROR', e.message));
  await page.goto('http://localhost:3105');
  await page.waitForFunction(() => window.studyReady);
  for (const [i, species] of ALL_TREE_SPECIES.entries()) {
    for (const seed of seeds[i]) {
      await page.evaluate(([s, n]) => window.renderStudy(s, n), [species, seed]);
      await page.screenshot({ path: `screenshots/tree-studies/${i}-${seed}-structure.jpg`, type: 'jpeg', quality: 88 });
    }
    const seed = seeds[i][0], data = generateTree(seed, species);
    for (const mode of ['seasons', 'growth', 'close']) {
      const appearances = mode === 'close' ? null : mode === 'seasons' ? ['spring', 'summer', 'autumn', 'winter'].map(s => data.map(v => sampleTreeAppearance(v, species, s))) : [.05, .25, .6, 1].map(g => data.map(v => sampleTreeAppearance(v, species, 'summer', g)));
      await page.evaluate(([s, n, m, a]) => window.renderStudy(s, n, m, a), [species, seed, mode, appearances]);
      await page.screenshot({ path: `screenshots/tree-studies/${i}-${seed}-${mode}.jpg`, type: 'jpeg', quality: 88 });
    }
    console.log(species, 'captured');
  }
}
finally {
  await browser.close();
}
