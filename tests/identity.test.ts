import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTree, treeFamily } from '../lib/tree.ts';
import { readGarden } from '../lib/garden.ts';
import { DEMO_IDENTITY, identityKey, isExactQuote, parseModelJson, sanitizeStoredIdentity, validateBotanicalIdentity, validateComparison } from '../lib/meta-identity.ts';

const identity = (patch: Partial<import('../lib/meta-identity.ts').BotanicalIdentity['characteristics']> = {}) => ({
  ...DEMO_IDENTITY,
  characteristics: { ...DEMO_IDENTITY.characteristics, ...patch },
});

test('model identity validation accepts bounded output and rejects unsupported output', () => {
  assert.equal(validateBotanicalIdentity(DEMO_IDENTITY).ok, true);
  assert.equal(validateBotanicalIdentity({ ...DEMO_IDENTITY, species: 'Moonveil' }).ok, false);
  assert.equal(validateBotanicalIdentity({ ...DEMO_IDENTITY, species: 'Dragon Tree' }).ok, false);
  assert.equal(validateBotanicalIdentity({ ...DEMO_IDENTITY, themes: [] }).ok, false);
  assert.equal(validateBotanicalIdentity({ ...DEMO_IDENTITY, extra: true }).ok, false);
  assert.equal(validateBotanicalIdentity(identity({ foliageDensity: 1.5 })).ok, false);
  assert.equal(validateBotanicalIdentity(identity({ heightVariation: -0.1 })).ok, false);
  assert.equal(validateBotanicalIdentity(identity({ trunkShape: 'spiral' as never })).ok, false);
  assert.deepEqual(parseModelJson('```json\n{"question":"What stayed with you?"}\n```'), { question: 'What stayed with you?' });
});

test('stored identities are sanitised without discarding the letter', () => {
  assert.equal(sanitizeStoredIdentity(identity({ foliageDensity: 2 }))?.characteristics.foliageDensity, 1);
  assert.equal(sanitizeStoredIdentity({ ...DEMO_IDENTITY, species: 'Nope' }), null);
  assert.equal(sanitizeStoredIdentity('junk'), null);
  const letter = { id: 'a', title: 'T', body: 'hello future me', planted: 1000, reveal: 2000, seed: 8, species: 'Oak', position: [0, 0], identity: { bogus: true }, generatorVersion: 2 };
  const state = readGarden(JSON.stringify({ version: 2, plots: [[0, 0]], letters: [letter], time: 1000, rate: 20, playing: true, speed: 1 }));
  assert.ok(state);
  assert.equal(state.letters.length, 1);
  assert.equal(state.letters[0].identity, undefined);
  assert.equal(state.letters[0].body, 'hello future me');
  const good = readGarden(JSON.stringify({ version: 2, plots: [[0, 0]], letters: [{ ...letter, identity: DEMO_IDENTITY }], time: 1000, rate: 20, playing: true, speed: 1 }));
  assert.deepEqual(good?.letters[0].identity, DEMO_IDENTITY);
  assert.equal(good?.letters[0].species, 'Oak');
});

test('the same seed and identity reproduce one tree while different identities change its structure', () => {
  const a = generateTree(1024, 'Oak', identity());
  assert.deepEqual(a, generateTree(1024, 'Oak', identity()));
  const b = generateTree(1024, 'Oak', identity({ trunkShape: 'straight', crownShape: 'narrow', branchingStyle: 'upward', foliageDensity: 0.2, heightVariation: 0 }));
  assert.notDeepEqual(a, b);
  const width = (tree: typeof a) => Math.max(...tree.map(v => Math.hypot(v.position[0], v.position[2])));
  assert.ok(Math.abs(width(a) - width(b)) > 0.2, 'identity must visibly change crown width');
  assert.ok(a.length <= 12000 && b.length <= 12000);
  for (const [i, v] of a.entries()) if (v.parent >= 0) { assert.ok(v.parent < i); assert.ok(v.start >= a[v.parent].end - 1e-8); }
  assert.notEqual(identityKey(identity()), identityKey(identity({ crownShape: 'dense' })));
});

test('seed-only trees keep their legacy shape when no identity is stored', () => {
  assert.deepEqual(generateTree(1024), generateTree(1024, treeFamily(1024)));
  assert.deepEqual(generateTree(7), generateTree(7, undefined, undefined));
});

test('reflection quotes must match the source texts exactly', () => {
  const original = 'I am practising\na little each week.';
  const reflection = 'I still practise, slowly.';
  assert.equal(isExactQuote('practising\na little', original), true);
  assert.equal(isExactQuote('practising every day', original), false);
  assert.equal(isExactQuote('I still practise, slowly.', reflection), true);
  assert.equal(validateComparison({ originalQuote: 'practising\na little', reflectionQuote: 'I still practise', observation: 'The practice continues, in the author\u2019s own words.' }, original, reflection).ok, true);
  assert.equal(validateComparison({ originalQuote: 'I never wrote this', reflectionQuote: 'I still practise', observation: 'Invented.' }, original, reflection).ok, false);
  const stored = readGarden(JSON.stringify({ version: 2, plots: [[0, 0]], letters: [{ id: 'a', title: 'T', body: original, planted: 1000, reveal: 2000, seed: 8, position: [0, 0], reflection, comparison: { originalQuote: 'fabricated quote', reflectionQuote: 'I still practise', observation: 'x' } }], time: 1000, rate: 20, playing: true, speed: 1 }));
  assert.equal(stored?.letters[0].comparison, undefined);
  assert.equal(stored?.letters[0].reflection, reflection);
});
