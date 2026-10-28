export type Vec3 = [number, number, number];
export type Letter = { id: string; title: string; body: string; planted: number; reveal: number; seed: number; position: [number, number] };
export type GardenData = { version: 1; now: number; playing: boolean; speed: number; rate: number; letters: Letter[] };
export type Voxel = { center: Vec3; size: Vec3; color: string; anchor: Vec3; start: number; duration: number; rotation?: Vec3; kind?: 'leaf' | 'wood' };
export const DAY = 86400000;
export function progress(letter: Letter, now: number) { return Math.max(0, Math.min(1, (now - letter.planted) / (letter.reveal - letter.planted))); }
export function stage(p: number) { return p < .06 ? 'A new sprout' : p < .28 ? 'Taking root' : p < .58 ? 'Reaching outward' : p < 1 ? 'Coming into leaf' : 'Ready to remember'; }
export function dateLabel(date: number) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date); }
export function dateInput(date: number) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
