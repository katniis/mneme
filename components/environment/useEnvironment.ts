'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ENVIRONMENT,
  ENVIRONMENT_KEY,
  WEATHER_KEY,
  isValidWeatherSnapshot,
  readEnvironmentPreferences,
  resolveEnvironment,
  type EnvironmentFrame,
  type EnvironmentLocation,
  type EnvironmentPreferences,
  type WeatherSnapshot,
} from '../../lib/environment';
import { fetchWeather } from '../../lib/weather';

export type LocationStatus = 'none' | 'pending' | 'ready' | 'denied' | 'unavailable' | 'needs-update';

export type EnvironmentController = {
  prefs: EnvironmentPreferences;
  frame: EnvironmentFrame;
  weather: WeatherSnapshot | null;
  deviceZone: string;
  locationStatus: LocationStatus;
  weatherError: string | null;
  updatePrefs: (changes: Partial<EnvironmentPreferences>) => void;
  useMyLocation: () => void;
  chooseLocation: (location: EnvironmentLocation) => void;
  clearLocation: () => void;
  refreshWeather: () => void;
};

const POLL_MS = 900000;
const SAMPLE_MS = 30000;
const TIMEOUT_MS = 10000;
const COOLDOWN_MS = 60000;

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function cacheKey(location: EnvironmentLocation): string {
  return `${location.latitude},${location.longitude},${location.timeZone}`;
}

function readCache(location: EnvironmentLocation): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(WEATHER_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { key?: string; snapshot?: WeatherSnapshot };
    if (data.key !== cacheKey(location) || !data.snapshot) return null;
    return isValidWeatherSnapshot(data.snapshot, Date.now()) ? data.snapshot : null;
  } catch {
    return null;
  }
}

export default function useEnvironment(): EnvironmentController {
  const [prefs, setPrefs] = useState<EnvironmentPreferences>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_ENVIRONMENT };
    try {
      return readEnvironmentPreferences(localStorage.getItem(ENVIRONMENT_KEY));
    } catch {
      return { ...DEFAULT_ENVIRONMENT };
    }
  });
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [deviceZone, setDeviceZone] = useState(browserZone);
  const [baseStatus, setBaseStatus] = useState<LocationStatus>('none');
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const generation = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const lastFailure = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  const locationActive = !prefs.location || prefs.location.source === 'city' || prefs.location.deviceZoneAtSelection === deviceZone;
  const needsUpdate = Boolean(prefs.location && prefs.location.source === 'device' && !locationActive);
  const locationStatus: LocationStatus = needsUpdate ? 'needs-update' : baseStatus;

  useEffect(() => {
    try {
      localStorage.setItem(ENVIRONMENT_KEY, JSON.stringify(prefs));
    } catch {
      // A failed preference write must never affect letters or the garden.
    }
  }, [prefs]);

  useEffect(() => {
    const sample = () => {
      setDeviceZone(browserZone());
      if (!document.hidden) setNowMs(Date.now());
    };
    const timer = window.setInterval(sample, SAMPLE_MS);
    document.addEventListener('visibilitychange', sample);
    window.addEventListener('focus', sample);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sample);
      window.removeEventListener('focus', sample);
    };
  }, []);

  const updatePrefs = useCallback((changes: Partial<EnvironmentPreferences>) => {
    setPrefs((current) => ({ ...current, ...changes }));
  }, []);

  useEffect(() => {
    const location = prefs.location;
    const needsData = prefs.enabled && Boolean(location) && locationActive && (prefs.dayNight || prefs.seasons || prefs.rain);
    generation.current += 1;
    const gen = generation.current;
    abortRef.current?.abort();
    if (!needsData || !location) {
      refreshRef.current = () => {};
      return;
    }
    setWeather((current) => current ?? readCache(location));
    const run = async (manual: boolean) => {
      if (inFlight.current || document.hidden) return;
      if (!manual && Date.now() - lastFailure.current < COOLDOWN_MS && lastFailure.current > 0) return;
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
      inFlight.current = true;
      try {
        const snapshot = await fetchWeather(location, controller.signal);
        if (generation.current !== gen) return;
        setWeather(snapshot);
        setWeatherError(null);
        try {
          localStorage.setItem(WEATHER_KEY, JSON.stringify({ key: cacheKey(location), snapshot }));
        } catch {
          // Cache failure only loses offline reuse.
        }
      } catch (error) {
        if (generation.current !== gen || controller.signal.aborted) return;
        lastFailure.current = Date.now();
        setWeatherError(error instanceof Error ? error.message : 'Weather is unavailable right now.');
      } finally {
        window.clearTimeout(timeout);
        inFlight.current = false;
      }
    };
    refreshRef.current = () => void run(true);
    void run(false);
    const timer = window.setInterval(() => void run(false), POLL_MS);
    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [prefs.enabled, prefs.location, prefs.dayNight, prefs.seasons, prefs.rain, locationActive]);

  const chooseLocation = useCallback((location: EnvironmentLocation) => {
    generation.current += 1;
    abortRef.current?.abort();
    setWeather(readCache(location));
    setWeatherError(null);
    setBaseStatus('ready');
    setPrefs((current) => ({ ...current, location }));
  }, []);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setBaseStatus('unavailable');
      return;
    }
    setBaseStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const zone = browserZone();
        setDeviceZone(zone);
        chooseLocation({
          name: 'My approximate location',
          latitude: Math.round(position.coords.latitude * 100) / 100,
          longitude: Math.round(position.coords.longitude * 100) / 100,
          timeZone: zone,
          source: 'device',
          deviceZoneAtSelection: zone,
        });
      },
      (error) => setBaseStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [chooseLocation]);

  const clearLocation = useCallback(() => {
    generation.current += 1;
    abortRef.current?.abort();
    try {
      localStorage.removeItem(WEATHER_KEY);
    } catch {
      // Nothing else depends on this cache.
    }
    setWeather(null);
    setWeatherError(null);
    setBaseStatus('none');
    setPrefs((current) => ({ ...current, location: null }));
  }, []);

  const refreshWeather = useCallback(() => refreshRef.current(), []);
  const frame = useMemo(
    () => resolveEnvironment(nowMs, deviceZone, prefs, locationActive ? weather : null),
    [nowMs, deviceZone, prefs, weather, locationActive],
  );

  return { prefs, frame, weather, deviceZone, locationStatus, weatherError, updatePrefs, useMyLocation, chooseLocation, clearLocation, refreshWeather };
}
