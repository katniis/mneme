# Seasonal sound and wildlife

Status: approved by the user with “Proceed with the plan”; implemented and verified. See VERIFICATION.md for actual checks and limitations.

## Intent and confirmed scope

The user wants to replace the nature bed that sounds like wind blowing into a microphone with a soundtrack for each season, retain and expand the animal/insect chirps, increase fireflies, add small butterflies and birds in the same understated style, and restrict snow to winter. The user confirmed **gentle instrumental music + animal/insect sounds** and identified the target checkout as `C:/Users/jbree/.codex/worktrees/local-environment/mneme` (`main`, inspected at `ad7513f`).

The chat's original `C:/Users/jbree/mneme` checkout is older and lacks these features. Do not implement against it. The target worktree already has an unrelated `next-env.d.ts` change; preserve it.

## Existing behavior

- `lib/ambient-audio.ts` loops two filtered noise sources for wind/rain and schedules four oscillator voices for birds/insects. `useAmbientAudio.ts` already handles explicit opt-in, volume persistence, fades, visibility, context loss, and teardown.
- `lib/ambience.ts` and `GardenAmbience.tsx` own seeded particle motion and bounded instancing. Firefly ceilings are 32 desktop / 8 mobile, reduced further on small islands.
- `lib/environment.ts` resolves manual/automatic seasons and weather independently; manual Snow and provider snow codes currently allow snow in any season. Existing tests explicitly permit this and need updating.

## Approach

Use checked-in, licensed instrumental recordings for the continuous bed and retain the existing local Web Audio chirps. Extend the existing ambience pools for wildlife. Enforce winter in the shared environment resolver and reflect that rule in the weather picker.

Alternatives considered: external streaming creates runtime availability/privacy problems; another synthesized continuous bed risks retaining the sound the user dislikes. Neither is needed. The local-recording choice and the detailed defaults below are agent proposals, pending review.

## Proposed music

| Resolved season | Candidate track | Character from the artist's description |
| --- | --- | --- |
| Spring | [Childhood](https://www.scottbuckley.com.au/library/childhood/) | Simple piano and strings |
| Summer | [A Kind Of Hope](https://www.scottbuckley.com.au/library/a-kind-of-hope/) | Piano, strings, atmospheric synth |
| Autumn | [Hiraeth](https://www.scottbuckley.com.au/library/hiraeth/) | Calm pads, strings, solo cello |
| Winter | [Snowfall](https://www.scottbuckley.com.au/library/snowfall/) | Layered piano and strings |

All four artist pages state CC BY 4.0 with attribution. [Artist usage terms](https://www.scottbuckley.com.au/library/using-this-music/) allow use/adaptation with credit. Store the audio locally with source URLs and attribution, and expose credits inside the existing panel. Track suitability is based on descriptions; it still needs listening. Tropical reuses Summer; Classic/neutral reuses Spring, avoiding two additional downloads.

Remove both continuous synthetic noise loops; keep weather-dependent call attenuation. Keep one existing sound toggle and volume slider. Use a four-second crossfade between tracks and at loop seams, at most two music sources plus four call oscillators. Fetch/decode only after explicit sound opt-in; load the current track and its replacement, not the entire library. A failed asset leaves chirps working with an honest status. Sound remains Off after reload and remembers volume only.

## Proposed wildlife defaults

- Fireflies: raise ceilings to **64 desktop / 24 mobile**; use a **0.35** small-island density floor for wildlife instead of the existing 0.15. Keep the existing 0.055 base size and distance scaling. Preserve warm-season dusk/night gating.
- Butterflies: ceilings **12 / 4**, base span **0.07 world units**, small muted wing pairs, gentle flutter near the ground. Present in spring, summer, tropical daylight, not winter or night.
- Birds: ceilings **8 / 3**, base span **0.10 world units**, small dark wing silhouettes, short gliding arcs above the island. Present at dawn/day/dusk outside winter, not night.
- Reuse firefly distance scaling for the new wildlife, capped at 12; fade near the camera. No lights, downloaded models, or new dependency. One instanced draw per group, five decorative draws total. No React state updates per particle/frame.
- Both new groups fade with rain/clouds; heavy rain suppresses them. Master-off, Living details-off, snow, reduced motion, and hidden-tab behavior follow the existing particles. Existing leaves and motes retain their counts and behavior.
- Retain current bird/insect timbres and frequency/gain bounds. Add seeded short/long, rising/falling bird phrases and varied cricket pulse groups. Raise event ceilings to six bird notes + six insect pulses per two-second window without overlapping a voice. Do not add a constant insect hiss.

## Winter-only snow

Snow requires the **resolved** season to equal `winter`, in addition to existing master and Rain & snow switches and either manual Snow or a fresh local snow report. Winter alone does not cause snowfall: Winter + Clear stays clear. Seasons-off resolves to neutral and cannot snow. Local seasons retain hemisphere handling.

Disable the Snow weather choice outside winter and explain “Snow is available in winter.” Do not force winter or rewrite saved preferences. A saved Snow choice outside winter renders no snow, no rain, and a clear-weather fallback; explain the inactive choice. When winter returns it can become active again. This applies to falling flakes and ground caps via the shared frame.

The user's requests intentionally supersede the existing generated-only audio rule and the independence of Snow from season. Other storage, clock, location, lifecycle, and accessibility invariants remain in force.

## Non-goals and acceptance

No playlists, new mixer controls, backend, streaming service, microphone access, dependencies, terrain/tree changes, or storage migration. Manual weather and seasons remain usable without location.

Acceptance requires deterministic tests, type checking, a production build, desktop/mobile screenshots and motion inspection, planting/reload persistence, music/call lifecycle and asset-failure checks, and audio audition artifacts. Signal checks do not prove that a soundtrack sounds good; clearly distinguish actual listening from unperformed subjective review. Use synthetic letters only.
