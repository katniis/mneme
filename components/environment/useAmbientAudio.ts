'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EnvironmentFrame } from '../../lib/environment';
import { DEFAULT_VOLUME, soundEvents, soundscapeProfile } from '../../lib/soundscape';
import { createSoundscape, type SoundscapeEngine } from '../../lib/ambient-audio';
import { SEASON_TRACKS } from '../../lib/seasonal-tracks';

type Session = { context: AudioContext; engine: SoundscapeEngine; timer?: number; pauseTimer?: number; suspending: Promise<void> | null; nextWindow: number; trackSrc: string; loadingSrc?: string; request?: AbortController };
const SEED = 1977;

export function useAmbientAudio(frame: EnvironmentFrame, available: boolean) {
  const [muted, setMutedState] = useState(false), [active, setActive] = useState(false);
  const [status, setStatus] = useState(''), [lost, setLost] = useState(false);
  const profile = useMemo(() => soundscapeProfile(frame), [frame.enabled, frame.period, frame.solarAngle, frame.daylight, frame.season, frame.rainIntensity, frame.cloudCover, frame.snow]);
  const latest = useRef({ frame, available, profile, muted }); latest.current = { frame, available, profile, muted };
  const session = useRef<Session | null>(null), closing = useRef<Promise<void> | null>(null);
  const wanted = useRef(true), mounted = useRef(true), generation = useRef(0), lostCanvas = useRef<HTMLCanvasElement | null>(null);
  const canPlay = useCallback(() => latest.current.available && latest.current.frame.enabled && !document.hidden && !lostCanvas.current, []);
  const loadTrack = useCallback(async (s: Session) => {
    const src = SEASON_TRACKS[latest.current.frame.season].src;
    if (s.loadingSrc === src && !s.request?.signal.aborted) return;
    s.request?.abort(); s.loadingSrc = undefined;
    setStatus('');
    if (s.trackSrc === src) return;
    const request = new AbortController(); s.request = request; s.loadingSrc = src;
    try {
      const response = await fetch(src, { signal: request.signal });
      if (!response.ok) throw new Error('Music unavailable');
      const bytes = await response.arrayBuffer();
      if (request.signal.aborted) return;
      const buffer = await s.context.decodeAudioData(bytes);
      if (request.signal.aborted || session.current !== s || !mounted.current || !wanted.current || !canPlay()) return;
      s.engine.setTrack(buffer, s.context.currentTime); s.trackSrc = src;
    } catch {
      if (!request.signal.aborted && session.current === s && mounted.current && wanted.current && canPlay())
        setStatus('The seasonal soundtrack is unavailable.');
    } finally {
      if (s.request === request) { s.request = undefined; s.loadingSrc = undefined; }
    }
  }, [canPlay]);
  const clearTimers = useCallback((s: Session) => { clearInterval(s.timer); clearTimeout(s.pauseTimer); s.timer = undefined; s.pauseTimer = undefined; }, []);
  const closeSession = useCallback((s: Session) => {
    s.request?.abort();
    clearTimers(s); s.context.onstatechange = null; s.engine.dispose();
    if (session.current === s) session.current = null;
    const pending = s.context.close().catch(() => {}); closing.current = pending;
    void pending.finally(() => { if (closing.current === pending) closing.current = null; });
  }, [clearTimers]);
  const pause = useCallback((reason = '') => {
    const token = ++generation.current, s = session.current;
    if (mounted.current) { setActive(false); setStatus(reason); }
    if (!s) return;
    s.request?.abort(); s.loadingSrc = undefined;
    clearTimers(s); s.engine.clearCalls(s.context.currentTime); s.engine.setVolume(0, s.context.currentTime, .25);
    s.pauseTimer = window.setTimeout(() => {
      if (session.current !== s || token !== generation.current) return;
      const pending = s.context.suspend().catch(() => {}); s.suspending = pending;
      void pending.finally(() => { if (s.suspending === pending) s.suspending = null; });
    }, 250);
  }, [clearTimers]);

  const resume = useCallback(async () => {
    if (!wanted.current || !canPlay()) return;
    const token = ++generation.current;
    try {
      if (closing.current) { await closing.current; if (token !== generation.current || !wanted.current || !canPlay()) return; }
      let s = session.current;
      if (s?.context.state === 'closed') { clearTimers(s); s.engine.dispose(); session.current = null; s = null; }
      if (!s) {
        if (typeof window.AudioContext !== 'function') { setStatus('Audio is unavailable in this browser.'); return; }
        const context = new AudioContext();
        try { s = { context, engine: createSoundscape(context), suspending: null, nextWindow: 0, trackSrc: '' }; }
        catch (error) { void context.close().catch(() => {}); throw error; }
        session.current = s;
        const owned = s;
        context.onstatechange = () => {
          if (!mounted.current || session.current !== owned || context.state === 'running') return;
          clearInterval(owned.timer); owned.timer = undefined; setActive(false);
          if (wanted.current && canPlay()) setStatus('Sound paused. Tap to resume.');
        };
      }
      clearTimers(s);
      if (s.suspending) { await s.suspending; if (token !== generation.current || !wanted.current || !canPlay()) return; }
      s.engine.setMusicMuted(latest.current.muted, s.context.currentTime);
      void loadTrack(s);
      await s.context.resume();
      if (token !== generation.current || session.current !== s || !wanted.current || !canPlay() || !mounted.current) return;
      if (s.context.state !== 'running') { setActive(false); setStatus('Sound paused. Tap to resume.'); return; }
      s.engine.setProfile(latest.current.profile, s.context.currentTime); s.engine.clearCalls(s.context.currentTime);
      s.engine.setVolume(DEFAULT_VOLUME, s.context.currentTime, .25);
      s.nextWindow = Math.floor(s.context.currentTime / 2);
      const tick = () => {
        if (session.current !== s || !wanted.current || !canPlay() || s.context.state !== 'running') return;
        const currentWindow = Math.floor(s.context.currentTime / 2), ahead = Math.floor((s.context.currentTime + .2) / 2);
        s.nextWindow = Math.max(s.nextWindow, currentWindow);
        while (s.nextWindow <= ahead) { s.engine.schedule(soundEvents(latest.current.profile, SEED, s.nextWindow), s.nextWindow * 2); s.nextWindow++; }
      };
      tick(); s.timer = window.setInterval(tick, 250); setActive(true); setStatus('');
    } catch {
      if (mounted.current && token === generation.current && wanted.current) { setActive(false); setStatus('Sound paused. Tap to resume.'); }
    }
  }, [canPlay, clearTimers, loadTrack]);

  const setMuted = useCallback((next: boolean) => {
    setMutedState(next); latest.current.muted = next;
    const s = session.current;
    s?.engine.setMusicMuted(next, s.context.currentTime);
    if (!next && s?.context.state !== 'running') void resume();
  }, [resume]);

  useEffect(() => { session.current?.engine.setProfile(profile, session.current.context.currentTime); }, [profile]);
  useEffect(() => {
    const s = session.current;
    if (s && wanted.current && canPlay() && s.context.state === 'running') void loadTrack(s);
  }, [frame.season, canPlay, loadTrack]);
  useEffect(() => {
    if (!wanted.current) return;
    if (canPlay()) void resume(); else pause(frame.enabled ? 'Sound paused while the garden is unavailable.' : 'Sound paused while atmosphere is off.');
  }, [frame.enabled, available, canPlay, resume, pause]);
  useEffect(() => {
    mounted.current = true; wanted.current = true;
    // Autoplay permissions vary; retry suspended audio inside the first user gesture.
    const unlock = () => { if (wanted.current && canPlay() && session.current?.context.state !== 'running') void resume(); };
    const visibility = () => { if (!wanted.current) return; if (canPlay()) void resume(); else pause(); };
    const contextLost = (event: Event) => {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      lostCanvas.current = event.target; setLost(true); if (wanted.current) pause('Sound paused while the garden is unavailable.');
    };
    const contextRestored = (event: Event) => { if (event.target === lostCanvas.current) { lostCanvas.current = null; setLost(false); if (wanted.current) void resume(); } };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('pointerdown', unlock, true); document.addEventListener('keydown', unlock, true);
    document.addEventListener('webglcontextlost', contextLost, true); document.addEventListener('webglcontextrestored', contextRestored, true);
    void resume();
    return () => {
      mounted.current = false; wanted.current = false; generation.current++;
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('pointerdown', unlock, true); document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('webglcontextlost', contextLost, true); document.removeEventListener('webglcontextrestored', contextRestored, true);
      if (session.current) closeSession(session.current);
    };
  }, [canPlay, pause, resume, closeSession]);
  const supported = typeof window !== 'undefined' && typeof window.AudioContext === 'function';
  return { muted, active, available: available && frame.enabled && !lost && supported,
    status: !supported ? 'Audio is unavailable in this browser.' : status,
    setMuted };
}
export type AmbientAudioController = ReturnType<typeof useAmbientAudio>;
