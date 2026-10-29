import { Color } from 'three';
import type { EnvironmentFrame } from './environment.ts';

export type RGB = [number, number, number];
export type DaylightAppearance = {
  skyTop: RGB; horizon: RGB; keyColour: RGB; hemisphereSky: RGB;
  hemisphereGround: RGB; fillColour: RGB; direction: RGB;
  ambient: number; hemisphere: number; key: number; fill: number; stars: number;
};
const COLOURS = ['skyTop', 'horizon', 'keyColour', 'hemisphereSky', 'hemisphereGround', 'fillColour', 'direction'] as const;
const INTENSITIES = ['ambient', 'hemisphere', 'key', 'fill', 'stars'] as const;
const rgb = (hex: string): RGB => new Color(hex).toArray();
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function normalize(vector: RGB) {
  const length = Math.hypot(...vector);
  for (let i = 0; i < 3; i++) vector[i] /= length;
  return vector;
}
function anchor(top: string, horizon: string, key: string, sky: string, ground: string, direction: RGB, intensities: [number, number, number, number]): DaylightAppearance {
  return {
    skyTop: rgb(top), horizon: rgb(horizon), keyColour: rgb(key),
    hemisphereSky: rgb(sky), hemisphereGround: rgb(ground), fillColour: rgb('#dce7d7'),
    direction: normalize(direction), ambient: intensities[0], hemisphere: intensities[1],
    key: intensities[2], fill: intensities[3], stars: 0,
  };
}
const PROFILES = [
  anchor('#a2bcc8', '#f6dccb', '#ffd6ae', '#c2d6e0', '#858e77', [-1, .18, .35], [.32, .75, 1.45, .28]),
  anchor('#c9dce1', '#eef0df', '#fff1cf', '#dceaf0', '#a5b19f', [0, 1, .35], [.38, .95, 2.5, .32]),
  anchor('#9a9bbd', '#edb49d', '#ffc18a', '#b3afcf', '#807c70', [1, .18, .35], [.3, .7, 1.2, .28]),
  anchor('#101b2e', '#101b2e', '#c8d8f5', '#fff4d9', '#a5b19f', [0, 2.5, 1], [.3, .6, .12, .3]),
];
PROFILES[3].skyTop = PROFILES[3].skyTop.map(channel => channel * .72) as RGB;
const STATIC = anchor('#e9eee5', '#e9eee5', '#fff1cf', '#fff4d9', '#a5b19f', [-8, 14, 5], [.8, 1.6, 2.5, .65]);
const OVERCAST = rgb('#8c9a9b');

function mix(current: DaylightAppearance, target: Readonly<DaylightAppearance>, amount: number) {
  for (const key of COLOURS) for (let i = 0; i < 3; i++) current[key][i] += (target[key][i] - current[key][i]) * amount;
  for (const key of INTENSITIES) current[key] += (target[key] - current[key]) * amount;
  normalize(current.direction);
}

export function sampleDaylight(frame: Pick<EnvironmentFrame, 'period' | 'solarAngle' | 'daylight' | 'cloudCover'>): DaylightAppearance {
  const angle = ((frame.solarAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const phase = angle / (Math.PI / 2), index = Math.floor(phase), fraction = phase - index;
  const profile = structuredClone(frame.period === 'static' ? STATIC : PROFILES[index]);
  if (frame.period !== 'static') mix(profile, PROFILES[(index + 1) % 4], fraction * fraction * (3 - 2 * fraction));
  const clouds = clamp(frame.cloudCover), daylight = clamp(frame.daylight);
  profile.key *= 1 - .55 * clouds;
  for (let i = 0; i < 3; i++) {
    profile.skyTop[i] += (OVERCAST[i] - profile.skyTop[i]) * .24 * daylight * clouds;
    profile.horizon[i] += (OVERCAST[i] - profile.horizon[i]) * .24 * daylight * clouds;
    for (const key of ['keyColour', 'hemisphereSky', 'hemisphereGround'] as const) {
      profile[key][i] += (PROFILES[1][key][i] - profile[key][i]) * .35 * clouds;
    }
  }
  profile.stars = frame.period === 'static' ? 0 : (1 - daylight) * (1 - clouds) * .7;
  return profile;
}

export function easeDaylight(current: DaylightAppearance, target: Readonly<DaylightAppearance>, delta: number, immediate: boolean): void {
  if (immediate) {
    for (const key of COLOURS) for (let i = 0; i < 3; i++) current[key][i] = target[key][i];
    for (const key of INTENSITIES) current[key] = target[key];
  } else if (delta > 0) {
    mix(current, target, 1 - Math.exp(-Math.min(delta, .1) * 2));
  }
}
