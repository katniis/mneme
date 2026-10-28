'use client';
import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../../lib/weather';
import { TIME_MODES, SEASON_MODES, WEATHER_MODES, type EnvironmentLocation, type TimeMode, type SeasonMode, type WeatherMode } from '../../lib/environment';
import type { EnvironmentController } from './useEnvironment';
import styles from './EnvironmentPanel.module.css';

export default function EnvironmentPanel({ controller: c }: { controller: EnvironmentController }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<EnvironmentLocation[]>([]);
  const [status, setStatus] = useState('');
  const request = useRef<AbortController | null>(null);
  const available = c.prefs.enabled && (c.prefs.dayNight || c.prefs.seasons || c.prefs.rain);
  const label = (value: string) => value === 'local' ? 'Follow local' : value === 'neutral' ? 'Original' : value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
  const daylightSource = c.prefs.timeMode !== 'local' ? 'manual' : c.frame.weatherStatus === 'fresh' && c.weather?.timeZone === c.zone ? 'local solar data' : 'local clock';
  useEffect(() => { request.current?.abort(); setStatus(''); setPlaces([]); }, [available, c.prefs.location]);
  useEffect(() => () => request.current?.abort(), []);
  async function search(e: React.FormEvent) {
    e.preventDefault(); request.current?.abort();
    const pending = new AbortController(); request.current = pending;
    setPlaces([]); setStatus('Searching cities…');
    try {
      const results = await searchPlaces(query, c.zone, pending.signal);
      if (!pending.signal.aborted) { setPlaces(results); setStatus(results.length ? 'Choose your city below.' : 'No cities found. Try another name.'); }
    } catch { if (!pending.signal.aborted) setStatus('City search is unavailable. Try again later.'); }
  }
  return <div className={styles.panel}>
    <h2 id="panel-title">Your local world.</h2>
    <p>Follow your local world, or choose the surroundings you want.</p>
    <label className={styles.master}><input type="checkbox" checked={c.prefs.enabled} onChange={e => c.updatePrefs({ enabled: e.target.checked })} />Environment effects</label>
    <fieldset disabled={!c.prefs.enabled} className={styles.features}>
      <legend>Choose your surroundings</legend>
      {(['dayNight', 'seasons', 'rain'] as const).map((key, i) => <label key={key}><input type="checkbox" checked={c.prefs[key]} onChange={e => c.updatePrefs({ [key]: e.target.checked })} />{['Day and night', 'Seasonal island', 'Rain and snow'][i]}</label>)}
    </fieldset>
    <div className={styles.choices}>
      <label htmlFor="environment-time">Time of day</label>
      <select id="environment-time" disabled={!c.prefs.enabled || !c.prefs.dayNight} value={c.prefs.timeMode} onChange={e => c.updatePrefs({ timeMode: e.target.value as TimeMode })}>{TIME_MODES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
      <small>{!c.prefs.enabled || !c.prefs.dayNight ? 'Day and night is off.' : `${label(c.frame.period)} · ${daylightSource}`}</small>
      <label htmlFor="environment-season">Island season</label>
      <select id="environment-season" disabled={!c.prefs.enabled || !c.prefs.seasons} value={c.prefs.seasonMode} onChange={e => c.updatePrefs({ seasonMode: e.target.value as SeasonMode })}>{SEASON_MODES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
      <small>{!c.prefs.enabled || !c.prefs.seasons ? 'Seasonal island is off.' : `${label(c.frame.season)} · ${c.prefs.seasonMode === 'local' ? c.locationActive ? 'local calendar and latitude' : 'choose a location for local seasons' : 'manual'}`}</small>
      <label htmlFor="environment-weather">Weather</label>
      <select id="environment-weather" disabled={!available} value={c.prefs.weatherMode} onChange={e => c.updatePrefs({ weatherMode: e.target.value as WeatherMode })}>{WEATHER_MODES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
      <small>{!available ? 'Environment effects are off.' : c.prefs.weatherMode === 'local' ? `Local weather · ${c.frame.weatherStatus === 'fresh' ? 'current conditions' : c.frame.weatherStatus === 'needs-location' ? 'choose a location' : 'unavailable or out of date'}` : `${label(c.prefs.weatherMode)} · manual`}{available && !c.prefs.rain ? ' · rain and snow hidden' : ''}</small>
      <button type="button" onClick={() => c.updatePrefs({ timeMode: 'local', seasonMode: 'local', weatherMode: 'local' })}>Follow local for everything</button>
    </div>
    <p className={styles.status}>Your clock: <strong>{c.zone}</strong><br />{!available ? 'Environment effects are off.' : !c.weatherNeeded ? 'Local weather updates are paused for your manual choices.' : c.frame.weatherStatus === 'fresh' ? 'Using local weather data where requested.' : 'Local daylight uses an approximate 06:00–18:00 schedule when solar data is unavailable.'}</p>
    <h3>Weather location</h3>
    <p>Your approximate location is sent to Open-Meteo for local weather. Your letters stay in this browser.</p>
    <button type="button" disabled={!available || c.locationStatus.startsWith('Finding')} onClick={c.useMyLocation}>Use my location</button>
    <p role="status">{c.locationStatus}</p>
    <form onSubmit={search} className={styles.search}>
      <label htmlFor="environment-city">Or choose a city</label>
      <div><input id="environment-city" disabled={!available} value={query} minLength={2} maxLength={80} required placeholder="City name" onChange={e => setQuery(e.target.value)} /><button disabled={!available || query.trim().length < 2} type="submit">Search</button></div>
    </form>
    <p role="status">{status}</p>
    {places.length > 0 && <ul className={styles.results}>{places.map((place, i) => <li key={i}><button type="button" onClick={() => c.chooseLocation(place)}>{place.name}</button></li>)}</ul>}
    {c.prefs.location && <div className={styles.selected}>
      <strong>{c.prefs.location.name}</strong>
      <p>{!c.locationActive ? 'Your timezone changed. Update your location to use local weather.' : c.prefs.location.timeZone !== c.zone ? `Weather for this city; daylight follows ${c.zone}.` : c.prefs.location.timeZone}</p>
      <p>{c.prefs.location.latitude > -23.44 && c.prefs.location.latitude < 23.44 ? 'Evergreen tropical palette, based on latitude.' : 'Seasonal ground follows the local month and selected hemisphere.'}</p>
      <p>{!c.weatherNeeded ? 'Local weather updates are paused.' : c.frame.weatherStatus === 'stale' ? 'Local weather is out of date. Manual choices still apply.' : c.weather && c.frame.weatherStatus === 'fresh' ? `Model-derived conditions · updated ${new Date(c.weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Weather has not been updated yet.'}</p>
      <div className={styles.actions}><button type="button" disabled={!available || !c.locationActive || !c.weatherNeeded} onClick={c.refreshWeather}>Update weather</button><button type="button" onClick={c.clearLocation}>Clear location</button></div>
    </div>}
    {!c.prefs.location && <p>Choose a location for local seasons and actual weather. Manual choices need no location permission.</p>}
    <p role="status">{c.weatherStatus}</p><p role="status">{c.storageStatus}</p>
    <p className={styles.attribution}>Weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>. City data from <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>. Conditions are approximate and refresh at most every 15 minutes.</p>
  </div>;
}
