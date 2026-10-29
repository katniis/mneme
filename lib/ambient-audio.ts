import type { SoundscapeProfile, SoundEvent } from './soundscape.ts';

export type SoundscapeEngine = {
  setTrack(buffer: AudioBuffer, at: number): void;
  setProfile(profile: SoundscapeProfile, at: number): void;
  setVolume(volume: number, at: number, seconds: number): void;
  setMusicMuted(muted: boolean, at: number): void;
  schedule(events: readonly SoundEvent[], windowStart: number): void;
  clearCalls(at: number): void;
  dispose(): void;
};

function ramp(param: AudioParam, value: number, at: number, seconds: number) {
  if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(at);
  else { const current = param.value; param.cancelScheduledValues(at); param.setValueAtTime(current, at); }
  if (seconds <= 0) param.setValueAtTime(value, at);
  else param.linearRampToValueAtTime(value, at + seconds);
}

export function createSoundscape(context: BaseAudioContext): SoundscapeEngine {
  const nodes: AudioNode[] = [], sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const gain = () => { const node = context.createGain(); nodes.push(node); node.gain.value = 0; return node; };
  const master = gain(), birds = gain(), insects = gain(), musicBus = gain();
  musicBus.gain.value = 1;
  const compressor = context.createDynamicsCompressor(); nodes.push(compressor);
  compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 4; compressor.attack.value = .02; compressor.release.value = .3;
  master.connect(compressor); compressor.connect(context.destination);
  birds.connect(master); insects.connect(master); musicBus.connect(master);
  const voices = Array.from({ length: 4 }, (_, i) => {
    const oscillator = context.createOscillator(), envelope = gain(), pan = context.createStereoPanner();
    oscillator.type = 'sine'; oscillator.frequency.value = i < 2 ? 2400 : 4200;
    oscillator.connect(envelope); envelope.connect(pan); pan.connect(i < 2 ? birds : insects); oscillator.start();
    nodes.push(oscillator, pan); sources.push(oscillator);
    return { oscillator, envelope, pan };
  });
  let initialized = false, disposed = false;
  type Music = { source: AudioBufferSourceNode; gain: GainNode; start: number; generation: number };
  const music = new Set<Music>();
  let track: AudioBuffer | null = null, generation = 0;
  const removeMusic = (entry: Music) => {
    entry.source.onended = null; entry.source.stop(); entry.source.disconnect(); entry.gain.disconnect(); music.delete(entry);
  };
  const startMusic = (buffer: AudioBuffer, at: number) => {
    const source = context.createBufferSource(), envelope = context.createGain();
    const overlap = Math.min(4, buffer.duration / 2), end = at + buffer.duration;
    source.buffer = buffer; source.connect(envelope); envelope.connect(musicBus);
    envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(.35, at + overlap);
    envelope.gain.setValueAtTime(.35, end - overlap); envelope.gain.linearRampToValueAtTime(0, end);
    const entry: Music = { source, gain: envelope, start: at, generation };
    music.add(entry);
    source.onended = () => {
      source.onended = null; source.disconnect(); envelope.disconnect(); music.delete(entry);
      queueLoop();
    };
    source.start(at);
  };
  const queueLoop = () => {
    if (disposed || !track || music.size >= 2) return;
    const last = [...music].filter(e => e.generation === generation).sort((a, b) => b.start - a.start)[0];
    if (last) startMusic(track, Math.max(context.currentTime, last.start + track.duration - Math.min(4, track.duration / 2)));
  };
  const clearVoice = (voice: typeof voices[number], at: number) => {
    ramp(voice.envelope.gain, 0, at, .008);
    ramp(voice.oscillator.frequency, voice.oscillator.frequency.value, at, 0);
    ramp(voice.pan.pan, voice.pan.pan.value, at, 0);
  };
  return {
    setTrack(buffer, at) {
      if (disposed || !Number.isFinite(buffer.duration) || buffer.duration <= 0) return;
      generation++; track = buffer;
      const outgoing = [...music].filter(e => e.start <= at).sort((a, b) => b.start - a.start)[0];
      for (const entry of music) if (entry !== outgoing) removeMusic(entry);
      if (outgoing) {
        ramp(outgoing.gain.gain, 0, at, Math.min(4, buffer.duration / 2));
        outgoing.source.stop(at + Math.min(4, buffer.duration / 2));
      }
      startMusic(buffer, at); queueLoop();
    },
    setProfile(profile, at) {
      if (disposed) return;
      const seconds = initialized ? 4 : 0; initialized = true;
      ramp(birds.gain, profile.birds, at, seconds); ramp(insects.gain, profile.insects, at, seconds);
      voices.forEach((voice, i) => { if ((i < 2 ? profile.birds : profile.insects) === 0) clearVoice(voice, at); });
    },
    setVolume(volume, at, seconds) { if (!disposed) ramp(master.gain, .18 * Math.max(0, Math.min(1, volume)), at, seconds); },
    setMusicMuted(muted, at) { if (!disposed) ramp(musicBus.gain, muted ? 0 : 1, at, .15); },
    schedule(events, windowStart) {
      if (disposed) return;
      for (const event of events) {
        const at = windowStart + event.at;
        if (at < context.currentTime) continue;
        const { oscillator, envelope, pan } = voices[event.voice];
        oscillator.frequency.setValueAtTime(event.fromHz, at); oscillator.frequency.exponentialRampToValueAtTime(event.toHz, at + event.duration * .7);
        pan.pan.setValueAtTime(event.pan, at);
        envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(event.gain, at + .008);
        envelope.gain.linearRampToValueAtTime(event.gain * .6, at + event.duration * .7); envelope.gain.linearRampToValueAtTime(0, at + event.duration);
      }
    },
    clearCalls(at) { if (!disposed) voices.forEach(voice => clearVoice(voice, at)); },
    dispose() {
      if (disposed) return; disposed = true;
      track = null;
      for (const entry of music) removeMusic(entry);
      for (const source of sources) source.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}
