'use client';
import { useState } from 'react';
import Icon from '../Icon';
import styles from './EnvironmentPanel.module.css';
import type { EnvironmentLocation } from '../../lib/environment';
import { searchPlaces } from '../../lib/weather';
import type { EnvironmentController } from './useEnvironment';

function weatherStatusText(controller: EnvironmentController): string {
  if (controller.weatherError) return controller.weatherError;
  switch (controller.frame.weatherStatus) {
    case 'off': return 'Environment effects are off.';
    case 'needs-location': return 'Add a location for local weather, seasons, and rain.';
    case 'fresh': return controller.weather ? `Updated ${new Date(controller.weather.fetchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Weather is approximate model data, not a live sensor.` : 'Weather updated.';
    case 'stale': return 'Showing the last known conditions. Rain and snow are paused until weather refreshes.';
    default: return 'Weather is unavailable right now. Local daylight still follows your clock.';
  }
}

export default function EnvironmentPanel({ controller }: { controller: EnvironmentController }) {
  const { prefs, deviceZone } = controller;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EnvironmentLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searched, setSearched] = useState(false);
  const off = !prefs.enabled;
  const foreignCity = prefs.location?.source === 'city' && prefs.location.timeZone !== deviceZone;

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setSearchError('');
    setSearched(false);
    if (query.trim().length < 2) {
      setSearchError('Type at least two characters to search.');
      return;
    }
    setSearching(true);
    try {
      const places = await searchPlaces(query, deviceZone, new AbortController().signal);
      setResults(places);
      setSearched(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Place search failed.');
    } finally {
      setSearching(false);
    }
  };

  const choose = (place: EnvironmentLocation) => {
    controller.chooseLocation(place);
    setResults([]);
    setQuery('');
    setSearched(false);
  };

  return (
    <div className={styles.panel}>
      <h2 id="panel-title">Your local world.</h2>
      <p className={styles.intro}>Daylight follows your real clock. Weather and seasons are optional, and always separate from letter growth time.</p>

      <label className={styles.master}>
        <input type="checkbox" checked={prefs.enabled} onChange={(e) => controller.updatePrefs({ enabled: e.target.checked })} />
        <span><strong>Environment effects</strong><small>Turn everything off to return to the neutral garden.</small></span>
      </label>

      <fieldset className={styles.features} disabled={off}>
        <legend>Choose what follows your world</legend>
        <label><input type="checkbox" checked={prefs.dayNight} onChange={(e) => controller.updatePrefs({ dayNight: e.target.checked })} /><span>Day and night<small>Sun, moon, and sky follow your browser time.</small></span></label>
        <label><input type="checkbox" checked={prefs.seasons} onChange={(e) => controller.updatePrefs({ seasons: e.target.checked })} /><span>Seasonal island<small>Ground colours follow the season where you are.</small></span></label>
        <label><input type="checkbox" checked={prefs.rain} onChange={(e) => controller.updatePrefs({ rain: e.target.checked })} /><span>Local rain<small>Rain appears only when local weather reports it.</small></span></label>
      </fieldset>

      <p className={styles.zone}>Your browser timezone: <strong>{deviceZone}</strong></p>
      <p className={styles.status} role="status">{weatherStatusText(controller)}</p>
      {controller.weather && prefs.location && (
        <p className={styles.summary}>{prefs.location.name}: {Math.round(controller.weather.temperatureC)}°C, {controller.weather.rainMm > 0 ? `${controller.weather.rainMm.toFixed(1)} mm recent rain` : 'no recent rain reported'}.</p>
      )}
      {foreignCity && <p className={styles.hint}>Weather is labelled for {prefs.location?.name}. Daylight still follows your browser timezone, not that city.</p>}

      {!prefs.location ? (
        <div className={styles.setup}>
          <p className={styles.disclosure}>Your approximate location is sent to Open-Meteo for local weather. Your letters stay in this browser.</p>
          <button type="button" className={styles.primary} disabled={off || controller.locationStatus === 'pending'} onClick={controller.useMyLocation}>
            <Icon name="environment" size={17} /> {controller.locationStatus === 'pending' ? 'Finding your location…' : 'Use my location'}
          </button>
          {controller.locationStatus === 'denied' && <p className={styles.error} role="alert">Location was not shared. You can still choose a city below.</p>}
          {controller.locationStatus === 'unavailable' && <p className={styles.error} role="alert">Location is unavailable here. You can still choose a city below.</p>}
          <form className={styles.search} onSubmit={search}>
            <label htmlFor="city-search">Or choose a city</label>
            <div>
              <input id="city-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for a city" disabled={off} autoComplete="off" />
              <button type="submit" disabled={off || searching}>{searching ? 'Searching…' : 'Search'}</button>
            </div>
          </form>
          {searchError && <p className={styles.error} role="alert">{searchError}</p>}
          {searched && !results.length && !searchError && <p className={styles.hint}>No places found. Try another spelling.</p>}
          {results.length > 0 && (
            <ul className={styles.results}>
              {results.map((place) => (
                <li key={`${place.name}-${place.latitude}-${place.longitude}`}>
                  <button type="button" onClick={() => choose(place)}>{place.name}<small>{place.timeZone}</small></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.setup}>
          <p className={styles.current}><strong>{prefs.location.name}</strong><small>{prefs.location.timeZone} · coordinates rounded for privacy</small></p>
          {controller.locationStatus === 'needs-update' && <p className={styles.error} role="alert">Your browser timezone changed. Use my location again to refresh a device location, or clear it and choose a city.</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled={off} onClick={controller.refreshWeather}>Update weather</button>
            <button type="button" className={styles.secondary} disabled={off} onClick={controller.useMyLocation}>Use my location</button>
            <button type="button" className={styles.secondary} onClick={controller.clearLocation}>Clear location</button>
          </div>
        </div>
      )}

      <p className={styles.attribution}>Weather by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>, place data from <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>. Only rounded coordinates are sent; no letter text ever leaves this browser.</p>
    </div>
  );
}
