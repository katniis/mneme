import type { SoundscapeProfile, SoundEvent } from './soundscape.ts';

export type SoundscapeEngine = {
  setProfile(profile: SoundscapeProfile, at: number): void;
  setVolume(volume: number, at: number, seconds: number): void;
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

export function createSoundscape(context: BaseAudioContext, noise: Float32Array): SoundscapeEngine {
  const nodes: AudioNode[] = [], sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const gain = () => { const node = context.createGain(); nodes.push(node); node.gain.value = 0; return node; };
  const filter = (type: BiquadFilterType, frequency: number) => { const node = context.createBiquadFilter(); node.type = type; node.frequency.value = frequency; node.Q.value = .5; nodes.push(node); return node; };
  const master = gain(), wind = gain(), rain = gain(), birds = gain(), insects = gain();
  const compressor = context.createDynamicsCompressor(); nodes.push(compressor);
  compressor.threshold.value = -18; compressor.knee.value = 12; compressor.ratio.value = 4; compressor.attack.value = .02; compressor.release.value = .3;
  master.connect(compressor); compressor.connect(context.destination);
  for (const bus of [wind, rain, birds, insects]) bus.connect(master);
  const buffer = context.createBuffer(1, noise.length, context.sampleRate); buffer.getChannelData(0).set(noise);
  const breezeFilter = filter('lowpass', 500), windHighpass = filter('highpass', 60);
  const rainHighpass = filter('highpass', 150), rainLowpass = filter('lowpass', 6500);
  for (const [i, entry] of [[breezeFilter, windHighpass, wind], [rainHighpass, rainLowpass, rain]].entries()) {
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    source.connect(entry[0]); entry[0].connect(entry[1]); entry[1].connect(entry[2]); source.start(0, i * 2);
    sources.push(source); nodes.push(source);
  }
  const voices = Array.from({ length: 4 }, (_, i) => {
    const oscillator = context.createOscillator(), envelope = gain(), pan = context.createStereoPanner();
    oscillator.type = 'sine'; oscillator.frequency.value = i < 2 ? 2400 : 4200;
    oscillator.connect(envelope); envelope.connect(pan); pan.connect(i < 2 ? birds : insects); oscillator.start();
    nodes.push(oscillator, pan); sources.push(oscillator);
    return { oscillator, envelope, pan };
  });
  let initialized = false, disposed = false;
  const clearVoice = (voice: typeof voices[number], at: number) => {
    ramp(voice.envelope.gain, 0, at, .008);
    ramp(voice.oscillator.frequency, voice.oscillator.frequency.value, at, 0);
    ramp(voice.pan.pan, voice.pan.pan.value, at, 0);
  };
  return {
    setProfile(profile, at) {
      if (disposed) return;
      const seconds = initialized ? 4 : 0; initialized = true;
      ramp(wind.gain, profile.wind, at, seconds); ramp(rain.gain, profile.rain, at, seconds);
      ramp(birds.gain, profile.birds, at, seconds); ramp(insects.gain, profile.insects, at, seconds);
      ramp(breezeFilter.frequency, profile.filterHz, at, seconds);
      voices.forEach((voice, i) => { if ((i < 2 ? profile.birds : profile.insects) === 0) clearVoice(voice, at); });
    },
    setVolume(volume, at, seconds) { if (!disposed) ramp(master.gain, .18 * Math.max(0, Math.min(1, volume)), at, seconds); },
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
      for (const source of sources) source.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}
