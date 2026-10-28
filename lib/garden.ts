import { placement, type Position } from './terrain.ts';
export const STORAGE_KEY = "mneme-garden-v1";
export const DRAFT_KEY = "mneme-draft-v1";
export type Letter = {
	id: string;
	title: string;
	body: string;
	planted: number;
	reveal: number;
	seed: number;
	position: Position;
};
export type GardenState = {
	version: 2;
	plots: Position[];
	letters: Letter[];
	time: number;
	rate: number;
	playing: boolean;
	speed: number;
};
export type Draft = { title: string; body: string; date: string; tree: string };
export function progress(
	letter: Pick<Letter, "planted" | "reveal">,
	time: number,
) {
	return Math.min(
		1,
		Math.max(0, (time - letter.planted) / (letter.reveal - letter.planted)),
	);
}
export function advanceTime(
	time: number,
	delta: number,
	speed: number,
	rate: number,
	playing: boolean,
	visible: boolean,
) {
	return time + (playing && visible ? Math.min(delta, 1) * speed * rate : 0);
}
export function validateLetter(body: string, date: string, now: number) {
	const errors: { body?: string; date?: string } = {};
	if (!body.trim())
		errors.body = "Give your future self a few words to find.";
	const parsed = Date.parse(`${date}T12:00:00`);
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
		!Number.isFinite(parsed) ||
		dateInput(parsed) !== date ||
		parsed <= now
	)
		errors.date = "Choose a day after the current demo date.";
	return errors;
}
export function dateInput(time: number) {
	const d = new Date(time);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatDate(time: number, short = false) {
	return new Date(time).toLocaleDateString("en-US", {
		month: short ? "short" : "long",
		day: "numeric",
		year: "numeric",
	});
}
export function readGarden(raw: string | null): GardenState | null {
	if (!raw) return null;
	try {
		const state = JSON.parse(raw);
		if (
			![1, 2].includes(state.version) ||
			!Array.isArray(state.letters) ||
			!Number.isFinite(state.time) ||
			!Number.isFinite(state.rate) ||
			state.rate < 0 ||
			typeof state.playing !== "boolean" ||
			![0.5, 1, 2, 4].includes(state.speed)
		)
			return null;
		const ids = new Set<string>();
		for (const l of state.letters) {
			if (
				typeof l.id !== "string" ||
				ids.has(l.id) ||
				typeof l.title !== "string" ||
				typeof l.body !== "string" ||
				!l.body.trim() ||
				!Number.isFinite(l.planted) ||
				!Number.isFinite(l.reveal) ||
				l.reveal <= l.planted ||
				!Number.isInteger(l.seed) ||
				l.seed < 0 ||
				!Array.isArray(l.position) ||
				l.position.length !== 2 ||
				!l.position.every(Number.isFinite)
			)
				return null;
			ids.add(l.id);
		}
		const plots = state.version === 1 ? state.letters.map((l: Letter) => l.position) : state.plots;
		if (!Array.isArray(plots) || plots.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) return null;
		const plotKeys = new Set(plots.map(p => JSON.stringify(p)));
		const occupied = state.letters.map((l: Letter) => JSON.stringify(l.position));
		if (plotKeys.size !== plots.length || new Set(occupied).size !== occupied.length || occupied.some((key: string) => !plotKeys.has(key))) return null;
		return { ...state, version: 2, plots };
	} catch {
		return null;
	}
}

export function deleteLetter(state: GardenState, id: string): GardenState {
  const letters = state.letters.filter(letter => letter.id !== id);
  return letters.length === state.letters.length ? state : { ...state, letters };
}

export function nextPlanting(state: GardenState): { position: Position; plots: Position[] } {
  const occupied = new Set(state.letters.map(letter => JSON.stringify(letter.position)));
  const vacant = state.plots.find(position => !occupied.has(JSON.stringify(position)));
  if (vacant) return { position: vacant, plots: state.plots };
  const position = placement(state.plots);
  return { position, plots: [...state.plots, position] };
}
