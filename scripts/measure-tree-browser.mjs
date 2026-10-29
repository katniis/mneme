import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ALL_TREE_SPECIES } from '../lib/trees/profiles.ts';
const require=createRequire(import.meta.url),root=process.cwd(),label=process.argv[2]||'after',port=process.argv[3]||'3103';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=JSON.parse(await fs.readFile('research/tree-benchmark-fixture.json','utf8'));
if (label === 'mix') fixture.letters.forEach((letter, index) => { letter.species = ALL_TREE_SPECIES[index % 9]; });
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {}),headless:true});
const results=[];
try{for(const [width,height] of [[1440,1000],[390,844]]){
 const context=await browser.newContext({viewport:{width,height}});
 await context.addInitScript(f=>{if (!sessionStorage.treeBenchmarkInitialized) {localStorage.setItem('mneme-garden-v1',JSON.stringify(f));localStorage.setItem('mneme-environment-v1',JSON.stringify({version:3,enabled:true,dayNight:true,seasons:true,rain:true,ambience:true,location:null,timeMode:'day',seasonMode:'summer',weatherMode:'clear'}));sessionStorage.treeBenchmarkInitialized='1';}window.__roots=[];window.__REACT_DEVTOOLS_GLOBAL_HOOK__={supportsFiber:true,inject(){return 1},onCommitFiberRoot(_,r){if(!window.__roots.includes(r))window.__roots.push(r)},onCommitFiberUnmount(){}};},fixture);
 const page=await context.newPage();await page.goto('http://localhost:'+port);await page.waitForSelector('canvas');await page.waitForTimeout(2000);
 const sample=await page.evaluate(async()=>{let store;const visit=f=>{if(!f||store)return;if(f.stateNode?.root?.getState)store=f.stateNode.root;visit(f.child);visit(f.sibling);};window.__roots.forEach(r=>visit(r.current));if(!store)throw new Error('Renderer store absent');const state=store.getState(),frames=[],calls=[];let previous;await new Promise(resolve=>{const tick=now=>{if(previous!==undefined){frames.push(now-previous);calls.push(state.gl.info.render.calls)}previous=now;if(frames.length<300)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick)});const sorted=[...frames].sort((a,b)=>a-b);return {frames:frames.length,median:sorted[149],p95:sorted[284],drawCalls:Math.max(...calls),triangles:state.gl.info.render.triangles,userAgent:navigator.userAgent};});
 const before = await page.evaluate(() => JSON.parse(localStorage.getItem('mneme-garden-v1')));
 assert.deepEqual(before.letters, fixture.letters); assert.deepEqual(before.plots, fixture.plots);
 await page.screenshot({path:root+'/screenshots/trees-'+label+'-'+width+'.png'});
 // Do not reapply the initial fixture on reload; exercise the actual persisted JSON.

 await page.reload(); await page.waitForSelector('canvas'); await page.waitForTimeout(900);
 const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('mneme-garden-v1')));
 assert.deepEqual(restored.letters, before.letters); assert.deepEqual(restored.plots, before.plots);
 results.push({width,height,...sample,reloadIdentity:true});console.log(JSON.stringify(results.at(-1)));await context.close();
}await fs.writeFile('research/tree-browser-performance-'+label+'.json',JSON.stringify(results,null,2));}finally{await browser.close()}
