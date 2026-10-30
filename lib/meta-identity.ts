import { REAL_TREE_SPECIES, type TreeSpecies } from './trees/profiles.ts';
import { random } from './trees/random.ts';
import type { TreeSkeleton } from './trees/types.ts';

export const GENERATOR_VERSION = 2;
export const TRUNK_SHAPES = ['straight', 'curved', 'twisted', 'branching'] as const;
export const CROWN_SHAPES = ['wide', 'narrow', 'open', 'dense'] as const;
export const BRANCHING_STYLES = ['upward', 'spreading', 'cascading'] as const;
export type TrunkShape = typeof TRUNK_SHAPES[number];
export type CrownShape = typeof CROWN_SHAPES[number];
export type BranchingStyle = typeof BRANCHING_STYLES[number];
export type IdentityCharacteristics = {
  trunkShape: TrunkShape;
  crownShape: CrownShape;
  branchingStyle: BranchingStyle;
  foliageDensity: number;
  heightVariation: number;
};
export type BotanicalIdentity = {
  intention: string;
  themes: string[];
  species: TreeSpecies;
  characteristics: IdentityCharacteristics;
  explanation: string;
};
export type ReflectionComparison = {
  originalQuote: string;
  reflectionQuote: string;
  observation: string;
};

export const STATIC_REFLECTION_QUESTION = 'Looking back at the words you planted, what feels most present for you now?';
export const DEMO_LETTER = 'Dear future me,\n\nBy the time you read this, I hope I have presented my first project without apologising for it first. I am practising a little each week, even when it feels slow. Remember that quiet, steady practice counts.\n\nBe kind to the nervous version of us who started this.';
export const DEMO_IDENTITY: BotanicalIdentity = {
  intention: 'Building confidence to share work through steady practice',
  themes: ['personal growth', 'patience', 'openness'],
  species: 'Oak',
  characteristics: { trunkShape: 'curved', crownShape: 'open', branchingStyle: 'upward', foliageDensity: 0.7, heightVariation: 0.6 },
  explanation: 'A gently curved oak with an open, upward crown suggests gradual growth and a willingness to be seen. This is a cached fictional example, not a live response.',
};

const SPECIES_LIST = REAL_TREE_SPECIES as readonly string[];
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const shortText = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;

export function validateBotanicalIdentity(raw: unknown): { ok: true; identity: BotanicalIdentity } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: 'Identity must be an object.' };
  const allowed = ['intention', 'themes', 'species', 'characteristics', 'explanation'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) return { ok: false, error: `Unsupported field: ${key}` };
  if (!shortText(raw.intention, 160)) return { ok: false, error: 'Intention must be 1-160 characters.' };
  if (!Array.isArray(raw.themes) || raw.themes.length < 1 || raw.themes.length > 3 || !raw.themes.every(t => shortText(t, 40))) return { ok: false, error: 'Themes must be 1-3 short phrases.' };
  if (typeof raw.species !== 'string' || !SPECIES_LIST.includes(raw.species)) return { ok: false, error: 'Species is not supported.' };
  if (!isRecord(raw.characteristics)) return { ok: false, error: 'Characteristics are required.' };
  const c = raw.characteristics;
  const charAllowed = ['trunkShape', 'crownShape', 'branchingStyle', 'foliageDensity', 'heightVariation'];
  for (const key of Object.keys(c)) if (!charAllowed.includes(key)) return { ok: false, error: `Unsupported characteristic: ${key}` };
  if (!(TRUNK_SHAPES as readonly string[]).includes(c.trunkShape as string)) return { ok: false, error: 'Trunk shape is not supported.' };
  if (!(CROWN_SHAPES as readonly string[]).includes(c.crownShape as string)) return { ok: false, error: 'Crown shape is not supported.' };
  if (!(BRANCHING_STYLES as readonly string[]).includes(c.branchingStyle as string)) return { ok: false, error: 'Branching style is not supported.' };
  if (typeof c.foliageDensity !== 'number' || !Number.isFinite(c.foliageDensity) || c.foliageDensity < 0 || c.foliageDensity > 1) return { ok: false, error: 'Foliage density must be between 0 and 1.' };
  if (typeof c.heightVariation !== 'number' || !Number.isFinite(c.heightVariation) || c.heightVariation < 0 || c.heightVariation > 1) return { ok: false, error: 'Height variation must be between 0 and 1.' };
  if (!shortText(raw.explanation, 400)) return { ok: false, error: 'Explanation must be 1-400 characters.' };
  return {
    ok: true,
    identity: {
      intention: (raw.intention as string).trim(),
      themes: (raw.themes as string[]).map(t => t.trim()),
      species: raw.species as TreeSpecies,
      characteristics: {
        trunkShape: c.trunkShape as TrunkShape,
        crownShape: c.crownShape as CrownShape,
        branchingStyle: c.branchingStyle as BranchingStyle,
        foliageDensity: c.foliageDensity,
        heightVariation: c.heightVariation,
      },
      explanation: (raw.explanation as string).trim(),
    },
  };
}

export function sanitizeStoredIdentity(raw: unknown): BotanicalIdentity | null {
  if (!isRecord(raw) || !isRecord(raw.characteristics)) return null;
  const c = raw.characteristics;
  const clamp01 = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : null;
  const foliageDensity = clamp01(c.foliageDensity), heightVariation = clamp01(c.heightVariation);
  if (foliageDensity === null || heightVariation === null) return null;
  const result = validateBotanicalIdentity({
    intention: typeof raw.intention === 'string' ? raw.intention.slice(0, 160) : '',
    themes: Array.isArray(raw.themes) ? raw.themes.filter(t => typeof t === 'string').slice(0, 3).map(t => t.slice(0, 40)) : [],
    species: raw.species,
    characteristics: { trunkShape: c.trunkShape, crownShape: c.crownShape, branchingStyle: c.branchingStyle, foliageDensity, heightVariation },
    explanation: typeof raw.explanation === 'string' ? raw.explanation.slice(0, 400) : '',
  });
  return result.ok ? result.identity : null;
}

export function identityKey(identity: BotanicalIdentity): string {
  const c = identity.characteristics;
  return [identity.species, c.trunkShape, c.crownShape, c.branchingStyle, c.foliageDensity.toFixed(3), c.heightVariation.toFixed(3)].join('|');
}

export function hashIdentity(identity: BotanicalIdentity): number {
  const text = `${identityKey(identity)}|${identity.intention}|${identity.themes.join(',')}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return hash >>> 0;
}

export function crownScale(crownShape: CrownShape): number {
  return crownShape === 'wide' ? 1.2 : crownShape === 'narrow' ? 0.8 : crownShape === 'open' ? 1.1 : 0.95;
}

export function applyIdentity(skeleton: TreeSkeleton, identity: BotanicalIdentity, seed: number): void {
  const { trunkShape, branchingStyle, crownShape, foliageDensity } = identity.characteristics;
  const maxY = Math.max(0.001, ...skeleton.nodes.map(n => n.position[1]));
  const direction = (seed % 2 === 0 ? 1 : -1);
  for (const node of skeleton.nodes) {
    const [x, y, z] = node.position;
    const hFrac = Math.min(1, Math.max(0, y / maxY));
    const radial = Math.hypot(x, z);
    let nx = x, nz = z, ny = y;
    if (node.organ === 'trunk' || node.organ === 'root') {
      if (trunkShape === 'straight') { nx = x * 0.55; nz = z * 0.55; }
      if (trunkShape === 'curved') { nx = x + Math.sin(hFrac * Math.PI) * 0.35 * direction; nz = z + Math.cos(hFrac * Math.PI * 0.5) * 0.12 * direction; }
      if (trunkShape === 'twisted') {
        const angle = hFrac * 1.0 * direction, cos = Math.cos(angle), sin = Math.sin(angle);
        nx = x * cos - z * sin; nz = x * sin + z * cos;
      }
    }
    if (trunkShape === 'branching' && node.order >= 1) { const s = 1 + 0.18 * hFrac; nx *= s; nz *= s; }
    if (node.order >= 1 && branchingStyle === 'spreading') { nx *= 1.1; nz *= 1.1; }
    if (node.order >= 2 && branchingStyle === 'upward') ny = y + radial * 0.16;
    if (node.order >= 2 && branchingStyle === 'cascading') ny = Math.max(0.25, y - radial * 0.2);
    node.position = [nx, ny, nz];
  }
  let keepRatio = Math.min(1, Math.max(0.35, 0.35 + 0.65 * foliageDensity));
  if (crownShape === 'open') keepRatio *= 0.8;
  if (crownShape === 'dense') keepRatio = Math.min(1, keepRatio * 1.15);
  if (keepRatio < 1 && skeleton.sites.length > 1) {
    const rng = random((seed ^ hashIdentity(identity) ^ 0x9e3779b9) >>> 0);
    const order = skeleton.sites.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const keep = new Set(order.slice(0, Math.max(1, Math.round(order.length * keepRatio))));
    skeleton.sites = skeleton.sites.filter((_, i) => keep.has(i));
  }
}

export function isExactQuote(quote: unknown, source: string): quote is string {
  return typeof quote === 'string' && quote.trim().length >= 3 && /\S/.test(quote) && quote.length <= source.length && source.includes(quote);
}

export function validateComparison(raw: unknown, original: string, reflection: string): { ok: true; comparison: ReflectionComparison } | { ok: false; error: string } {
  if (!isRecord(raw)) return { ok: false, error: 'Comparison must be an object.' };
  if (!isExactQuote(raw.originalQuote, original)) return { ok: false, error: 'Original quote was not found verbatim in the letter.' };
  if (!isExactQuote(raw.reflectionQuote, reflection)) return { ok: false, error: 'Reflection quote was not found verbatim in the reflection.' };
  if (!shortText(raw.observation, 400)) return { ok: false, error: 'Observation must be 1-400 characters.' };
  return { ok: true, comparison: { originalQuote: raw.originalQuote, reflectionQuote: raw.reflectionQuote, observation: (raw.observation as string).trim() } };
}

export function interpretPrompt(body: string): string {
  return [
    'You propose a botanical identity for a personal letter in the Mneme garden. Respond with JSON only, no markdown fences.',
    'Shape: {"intention":"concise intention","themes":["1 to 3 short themes"],"species":"one supported species","characteristics":{"trunkShape":"straight|curved|twisted|branching","crownShape":"wide|narrow|open|dense","branchingStyle":"upward|spreading|cascading","foliageDensity":0.0,"heightVariation":0.0},"explanation":"short plain explanation"}',
    `Supported species: ${REAL_TREE_SPECIES.join(', ')}. foliageDensity and heightVariation must be numbers from 0 to 1.`,
    'Choose a healthy, believable tree. Associations are symbolic, not scientific. Never diagnose feelings, score personality, predict success, or make a difficult letter produce a dead or inferior tree. Do not invent facts beyond the letter.',
    'Letter:',
    body,
  ].join('\n');
}

export function questionPrompt(body: string): string {
  return [
    'Write one concise, thoughtful reflection question grounded in this letter. Respond with JSON only: {"question":"..."}.',
    'Do not assume the goal was achieved or that life improved. Do not diagnose or score the author.',
    'Letter:',
    body,
  ].join('\n');
}

export function comparePrompt(original: string, reflection: string): string {
  return [
    'Compare a past letter with a present reflection. Respond with JSON only: {"originalQuote":"exact quote copied from ORIGINAL","reflectionQuote":"exact quote copied from REFLECTION","observation":"short tentative observation"}.',
    'Both quotes must be copied verbatim, character for character, from the texts below. Never invent or paraphrase a quote. Keep the observation tentative; do not claim a goal was achieved, diagnose, or award a growth score.',
    'ORIGINAL:',
    original,
    'REFLECTION:',
    reflection,
  ].join('\n');
}

export function parseModelJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(trimmed); } catch { /* fall through to object extraction */ }
  const start = trimmed.indexOf('{'), end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { return null; }
}

export function extractModelText(data: unknown): string {
  if (!isRecord(data)) return '';
  const choices = data.choices;
  if (Array.isArray(choices) && isRecord(choices[0]) && isRecord(choices[0].message) && typeof choices[0].message.content === 'string') return choices[0].message.content;
  if (typeof data.output_text === 'string') return data.output_text;
  if (typeof data.response === 'string') return data.response;
  if (typeof data.text === 'string') return data.text;
  if (Array.isArray(data.output)) {
    for (const item of data.output) if (isRecord(item) && Array.isArray(item.content)) for (const part of item.content) if (isRecord(part) && typeof part.text === 'string') return part.text;
  }
  return '';
}
