import type { Position } from './terrain.ts';
export const STORAGE_KEY = 'mneme-garden-v1';
export const DRAFT_KEY = 'mneme-draft-v1';
export type Letter = { id: string; title: string; body: string; planted: number; reveal: number; seed: number; position: Position };
export type GardenState = { version: 1; letters: Letter[]; time: number; rate: number; playing: boolean; speed: number };
export type Draft = { title: string; body: string; date: string };
export function progress(letter: Pick<Letter, 'planted' | 'reveal'>, time: number) { return Math.min(1, Math.max(0, (time - letter.planted) / (letter.reveal - letter.planted))); }
export function advanceTime(time: number, delta: number, speed: number, rate: number, playing: boolean, visible: boolean) {
  return time + (playing && visible ? Math.min(delta, 1) * speed * rate : 0);
}
export function validateLetter(body: string, date: string, now: number) {
  const errors: { body?: string; date?: string } = {};
  if (!body.trim()) errors.body = 'Give your future self a few words to find.';
  const parsed = Date.parse(`${date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed) || dateInput(parsed) !== date || parsed <= now) errors.date = 'Choose a day after the current demo date.';
  return errors;
}
export function dateInput(time: number) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatDate(time: number, short = false) { return new Date(time).toLocaleDateString('en-US', { month: short ? 'short' : 'long', day: 'numeric', year: 'numeric' }); }
export function readGarden(raw: string | null): GardenState | null {
  if (!raw) return null;
  try {
    const state = JSON.parse(raw);
    if (state.version !== 1 || !Array.isArray(state.letters) || !Number.isFinite(state.time) || !Number.isFinite(state.rate) || state.rate < 0 || typeof state.playing !== 'boolean' || ![.5, 1, 2, 4].includes(state.speed)) return null;
    const ids = new Set<string>();
    for (const l of state.letters) {
      if (typeof l.id !== 'string' || ids.has(l.id) || typeof l.title !== 'string' || typeof l.body !== 'string' || !l.body.trim() || !Number.isFinite(l.planted) || !Number.isFinite(l.reveal) || l.reveal <= l.planted || !Number.isInteger(l.seed) || l.seed < 0 || !Array.isArray(l.position) || l.position.length !== 2 || !l.position.every(Number.isFinite)) return null;
      ids.add(l.id);
    }
    return state;
  } catch { return null; }
}
