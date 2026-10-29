'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EnvironmentFrame } from '../../lib/environment';
import { AUDIO_KEY, DEFAULT_VOLUME, makeNoise, readAudioSettings, soundEvents, soundscapeProfile } from '../../lib/soundscape';
import { createSoundscape, type SoundscapeEngine } from '../../lib/ambient-audio';

type Session = { context: AudioContext; engine: SoundscapeEngine; timer?: number; pauseTimer?: number; suspending: Promise<void> | null; nextWindow: number };
const SEED = 1977;

export function useAmbientAudio(frame: EnvironmentFrame, available: boolean) {
  const [enabled, setEnabledState] = useState(false), [active, setActive] = useState(false), [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [status, setStatus] = useState(''), [storageStatus, setStorageStatus] = useState(''), [lost, setLost] = useState(false);
  const profile = useMemo(() => soundscapeProfile(frame), [frame.enabled, frame.period, frame.solarAngle, frame.daylight, frame.season, frame.rainIntensity, frame.cloudCover, frame.snow]);
  const latest = useRef({ frame, available, profile, volume }); latest.current = { frame, available, profile, volume };
  const session = useRef<Session | null>(null), closing = useRef<Promise<void> | null>(null);
  const wanted = useRef(false), mounted = useRef(true), generation = useRef(0), lostCanvas = useRef<HTMLCanvasElement | null>(null);
  const canPlay = useCallback(() => latest.current.available && latest.current.frame.enabled && !document.hidden && !lostCanvas.current, []);
  const clearTimers = useCallback((s: Session) => { clearInterval(s.timer); clearTimeout(s.pauseTimer); s.timer = undefined; s.pauseTimer = undefined; }, []);
  const closeSession = useCallback((s: Session) => {
    clearTimers(s); s.context.onstatechange = null; s.engine.dispose();
    if (session.current === s) session.current = null;
    const pending = s.context.close().catch(() => {}); closing.current = pending;
    void pending.finally(() => { if (closing.current === pending) closing.current = null; });
  }, [clearTimers]);
  const pause = useCallback((close: boolean, reason = '') => {
    const token = ++generation.current, s = session.current;
    if (mounted.current) { setActive(false); setStatus(reason); }
    if (!s) return;
    clearTimers(s); s.engine.clearCalls(s.context.currentTime); s.engine.setVolume(0, s.context.currentTime, .25);
    s.pauseTimer = window.setTimeout(() => {
      if (session.current !== s || token !== generation.current) return;
      if (close) closeSession(s);
      else {
        const pending = s.context.suspend().catch(() => {}); s.suspending = pending;
        void pending.finally(() => { if (s.suspending === pending) s.suspending = null; });
      }
    }, 250);
  }, [clearTimers, closeSession]);

  const resume = useCallback(async () => {
    if (!wanted.current || !canPlay()) return;
    const token = ++generation.current;
    try {
      if (closing.current) { await closing.current; if (token !== generation.current || !wanted.current || !canPlay()) return; }
      let s = session.current;
      if (s?.context.state === 'closed') { clearTimers(s); s.engine.dispose(); session.current = null; s = null; }
      if (!s) {
        if (typeof window.AudioContext !== 'function') { setStatus('Nature sounds are unavailable in this browser.'); return; }
        // The first context and resume call happen inside the enable gesture, before any await.
        const context = new AudioContext();
        try { s = { context, engine: createSoundscape(context, makeNoise(SEED, context.sampleRate * 4)), suspending: null, nextWindow: 0 }; }
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
      await s.context.resume();
      if (token !== generation.current || session.current !== s || !wanted.current || !canPlay() || !mounted.current) return;
      if (s.context.state !== 'running') { setActive(false); setStatus('Sound paused. Tap to resume.'); return; }
      s.engine.setProfile(latest.current.profile, s.context.currentTime); s.engine.clearCalls(s.context.currentTime);
      s.engine.setVolume(latest.current.volume, s.context.currentTime, .25);
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
  }, [canPlay, clearTimers]);

  const setEnabled = useCallback(async (next: boolean) => {
    wanted.current = next; setEnabledState(next);
    if (next) await resume(); else pause(true);
  }, [pause, resume]);
  const setVolume = useCallback((value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.max(0, Math.min(1, value)); setVolumeState(next); latest.current.volume = next;
    const s = session.current; if (s && canPlay() && s.context.state === 'running') s.engine.setVolume(next, s.context.currentTime, .1);
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify({ version: 1, volume: next })); setStorageStatus(''); }
    catch { setStorageStatus('Your volume cannot be saved in this browser.'); }
  }, [canPlay]);

  useEffect(() => { session.current?.engine.setProfile(profile, session.current.context.currentTime); }, [profile]);
  useEffect(() => {
    if (!wanted.current) return;
    if (canPlay()) void resume(); else pause(false, frame.enabled ? 'Sound paused while the garden is unavailable.' : 'Sound paused while atmosphere is off.');
  }, [frame.enabled, available, canPlay, resume, pause]);
  useEffect(() => {
    mounted.current = true;
    try { const saved = readAudioSettings(localStorage.getItem(AUDIO_KEY)); setVolumeState(saved.volume); latest.current.volume = saved.volume; }
    catch { setStorageStatus('Your volume cannot be saved in this browser.'); }
    const visibility = () => { if (!wanted.current) return; if (canPlay()) void resume(); else pause(false); };
    const contextLost = (event: Event) => {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      lostCanvas.current = event.target; setLost(true); if (wanted.current) pause(false, 'Sound paused while the garden is unavailable.');
    };
    const contextRestored = (event: Event) => { if (event.target === lostCanvas.current) { lostCanvas.current = null; setLost(false); if (wanted.current) void resume(); } };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('webglcontextlost', contextLost, true); document.addEventListener('webglcontextrestored', contextRestored, true);
    return () => {
      mounted.current = false; wanted.current = false; generation.current++;
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('webglcontextlost', contextLost, true); document.removeEventListener('webglcontextrestored', contextRestored, true);
      if (session.current) closeSession(session.current);
    };
  }, [canPlay, pause, resume, closeSession]);
  const supported = typeof window !== 'undefined' && typeof window.AudioContext === 'function';
  return { enabled, active, volume, available: available && frame.enabled && !lost && supported,
    status: !supported ? 'Nature sounds are unavailable in this browser.' : status || storageStatus,
    setEnabled, setVolume, resume };
}
export type AmbientAudioController = ReturnType<typeof useAmbientAudio>;
