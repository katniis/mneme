import { validLocation, validZone, type EnvironmentLocation, type WeatherSnapshot } from './environment.ts';
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const round = (n: number) => Math.round(n * 100) / 100;
export const locationKey = (l: EnvironmentLocation) => JSON.stringify([round(l.latitude), round(l.longitude), l.timeZone]);
export function normalizeWeather(raw: unknown, fetchedAt: number): WeatherSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { timezone?: unknown; current?: Record<string, unknown>; daily?: Record<string, unknown> };
  const c = r.current;
  if (!validZone(r.timezone) || !c || !finite(fetchedAt) || !finite(c.time) || c.time <= 0 || c.time * 1000 > fetchedAt + 300000 ||
    !finite(c.rain) || c.rain < 0 || !finite(c.showers) || c.showers < 0 || !finite(c.weather_code) || !Number.isInteger(c.weather_code) ||
    !finite(c.cloud_cover) || c.cloud_cover < 0 || c.cloud_cover > 100 || !finite(c.temperature_2m) || ![0, 1].includes(c.is_day as number)) return null;
  const events = (value: unknown): number[] | null => Array.isArray(value) && value.length <= 10 && value.every(t => t === null || (finite(t) && t > 0 && t < 8640000000000)) ? value.filter((t): t is number => t !== null).map(t => t * 1000) : null;
  const sunrise = events(r.daily?.sunrise), sunset = events(r.daily?.sunset);
  if (!sunrise || !sunset) return null;
  return { fetchedAt, observedAt: c.time * 1000, timeZone: r.timezone, rainMm: c.rain + c.showers, code: c.weather_code, cloudCover: c.cloud_cover / 100, temperatureC: c.temperature_2m, isDay: c.is_day === 1, sunrise, sunset };
}
export function readWeatherCache(raw: string | null, location: EnvironmentLocation): WeatherSnapshot | null {
  try {
    const c = JSON.parse(raw || 'null'), w = c?.weather as WeatherSnapshot;
    if (JSON.stringify(c?.location) !== locationKey(location) || !w || typeof w.isDay !== 'boolean' || !Array.isArray(w.sunrise) || !Array.isArray(w.sunset)) return null;
    const normalized = normalizeWeather({ timezone: w.timeZone, current: { time: w.observedAt / 1000, rain: w.rainMm, showers: 0, weather_code: w.code, cloud_cover: w.cloudCover * 100, temperature_2m: w.temperatureC, is_day: w.isDay ? 1 : 0 }, daily: { sunrise: w.sunrise.map(t => t / 1000), sunset: w.sunset.map(t => t / 1000) } }, w.fetchedAt);
    return normalized;
  } catch { return null; }
}
async function request(url: URL, signal: AbortSignal) {
  const timeout = AbortSignal.timeout(10000);
  const response = await fetch(url, { signal: AbortSignal.any([signal, timeout]), credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Weather service is unavailable. Please try again later.');
  return response.json();
}
export async function fetchWeather(location: EnvironmentLocation, signal: AbortSignal): Promise<WeatherSnapshot> {
  if (!validLocation(location)) throw new Error('Choose a valid weather location.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: String(round(location.latitude)), longitude: String(round(location.longitude)), timezone: 'auto', timeformat: 'unixtime', past_days: '1', forecast_days: '2', current: 'rain,showers,weather_code,cloud_cover,temperature_2m,is_day', daily: 'sunrise,sunset' }).toString();
  const weather = normalizeWeather(await request(url, signal), Date.now());
  if (!weather) throw new Error('Weather data could not be read. Local time still works.');
  return weather;
}
export async function searchPlaces(query: string, deviceZone: string, signal: AbortSignal): Promise<EnvironmentLocation[]> {
  const name = query.trim();
  if (name.length < 2 || name.length > 80) throw new Error('Enter a city name between 2 and 80 characters.');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name, count: '5', language: 'en', format: 'json' }).toString();
  const raw = await request(url, signal);
  if (!raw || (raw.results !== undefined && !Array.isArray(raw.results))) throw new Error('City results could not be read.');
  return (raw.results || []).slice(0, 5).flatMap((r: Record<string, unknown>) => {
    if (!r || typeof r.name !== 'string' || !finite(r.latitude) || !finite(r.longitude)) return [];
    const l = { name: [r.name, typeof r.country === 'string' ? r.country : ''].filter(Boolean).join(', '), latitude: round(r.latitude), longitude: round(r.longitude), timeZone: r.timezone, source: 'city', deviceZoneAtSelection: deviceZone };
    return validLocation(l) ? [l] : [];
  });
}
