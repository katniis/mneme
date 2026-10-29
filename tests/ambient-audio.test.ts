import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSoundscape } from '../lib/ambient-audio.ts';

function graph() {
  const param = () => ({ value: 0, ramps: [] as [number, number][], cancelAndHoldAtTime() {}, cancelScheduledValues() {}, setValueAtTime(v: number) { this.value = v; }, linearRampToValueAtTime(v: number, at: number) { this.value = v; this.ramps.push([v, at]); }, exponentialRampToValueAtTime(v: number) { this.value = v; } });
  const nodes: { gain: ReturnType<typeof param>; disconnected: boolean }[] = [];
  function node() {
    const n = { gain: param(), frequency: param(), pan: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), buffer: null as unknown, onended: null as (() => void) | null, startAt: -1, stopAt: Infinity, disconnected: false,
      connect() {}, disconnect() { this.disconnected = true; }, start(at = 0) { this.startAt = at; }, stop(at = 0) { this.stopAt = at; } };
    nodes.push(n); return n;
  }
  const buffers: ReturnType<typeof node>[] = [], oscillators: ReturnType<typeof node>[] = [];
  const context = { currentTime: 0, destination: {}, createGain: node, createDynamicsCompressor: node, createStereoPanner: node,
    createOscillator() { const n = node(); oscillators.push(n); return n; },
    createBufferSource() { const n = node(); buffers.push(n); return n; } };
  return { context, buffers, oscillators, nodes, engine: createSoundscape(context as unknown as BaseAudioContext) };
}

test('music replaces noise, overlaps loop seams and bounds rapid replacements', () => {
  const g = graph(), a = { duration: 30 } as AudioBuffer, b = { duration: 40 } as AudioBuffer;
  assert.equal(g.oscillators.length, 4); assert.equal(g.buffers.length, 0);
  g.engine.setTrack(a, 0);
  assert.deepEqual(g.buffers.map(s => s.startAt), [0, 26]);
  assert.ok(g.nodes.some(n => n.gain.ramps.some(([v, at]) => v === 0 && at === 30)));
  g.context.currentTime = 30; g.buffers[0].onended!();
  assert.equal(g.buffers.at(-1)!.startAt, 52);
  for (let i = 0; i < 30; i++) {
    g.context.currentTime = 31 + i * .05; g.engine.setTrack(i % 2 ? a : b, g.context.currentTime);
    assert.ok(g.buffers.filter(s => !s.disconnected).length <= 2);
  }
  const pending = g.buffers.filter(s => !s.disconnected).map(s => s.onended);
  g.engine.setVolume(0, g.context.currentTime, 0);
  assert.equal(g.nodes[0].gain.value, 0);
  g.engine.dispose(); g.engine.dispose();
  for (const callback of pending) callback?.();
  assert.ok(g.nodes.every(n => n.disconnected));
  assert.ok(g.buffers.every(n => n.stopAt < Infinity || n.disconnected));
});

test('short music buffers never schedule a negative loop start', () => {
  const g = graph(); g.engine.setTrack({ duration: 2 } as AudioBuffer, 0);
  assert.deepEqual(g.buffers.map(s => s.startAt), [0, 1]);
  g.engine.dispose();
});
