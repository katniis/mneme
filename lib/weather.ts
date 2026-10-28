import { FUTURE_TOLERANCE_MS, type EnvironmentLocation, type WeatherSnapshot } from './environment.ts';

const round2 = (value: number) => Math.round(value * 100) / 100;

export function forecastUrl(location: EnvironmentLocation): string {
  const params = new URLSearchParams({
    latitude: String(round2(location.latitude)),
    longitude: String(round2(location.longitude)),
    timezone: 'auto',
    timeformat: 'unixtime',
    past_days: '1',
    forecast_days: '2',
    current: 'rain,showers,weather_code,cloud_cover,temperature_2m,is_day',
    daily: 'sunrise,sunset',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function geocodingUrl(query: string): string {
  const params = new URLSearchParams({ name: query.trim(), count: '5', language: 'en', format: 'json' });
  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function solarArray(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const result: number[] = [];
  for (const entry of value) {
    if (entry === null) continue;
    if (!finite(entry)) return null;
    result.push(entry * 1000);
  }
  return result;
}

export function normalizeWeather(raw: unknown, fetchedAt: number): WeatherSnapshot | null {
  if (!raw || typeof raw !== 'object' || !Number.isFinite(fetchedAt)) return null;
  const data = raw as { timezone?: unknown; current?: unknown; daily?: unknown };
  if (typeof data.timezone !== 'string' || !data.timezone) return null;
  if (!data.current || typeof data.current !== 'object') return null;
  const current = data.current as Record<string, unknown>;
  if (!finite(current.time) || !finite(current.rain) || !finite(current.showers)) return null;
  if (!finite(current.weather_code) || !finite(current.cloud_cover) || !finite(current.temperature_2m)) return null;
  if (current.rain < 0 || current.showers < 0 || current.cloud_cover < 0 || current.cloud_cover > 100) return null;
  if (current.is_day !== 0 && current.is_day !== 1 && typeof current.is_day !== 'boolean') return null;
  const observedAt = current.time * 1000;
  if (observedAt > fetchedAt + FUTURE_TOLERANCE_MS) return null;
  const daily = (data.daily && typeof data.daily === 'object' ? data.daily : {}) as Record<string, unknown>;
  const sunrise = solarArray(daily.sunrise);
  const sunset = solarArray(daily.sunset);
  if (sunrise === null || sunset === null) return null;
  return {
    fetchedAt,
    observedAt,
    timeZone: data.timezone,
    rainMm: current.rain + current.showers,
    code: current.weather_code,
    cloudCover: current.cloud_cover / 100,
    temperatureC: current.temperature_2m,
    isDay: current.is_day === 1 || current.is_day === true,
    sunrise,
    sunset,
  };
}

export async function fetchWeather(location: EnvironmentLocation, signal: AbortSignal): Promise<WeatherSnapshot> {
  let response: Response;
  try {
    response = await fetch(forecastUrl(location), { signal });
  } catch {
    throw new Error('Weather could not be reached. Check your connection and try again.');
  }
  if (!response.ok) throw new Error(`Weather request failed (${response.status}). Try again shortly.`);
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new Error('Weather data was incomplete. Try again shortly.');
  }
  const snapshot = normalizeWeather(raw, Date.now());
  if (!snapshot) throw new Error('Weather data was incomplete. Try again shortly.');
  return snapshot;
}

export async function searchPlaces(query: string, deviceZone: string, signal: AbortSignal): Promise<EnvironmentLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return [];
  let response: Response;
  try {
    response = await fetch(geocodingUrl(trimmed), { signal });
  } catch {
    throw new Error('Place search could not be reached. Check your connection and try again.');
  }
  if (!response.ok) throw new Error(`Place search failed (${response.status}). Try again shortly.`);
  const raw = (await response.json().catch(() => null)) as { results?: unknown } | null;
  if (!raw || !Array.isArray(raw.results)) return [];
  const places: EnvironmentLocation[] = [];
  for (const entry of raw.results) {
    if (!entry || typeof entry !== 'object') continue;
    const place = entry as Record<string, unknown>;
    if (typeof place.name !== 'string' || !place.name.trim()) continue;
    if (!finite(place.latitude) || !finite(place.longitude)) continue;
    if (place.latitude < -90 || place.latitude > 90 || place.longitude < -180 || place.longitude > 180) continue;
    if (typeof place.timezone !== 'string' || !place.timezone) continue;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: place.timezone });
    } catch {
      continue;
    }
    const label = typeof place.country === 'string' && place.country ? `${place.name}, ${place.country}` : place.name;
    places.push({
      name: label,
      latitude: round2(place.latitude),
      longitude: round2(place.longitude),
      timeZone: place.timezone,
      source: 'city',
      deviceZoneAtSelection: deviceZone,
    });
  }
  return places.slice(0, 5);
}
