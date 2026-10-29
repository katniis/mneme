'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { searchPlaces } from '../../lib/weather';
import { TIME_MODES, SEASON_MODES, WEATHER_MODES, type EnvironmentLocation } from '../../lib/environment';
import type { EnvironmentController } from './useEnvironment';
import styles from './EnvironmentPanel.module.css';

function modeLabel(value: string) {
  return value === 'local' ? 'Auto' : value === 'neutral' ? 'Classic' : value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' ');
}

function Switch({ label, checked, disabled, compact, onChange }: { label: string; checked: boolean; disabled?: boolean; compact?: boolean; onChange: (checked: boolean) => void }) {
  return <label className={styles.switch}>
    <span className={compact ? styles.srOnly : undefined}>{label}</span>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    <span className={styles.track} aria-hidden="true" />
  </label>;
}

function ChoiceGroup<T extends string>({ name, title, value, options, disabled, onChange, caption, control }: { name: string; title: string; value: T; options: readonly T[]; disabled: boolean; onChange: (value: T) => void; caption: string; control?: ReactNode }) {
  const choice = (option: T) => <label key={option} className={styles.choice}>
    <input type="radio" name={name} value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)} />
    <span>{modeLabel(option)}</span>
  </label>;
  return <section className={styles.group} aria-labelledby={`${name}-title`}>
    <div className={styles.groupHeading}>
      <h3 id={`${name}-title`}>{title}</h3>
      {options.filter(option => option === 'local').map(choice)}
      {control}
    </div>
    <div className={`${styles.options} ${name === 'environment-time' ? styles.timeOptions : name === 'environment-weather' ? styles.weatherOptions : ''}`}>{options.filter(option => option !== 'local').map(choice)}</div>
    <p className={styles.caption}>{caption}</p>
  </section>;
}

export default function EnvironmentPanel({ controller: c }: { controller: EnvironmentController }) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<EnvironmentLocation[]>([]);
  const [status, setStatus] = useState('');
  const request = useRef<AbortController | null>(null);
  const available = c.prefs.enabled && (c.prefs.dayNight || c.prefs.seasons || c.prefs.rain || c.prefs.ambience);
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
    <h2 id="panel-title">Set the mood.</h2>
    <p>Choose the light, season, and weather. Auto keeps them in tune with your world.</p>
    <div className={styles.master}><Switch label="Atmosphere" checked={c.prefs.enabled} onChange={enabled => c.updatePrefs({ enabled })} /></div>
    <Switch label="Living details" checked={c.prefs.ambience} disabled={!c.prefs.enabled} onChange={ambience => c.updatePrefs({ ambience })} />
    <div className={styles.choices}>
      <ChoiceGroup name="environment-time" title="Time of day" value={c.prefs.timeMode} options={TIME_MODES} disabled={!c.prefs.enabled || !c.prefs.dayNight} onChange={timeMode => c.updatePrefs({ timeMode })}
        control={<Switch label="Day and night" compact checked={c.prefs.dayNight} disabled={!c.prefs.enabled} onChange={dayNight => c.updatePrefs({ dayNight })} />}
        caption={!c.prefs.enabled || !c.prefs.dayNight ? 'Day and night is off.' : c.prefs.timeMode === 'local' ? `${modeLabel(c.frame.period)} right now, using your time zone.` : `Keep the garden at ${c.prefs.timeMode}.`} />
      <ChoiceGroup name="environment-season" title="Season" value={c.prefs.seasonMode} options={SEASON_MODES} disabled={!c.prefs.enabled || !c.prefs.seasons} onChange={seasonMode => c.updatePrefs({ seasonMode })}
        control={<Switch label="Seasonal island" compact checked={c.prefs.seasons} disabled={!c.prefs.enabled} onChange={seasons => c.updatePrefs({ seasons })} />}
        caption={!c.prefs.enabled || !c.prefs.seasons ? 'Seasonal colours are off.' : c.prefs.seasonMode === 'local' ? c.locationActive ? `${modeLabel(c.frame.season)} colours, based on your location.` : 'Add a location to match the season.' : `${modeLabel(c.prefs.seasonMode)} colours, all year round.`} />
      <ChoiceGroup name="environment-weather" title="Weather" value={c.prefs.weatherMode} options={WEATHER_MODES} disabled={!available} onChange={weatherMode => c.updatePrefs({ weatherMode })}
        caption={!available ? 'Atmosphere is off.' : c.prefs.weatherMode === 'local' ? c.frame.weatherStatus === 'fresh' ? 'Current conditions near you.' : c.frame.weatherStatus === 'needs-location' ? 'Add a location to match your weather.' : 'Weather unavailable. You can choose a setting above.' : 'Your chosen weather, whatever the forecast.'} />
      <Switch label="Rain & snow" checked={c.prefs.rain} disabled={!c.prefs.enabled} onChange={rain => c.updatePrefs({ rain })} />
      <button className={styles.reset} type="button" onClick={() => c.updatePrefs({ timeMode: 'local', seasonMode: 'local', weatherMode: 'local' })}>Reset to automatic</button>
    </div>
    <p className={styles.status}>Time zone · <strong>{c.zone.replaceAll('_', ' ')}</strong><br />{!available ? 'Turn on atmosphere to change your surroundings.' : !c.weatherNeeded ? 'Automatic weather updates are paused.' : c.frame.weatherStatus === 'fresh' ? 'Weather is up to date.' : 'Auto uses your clock. Add a location for seasons and weather.'}</p>
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
