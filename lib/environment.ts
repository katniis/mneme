export type EnvironmentLocation = {
  name: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: 'device' | 'city';
  deviceZoneAtSelection: string;
};
export type EnvironmentPreferences = {
  version: 1;
  enabled: boolean;
  dayNight: boolean;
  seasons: boolean;
  rain: boolean;
  location: EnvironmentLocation | null;
};
export type Season = 'neutral' | 'tropical' | 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherSnapshot = {
  fetchedAt: number;
  observedAt: number;
  timeZone: string;
  rainMm: number;
  code: number;
  cloudCover: number;
  temperatureC: number;
  isDay: boolean;
  sunrise: number[];
  sunset: number[];
};
export type EnvironmentFrame = {
  enabled: boolean;
  period: 'static' | 'dawn' | 'day' | 'dusk' | 'night';
  solarAngle: number;
  daylight: number;
  season: Season;
  rainIntensity: number;
  cloudCover: number;
  snow: boolean;
  source: 'static' | 'local-clock' | 'local-weather';
  weatherStatus: 'off' | 'needs-location' | 'fresh' | 'stale' | 'unavailable';
};

export const ENVIRONMENT_KEY = 'mneme-environment-v1';
export const WEATHER_KEY = 'mneme-weather-v1';
export const STALE_MS = 1800000;
export const FUTURE_TOLERANCE_MS = 300000;
export const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 97, 99];
export const SNOW_CODES = [71, 73, 75, 77, 85, 86];
export const DEFAULT_ENVIRONMENT: EnvironmentPreferences = {
  version: 1,
  enabled: true,
  dayNight: true,
  seasons: true,
  rain: true,
  location: null,
};

function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function readEnvironmentPreferences(raw: string | null): EnvironmentPreferences {
  const fallback = (): EnvironmentPreferences => ({ ...DEFAULT_ENVIRONMENT, location: null });
  if (!raw) return fallback();
  try {
    const data = JSON.parse(raw) as Partial<EnvironmentPreferences>;
    if (data.version !== 1) return fallback();
    if ([data.enabled, data.dayNight, data.seasons, data.rain].some((v) => typeof v !== 'boolean')) return fallback();
    if (data.location === null) {
      return { version: 1, enabled: data.enabled!, dayNight: data.dayNight!, seasons: data.seasons!, rain: data.rain!, location: null };
    }
    const loc = data.location as Partial<EnvironmentLocation> | undefined;
    if (!loc || typeof loc !== 'object') return fallback();
    if (typeof loc.name !== 'string' || !loc.name.trim() || loc.name.length > 160) return fallback();
    if (!Number.isFinite(loc.latitude) || (loc.latitude as number) < -90 || (loc.latitude as number) > 90) return fallback();
    if (!Number.isFinite(loc.longitude) || (loc.longitude as number) < -180 || (loc.longitude as number) > 180) return fallback();
    if (!isTimeZone(loc.timeZone) || !isTimeZone(loc.deviceZoneAtSelection)) return fallback();
    if (loc.source !== 'device' && loc.source !== 'city') return fallback();
    return {
      version: 1,
      enabled: data.enabled!,
      dayNight: data.dayNight!,
      seasons: data.seasons!,
      rain: data.rain!,
      location: {
        name: loc.name,
        latitude: loc.latitude as number,
        longitude: loc.longitude as number,
        timeZone: loc.timeZone,
        source: loc.source,
        deviceZoneAtSelection: loc.deviceZoneAtSelection,
      },
    };
  } catch {
    return fallback();
  }
}

export function localDateParts(now: number, timeZone: string): { year: number; month: number; day: number; minutes: number } {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    calendar: 'gregory',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(new Date(now));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get('hour') % 24;
  return { year: get('year'), month: get('month'), day: get('day'), minutes: hour * 60 + get('minute') };
}

export function seasonFor(month: number, latitude: number | null): Season {
  if (latitude === null || !Number.isFinite(latitude)) return 'neutral';
  if (Math.abs(latitude) < 23.44) return 'tropical';
  const normalized = ((Math.round(month) - 1) % 12 + 12) % 12 + 1;
  const effective = latitude < 0 ? ((normalized + 5) % 12) + 1 : normalized;
  if (effective >= 3 && effective <= 5) return 'spring';
  if (effective >= 6 && effective <= 8) return 'summer';
  if (effective >= 9 && effective <= 11) return 'autumn';
  return 'winter';
}

function validSnapshot(weather: WeatherSnapshot | null, now: number): weather is WeatherSnapshot {
  if (!weather || typeof weather !== 'object') return false;
  if (!Number.isFinite(weather.fetchedAt) || !Number.isFinite(weather.observedAt)) return false;
  if (weather.fetchedAt > now + FUTURE_TOLERANCE_MS || weather.observedAt > now + FUTURE_TOLERANCE_MS) return false;
  if (!Number.isFinite(weather.rainMm) || weather.rainMm < 0) return false;
  if (!Number.isFinite(weather.code) || !Number.isFinite(weather.temperatureC)) return false;
  if (!Number.isFinite(weather.cloudCover) || weather.cloudCover < 0 || weather.cloudCover > 1) return false;
  if (typeof weather.isDay !== 'boolean' || typeof weather.timeZone !== 'string') return false;
  if (!Array.isArray(weather.sunrise) || !Array.isArray(weather.sunset)) return false;
  return [...weather.sunrise, ...weather.sunset].every(Number.isFinite);
}

export function isValidWeatherSnapshot(weather: WeatherSnapshot | null, now: number): boolean {
  return validSnapshot(weather, now);
}

export function isFreshWeather(now: number, weather: WeatherSnapshot | null): boolean {
  if (!validSnapshot(weather, now)) return false;
  return now - weather.fetchedAt <= STALE_MS && now - weather.observedAt <= STALE_MS;
}

type Daylight = { period: EnvironmentFrame['period']; solarAngle: number; daylight: number; source: EnvironmentFrame['source'] };

function fallbackDaylight(minutes: number): Daylight {
  const sunrise = 360;
  const sunset = 1080;
  let solarAngle: number;
  if (minutes >= sunrise && minutes <= sunset) {
    solarAngle = ((minutes - sunrise) / (sunset - sunrise)) * Math.PI;
  } else {
    const sinceSunset = minutes > sunset ? minutes - sunset : minutes + (1440 - sunset);
    solarAngle = Math.PI + (sinceSunset / (1440 - (sunset - sunrise))) * Math.PI;
  }
  if (minutes >= 330 && minutes < 390) return { period: 'dawn', solarAngle, daylight: (minutes - 330) / 60, source: 'local-clock' };
  if (minutes >= 390 && minutes < 1050) return { period: 'day', solarAngle, daylight: 1, source: 'local-clock' };
  if (minutes >= 1050 && minutes < 1110) return { period: 'dusk', solarAngle, daylight: 1 - (minutes - 1050) / 60, source: 'local-clock' };
  return { period: 'night', solarAngle, daylight: 0, source: 'local-clock' };
}

function solarDaylight(now: number, weather: WeatherSnapshot): Daylight | null {
  const rises = [...weather.sunrise].sort((a, b) => a - b);
  const sets = [...weather.sunset].sort((a, b) => a - b);
  const lastRise = rises.filter((t) => t <= now).at(-1);
  const nextRise = rises.find((t) => t > now);
  const lastSet = sets.filter((t) => t <= now).at(-1);
  const nextSet = sets.find((t) => t > now);
  const isDay = lastRise !== undefined && (lastSet === undefined || lastRise > lastSet);
  if (isDay) {
    if (nextSet === undefined) return null;
    const frac = (now - lastRise) / Math.max(1, nextSet - lastRise);
    const solarAngle = Math.min(1, Math.max(0, frac)) * Math.PI;
    if (now < lastRise + 3600000) return { period: 'dawn', solarAngle, daylight: Math.min(1, (now - lastRise) / 3600000), source: 'local-weather' };
    if (now >= nextSet - 3600000) return { period: 'dusk', solarAngle, daylight: Math.min(1, (nextSet - now) / 3600000), source: 'local-weather' };
    return { period: 'day', solarAngle, daylight: 1, source: 'local-weather' };
  }
  if (lastSet === undefined || nextRise === undefined) return null;
  const frac = (now - lastSet) / Math.max(1, nextRise - lastSet);
  return { period: 'night', solarAngle: Math.PI + Math.min(1, Math.max(0, frac)) * Math.PI, daylight: 0, source: 'local-weather' };
}

export function resolveEnvironment(now: number, deviceZone: string, prefs: EnvironmentPreferences, weather: WeatherSnapshot | null): EnvironmentFrame {
  const valid = validSnapshot(weather, now);
  const fresh = valid && isFreshWeather(now, weather);
  const usable = fresh ? weather : null;
  let weatherStatus: EnvironmentFrame['weatherStatus'];
  if (!prefs.enabled || (!prefs.dayNight && !prefs.seasons && !prefs.rain)) weatherStatus = 'off';
  else if (!prefs.location) weatherStatus = 'needs-location';
  else if (!valid) weatherStatus = 'unavailable';
  else weatherStatus = fresh ? 'fresh' : 'stale';

  const season: Season = prefs.enabled && prefs.seasons
    ? seasonFor(localDateParts(now, deviceZone).month, prefs.location?.latitude ?? null)
    : 'neutral';
  const rainIntensity = prefs.enabled && prefs.rain && usable && RAIN_CODES.includes(usable.code) && usable.rainMm > 0
    ? Math.min(1, usable.rainMm / 3)
    : 0;
  const snow = Boolean(prefs.enabled && prefs.seasons && usable && SNOW_CODES.includes(usable.code));
  const cloudCover = prefs.enabled && usable ? usable.cloudCover : 0;

  if (!prefs.enabled || !prefs.dayNight) {
    return { enabled: prefs.enabled, period: 'static', solarAngle: Math.PI / 2, daylight: 1, season, rainIntensity, cloudCover, snow, source: 'static', weatherStatus };
  }
  let daylight: Daylight | null = null;
  if (usable && usable.timeZone === deviceZone) {
    daylight = solarDaylight(now, usable);
    if (!daylight) {
      daylight = usable.isDay
        ? { period: 'day', solarAngle: Math.PI / 2, daylight: 1, source: 'local-weather' }
        : { period: 'night', solarAngle: (3 * Math.PI) / 2, daylight: 0, source: 'local-weather' };
    }
  }
  if (!daylight) daylight = fallbackDaylight(localDateParts(now, deviceZone).minutes);
  return { enabled: true, period: daylight.period, solarAngle: daylight.solarAngle, daylight: daylight.daylight, season, rainIntensity, cloudCover, snow, source: daylight.source, weatherStatus };
}

const SEASON_TINTS: Record<Exclude<Season, 'neutral'>, { target: string; mix: number }> = {
  spring: { target: '#8fae6c', mix: 0.25 },
  summer: { target: '#658744', mix: 0.15 },
  autumn: { target: '#b08b50', mix: 0.42 },
  winter: { target: '#9da998', mix: 0.45 },
  tropical: { target: '#557c42', mix: 0.18 },
};

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function terrainColour(color: string, kind: string, season: Season): string {
  if (season === 'neutral') return color;
  if (kind !== 'grass' && kind !== 'tuft' && kind !== 'flower' && kind !== 'soil') return color;
  const tint = SEASON_TINTS[season];
  const from = hexToRgb(color);
  const to = hexToRgb(tint.target);
  if (!from || !to) return color;
  const mix = kind === 'flower' || kind === 'soil' ? Math.min(0.1, tint.mix) : tint.mix;
  const channels = from.map((channel, i) => Math.round(channel + (to[i] - channel) * mix));
  return `#${channels.map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')}`;
}

export type RainGround = { x: number; y: number; z: number };
export type RainSample = { x: number; y: number; z: number; impact: boolean; cycle: number };

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const RAIN_POOLS = {
  desktop: { drops: 1200, splashes: 120 },
  mobile: { drops: 450, splashes: 40 },
};
export const RAIN_CYCLE_SECONDS = 1.5;
export const RAIN_FALL_SECONDS = 1.4;
export const RAIN_DROP_HEIGHT = 12;

export function rainSample(index: number, elapsedSeconds: number, ground: RainGround[]): RainSample | null {
  if (!ground.length) return null;
  const phase = seeded((index + 1) * 1013904223)();
  const elapsed = Math.max(0, elapsedSeconds) + phase * RAIN_CYCLE_SECONDS;
  const cycle = Math.floor(elapsed / RAIN_CYCLE_SECONDS);
  const cycleTime = elapsed - cycle * RAIN_CYCLE_SECONDS;
  const column = ground[Math.floor(seeded(((index + 1) * 73856093 ^ (cycle + 1) * 19349663) >>> 0)() * ground.length)];
  if (cycleTime < RAIN_FALL_SECONDS) {
    return { x: column.x, y: column.y + RAIN_DROP_HEIGHT * (1 - cycleTime / RAIN_FALL_SECONDS), z: column.z, impact: false, cycle };
  }
  return { x: column.x, y: column.y, z: column.z, impact: true, cycle };
}

export function environmentRanges(radius: number) {
  return {
    skyDistance: radius * 12,
    cameraFar: Math.max(200, radius * 24),
    shadowExtent: radius + 6,
    shadowFar: radius * 16,
  };
}

export function fogRange(cameraDistance: number, radius: number, rainIntensity: number): { near: number; far: number } {
  if (rainIntensity > 0) {
    const near = Math.max(1, cameraDistance - radius * 1.5);
    return { near, far: Math.max(cameraDistance + radius * 5, near + 1) };
  }
  return { near: cameraDistance + radius * 2, far: cameraDistance + radius * 12 };
}

export function celestialPosition(solarAngle: number, center: [number, number], radius: number): [number, number, number] {
  const distance = radius * 12;
  return [center[0] + Math.cos(solarAngle) * distance, Math.sin(solarAngle) * distance, center[1] - distance * 0.35];
}
