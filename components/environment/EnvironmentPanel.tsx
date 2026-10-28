'use client';
import { useEffect, useRef, useState } from 'react';
import { searchPlaces } from '../../lib/weather';
import type { EnvironmentLocation } from '../../lib/environment';
import type { EnvironmentController } from './useEnvironment';
import styles from './EnvironmentPanel.module.css';

export default function EnvironmentPanel({ controller: c }: { controller: EnvironmentController }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<EnvironmentLocation[]>([]);
  const [status, setStatus] = useState('');
  const request = useRef<AbortController | null>(null);
  const available = c.prefs.enabled && (c.prefs.dayNight || c.prefs.seasons || c.prefs.rain);
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
    <p>Let the garden follow the day and weather around you.</p>
    <label className={styles.master}><input type="checkbox" checked={c.prefs.enabled} onChange={e => c.updatePrefs({ enabled: e.target.checked })} />Environment effects</label>
    <fieldset disabled={!c.prefs.enabled} className={styles.features}>
      <legend>Choose your surroundings</legend>
      {(['dayNight', 'seasons', 'rain'] as const).map((key, i) => <label key={key}><input type="checkbox" checked={c.prefs[key]} onChange={e => c.updatePrefs({ [key]: e.target.checked })} />{['Day and night', 'Seasonal island', 'Local rain'][i]}</label>)}
    </fieldset>
    <p className={styles.status}>Your clock: <strong>{c.zone}</strong><br />{!available ? 'Environment effects are off.' : c.frame.source === 'local-weather' ? 'Using local weather data.' : 'Daylight uses an approximate 06:00–18:00 local schedule.'}</p>
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
      <p>{c.frame.weatherStatus === 'stale' ? 'Weather is out of date. Rain and snow are paused.' : c.weather && c.frame.weatherStatus === 'fresh' ? `Model-derived conditions · updated ${new Date(c.weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Weather has not been updated yet.'}</p>
      <div className={styles.actions}><button type="button" disabled={!available || !c.locationActive} onClick={c.refreshWeather}>Update weather</button><button type="button" onClick={c.clearLocation}>Clear location</button></div>
    </div>}
    {!c.prefs.location && <p>Choose a location for seasonal colours and actual weather. No location permission is needed to use the garden.</p>}
    <p role="status">{c.weatherStatus}</p><p role="status">{c.storageStatus}</p>
    <p className={styles.attribution}>Weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>. City data from <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>. Conditions are approximate and refresh at most every 15 minutes.</p>
  </div>;
}
