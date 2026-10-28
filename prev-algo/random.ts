export function random(seed: number) { let a = seed >>> 0; return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function noise(x: number, z: number, salt = 0) { return random(Math.imul(x + 10000, 374761393) ^ Math.imul(z + 10000, 668265263) ^ salt)(); }
export function mix(a: number, b: number, t: number) { return a + (b-a)*t; }
