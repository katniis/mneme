# Verification — October 27, 2026

## Automated checks

- `npm test`: seven passing groups, including physical voxel-support intersections and birth ordering across seven distinct seeds, plus regression checks for long straight coastlines and connected deep rock during every expansion from two to eight trees.
- `npm run typecheck`: passed.
- `npm run build`: passed; the garden is statically prerendered with client-side state and rendering.
- `npm install`: audited 92 packages with zero reported vulnerabilities at installation.
- Taste source lint: zero failures; two shadow advisories apply to the floating detail/editor panel and transient confirmation.
- Production visual inspector: 1440×900, 768×1024, and 390×844; zero failures. Advisories apply to functional icon controls and small secondary mobile labels.

## Browser evidence

The letter creation and multiple-tree checks used real form submissions. An eight-letter fixture created through those submissions was copied into isolated browser contexts for repeatable production, mobile, and fallback checks. Fixture letters are not shipped as initial app data.

| Check | Observed result |
| --- | --- |
| Empty garden | Generated textured, stepped land with visible soil and rock underside |
| First planting | Stored exactly one letter, seed, and permanent position |
| Growth | Observed grounded stem, extending connected wood, developing leaves, and maturity |
| Reveal | Original multiline letter appeared with its whitespace intact |
| 3D picking | Clicking the visible tree opened the matching letter details |
| Dragging | Orbit changed the render and did not open a detail panel |
| Wheel | Changed camera zoom |
| Three / eight trees | Distinct seeded structures, connected terrain, and stable earlier placements |
| Reload at eight trees | Letter records, seeds, positions, and simulated time matched before/after |
| Validation | Empty body produced an adjacent error; text remained editable |
| Draft recovery | Closing and reloading retained a multiline draft with exact spacing |
| Keyboard | Enter selected a letter; Escape closed its detail panel |
| Mobile | 390×844 with no horizontal overflow; independently scrolling editor |
| Touch emulation | CDP touch events changed orbit and pinch zoom |
| Reduced motion | New letter remained paused with simulation time equal to its planted time |
| WebGL unavailable | Fallback appeared; existing saved letter could still be selected and read |
| Production console | Zero errors and warnings in the final inspected session |

The clock helper is tested for paused and hidden states. Physical device keyboards, screen readers, sustained frame rates, and large-garden stress behavior were not measured.

## Captures

- `screenshots/01-empty-island.png`
- `screenshots/02-sprout.png`
- `screenshots/03-intermediate.png`
- `screenshots/04-mature-tree.png`
- `screenshots/05-revealed-letter.png`
- `screenshots/06-three-trees.png`
- `screenshots/07-eight-trees.png`
- `screenshots/08-orbited-garden.png`
- `screenshots/09-mobile-garden.png`
- `screenshots/10-mobile-editor.png`
- `recordings/mneme-growth.mp4` — sampled live 4× preview, no camera animation used to simulate growth.

## Art direction and visual review

Taste direction: **Framed sheet**, seed **1863468205**. The brief fixes the forest/stone palette and system sans-serif. A full canvas takes the place of the sheet; no persistent sidebar was added because the brief prioritizes the island. The subject's own letter-to-tree lifecycle is the signature element. All textures and geometry are generated locally; no stock photography or external media is used.

ROUND 1

Seen in one second: a textured voxel island in a quiet garden interface.

Idea (one sentence): letters to a future self become living, structurally distinct trees.

Live thing: writing and planting a letter develops an attached voxel tree over shared demo time.

Layout words by section: shell=restrained header / garden=interactive canvas / writing=temporary sheet / clock=compact control.

Scores: design 7.2 · usability 7.0 · creativity 8.0 · content 8.0 → overall 7.36.

Caps applied: page-only photography rules do not apply to this working 3D canvas.

Top three problems and fixes:

1. Initial island and some mature crowns were clipped. Framing now uses the generated mature height, garden extent, and viewport aspect.
2. Early branches were too evenly spaced. Attachment heights, secondary counts, and twig positions now vary within each natural archetype.
3. Empty-state copy touched the island on narrow screens. Phone framing moves the island above the invitation; the supporting copy is condensed and the tablet clock is placed to the right.

ROUND 2

Seen in one second: one floating garden, with readable terrain layers and varied natural trees.

Idea (one sentence): a letter holds a future date, and the garden makes that wait visible.

Live thing: a grounded sprout develops continuously into the tree generated from its saved seed.

Layout words by section: shell=quiet frame / garden=live world / writing=scrollable sheet / details=letter / clock=local simulation.

Scores: design 7.8 · usability 8.0 · creativity 8.0 · content 8.0 → overall 7.92.

Caps applied: none for the app-screen criteria. Self-review scores are subjective, not an external jury rating.

Remaining observations:

1. Leaf blades remain deliberately cubic; anatomy is illustrative rather than species-accurate.
2. Multiple crowns overlap from some viewpoints; orbiting separates them and the letter list remains available.
3. Very small details are easier to inspect by zooming. No claim is made about physical mobile GPU performance.

## Coastline correction

The original angular outline was repeated at grid-aligned expansion centers. Its straight voxel runs lined up into cliff walls: the eight-tree fixture had a continuous 27-block straight edge. This was generated geometry, not camera clipping. Each center now varies its angular outline, and a coherent world-coordinate field breaks up aligned borders. The generation bounds were enlarged to contain those offsets. The one-, three-, and eight-tree fixtures now pass a six-block maximum straight-edge regression check; terrain connectivity and permanent tree placement still pass. The browser render and production build were checked after the correction.

## Shared underside

Rock depth previously used the maximum influence of individual planting regions, leaving a thin saddle between separate cones. It now measures the distance from each column to the shoreline of the complete island. A common rock spine below neighboring planting areas reinforces narrow joins; broad, deterministic geological variation replaces independent per-column depth jitter. The surface footprint and tree placement algorithm remain intact.

The new regression test first failed on the two-tree island. It now verifies a connected fifth rock layer beneath every tree for each garden size from two through eight and checks that adding a letter retains all existing rock voxels. A narrow join at the seventh addition was caught and fixed by the shared spine. All seven tests, TypeScript, and the production build passed afterward.

In the production browser, a real letter submission expanded a two-tree fixture to three trees. Existing letter records and positions matched exactly. With tree time paused and the camera settled, early and late underside captures differed as the new supported rock layers developed. The final view was inspected from below. The production console had zero errors or warnings.

New captures: `screenshots/12-unified-underside.png`, `screenshots/13a-rock-forming.png`, and `screenshots/13-expansion-shared-core.png`. Large-garden generation performance beyond eight trees was not measured; direct shoreline-distance evaluation can be replaced with a distance transform if needed at that scale.

## Tree generator merge (live + variant)

The live generator in `lib/tree.ts` now uses the variant's unified palettes, structural occupancy grafting, shell-filled trunks, stratified branch heights, two-segment primaries, and leader shoots. Twig and petiole wood is intentionally spaced tighter than the structural occupancy rule so consecutive nodes physically touch; the regression test applies the no-near-duplicate rule to structural wood (`size >= 0.12`) only.

- `npm test`: nine passing tests, including the structural-duplicate, voxel-budget, and leader-canopy checks.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Voxel totals per seed stayed between about 6.1k and 9.6k for the sampled seeds.
- Browser recapture was not performed in this session: port 3000 was already occupied and the sandbox denied other listen ports. Existing screenshots therefore show the previous anatomy and should be recaptured before release.

## Eight species

The generator now assigns eight species by seed: Oak, Birch, Maple (autumn red), Cherry Blossom, Weeping Willow, Pine, Jacaranda, and Spruce. Cherry Blossom, Maple, and Jacaranda use the broadleaf scaffold with species palettes and silhouettes; Pine and Spruce use tiered conifer whorls; Weeping Willow uses arched branches with hanging leaf strands. Widening the selector from `% 3` to `% 8` can remap the species of an already-planted letter once; its seed, position, text, and clock are unchanged.

- `npm test`: eleven passing tests, including per-species signature checks (blossom share, autumn colour, hanging elongated leaves, conifer tier shrinkage, top-weighted purple) and attachment checks across all eight species.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Sampled voxel totals: broadleaf species about 6.8k–9.4k, Weeping Willow about 1.8k, Pine about 1.6k, Spruce about 2.8k.
- Browser screenshots were not recaptured in this session for the same port reason above. The eight-species garden should be captured (seeds 0–7, desktop and mobile) before release; screenshots still show the previous three-species anatomy.

## Leaf realism (from research/leaves.md)

All ten ranked recommendations from `research/leaves.md` were implemented: sun/shade size and colour gradient with a Maple autumn shell gradient, leaf-only rotation (`Voxel.rotation`, applied in `Scene.tsx`; wood stays axis-aligned), species phyllotaxis (opposite Maple, 137.5° spiral elsewhere), anisotropic per-species leaf footprints, blossom clusters at buds instead of recoloured leaves, outer-shell bud redistribution, pine fascicles versus spruce single helical needles with cones retagged as wood, 9:1 willow leaves, and Jacaranda compound-leaf sprays with a thin rachis.

- `npm test`: fourteen passing tests, including rotation, interior-versus-shell size and luminance, Maple shell redness, and pine cone kind checks.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Sampled voxel totals (seeds 0–7): 1.8k (Willow) to 10.7k (Cherry Blossom). Across seeds 0–199 the maximum was 11,772, under the 12,000 ceiling.
- Browser screenshots were again not recaptured: `localhost:3000` is not reachable from the sandbox. Rotated foliage in particular should be visually inspected (seeds 0–7, desktop and mobile) before release.

## Tree structure (from research/trees.md)

The ranked structural changes were implemented: a forkable trunk (`forkHeight`/`forkCount`) for Oak, Cherry Blossom, and Jacaranda with branches and leaders re-rooted on the limbs; a per-species crown-outline curve; drooping birch sprays and twigs; branch-, spray-, and twig-level opposite pairing for Maple; a conifer split (pine whorl dropout, upturned two-segment tips, and distal needle tufts; spruce upswept branches with hanging branchlets); willow curtains extended toward the ground with denser strands; and bark riders (dark birch base, denser cherry lenticel bands).

- `npm test`: fifteen passing tests, including cherry vase openness, birch droop, and willow curtain reach.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Sampled voxel totals (seeds 0–7): 2.1k (Pine) to 8.9k (Birch). Across seeds 0–199 the maximum was 10,487, under the 12,000 ceiling.
- Crown-radius bands now differentiate the species: Cherry and Oak widen toward the top, Maple peaks at mid-height, Birch narrows to the top with foliage pulled into the bottom band, and Jacaranda keeps a clear bole under a flat crown.
- Browser screenshots were again not recaptured: `localhost:3000` is not reachable from the sandbox. The fork crotches and spruce branchlets in particular should be visually inspected (seeds 0–7, desktop and mobile) before release.

## Tree selection (28 October 2026)

The letter editor now offers all eight existing species and a default “Surprise me” option. A chosen species is encoded in the new tree's seed; existing letter records, seeds, positions, and clock behavior are preserved. The locally saved draft includes the choice, and older drafts or invalid saved choices fall back to “Surprise me” while retaining the letter text.

- `npm test`: all 17 tests passed. The two new tests cover every species at seed boundaries, random fallback, retained variation, and letter serialization without changing existing records. Both new tests failed before implementation.
- `npm run typecheck`: passed under Node.js 24.14.1.
- `npm run build`: passed; browser checks used `npm start` on port 3000.
- Production browser checks at 1440×1000 and 390×844: all nine dropdown options present; keyboard selection works; Cherry Blossom draft selection survives reload; planting Cherry Blossom and Spruce stores their correct species and retains both letter records after reload. The WebGL scene renders. Mobile selector is 296×47 pixels, with no horizontal page overflow.
- Older drafts retain exact whitespace and default to random. An invalid stored tree choice also defaults to random. Submitting a blank body retains the selected Pine and leaves existing letters unchanged.
- Browser console: zero errors and warnings. `git diff --check`: passed. The UI detector reported only the existing progress-bar `transition: width`, outside this change.
- Captures: `screenshots/14-tree-selector-desktop.png`, `screenshots/15-tree-selector-mobile.png`, and `screenshots/16-tree-selection-persistence.png`. Only synthetic letters were used.
- Mobile checks used browser viewport emulation; physical mobile hardware was not tested.

## Fill gaps between joined planting areas (28 October 2026)

Reproduced permanent enclosed holes in the generated footprint: the third planting left four empty cells, starting at grid coordinate `3:4`; the 25-tree footprint left 22 empty cells. The previous connectivity checks allowed these holes because the surrounding ground was still connected.

`generateTerrain` now flood-fills empty space from outside the generation bounds and fills any enclosed pockets before calculating the shoreline and rock depth. Filled cells use the normal grass, soil, and rock generation, including expansion animation. The outer coastline and stored letter seeds, positions, and text are preserved. Existing gardens receive the repaired terrain when rendered again.

- Regression first failed with `3 trees leave an unfilled gap at 3:4`.
- `npm test`: all 18 tests passed. The new regression checks every garden size from 1 through 49 for one connected footprint, no enclosed empty cells, soil/rock support in every column, and retention of all previously generated solid voxel positions.
- `npm run typecheck` and `npm run build`: passed under Node.js 24.14.1.
- Production browser: submitted a real third planting into a synthetic two-letter garden, allowed terrain expansion to settle, and inspected the repaired join from above. Existing letter records matched exactly before/after planting and reload.
- Visually inspected the actual 49-tree fixture at 1440×1000 and 390×844 (zoomed in on mobile); both the interface and storage reported 49 letters. The overhead surface has no enclosed holes. Mobile page width stayed 390 pixels. Browser console: zero errors and warnings.
- Captures: `screenshots/17-island-gaps-before.png`, `screenshots/18-island-gaps-filled-desktop.png`, `screenshots/19-island-gaps-filled-49-trees.png`, and `screenshots/20-island-gaps-filled-mobile.png`. Only synthetic letters were used.
- Physical mobile hardware and gardens larger than 49 trees were not checked. At 49 trees, the existing mobile camera framing initially places the terrain beyond the fog/view distance; zooming in makes it visible. Camera behavior was outside this terrain-gap fix.

## Natural tree placement (28 October 2026)

Replaced the square spiral with deterministic candidate sampling around the actual saved tree positions. Candidates use varied angles and distances, reject positions within 4.8 world units of another trunk, and favor nearby open ground with variation to avoid rows. An outward fallback guarantees space if sampled candidates are occupied. New land remains within the existing terrain-join range. Existing stored positions are never recomputed or moved; older gardens gain irregular new plantings around their saved trees.

- New spacing and legacy-position tests failed before implementation. `npm test`: all 21 tests passed. Placement is deterministic across 49 plantings, with 49 distinct X coordinates and 48 distinct Z coordinates rounded to two decimals. Every new tree remains at least 4.8 units from the others and within 6 units of the existing garden.
- Terrain regressions now cover every size from 1 through 49 for both a fresh natural layout and a garden extended from the original eight grid positions: connected ground, no enclosed holes, supported columns, and retention of all previous solid voxel positions. The coastline regression retains its original grid fixtures.
- `npm run typecheck`, `npm run build`, and `git diff --check`: passed under Node.js 24.14.1.
- Production browser at 1440×1000: inspected the actual 49-tree natural layout from above and verified all positions survived reload. Submitted a new Birch into a saved eight-tree grid garden; the ninth tree appeared at approximately `[5.0085, -5.1522]`, 5.0568 units from its nearest neighbor. All eight existing letter records and the new record survived planting and reload unchanged. No browser errors or warnings were recorded during that planting check.
- Inspected the same 49-tree layout at 390×844 after zooming in; page width stayed 390 pixels. Captures: `screenshots/21-natural-tree-placement-49.png` and `screenshots/22-natural-tree-placement-mobile.png`. Fixtures contain synthetic letters only.
- Saved trees intentionally keep their old placement. Physical mobile hardware and gardens beyond 49 trees were not tested; the previously recorded large-garden mobile camera/fog limitation remains.

## Remove square dots on rock faces (28 October 2026)

The small bright squares were generated mineral faceplates, not holes or a texture defect. Removed the mineral decoration voxels and their unused animation branches. Rock blocks retain the existing palette, pixel texture, solid geometry, and supported expansion.

- The new regression failed before the change with 169 mineral faceplates in a three-tree fixture; it passes after their removal.
- `npm test`: all 22 tests passed, including both 1–49-tree connectivity and ground-retention scenarios. `npm run typecheck`, `npm run build`, and `git diff --check`: passed.
- Production browser: compared the eight-tree underside before and after at 1280×900. Inspected the repaired underside at 390×844, submitted a ninth letter on mobile, waited for expansion, and reloaded. All existing letter records and the new record were retained exactly. No browser errors or warnings; mobile document width stayed 390 pixels.
- Captures: `screenshots/23-rock-face-spots-before.png`, `screenshots/24-rock-faces-clean-desktop.png`, and `screenshots/25-rock-faces-clean-mobile.png`. Only synthetic letters were used. Physical mobile hardware was not tested.

## Delete letters, retain plots, and fell trees (28 October 2026)

Implemented the approved plan in `docs/superpowers/plans/2026-10-28-tree-deletion.md`. The detail panel now offers **Delete tree and letter**, followed by **Keep letter** / **Delete permanently** confirmation. Deletion is saved before removing content or starting animation; a failed write retains the original letter and tree. Deleted title/body are absent from saved state and the transient render record.

Version-1 gardens migrate to version 2 under the same storage key. An ordered permanent `plots` list records historical land independently of letters. Terrain and island bounds use plots; new planting reuses the first historical vacancy before adding land. Existing seeds, positions, surviving text, and clock settings remain intact.

The displayed tree freezes at its actual growth stage, hinges into a fall, settles against structural wood contact, and dissolves in a staggered wave. Every visible block has one same-colour rising cube particle. Both use instanced meshes; invisible future blocks are omitted. The effect uses real elapsed time, finishes by 3800 ms, and has an idempotent 4500 ms cleanup fallback. Planting and another deletion are disabled while clearing. Reduced motion/unavailable WebGL skip animation; preference changes and context loss clear the transient effect.

- `npm test`: **31/31 passed**. New tests were observed failing before implementation. Coverage includes version migration/validation, middle/last/all deletion, immutable survivors and clocks, permanent ground, ordered vacancy reuse, partial growth, phase boundaries, 0/1/10,000-block particle schedules, deterministic fall direction, and generated willow contact.
- `npm run typecheck`, `npm run build`, and `git diff --check`: passed. Production browser tests used `npm start` on port 3000.
- Core desktop flow at 1280×900: migration, Keep letter, Escape, injected garden-write failure, safe retry, planting lock, falling/settling/particle/empty-land screenshots, matching surviving records, deleted-content absence, vacancy reuse, and reload all passed. No browser errors/warnings.
- Lifecycle checks: reduced motion, WebGL unavailable, reduced motion enabled mid-effect, reload during fall, simulated context-loss event, simulated hidden-tab cleanup, double confirmation activation, paused demo at 0.5×/1×/2×/4×, mature broadleaf/willow/conifer, and partial growth all passed with no page errors. Context loss and tab visibility were simulated; actual GPU loss was not induced.
- Large garden: deleted all **49** synthetic letters through the UI with reduced motion/WebGL fallback for bulk deletion, retaining **49 plots** throughout. Reload with real WebGL rendered the full empty historical island; a replacement letter reused its first plot without expansion.
- Mobile at 390×844: confirmation controls, ordinary animation, mid-effect reduced motion, retained land, and zero horizontal overflow were inspected. A real 8.24-second browser recording was decoded into a contact sheet for visual inspection. A second mobile recording verified the final willow fix.
- Fresh review used **Sol**, as requested. It found a willow hanging-twig overlap that could clamp the fall to 0°. A real-generator regression for seeds 4 and 12 failed before the correction. Contact now uses structural wood, allowing fine twigs to bend; both willows visibly fall. All 31 tests and the final production build passed afterward; the corrected willow was checked on mobile.
- UI detector: only the existing progress-bar `transition: width` warning, outside this feature.
- Evidence: screenshots `26-tree-falling.png` through `39-willow-cleared-mobile.png` (available numbered captures), plus `recordings/tree-deletion.mp4`. Synthetic letters only. Physical mobile hardware, actual GPU loss, and gardens beyond 49 plots were not tested. The pre-existing large-garden mobile camera/fog limitation remains outside scope.

Execution notes: used the current checkout to preserve extensive prior uncommitted changes; task commits were deferred rather than mixing that work into new commits. Task-2 browser checks were batched with final production checks to avoid an intermediate build. No outstanding review findings were deferred.

At the user's subsequent request, the verified Mneme application changes were prepared for a local commit on `main`. All 31 tests passed again before committing; unrelated assets, prototypes, research, and ignore-file edits were left untouched.

## Local environment — 28 October 2026

Implemented the environment plan and linked design in an isolated `codex/local-environment` worktree. The user's `feat/environment` checkout was read only to copy `sun.glb` and `moon.glb`; both copies match their source SHA-256. No Meta integration, backend, letter schema, generator, permanent placement, or deletion geometry changed.

- Final commands: `npm test` **47 passed, 0 failed**, `npm run typecheck`, `npm run build` (default Turbopack), and `git diff --check` passed. An earlier webpack build also passed. Dependencies installed with Node 24 using the existing lockfile; no runtime dependency added.
- Local time: Manila noon/midnight, local year rollover, both New York DST transitions, northern/southern quarters, tropical latitude, every master/feature combination, foreign-city solar mismatch, polar day/night, partial polar-event arrays, stale and future weather bounds are covered by deterministic tests. Growth time stays independent.
- Weather boundaries: synthetic provider JSON covers normalization, seconds conversion, nullable solar events, invalid coordinates/results, rounding, URL encoding, HTTP failures, abort, and cache/location binding. No letter data is passed to weather helpers.
- Production browser: no GPS or weather request before setup; denied GPS followed by city selection; granted synthetic GPS uses rounded 14.6/120.98 only; no continuous tracking. Late A response cannot overwrite B. Same-city reselection and A→B→A retain successful snapshots without breaking the fetch cooldown. Master/all-off cancel pending work, clear removes cache, stale observation stops precipitation, malformed/429/offline/10-second timeout remain usable, immediate retry respects cooldown. Changing device timezone deactivates device location without another GPS call. Hiding a pending GPS request leaves manual retry available on return. Unavailable preference storage does not block planting or letter storage. These checks used isolated contexts and synthetic locations/letters.
- Visual matrix: production Chromium at 1440×1000 and 390×844; dawn/day/dusk/night, spring/summer/autumn/winter ground, reported snow, tropical rainy night, reduced motion, master off, unavailable models, 1 plot and 49 retained plots (9 mature trees). All 16 cases passed with no unexpected page errors, horizontal overflow, original model requests, or garden/clock mutation. Off requests no celestial assets; intentional model failures stay inside their fallback and the editor remains usable.
- Final combined production confirmation: rainy-night planting, reload, felling, retained land, and vacant-plot reuse passed. The full 49-plot mobile island remains visible without the old fog/clipping disappearance. Final desktop/mobile confirmation logged zero page or console errors. Cloud edges were softened after the first visual batch; lunar texture and mobile heading separation were corrected. Scene text switches immediately to readable night ink; sky/light/weather transitions remain eased. This deliberately avoids an initially dark heading during hydration.
- Bounded rendering: one terrain generation shared by ground/rain; no tree colour changes. Preallocated rain pools cap at 1200 desktop/450 mobile drops and 120/40 concurrent splashes, one impact per sampled cycle; impacts use existing grass top heights. Cosmetic snow is a separate thin instanced overlay. Sky caps at 512 stars and 12 soft cloud planes; the existing single shadow map is retained. These are implementation ceilings, not measured mobile FPS.
- Asset preparation rerun: pinned glTF Transform 4.5.1, 1024px WebP, no new runtime decoder. Sun **473004 bytes / 19947 triangles**; moon **316296 bytes / 5888 triangles**; combined **789300 bytes**. Independent GLB/image tests check payload, topology, actual encoded dimensions, decoder requirements, legacy lunar material conversion and original hashes. Runtime requests only `.sky.glb` derivatives. The raw source models remain intact.
- Fresh read-only **Sol** review found two important issues: cached weather loss after location reselection and partial-polar daylight fallback. Both were reproduced before correction and passed their regression checks afterward; no findings remain deferred. A separate interrupted-GPS retry regression was reproduced and corrected. The UI detector reports only the incumbent progress-bar `transition: width` warning.
- Evidence: `screenshots/environment-*.png` includes the 16 scene cases, final settings and mobile rainy island. `recordings/local-environment.mp4` is a 450186-byte day→night→effects-off recording with synthetic letter content; a decoded contact sheet is in `screenshots/environment-video-contact.png`.

Not measured: physical mobile FPS, real GPS hardware prompts, or more than 49 plots. Weather/network tests use controlled responses; actual provider conditions and outages can differ. Open-Meteo data is model-derived, approximate, and its public prototype terms need re-evaluation before commercial release. Changes are committed locally on the isolated branch; no merge, push, or deployment was performed.

## Manual environment controls and simplified sky — 28 October 2026

This section supersedes earlier cloud/celestial rendering notes. At the user's final request, cloud geometry and the 3D sun/moon models were removed. Day/night remains represented by sky colour, stars, changing light direction/intensity and weather haze; independent manual/local time, season and weather choices remain. Rain extends through surrounding air and only splashes on real grass. Snow cover and seasonal ground remain.

- Removed CelestialBodies, the uncommitted voxel cloud renderer, cloud-only geometry/motion/cutaway helpers and tests, the model-preparation script/package command, asset manifest and celestial budget test. Public model files are no longer served or referenced. A local ignored backup preserves the supplied files; the other checkout is untouched. Restored tree-only framing and removed cloud-only height/envelope state. Generic land/tree shadow fitting retains two tests.
- Final checks: `npm test` **55 passed, 0 failed**, `npm run typecheck`, `npm run build` (Turbopack), and `git diff --check`. Code/config/test searches found no remaining cloud/model renderer, GLB URL, or preparation-command references. No runtime dependencies were added.
- Production browser before removal failed the zero-model-request assertion. Final desktop/mobile day, night, rainy 49-plot garden, reduced-motion snow, and master-off checks passed with **zero model requests, zero unsolicited weather requests, zero page/console errors, no horizontal overflow**, and unchanged saved plots/letters/paused clock. Actual sky pixels distinguished day `[220,226,218]`, night `[16,27,45]`, and off `[233,238,229]`; the cycle remains active without models.
- Manual night persisted with local daytime; independent season/weather and v1→v2 preference migration passed. Returning to Follow local resamples the current real instant immediately, including after midnight. Weather polling runs independently from clock sampling/selector updates, so required pending requests are not cancelled by an unrelated manual-time change.
- Fresh Sol cleanup review found no active stale cloud/model references. It identified denied replacement GPS disabling an existing saved-city polling loop. The corrected production regression preserved a valid14-minute cache, denied GPS, advanced past the due interval, and observed exactly one automatic request. Authorized existing-city polling now continues until a replacement location actually succeeds.
- Final rainy planting → deletion → retained empty plot → replacement → reload passed using real persisted replacement ID/body/position, without fixture reset on reload. Existing tree generation, growth, felling particles and land persistence remain unchanged.
- Evidence: `screenshots/sky-clean-day.png`, `sky-clean-night.png`, `sky-clean-mobile49.png`, `sky-clean-snow.png`, `sky-clean-off.png`. Earlier cloud captures/recordings are historical and do not describe the shipped scene.

Physical mobile FPS and real GPS hardware were not measured; browser fixtures used synthetic letters/locations. Changes remain local on the isolated feature branch, with no merge, push or deployment.


## Natural daylight — 2026-10-29

- Added deterministic linear-colour profiles for peach dawn, crisp daylight, amber dusk, and the existing blue night. The existing sun light now produces low opposing dawn/dusk shadows and short noon shadows; hemisphere and fill lighting preserve visible cube shading. The world-oriented sky, fog and lights change together without new geometry, models, postprocessing or runtime dependencies.
- Preserved existing night throughout resolved night, rather than stretching warm keyframes halfway to midnight. Automatic 02:00/20:00/23:00 regression failed before this correction and passed afterward. Adjusted the existing overlay text threshold to keep dark text legible over the brighter dawn/dusk skies.
- Logic verification: `npm test` **63 passed, 0 failed**, `npm run typecheck` passed, and production `npm run build` passed. New profile tests first failed with the missing module, then passed. Tests cover profile bounds/continuity, target interpolation without a bright-noon detour, night/static profiles, clock/provider boundaries, and low-angle shadow coverage for radii 4.6 and 32.
- Compared fixed synthetic 1- and 49-tree gardens at desktop 1440×1000 and portrait 390×844 through all four phases. Confirmed zero page/console errors, zero model/unsolicited weather requests, no horizontal overflow, and unchanged saved letters/plots/paused time. The first 49-tree harness attempt raced a viewport-triggered save; final fixtures seed before hydration and verify actual count 49 and preserved data.
- Camera checks: 49-tree top views at polar angle 0.2, plus actual nearest/farthest orbit distances 54.34/207.01, on both viewport sizes. Inspected near-view shadow detail and clear/overcast/rain/snow combinations. Retained shoreline, cube geometry and snow remain readable; weather attenuates the selected lighting rather than changing its phase.
- Island-only comparison masks the backgrounds of the same three 49-tree top views. Shared silhouette contained 300,880 pixels; mean absolute RGB differences were dawn/day 58.67, day/dusk 67.62, dawn/dusk 9.93 (0–255 scale). Visual inspection confirms high/short noon shadows and opposing low light at dawn/dusk. This is visual evidence, not a perceptual-quality benchmark.
- Night before/after screenshot difference: mean absolute channel change **0.000562/255**, no pixel differed by more than 2/255, for the same fixed 9-tree fixture.
- Actual rendered light checks passed for **24 local-clock/provider cases**, including 05:29/05:30/06:00/06:30/06:31, corresponding evening boundaries, 23:59→00:00, and shifted provider sunrise 06:20/sunset 18:10. Synthetic provider cache used the existing array location key; no live location/weather requests were needed.
- Normal-motion dawn→dusk transition: 80 frame samples, key intensity 1.2148–1.3882 within endpoint range 1.2–1.45, light x moved from -45.58 to +43.52, no bright noon flash. Rapid day/night/dawn choices were recorded. Reduced motion applied targets immediately. Simulated hidden state froze key intensity at 0.12; after a clock change, resuming at noon applied 2.5 without replay. Day/night off with cloudy weather gave neutral key 1.5375; master/all-effects off gave 2.5.
- Synthetic mobile planting flow: deleted the existing tree/letter, retained its plot, planted a Maple replacement on [0,0], paused growth, and reloaded. Replacement ID/seed/content and retained land persisted without resetting the fixture. Auto/manual time choices persisted independently.
- Evidence: `screenshots/daylight-before-{dawn,day,dusk,night}.png`, `daylight-after-{dawn,day,dusk,night}.png`; final 1/49 desktop/mobile captures `daylight-{1,49}-{desktop,mobile}-{dawn,day,dusk,night}.png`; `daylight-49-{desktop,mobile}-top-{dawn,day,dusk}.png`; actual camera extremes `daylight-49-{desktop,mobile}-{close,far}.png`; `daylight-weather-{dawn-cloudy,dusk-heavy-rain,day-snow,dusk-snow}.png`; `daylight-island-only-comparison.png`.
- Transition recording: `recordings/page@1808d03d5b220e819d9269c8b638b887.webm`. Browser state inspection was confined to isolated synthetic test pages; no production debug hook was added.

Physical mobile-device FPS, real GPS hardware and live provider conditions were not measured. Work remains local on the isolated feature branch; no merge, push or deployment.
