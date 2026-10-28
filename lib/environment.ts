export type EnvironmentLocation = { name: string; latitude: number; longitude: number; timeZone: string; source: 'device' | 'city'; deviceZoneAtSelection: string };
export type EnvironmentPreferences = { version: 1; enabled: boolean; dayNight: boolean; seasons: boolean; rain: boolean; location: EnvironmentLocation | null };
export type Season = 'neutral' | 'tropical' | 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherSnapshot = { fetchedAt: number; observedAt: number; timeZone: string; rainMm: number; code: number; cloudCover: number; temperatureC: number; isDay: boolean; sunrise: number[]; sunset: number[] };
export type EnvironmentFrame = { enabled: boolean; period: 'static' | 'dawn' | 'day' | 'dusk' | 'night'; solarAngle: number; daylight: number; season: Season; rainIntensity: number; cloudCover: number; snow: boolean; source: 'static' | 'local-clock' | 'local-weather'; weatherStatus: 'off' | 'needs-location' | 'fresh' | 'stale' | 'unavailable' };
export const DEFAULT_ENVIRONMENT: EnvironmentPreferences = { version: 1, enabled: true, dayNight: true, seasons: true, rain: true, location: null };
export const ENVIRONMENT_KEY = 'mneme-environment-v1';
export const WEATHER_KEY = 'mneme-weather-v1';
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 97, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function validZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}
export function validLocation(value: unknown): value is EnvironmentLocation {
  if (!value || typeof value !== 'object') return false;
  const v = value as EnvironmentLocation;
  return typeof v.name === 'string' && v.name.trim().length > 0 && v.name.length <= 160 &&
    Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180 &&
    validZone(v.timeZone) && validZone(v.deviceZoneAtSelection) && (v.source === 'city' || v.source === 'device');
}
export function readEnvironmentPreferences(raw: string | null): EnvironmentPreferences {
  try {
    const v = JSON.parse(raw || 'null');
    if (v?.version === 1 && ['enabled', 'dayNight', 'seasons', 'rain'].every(k => typeof v[k] === 'boolean') && (v.location === null || validLocation(v.location))) {
      return { version: 1, enabled: v.enabled, dayNight: v.dayNight, seasons: v.seasons, rain: v.rain, location: v.location };
    }
  } catch { /* Invalid preferences never affect saved letters. */ }
  return { ...DEFAULT_ENVIRONMENT };
}
export function localDateParts(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: validZone(timeZone) ? timeZone : 'UTC', calendar: 'gregory', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
  const n = (key: string) => Number(parts.find(p => p.type === key)?.value);
  return { year: n('year'), month: n('month'), day: n('day'), minutes: n('hour') * 60 + n('minute') };
}
export function seasonFor(month: number, latitude: number | null): Season {
  if (latitude === null) return 'neutral';
  if (Math.abs(latitude) < 23.44) return 'tropical';
  const index = Math.floor(((month + 9) % 12) / 3);
  return (['spring', 'summer', 'autumn', 'winter'] as const)[(index + (latitude < 0 ? 2 : 0)) % 4];
}
export function freshWeather(w: WeatherSnapshot | null, now: number): w is WeatherSnapshot {
  return !!w && [w.fetchedAt, w.observedAt].every(t => Number.isFinite(t) && now - t <= 1800000 && t - now <= 300000);
}
export function activeLocation(p: EnvironmentPreferences, zone: string) {
  return p.location && (p.location.source === 'city' || p.location.deviceZoneAtSelection === zone) ? p.location : null;
}
export function resolveEnvironment(now: number, deviceZone: string, p: EnvironmentPreferences, weather: WeatherSnapshot | null): EnvironmentFrame {
  const location = activeLocation(p, deviceZone);
  const working = p.enabled && (p.dayNight || p.seasons || p.rain);
  const fresh = !!location && freshWeather(weather, now);
  const local = localDateParts(now, deviceZone);
  let angle = ((local.minutes - 360 + 1440) % 1440) / 720 * Math.PI;
  let distance = Math.min(Math.abs(local.minutes - 360), Math.abs(local.minutes - 1080));
  let daylight = clamp((Math.sin(angle) + Math.sin(Math.PI / 24)) / (2 * Math.sin(Math.PI / 24)));
  if (fresh && weather.timeZone === deviceZone) {
    const events = [...weather.sunrise.map(t => ({ t, rise: true })), ...weather.sunset.map(t => ({ t, rise: false }))].sort((a, b) => a.t - b.t);
    const before = events.filter(e => e.t <= now).at(-1);
    const after = events.find(e => e.t > now);
    if (before && after && before.rise !== after.rise) {
      angle = (before.rise ? 0 : Math.PI) + (now - before.t) / (after.t - before.t) * Math.PI;
      distance = Math.min(now - before.t, after.t - now) / 60000;
      daylight = before.rise ? clamp(.5 + distance / 60) : clamp(.5 - distance / 60);
    } else if (!events.length) {
      angle = weather.isDay ? Math.PI / 2 : Math.PI * 1.5;
      daylight = weather.isDay ? 1 : 0;
      distance = Infinity;
    }
  }
  const daytime = Math.sin(angle) >= 0;
  const period = distance <= 30 ? (Math.cos(angle) >= 0 ? 'dawn' : 'dusk') : daytime ? 'day' : 'night';
  return {
    enabled: p.enabled, period: p.enabled && p.dayNight ? period : 'static',
    solarAngle: p.enabled && p.dayNight ? angle : Math.PI / 2, daylight: p.enabled && p.dayNight ? daylight : 1,
    season: p.enabled && p.seasons ? seasonFor(local.month, location?.latitude ?? null) : 'neutral',
    rainIntensity: p.enabled && p.rain && fresh && RAIN_CODES.has(weather.code) ? clamp(weather.rainMm / 3) : 0,
    cloudCover: working && fresh ? weather.cloudCover : 0,
    snow: p.enabled && p.seasons && fresh && SNOW_CODES.has(weather.code),
    source: !working ? 'static' : fresh ? 'local-weather' : 'local-clock',
    weatherStatus: !working ? 'off' : !location ? 'needs-location' : fresh ? 'fresh' : weather ? 'stale' : 'unavailable',
  };
}
export function terrainColour(color: string, kind: string, season: Season): string {
  if (season === 'neutral' || !['grass', 'tuft', 'flower', 'soil'].includes(kind)) return color;
  const palette = { spring: ['#8fae6c', .25], summer: ['#658744', .15], autumn: ['#b08b50', .42], winter: ['#9da998', .45], tropical: ['#557c42', .18] } as const;
  const [target, amount] = palette[season];
  const mix = kind === 'flower' || kind === 'soil' ? Math.min(.1, amount) : amount;
  const from = parseInt(color.slice(1), 16), to = parseInt(target.slice(1), 16);
  const channel = (shift: number) => Math.round(((from >> shift) & 255) * (1 - mix) + ((to >> shift) & 255) * mix).toString(16).padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}
export const RAIN_LIMITS = { desktop: { drops: 1200, splashes: 120 }, mobile: { drops: 450, splashes: 40 } } as const;
export function rainSample(index: number, elapsedSeconds: number, ground: { x: number; y: number; z: number }[]) {
  if (!ground.length) return null;
  const hash = (n: number) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
  const time = Math.max(0, elapsedSeconds) + (hash(index + 71) % 1500) / 1000;
  const cycle = Math.floor(time / 1.5), phase = time - cycle * 1.5;
  const column = ground[hash(index + cycle * 1201) % ground.length];
  const impact = phase >= 1.4;
  return { x: column.x, y: column.y + (impact ? 0 : 12 * (1 - phase / 1.4)), z: column.z, impact, cycle };
}
