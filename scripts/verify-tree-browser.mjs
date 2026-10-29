import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import { ALL_TREE_SPECIES } from '../lib/trees/profiles.ts';
import { gardenPositions } from '../tests/fixtures.ts';
const require = createRequire(import.meta.url), { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}), headless: true });
const report = [];
const prefs = { version: 3, enabled: true, dayNight: true, seasons: true, rain: true, ambience: true, location: null, timeMode: 'day', seasonMode: 'summer', weatherMode: 'clear' };
const state = letters => ({ version: 2, letters, plots: letters.map(l => l.position), time: 1, rate: 0, playing: false, speed: 1 });
async function open(fixture, width, height, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  await context.addInitScript(({ f, p }) => { if (!sessionStorage.initialized) {
    localStorage.setItem('mneme-garden-v1', JSON.stringify(f));
    localStorage.setItem('mneme-environment-v1', JSON.stringify(p));
    sessionStorage.initialized = '1';
  } window.__roots = []; window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, inject() { return 1; }, onCommitFiberRoot(_, r) { if (!window.__roots.includes(r))
      window.__roots.push(r); }, onCommitFiberUnmount() { } }; }, { f: fixture, p: prefs });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error')
    errors.push(m.text()); });
  await page.goto('http://localhost:3103');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1200);
  return { context, page, errors };
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('mneme-garden-v1')));
async function closePanel(page) { const b = page.getByRole('button', { name: 'Close panel', exact: true }); if (await b.count())
  await b.click(); }
async function plant(page, species, title) { await closePanel(page); await page.getByRole('button', { name: 'Write a letter', exact: true }).first().click(); await page.locator('#title').fill(title); await page.locator('#body').fill('Synthetic browser verification only.'); await page.locator('#date').fill('2031-01-02'); await page.locator('#tree').selectOption(species); await page.getByRole('button', { name: 'Plant letter', exact: true }).click(); await page.waitForTimeout(120); }
async function select(page, title) { await closePanel(page); await page.getByRole('button', { name: /Your letters/ }).click(); await page.getByRole('button', { name: new RegExp(title) }).click(); }
async function season(page, value) { await closePanel(page); await page.getByRole('button', { name: 'Environment settings', exact: true }).click(); await page.locator(`input[name=environment-season][value=${value}]`).check({ force: true }); await closePanel(page); await page.waitForTimeout(80); }
async function time(page, value) { await closePanel(page); await page.getByRole('button', { name: 'Environment settings', exact: true }).click(); await page.locator(`input[name=environment-time][value=${value}]`).check({ force: true }); await closePanel(page); await page.waitForTimeout(80); }
async function stats(page, id) {
  return page.evaluate(id => {
    let store, p;
    const visit = f => { if (!f)
      return; if (f.stateNode?.root?.getState)
      store = f.stateNode.root; if (f.memoizedProps?.tree?.id === id && Array.isArray(f.memoizedProps.data))
      p = f.memoizedProps; visit(f.child); visit(f.sibling); };
    window.__roots.forEach(r => visit(r.current));
    if (!p || !store)
      return null;
    const s = store.getState(), m = s.scene.getObjectByName('tree:' + id);
    if (!m)
      return null;
    const a = m.instanceMatrix.array, visible = [], organs = {};
    for (let i = 0; i < p.data.length; i++) {
      if (Math.hypot(a[i * 16], a[i * 16 + 1], a[i * 16 + 2]) > 1e-7) {
        visible.push(i);
        const o = p.data[i].organ;
        organs[o] = (organs[o] || 0) + 1;
      }
    }
    window.__dataRefs ??= {};
    const sameData = !window.__dataRefs[id] || window.__dataRefs[id] === p.data;
    window.__dataRefs[id] = p.data;
    const emissions = Array.from(m.geometry.attributes.treeEmission.array);
    return { species: p.tree.species, count: p.data.length, visible, organs, sameData, uuid: m.uuid, colors: Array.from(m.instanceColor.array), emissions, maxEmission: Math.max(...emissions), removal: !!p.removal, matrix: Array.from(a.slice(0, 16)), lights: s.scene.children.filter(x => x.isLight).length };
  }, id);
}
async function deleteAndSwitch(page, id, title, nextSeason) { await select(page, title); const before = await stats(page, id); await page.getByRole('button', { name: 'Delete tree and letter', exact: true }).click(); await page.getByRole('button', { name: 'Delete permanently', exact: true }).click(); const during = await stats(page, id); assert.ok(during?.removal, 'tree must remain present during fall'); assert.equal(during.species, before.species); assert.equal(during.count, before.count); await season(page, nextSeason); const switched = await stats(page, id); assert.ok(switched?.removal, 'season switch must not end the fall'); assert.deepEqual(switched.visible, during.visible); assert.deepEqual(switched.colors, during.colors); assert.deepEqual(switched.emissions, during.emissions); await page.waitForTimeout(3900); assert.equal(await stats(page, id), null); return { species: before.species, visible: before.visible.length, snapshotRetained: true }; }
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const { context, page, errors } = await open(state([]), width, height, 'reduce');
    for (const species of ALL_TREE_SPECIES)
      await plant(page, species, 'Synthetic ' + species);
    const before = await saved(page);
    assert.equal(before.letters.length, 9);
    assert.deepEqual(before.letters.map(l => l.species), ALL_TREE_SPECIES);
    assert.equal(before.playing, false);
    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(700);
    assert.deepEqual((await saved(page)).letters, before.letters);
    assert.deepEqual((await saved(page)).plots, before.plots);
    for (const species of ALL_TREE_SPECIES) {
      await select(page, 'Synthetic ' + species);
      assert.ok((await page.locator('[role=dialog]').innerText()).includes(species));
    }
    await closePanel(page);
    await page.getByRole('button', { name: 'Write a letter', exact: true }).first().click();
    await page.locator('#title').fill('Synthetic draft');
    await page.locator('#body').fill('Synthetic draft preservation.');
    await page.locator('#tree').selectOption('Moonveil');
    await page.waitForTimeout(100);
    await page.reload(); await page.waitForSelector('canvas');
    await page.getByRole('button', { name: 'Write a letter', exact: true }).first().click();
    assert.equal(await page.locator('#tree').inputValue(), 'Moonveil');
    assert.equal(await page.locator('#body').inputValue(), 'Synthetic draft preservation.');
    await closePanel(page);
    await plant(page, '', 'Synthetic Surprise');
    assert.ok(ALL_TREE_SPECIES.includes((await saved(page)).letters.at(-1).species));
    await closePanel(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    report.push({ width, height, plantNine: true, surpriseChoice: true, moonveilDraftReload: true, reloadIdentity: true, selectionNine: true, reducedMotionPaused: true, errors });
    await context.close();
  }
  const positions = gardenPositions(10), letters = ALL_TREE_SPECIES.map((species, i) => ({ id: 'mature-' + i, title: 'Fixture ' + species, body: 'Synthetic mature fixture.', species, seed: 100, planted: 0, reveal: 1, position: positions[i] }));
  letters.push({ id: 'partial', title: 'Fixture Partial', body: 'Synthetic partial fixture.', species: 'Weeping Willow', seed: 12, planted: 0, reveal: 1 / .6, position: positions[9] });
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const { context, page, errors } = await open(state(letters), width, height);
    const summer = await stats(page, 'mature-0'), moonDay = await stats(page, 'mature-8');
    assert.ok(summer.organs.leaf > 0);
    assert.equal(summer.maxEmission, 0);
    for (const seasonName of ['spring', 'summer', 'autumn', 'winter']) {
      await season(page, seasonName);
      const oak = await stats(page, 'mature-0'), cherry = await stats(page, 'mature-3');
      assert.equal(oak.uuid, summer.uuid);
      assert.ok(oak.sameData);
      assert.equal(oak.count, summer.count);
      if (seasonName === 'winter') {
        assert.ok(!oak.organs.leaf);
        assert.ok(!cherry.organs.leaf && !cherry.organs.blossom);
      }
      if (seasonName === 'spring')
        assert.ok(cherry.organs.blossom > 0);
      else
        assert.ok(!cherry.organs.blossom);
      await page.screenshot({ path: `screenshots/trees-garden-${width}-${seasonName}.png` });
    }
    const winterHits = await page.evaluate(() => { let s, p; const visit = f => { if (!f)
      return; if (f.stateNode?.root?.getState)
      s = f.stateNode.root.getState(); if (f.memoizedProps?.tree?.id === 'mature-0' && Array.isArray(f.memoizedProps.data))
      p = f.memoizedProps; visit(f.child); visit(f.sibling); }; window.__roots.forEach(r => visit(r.current)); const m = s.scene.getObjectByName('tree:mature-0'), leaves = p.data.filter(v => v.organ === 'leaf').slice(0, 20); let hiddenHits = 0; for (const v of leaves) {
      const point = m.position.clone().fromArray(v.position);
      m.localToWorld(point);
      s.raycaster.ray.origin.copy(point);
      s.raycaster.ray.origin.y += 1;
      s.raycaster.ray.direction.set(0, -1, 0);
      const hits = [];
      m.raycast(s.raycaster, hits);
      hiddenHits += hits.filter(h => p.data[h.instanceId].kind === 'leaf').length;
    } return hiddenHits; });
    assert.equal(winterHits, 0);
    for (const name of ['Atmosphere', 'Seasonal island']) {
      await page.getByRole('button', { name: 'Environment settings', exact: true }).click();
      await page.getByRole('switch', { name, exact: true }).uncheck({ force: true });
      await closePanel(page); await page.waitForTimeout(80);
      assert.equal((await stats(page, 'mature-0')).organs.leaf, summer.organs.leaf);
      await page.getByRole('button', { name: 'Environment settings', exact: true }).click();
      await page.getByRole('switch', { name, exact: true }).check({ force: true });
      await closePanel(page); await page.waitForTimeout(80);
      assert.ok(!(await stats(page, 'mature-0')).organs.leaf);
    }
    await season(page, 'summer');
    await time(page, 'night');
    const moonNight = await stats(page, 'mature-8');
    assert.ok(moonNight.maxEmission > moonDay.maxEmission * 2);
    await page.screenshot({ path: `screenshots/trees-moonveil-night-${width}.png` });
    await time(page, 'day');
    const frozen = await deleteAndSwitch(page, 'mature-8', 'Fixture Moonveil', 'winter');
    await season(page, 'summer');
    const partial = await deleteAndSwitch(page, 'partial', 'Fixture Partial', 'autumn');
    const retained = await saved(page);
    assert.equal(retained.plots.length, 10);
    assert.equal(retained.letters.length, 8);
    await plant(page, 'Moonveil', 'Fixture replacement');
    const replaced = await saved(page);
    assert.deepEqual(replaced.letters.at(-1).position, positions[8]);
    assert.equal(replaced.plots.length, 10);
    await page.reload();
    await page.waitForTimeout(1000);
    assert.deepEqual((await saved(page)).letters, replaced.letters);
    const client = await context.newCDPSession(page);
    await client.send('Page.setWebLifecycleState', { state: 'frozen' });
    await new Promise(r => setTimeout(r, 250));
    await client.send('Page.setWebLifecycleState', { state: 'active' });
    await page.waitForTimeout(200);
    assert.ok(await stats(page, 'mature-0'));
    await page.mouse.move(width * .45, height * .45);
    await page.mouse.wheel(0, -500);
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Recenter garden', exact: true }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    report.push({ width, height, sameSeedNineCaches: true, pausedSeasonSwitches: true, environmentToggles: true, hiddenLeafRayHits: winterHits, moonveilDayEmission: moonDay.maxEmission, moonveilNightEmission: moonNight.maxEmission, matureDeletion: frozen, partialDeletion: partial, retainedPlots: true, reusedVacancy: true, reload: true, lifecycleEmulation: true, nearFarZoom: true, errors });
    await context.close();
  }
  const picking = await open(state([{ id: 'oak', title: 'Synthetic oak', body: 'Synthetic.', seed: 0, planted: 0, reveal: 1, position: [0, 0] }]), 1440, 1000);
  {
    const { page, context } = picking;
    await season(page, 'winter');
    await page.evaluate(() => { let store; const visit = f => { if (!f)
      return; if (f.stateNode?.root?.getState)
      store = f.stateNode.root; visit(f.child); visit(f.sibling); }; window.__roots.forEach(r => visit(r.current)); const s = store.getState(), m = s.scene.getObjectByName('tree:oak'); m.computeBoundingSphere(); window.__winter = m.boundingSphere.clone(); });
    await page.getByRole('button', { name: 'Environment settings', exact: true }).click();
    await page.locator('input[name=environment-season][value=spring]').check({ force: true });
    await page.getByRole('button', { name: 'Close panel', exact: true }).click();
    await page.waitForTimeout(100);
    const result = await page.evaluate(() => {
      let s, p;
      const visit = f => { if (!f)
        return; if (f.stateNode?.root?.getState)
        s = f.stateNode.root.getState(); if (f.memoizedProps?.tree?.id === 'oak' && Array.isArray(f.memoizedProps.data))
        p = f.memoizedProps; visit(f.child); visit(f.sibling); };
      window.__roots.forEach(r => visit(r.current));
      const m = s.scene.getObjectByName('tree:oak'), V = m.position.constructor, a = m.instanceMatrix.array;
      const candidates = p.data.map((v, i) => ({ v, i, d: new V(...v.position).distanceTo(window.__winter.center) })).filter(({ v, i, d }) => v.organ === 'leaf' && d > window.__winter.radius + .02 && Math.hypot(a[i * 16], a[i * 16 + 1], a[i * 16 + 2]) > 1e-7).sort((a, b) => b.d - a.d);
      if (!candidates.length)
        throw new Error('No leaf outside winter bounds');
      const { v, i } = candidates[0], radial = new V(...v.position).sub(window.__winter.center), direction = new V(0, 1, 0).cross(radial).normalize(), point = new V(...v.position);
      m.localToWorld(point);
      s.raycaster.set(point.clone().addScaledVector(direction, 4), direction.negate());
      const hits = [];
      m.raycast(s.raycaster, hits);
      return { outside: candidates.length, target: i, hits: hits.filter(h => h.instanceId === i).length };
    });
    report.push({ winterToSpringPicking: result });
    assert.ok(result.hits > 0, 'newly visible outer foliage must remain selectable after winter');
    await context.close();
  }
  await fs.writeFile('research/tree-browser-verification.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
finally {
  await browser.close();
}
