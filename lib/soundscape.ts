import type { EnvironmentFrame } from './environment.ts';
import { random } from './tree.ts';

export const AUDIO_KEY = 'mneme-audio-v1', DEFAULT_VOLUME = .3;
export type SoundscapeProfile = { birds: number; insects: number };
export type SoundEvent = { voice: 0 | 1 | 2 | 3; at: number; duration: number; fromHz: number; toHz: number; gain: number; pan: number };
const TIMES = [[1, 0], [.55, .05], [.15, .75], [0, .65]] as const;
const SEASONS = { neutral: [.65, .6], spring: [1, .55], summer: [.7, 1], autumn: [.4, .3], winter: [0, 0], tropical: [.9, 1] } as const;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function soundscapeProfile(frame: Pick<EnvironmentFrame, 'enabled' | 'period' | 'solarAngle' | 'daylight' | 'season' | 'rainIntensity' | 'cloudCover' | 'snow'>): SoundscapeProfile {
  const result: SoundscapeProfile = { birds: 0, insects: 0 };
  if (!frame.enabled) return result;
  const phase = (((frame.solarAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2);
  const index = frame.period === 'static' ? 1 : Math.floor(phase), t = frame.period === 'static' ? 0 : phase - index, next = (index + 1) % 4;
  const mix = t * t * (3 - 2 * t), darkness = frame.period === 'static' ? 0 : clamp(1 - frame.daylight * 2), night = darkness * darkness * (3 - 2 * darkness);
  for (const [i, key] of (['birds', 'insects'] as const).entries()) {
    const base = TIMES[index][i] + (TIMES[next][i] - TIMES[index][i]) * mix;
    result[key] = base + (TIMES[3][i] - base) * night;
  }
  const season = SEASONS[frame.season];
  result.birds *= season[0] * (frame.snow ? 0 : 1 - frame.rainIntensity);
  result.insects *= season[1] * (frame.snow ? 0 : 1 - frame.rainIntensity);
  return result;
}

export function readAudioSettings(raw: string | null): { version: 1; volume: number } {
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version === 1 && typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1) return { version: 1, volume: value.volume };
  } catch { /* Audio settings never affect letters or environment preferences. */ }
  return { version: 1, volume: DEFAULT_VOLUME };
}

export function soundEvents(profile: SoundscapeProfile, seed: number, windowIndex: number): SoundEvent[] {
  const rng = random(seed + windowIndex * 73856093), result: SoundEvent[] = [];
  if (profile.birds > 0 && rng() < profile.birds * .3) {
    const start = .15 + rng() * .7;
    for (const voice of [0, 1] as const) result.push({ voice, at: start + voice * .25, duration: .12 + rng() * .16, fromHz: 1800 + rng() * 1800, toHz: 1800 + rng() * 1800, gain: .2 + rng() * .1, pan: rng() * 1.2 - .6 });
  }
  if (profile.insects > 0 && rng() < profile.insects * .65) {
    const start = .25 + rng() * .7, frequency = 3600 + rng() * 1200;
    for (let i = 0; i < 6; i++) result.push({ voice: i % 2 ? 3 : 2, at: start + i * .09, duration: .025 + rng() * .025, fromHz: frequency, toHz: Math.max(3600, frequency * .99), gain: .04 + rng() * .04, pan: rng() * 1.2 - .6 });
  }
  return result;
}
