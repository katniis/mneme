'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_ENVIRONMENT, ENVIRONMENT_KEY, WEATHER_KEY, activeLocation, readEnvironmentPreferences, resolveEnvironment, type EnvironmentLocation, type EnvironmentPreferences, type WeatherSnapshot } from '../../lib/environment';
import { fetchWeather, locationKey, readWeatherCache } from '../../lib/weather';

export function useEnvironment() {
  const [prefs, setPrefs] = useState({ ...DEFAULT_ENVIRONMENT });
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [now, setNow] = useState(Date.now);
  const [zone, setZone] = useState('UTC');
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [locationStatus, setLocationStatus] = useState('');
  const [weatherStatus, setWeatherStatus] = useState('');
  const [storageStatus, setStorageStatus] = useState('');
  const [refresh, setRefresh] = useState(0);
  const requests = useRef({ generation: 0, gps: 0, controller: null as AbortController | null });
  const attempts = useRef(new Map<string, { at: number; success: boolean; weather: WeatherSnapshot | null }>());
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setVisible(!document.hidden);
    try {
      const saved = readEnvironmentPreferences(localStorage.getItem(ENVIRONMENT_KEY));
      setPrefs(saved);
      if (saved.location) {
        const cached = readWeatherCache(localStorage.getItem(WEATHER_KEY), saved.location);
        setWeather(cached);
        if (cached && cached.fetchedAt <= Date.now()) attempts.current.set(locationKey(saved.location), { at: cached.fetchedAt, success: true, weather: cached });
      }
    } catch { setStorageStatus('Environment settings cannot be saved in this browser.'); }
    setReady(true);
  }, []);
  const invalidate = useCallback(() => {
    requests.current.generation++;
    requests.current.gps++;
    requests.current.controller?.abort();
    requests.current.controller = null;
  }, []);
  const updatePrefs = useCallback((changes: Partial<EnvironmentPreferences>) => {
    invalidate();
    setLocationStatus('');
    setWeatherStatus('');
    setPrefs(p => ({ ...p, ...changes }));
  }, [invalidate]);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(ENVIRONMENT_KEY, JSON.stringify(prefs)); setStorageStatus(''); }
    catch { setStorageStatus('Environment settings cannot be saved in this browser.'); }
  }, [prefs, ready]);
  useEffect(() => {
    const sample = () => { setNow(Date.now()); setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); setVisible(!document.hidden); };
    const visibility = () => { if (document.hidden) { invalidate(); setWeatherStatus(''); setLocationStatus(''); } sample(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('focus', sample);
    const timer = visible && prefs.enabled ? window.setInterval(sample, 30000) : undefined;
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('focus', sample); };
  }, [visible, prefs.enabled, invalidate]);
  const location = activeLocation(prefs, zone);
  useEffect(() => {
    if (!ready || !visible || !prefs.enabled || !(prefs.dayNight || prefs.rain || prefs.seasons) || !location) return;
    const generation = ++requests.current.generation;
    const controller = new AbortController();
    requests.current.controller = controller;
    const key = locationKey(location), previous = attempts.current.get(key), time = Date.now();
    if (previous && time - previous.at < (previous.success ? 900000 : 60000)) return () => controller.abort();
    attempts.current.set(key, { at: time, success: false, weather: previous?.weather ?? null });
    setWeatherStatus('Updating weather…');
    fetchWeather(location, controller.signal).then(w => {
      if (controller.signal.aborted || generation !== requests.current.generation) return;
      attempts.current.set(key, { at: Date.now(), success: true, weather: w });
      setWeather(w); setNow(Date.now()); setWeatherStatus('');
      try { localStorage.setItem(WEATHER_KEY, JSON.stringify({ location: JSON.parse(key), weather: w })); } catch { setStorageStatus('Weather is available, but its cache cannot be saved.'); }
    }).catch(() => {
      if (!controller.signal.aborted && generation === requests.current.generation) setWeatherStatus('Weather unavailable. Local time still works; retry in a minute.');
    });
    return () => { controller.abort(); };
  }, [ready, visible, prefs, zone, now, refresh, location]);
  const chooseLocation = useCallback((next: EnvironmentLocation) => {
    const key = locationKey(next), cached = attempts.current.get(key)?.weather ?? null;
    invalidate(); setWeather(cached); setWeatherStatus(''); setLocationStatus('');
    try {
      if (cached) localStorage.setItem(WEATHER_KEY, JSON.stringify({ location: JSON.parse(key), weather: cached }));
      else localStorage.removeItem(WEATHER_KEY);
    } catch { /* Cache is optional. */ }
    setPrefs(p => ({ ...p, location: next }));
  }, [invalidate]);
  const clearLocation = useCallback(() => {
    invalidate(); setWeather(null); setWeatherStatus(''); setLocationStatus('');
    attempts.current.clear();
    try { localStorage.removeItem(WEATHER_KEY); } catch { setStorageStatus('The old weather cache could not be cleared.'); }
    setPrefs(p => ({ ...p, location: null }));
  }, [invalidate]);
  const useMyLocation = useCallback(() => {
    invalidate();
    const token = requests.current.gps;
    if (!navigator.geolocation) { setLocationStatus('Location is unavailable. You can choose a city below.'); return; }
    setLocationStatus('Finding your approximate location…');
    navigator.geolocation.getCurrentPosition(position => {
      if (token !== requests.current.gps) return;
      const currentZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      chooseLocation({ name: 'Your approximate location', latitude: Math.round(position.coords.latitude * 100) / 100, longitude: Math.round(position.coords.longitude * 100) / 100, timeZone: currentZone, source: 'device', deviceZoneAtSelection: currentZone });
    }, () => { if (token === requests.current.gps) setLocationStatus('Location was not available or permission was declined. You can choose a city below.'); }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
  }, [chooseLocation, invalidate]);
  useEffect(() => () => invalidate(), [invalidate]);
  const frame = useMemo(() => resolveEnvironment(now, zone, prefs, weather), [now, zone, prefs, weather]);
  return { prefs, frame, zone, locationStatus, weatherStatus, storageStatus, weather, locationActive: !!location, updatePrefs, chooseLocation, clearLocation, useMyLocation, refreshWeather: () => { setNow(Date.now()); setRefresh(n => n + 1); } };
}
export type EnvironmentController = ReturnType<typeof useEnvironment>;
