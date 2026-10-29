# Seasonal Sound and Wildlife Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace noisy synthesized ambience with seasonal instrumental tracks, enrich the existing chirps, add small wildlife, and allow snow only in winter.

**Architecture:** Reuse the existing audio hook/engine for lifecycle and mixing, with local music buffers replacing continuous noise. Extend the existing seeded ambience pools; enforce snow eligibility once in the environment resolver and consume the same decision in the picker. No garden-state changes.

**Tech Stack:** Node.js 24, TypeScript, Next.js, React, Three.js / React Three Fiber, Web Audio, CSS Modules, `node:test`. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-10-29-seasonal-sound-and-wildlife-design.md` (proposed; review with this plan).

## Global Constraints

- Target `C:/Users/jbree/.codex/worktrees/local-environment/mneme`, inspected on `main` at `ad7513f`; preserve the existing `next-env.d.ts` edit. The original chat checkout is not the implementation baseline.
- Read target `AGENTS.md` and bundled Next.js client-component/static-public-file guides before implementation. Use Node.js 24, two spaces, single quotes, semicolons.
- Preserve letters, stored seeds, tree positions, retained plots, and the shared simulation clock. Use synthetic letters only in artifacts.
- “Gentle instrumental music + animal/insect sounds” is confirmed. Track choices and wildlife tuning in the spec are proposed defaults.
- Sound remains Off on reload and remembers volume only. Keep explicit gesture, fades, hidden/master/WebGL pause, and Off/unmount teardown. Reduced motion and Living details do not control sound.
- Firefly ceilings: 64 desktop / 24 mobile. Butterfly ceilings: 12 / 4. Bird ceilings: 8 / 3. Wildlife density floor: 0.35. Base spans: 0.055, 0.07, 0.10 respectively. Distance multiplier capped at 12.
- Keep existing motes/debris behavior; maximum five decorative draws, four call oscillators, two music sources. No new lights/models, dependencies, microphone access, backend, or streaming requests.
- Snow requires resolved winter; keep existing switches and fresh-weather validation. Winter + Clear stays clear. Preserve saved choices rather than silently changing season/weather.
- The user-requested recorded music and winter-bound snow override the old generated-only music and independent-Snow rules; all other repository invariants still apply.
- Docs are ignored by this repository. Keep the plan/spec readable locally; do not change `.gitignore`. Stage only task-owned files if committing, using explicit `git add -f` for these docs when needed.

## Review Focus

- Rapid season changes or Off during fetch/decode: obsolete music must never start; no more than two music sources (Task 2 lifecycle checks).
- Missing/invalid audio and blocked resume: chirps and the garden remain usable, with status and retry instead of a broken session (Task 2).
- Legacy/manual Snow outside winter, local snow in autumn, seasons-off and hemisphere changes: no falling snow or caps outside resolved winter (Task 1).
- Empty/small/49-plot islands, camera zoom and the 700px breakpoint: wildlife stays small, bounded, visible where eligible, and does not reset existing particles (Task 4).
- Reload, hidden tabs, reduced motion, planting and deletion: saved letters/land remain unchanged, audio does not autoplay, animation does not catch up (Tasks 2 and 4–5).

---

## File responsibilities

| Files | Responsibility |
| --- | --- |
| `lib/environment.ts`; `tests/environment.test.ts` | Shared winter-only snow rule and regressions replacing old independent-snow expectations |
| `components/environment/EnvironmentPanel.tsx` | Snow eligibility/caption, updated sound description, music credits |
| `lib/seasonal-tracks.ts` (new); `public/audio/seasons/{spring,summer,autumn,winter}.mp3` (new); `public/audio/seasons/CREDITS.md` (new) | Four licensed local assets, season mapping, source/attribution |
| `lib/ambient-audio.ts`; `components/environment/useAmbientAudio.ts` | Music sources, mixing, load/decode/crossfade/cleanup lifecycle |
| `lib/soundscape.ts`; `tests/soundscape.test.ts` | Existing call profiles/events, richer phrases, removal of unused noise generation |
| `tests/seasonal-tracks.test.ts`; `tests/ambient-audio.test.ts` (new) | Asset/mapping checks and bounded music graph transitions |
| `lib/ambience.ts`; `components/environment/GardenAmbience.tsx`; `tests/ambience.test.ts` | Seeded small wildlife, pool counts, wing silhouettes, existing particle integration |
| `VERIFICATION.md`; `screenshots/`; `recordings/` | Actual test results, browser evidence, short audio/motion samples |

`Garden.tsx` and `Scene.tsx` already wire the hook/controller/ambience correctly; keep their public interfaces unchanged. No app route/config/export changes are required.

### Task 1: Bind snowfall and its control to winter

**Files:** Modify `lib/environment.ts`, `components/environment/EnvironmentPanel.tsx`, `tests/environment.test.ts`. Audit `tests/rain.test.ts` for older contradictory snow fixtures.

**Interfaces:** Keep `resolveEnvironment(now: number, deviceZone: string, p: EnvironmentPreferences, weather: WeatherSnapshot | null): EnvironmentFrame`. Resolve `season` before constructing the returned frame. Add optional `disabledOptions?: readonly T[]` to the existing `ChoiceGroup<T extends string>` props, consumed only by Weather.

- [x] **Step 1: Add failing winter-gate assertions and replace the old contradictory expectations.** In `tests/environment.test.ts`, using existing `noon`, `prefs`, `weather`, and `defaults` fixtures:

```ts
for (const seasonMode of ['neutral', 'tropical', 'spring', 'summer', 'autumn', 'winter'] as const) {
  const p = { ...defaults, seasonMode, weatherMode: 'snow' as const };
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', p, null).snow, seasonMode === 'winter');
}
const winter = { ...prefs, seasonMode: 'winter' as const, weatherMode: 'snow' as const };
for (const off of [{ enabled: false }, { seasons: false }, { rain: false }])
  assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...winter, ...off }, null).snow, false);
assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...winter, weatherMode: 'clear' }, null).snow, false);
assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...prefs, seasonMode: 'autumn' }, { ...weather, code: 73 }).snow, false);
assert.equal(resolveEnvironment(noon, 'Asia/Manila', { ...prefs, seasonMode: 'winter' }, { ...weather, code: 73 }).snow, true);
```

Also assert stale/future winter weather cannot snow; a serialized Autumn + Snow preference remains unchanged by resolution and yields `snow=false`, `rainIntensity=0`, `cloudCover=0`; July local season at latitude -40 permits fresh snow while latitude +40 does not. Refresh timestamps for July fixtures. Existing Living details independence tests should use Winter explicitly.
- [x] **Step 2: Run `node --experimental-strip-types --test tests/environment.test.ts`; observe failure because nonwinter snow is currently allowed.**
- [x] **Step 3: Implement the shared gate and picker.** Use resolved winter plus existing master/precipitation gates; clear precipitation/cloud effects for a suppressed snow request. Pass `disabledOptions={c.frame.season === 'winter' ? [] : ['snow']}` to Weather and apply native input disabling. Explain “Snow is available in winter.” when unavailable, including a persisted inactive choice. Do not mutate preferences or force winter. Both flakes and caps already consume `frame.snow`.
- [x] **Step 4: Re-run the focused test; expect PASS.** Browser-check keyboard navigation, disabled Snow in Autumn, Winter + Snow, Winter + Clear, switching away from winter while Snow is selected, and reload of that selection.
- [x] **Step 5: Commit only the three task files (and any actually updated rain regression), subject `Bind snowfall to winter`.**

### Task 2: Replace the continuous noise with local seasonal music

**Files:** Create `lib/seasonal-tracks.ts`, four MP3 assets and `public/audio/seasons/CREDITS.md`, `tests/seasonal-tracks.test.ts`, `tests/ambient-audio.test.ts`. Modify `lib/ambient-audio.ts`, `lib/soundscape.ts`, `components/environment/useAmbientAudio.ts`, `components/environment/EnvironmentPanel.tsx`, `tests/soundscape.test.ts`.

**Interfaces:**
- Export `SEASON_TRACKS: Record<Season, { src: string; title: string; artist: string; sourceUrl: string; licenseUrl: string }>` from `lib/seasonal-tracks.ts`. Paths `/audio/seasons/spring.mp3`, `summer.mp3`, `autumn.mp3`, `winter.mp3`; tropical aliases summer and neutral aliases spring. Artist `Scott Buckley`, license URL `https://creativecommons.org/licenses/by/4.0/`; titles/source URLs exactly as in the spec.
- Change `createSoundscape(context: BaseAudioContext): SoundscapeEngine` to remove its noise parameter. Keep existing engine methods, adding `setTrack(buffer: AudioBuffer, at: number): void`. Narrow `SoundscapeProfile` to `{ birds: number; insects: number }`; keep `soundscapeProfile(frame)` input and adaptive call behavior.
- Keep `useAmbientAudio(frame: EnvironmentFrame, available: boolean)` return type and existing `Garden`/panel callers. The hook owns fetch/decode and status; the engine owns source scheduling and fades.

- [x] **Step 1: Write failing tests.** `seasonal-tracks.test.ts` asserts all six seasons map to exactly four existing, nonempty MP3 files; tropical/neutral aliases; every record contains artist/license/source and CREDITS names all four tracks. `ambient-audio.test.ts` uses a minimal recorded Web Audio graph to assert no noise buffer/source construction, four oscillator voices, at most two simultaneous music sources during repeated `setTrack`, four-second fade/loop overlap, exact master silence at volume zero, and idempotent disposal stopping/disconnecting active sources. Update soundscape tests for the narrowed profile and remove the obsolete noise-generator test.
- [x] **Step 2: Run `node --experimental-strip-types --test tests/seasonal-tracks.test.ts tests/ambient-audio.test.ts tests/soundscape.test.ts`; expect failures for missing assets/mapping/engine behavior.**
- [x] **Step 3: Add assets and music behavior.** Download from each artist page's MP3 link, record title, source/download URLs, CC BY 4.0 attribution and any transcoding in CREDITS. Audition before final inclusion; use local MP3s, with no remote runtime URL. Delete both noise loops, their filters/buses, `makeNoise`, and every obsolete caller/import. Route music and four existing call voices through the existing master/compressor. Music gain is 0.35 before master; preserve master scale 0.18 and default volume 0.3. Crossfade tracks and seams for four seconds using Web Audio scheduling; keep at most one outgoing and one incoming source, retiring any previous outgoing source on rapid switches. Use overlap of `min(4, duration / 2)` for unexpectedly short test/decoded buffers. For looping, schedule the next buffer to start at the current buffer's end minus overlap; its predecessor's `onended` schedules the following copy. Track switches cancel pending loop copies before fading the active copy into the replacement. Guard callbacks after disposal/replacement; add no loop timer.
- [x] **Step 4: Integrate fetch/decode into the existing hook lifecycle.** Start/resume the context synchronously in the enable gesture as today; fetch only after opt-in. Use an AbortController plus a request/session token checked after fetch and decode, and after pause/Off/unmount. Only the latest requested season may call `setTrack`. A successful incoming track replaces the outgoing one; keep at most the current/incoming decoded buffers. An unchanged track URL must not restart on daylight/profile updates. Fetch/decode failures keep chirps active, show “Seasonal music is unavailable. Animal sounds are still playing.” and allow the existing Resume sound action to retry. Abort pending work on pause/Off; resume the latest season without duplicate sources/schedulers. Update the existing panel description to mention seasonal music and animal sounds; add visible title/artist/source/license credits without another control.
- [x] **Step 5: Re-run focused tests; expect PASS.** In a real browser test delayed A→B→C loads, Off during decode, repeated rapid enable/disable, hidden/master/WebGL pause/resume, failed download/decode, rejected resume, and reload. Assert zero contexts/audio requests before opt-in, no late playback after Off, one scheduler/context, no more than six active sources, retry recovery, and volume-only persistence. Render actual-engine OfflineAudioContext samples at 44.1/48 kHz; finite samples, peak below 1, zero volume exactly silent. Inspect transitions and emit audition WAVs; report listening separately from waveform results.
- [x] **Step 6: Commit the explicitly listed task files, subject `Play seasonal music beneath nature calls`.**

### Task 3: Add more varied bird and insect calls

**Files:** Modify `lib/soundscape.ts`, `tests/soundscape.test.ts`.

**Interfaces:** Preserve `SoundEvent`, its voices 0/1 (birds), 2/3 (insects), and `soundEvents(profile: SoundscapeProfile, seed: number, windowIndex: number): SoundEvent[]`. Consume Task 2's `{ birds, insects }` profile.

- [x] **Step 1: Extend the 1,000-window test.** With `{ birds: 1, insects: 1 }`, assert deterministic events; at most 12 events/window, six/category; all events end within two seconds; no same-voice overlap; existing bird bounds 1800–3600 Hz, 0.12–0.28 s, gain ≤0.3; insect bounds 3600–4800 Hz, 0.025–0.05 s, gain ≤0.08; pan magnitude ≤0.6. Collect phrases across windows and assert bird note counts include 2, 4, 6, insect pulse counts include 3, 6, and bird phrases include rising and falling contours. Zero profile produces no events. Compare occupied windows against existing recorded baseline: more activity at full profile without a continuous tone.
- [x] **Step 2: Run `node --experimental-strip-types --test tests/soundscape.test.ts`; observe the new variety assertions fail.**
- [x] **Step 3: Extend the existing seeded scheduler.** Keep four voices and sine timbres; bird phrase probability `profile.birds * 0.55`, insect probability `profile.insects * 0.85`. Seed selection of 2/4/6 bird notes and 3/6 insect pulses; use existing envelopes and tested frequency/gain limits. Separate repeated same-voice notes by at least their duration. Preserve winter/night/weather suppression; no hiss or extra animal bus.
- [x] **Step 4: Re-run the test; expect PASS.** Record Spring dawn and Summer night over their music; check calls remain audible and spaced. Label subjective listening limits honestly.
- [x] **Step 5: Commit those two files, subject `Vary birdsong and cricket phrases`.**

### Task 4: Increase fireflies and add small butterflies and birds

**Files:** Modify `lib/ambience.ts`, `components/environment/GardenAmbience.tsx`, `tests/ambience.test.ts`.

**Interfaces:** Extend `AmbienceKind` with `'butterfly' | 'bird'`; add `butterflies: number` and `birds: number` to `AmbienceProfile` and `AMBIENCE_LIMITS`. Preserve signatures `sampleAmbience(frame: EnvironmentFrame): AmbienceProfile`, `spawnAmbient(kind: AmbienceKind, index: number, cycle: number, origin: Vec3): AmbientParticle`, `sampleAmbientParticle(p: AmbientParticle, age: number, out: ParticlePose): void`, and `ambientSizeScale(kind: AmbienceKind, distance: number): number`. Existing `GardenAmbience` props remain unchanged.

- [x] **Step 1: Add failing tests.** Assert exact pool caps and all five density channels bounded in [0,1]. Butterflies: positive Spring/Summer/Tropical day, zero Autumn/Winter/night. Birds: positive Spring/Summer/Autumn/Tropical dawn/day/dusk, zero Winter/night. Both zero for neutral, heavy rain, snow, master-off, Living details-off. New kinds are seeded, finite, preserve origins/reuse output arrays, finish/fade at duration, stay above their latched ground, and do not drift arbitrarily beyond the island neighborhood. Verify base x spans 0.055/0.07/0.10 at a visible age and capped firefly-style distance scaling for all three wildlife kinds; old mote/debris assertions remain unchanged.
- [x] **Step 2: Run `node --experimental-strip-types --test tests/ambience.test.ts`; observe failures for missing kinds/profile fields/new limits.**
- [x] **Step 3: Extend the existing model and pools.** Set limits/base spans from Global Constraints. Preserve firefly seasonal weighting and size; use 0.35 small-island floor for the three wildlife groups only. Butterfly daylight weight 1 for spring/summer/tropical, zero otherwise; bird season weight 0.6 outside neutral/winter with daylight weighting at dawn/day/dusk; multiply both by `1 - max(cloudCover, rainIntensity)` and suppress at night/snow. Seed butterfly origins 0.6–2.1 units above sampled ground and birds 2.5–4 above; use closed flutter/glide paths of radius ≤1.5 with vertical motion ≤0.3, rather than unbounded drift. Extend particle pose computation and reuse firefly distance scaling. Render butterfly/bird wing pairs as tiny low-poly V-shaped geometries with flutter from pose rotation/scale, using warm muted butterfly colours and dark bird silhouettes. Keep one instanced mesh/draw per group, ignore raycasts, reuse fadeNearCamera and scratch objects. Preserve existing responsive limits, hidden pause and reduced-motion unmount behavior.
- [x] **Step 4: Re-run ambience tests; expect PASS.** Browser-inspect empty/one/49-plot fixtures at 1440×1000 and 390×844: summer dusk/night fireflies, spring day butterflies/birds, autumn birds, winter absence; near/far zoom; resize across 700px without resetting existing particles. Inspect a short motion recording for recognizable wings and calm movement. Assert five decorative draws maximum, unchanged four scene lights, and active counts within responsive caps.
- [x] **Step 5: Commit the three files, subject `Add small wildlife and more fireflies`.**

### Task 5: Verify the complete garden and record evidence

**Files:** Modify `VERIFICATION.md`; capture task-owned `screenshots/seasonal-*` and `recordings/seasonal-*` artifacts. No new runtime code.

**Interfaces:** Consume the unchanged garden/scene/controller interfaces plus Tasks 1–4. Evidence must describe the actual tested commit and conditions.

- [x] **Step 1: Run `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check` from the target checkout under Node.js 24.** All must exit zero. Do not stage unrelated generated `next-env.d.ts` changes.
- [x] **Step 2: Exercise production at desktop/mobile sizes using synthetic storage.** Cover all six seasons × four time presets with clear/rain/snow as relevant; verify disabled Snow and saved invalid combinations, Winter + Clear, opt-in and credits. Plant a synthetic letter, reload and compare ID/seed/body/position; delete/replant to check retained-plot reuse. Check keyboard interaction, no overflow/console errors, reduced motion and hidden pause. No music requests to external hosts or microphone prompts.
- [x] **Step 3: Capture evidence.** Desktop/mobile fireflies, butterfly/bird day scene, Autumn + inactive Snow, Winter + Snow, Winter + Clear; short wildlife motion and track-transition/call audition samples. Record actual source counts, limits, command results, tested lifecycle failures, and whether audio was heard. Do not call browser emulation a physical-device benchmark or a clock jump prolonged listening.
- [x] **Step 4: Update `VERIFICATION.md` and self-review against the spec.** Report unperformed subjective/hardware checks; preserve historical verification entries while noting that winter binding supersedes earlier Summer + Snow expectations. Ensure no letter text is present in artifacts.
- [x] **Step 5: Commit `VERIFICATION.md` and the reviewed plan/spec only, subject `Record seasonal ambience verification`.** Use explicit `git add -f` for the two ignored docs if needed; do not force-add screenshot/recording directories wholesale. Integration/merge/push remains a separate decision.

## Plan self-review and execution handoff

Coverage checked: seasonal tracks and attribution/lifecycle (Task 2), retained/richer chirps (Tasks 2–3), more same-size fireflies and tiny winged wildlife (Task 4), winter-only manual/local/persisted snow and picker (Task 1), persistence/accessibility/desktop/mobile evidence (Task 5). All five Review Focus conditions have owning checks. Implementation and verification completed; actual results and subjective/hardware limitations are recorded in VERIFICATION.md.

Recommended execution: **Native**, because the changes share the existing environment/audio interfaces and are best verified together. Alternatively use **Subagent-driven** execution with fresh task implementers/reviewers. The user approved proceeding with the recommended Native execution. Work was completed in the named main worktree; no merge or push was performed.
