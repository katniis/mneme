# Botanical Tree Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the eight real voxel trees around researched botanical forms, add the fictional Moonveil tree, and display species-appropriate seasonal foliage and flowering without changing existing letters or identities.

**Architecture:** Keep `lib/tree.ts` as the import facade, with several bounded, seeded skeleton builders feeding a shared connected voxel/organ pipeline. Resolve seasonal appearance independently of cached anatomy; capture that appearance for deletion and debris. Preserve seed-derived identity for legacy letters and add optional explicit species metadata for new nine-way selections.

**Tech Stack:** Node.js 24, TypeScript, Next.js 16, React 19, Three.js / React Three Fiber, CSS Modules, `node:test`, existing Three.js OBB utilities. No new runtime dependency or backend.

**Spec:** `docs/superpowers/specs/2026-10-29-botanical-tree-revamp-design.md`. Read it together with `research/tree-botany-2026-10-29.md`, `research/tree-revamp-2026-10-29.md`, and `research/tree-reference-board.html`.

## Global Constraints

- Use `C:/Users/jbree/.codex/worktrees/local-environment/mneme`, baseline `2f6bb3e` on `main`; preserve its existing `next-env.d.ts` edit and leave the older original chat checkout and sibling prototypes untouched.
- The user selected several botanical procedural models with seeded variation, real seasonal leaf/flower cycles, and a visual reference board. The nine silhouettes on that board are schematic proposals; actual voxel renders must pass their own reference review.
- Preserve letters, stored seeds, legacy `% 8` identity, tree positions, retained plots, and the shared simulation clock. Existing trees receive new anatomy at the same saved growth progress. No seed tagging, `% 9` legacy remapping, storage version bump, or rewriting legacy letters.
- Native execution is the previously accepted method. Review this new plan/spec/board before implementation; do not dispatch task implementers until the user chooses a different method.
- Read target `AGENTS.md` and bundled Next.js client-component guides before component changes. Node.js 24; two-space indentation, single quotes, semicolons; keep browser resource/rendering work out of generation modules.
- Keep `kind: 'wood' | 'leaf'` and parent/anchor/growth invariants. New geometry must have actual oriented support contact, not just overlapping unrotated bounds. Whole leaf/flower motifs share an organ ID.
- Hard limits: 12,000 voxels/tree, 512 skeleton nodes, 256 attractors, 128 colonization iterations, 512 attractor sampling attempts. No-progress exits are mandatory; prune whole terminal subtrees/organs at limits.
- Copy species proportions, miniature height ranges, seasonal fractions/colours, organ definitions, and Moonveil emission values from the spec. They are explicit art-direction choices, not source-measured botanical constants.
- Cache anatomy by resolved species plus seed; season changes only affect appearance. Keep one tree instanced draw/tree, no new scene lights or postprocessing, no per-leaf React components/state, no new runtime dependency.
- Preserve audio, rain/snow controls, terrain/placement, and storage privacy. All fixtures and evidence use synthetic letters. Do not put reference photographs in app assets.
- Final required checks: `npm test`, `npm run typecheck`, `npm run build`, `git diff --check`, reference comparisons, desktop/mobile, planting/reload/deletion, and 49-plot performance observations. Record actual results and limits in `VERIFICATION.md`.

## Review Focus

- Existing seed values, explicit ninth-tree selections, malformed optional metadata, and identical seeds of different species: species and letters survive reload without cache collisions (Task 5).
- Dense crotches, rotated leaf motifs, low willow shoots, degenerate crown sampling, and budget exhaustion: rooted, finite, attached geometry with complete parent graphs (Tasks 1–4).
- Mature/paused trees switching season and winter-hidden organs: appearance updates without regenerating anatomy, orphaning leaf lobes, or leaving invisible selection surfaces (Task 6).
- Season changes during deletion and seasonal debris from hidden flowers/leaves: the fallen tree keeps its captured appearance, structural contact remains valid, and debris comes from currently visible organs (Task 6).
- Nine species/variant seeds at normal distance, 49 plots, mobile zoom and reduced motion: the reference identity remains visible without exceeded budgets, extra lights, unbounded generation, or unmeasured performance claims (Tasks 2–4, 7).

---

## File responsibilities and shared interfaces

| Files | Responsibility |
| --- | --- |
| `lib/tree.ts` | Stable public facade and dispatch; legacy seed mapping and selection helpers |
| `lib/trees/types.ts`, `random.ts`, `profiles.ts` (new) | Geometry/organ contracts, unchanged PRNG, explicit botanical dimensions/palettes/limits |
| `lib/trees/voxel-builder.ts`, `foliage.ts` (new) | Pipe radii, connected deduplicated tapered wood, attached whole-organ voxel motifs, normalized growth |
| `lib/trees/colonization.ts`, `broadleaf.ts`, `flowering.ts` (new) | Bounded outer branching and distinct broadleaf/flowering scaffold construction |
| `lib/trees/pine.ts`, `spruce.ts`, `willow.ts`, `moonveil.ts` (new) | Independent diagnostic construction models |
| `lib/trees/phenology.ts` (new) | Stable organ visibility, seasonal colour and resolved base emission |
| `lib/garden.ts`, `components/Garden.tsx`, `components/Scene.tsx` | Optional species persistence, nine-way choice, identity-aware cache, environment passed to trees |
| `components/Tree.tsx`, `lib/tree-removal.ts` | Instanced seasonal appearance/emission, hidden-hit filtering, frozen visible deletion poses and structural contact |
| `lib/ambience.ts`, `components/environment/GardenAmbience.tsx` | Current-season leaf/petal eligibility and colours |
| `tests/tree-{pipeline,morphology,phenology}.test.ts` (new); existing garden/selection/removal/ambience tests | New deterministic contracts and retained integration protections |
| `scripts/verify-trees.mjs` (new) | Reproducible synthetic reference/contact-sheet and benchmark fixture generation; use existing installed tooling only |
| `VERIFICATION.md`, `screenshots/trees-*`, `recordings/trees-*` | Actual comparisons, seasonal/growth/deletion evidence and measured limits |

Define these shared types in `lib/trees/types.ts` and re-export current public types from `lib/tree.ts`:

```ts
type WoodOrgan = 'root' | 'trunk' | 'branch' | 'twig';
type Organ = WoodOrgan | 'leaf' | 'needle' | 'blossom' | 'fruit' | 'bud' | 'juvenile-leaf';
type SkeletonNode = { position: Vec3; parent: number; radius: number; organ: WoodOrgan; order: number };
type OrganSite = { node: number; direction: Vec3; organ: Exclude<Organ, WoodOrgan>; organId: number };
type TreeSkeleton = { nodes: SkeletonNode[]; sites: OrganSite[] };
type VoxelAppearance = { scale: number; color: string; emissive: number };
```

`Voxel` keeps its existing fields and adds optional `organ?: Organ`, `organId?: number`, `emissive?: number`. Untagged legacy test fixtures retain kind-derived defaults. `TreeSpecies` is the union of the nine labels; keep the original eight in a stable ordered `REAL_TREE_SPECIES` tuple and provide `TREE_PROFILES: Record<TreeSpecies, TreeProfile>`. `TreeProfile` exposes `height: readonly [number, number]`, `crownRatio: readonly [number, number]`, `bark: readonly string[]`, `leaf: readonly string[]`, and `blossom?: readonly string[]`; additional model tuning remains private to each builder.

All skeleton builders return nodes with earlier-parent indices and attachment sites referencing real nodes. Shared voxelization derives branch radii and connects cells before organ placement; sites attach to the resulting wood support, not a guessed nearest unrelated branch. Node/organ budgets are enforced in their owning construction stage, with a total voxel check before accepting a complete organ.

## Task 1: Build the shared connected skeleton-to-voxel pipeline

**Files:** Create `lib/trees/types.ts`, `random.ts`, `profiles.ts`, `voxel-builder.ts`, `foliage.ts`, `tests/tree-pipeline.test.ts`. Modify `lib/tree.ts` to re-export the unchanged PRNG/types while its existing generation path remains in service. Do not expose the ninth picker choice yet.

**Interfaces:** `voxelizeTree(skeleton: TreeSkeleton, seed: number, species: TreeSpecies): Voxel[]` in `voxel-builder.ts`; `appendOrgans(voxels: Voxel[], sites: readonly { parent: number; direction: Vec3; organ: Exclude<Organ, WoodOrgan>; organId: number }[], seed: number, species: TreeSpecies): void` in `foliage.ts`. These functions own fresh output arrays; they do not mutate the input skeleton. The latter appends only complete motifs to its owned output.

- [ ] **Step 0: Preserve the performance baseline before product edits.** Generate a synthetic 49-plot fixture with seeds `1000 + i` for `i=0..48`, existing seed-derived identity, fully grown letters, paused growth, Summer/Day/Clear and current living details enabled. Record seven warm 49-tree generation runs and a 300-frame browser sample at 1440×1000 and 390×844 after loading settles; save the fixture, median generation, frame-time p95, draw calls and environment details under this plan's verification workspace. These exact inputs are reused in Task 7. Use the bundled browser tooling and an isolated verification port; preserve the unchanged production baseline rather than trying to reconstruct a frame-time comparison after replacement.
- [ ] **Step 1: Write failing pipeline tests.** Pin `random(0)`'s first four samples exactly to `[0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111]`. Voxelize a bent Y skeleton twice and assert byte-equivalent results, unchanged input, exactly one root voxel, no duplicate wood cell keys, finite positive sizes, parent-before-child order, anchors equal parent positions, normalized growth and all intended voxels complete at 1. With Three.js `OBB`, assert actual parent/child intersection at maturity, including a rotated multi-block leaf motif. Assert a complete `organId` group is either appended or omitted at the 12,000 ceiling; no parent/index corruption.
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-pipeline.test.ts`; expect FAIL for the missing pipeline.**
- [ ] **Step 3: Implement the shared pipeline.** Copy the current PRNG unchanged. Use pipe exponent 2.3, a shared wood grid of **0.08 world units**, and **0.06** as the starting leaf motif cell size. Join tapered volumes/crotches through shared deduplicated cells and preserve rooted support order. Append attached organ blocks with stable IDs and appropriate tags; never enlarge leaf bounds to bridge a missing petiole. Normalize support-derived timing; tag transient juvenile leaves and schedule blossoms at growth ≥0.65. Implement pipeline caps/no-progress guards, not an arbitrary final array slice. Preserve current `generateTree(seed)` output until a family switches in its own task.
- [ ] **Step 4: Run the pipeline test and `npm test`; expect PASS.** Add rotated-contact assertions across the emitted motif cells and branching crotch; existing terrain/random-dependent tests must stay unchanged.
- [ ] **Step 5: Commit the named files, subject `Add connected botanical voxel pipeline`.**

## Task 2: Rebuild oak, birch and maple around diagnostic scaffolds

**Files:** Create `lib/trees/colonization.ts`, `broadleaf.ts`, `tests/tree-morphology.test.ts`. Modify `lib/trees/profiles.ts`, `foliage.ts`, `lib/tree.ts`, and affected anatomy assertions in `tests/garden.test.ts`.

**Interfaces:** `buildBroadleafSkeleton(seed: number, species: 'Oak' | 'Birch' | 'Maple'): TreeSkeleton`; `colonize(seed: number, skeleton: TreeSkeleton, attractors: readonly Vec3[]): TreeSkeleton` returns a fresh bounded extension without mutating input; both feed Task 1's `voxelizeTree`. `lib/tree.ts` dispatches these three legacy species to the new path and retains other current families for now.

- [ ] **Step 1: Write failing morphology tests for seeds `0/8/16` Oak, `1/9/17` Birch, `2/10/18` Maple.** Assert spec height/crown-ratio ranges; Oak has the largest lower-bole cross-sectional occupancy of these three and spreading forks; Birch has a taller, narrower open crown with fine downward terminal shoots; Maple is lower, layered and green in base foliage, with opposite shoot attachment sites and palmate motifs. All nine outputs satisfy Task 1's graph/contact checks and ≤12,000 voxels. Add unreachable/coincident attractor and empty-crown cases proving finite termination within the iteration/sampling/node limits. Replace the obsolete permanent-red maple assertion with the intended green base geometry; seasonal autumn belongs to Task 6. For converted/tagged families, replace the old unrotated contact proxy with OBB contact and replace the blanket “every leaf carries rotation” assertion with the real motif/orientation contract. Keep the old proxy only for not-yet-converted families until Task 4 removes their generator; preserve parent/growth coverage throughout.
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-pipeline.test.ts tests/tree-morphology.test.ts tests/garden.test.ts`; observe failures on the new diagnostic assertions.**
- [ ] **Step 3: Implement the three scaffold models and bounded crown filling.** Oak uses a stout low bole and unequal spreading heavy limbs; Birch retains a slender dominant line with ascending branches and pendant fine tips; Maple forks lower into separated layers and opposite fine shoots. Use species-shaped, asymmetric attraction regions only for outer branching, with shared colonization limits and no-progress exit. Emit the researched leaf motifs and coherent bark patterns: oak furrows, pale birch upper bark with a dark mature base, smoother slender maple stems. Do not generate every major limb as an exact leaf-arrangement pair or copy one crown envelope across the three.
- [ ] **Step 4: Re-run focused tests; expect PASS.** Capture actual generated front/side, grayscale silhouette and bare-wood studies for all three seeds beside dossier photos at fixed camera settings. Inspect normal-distance and close views. Adjust geometry until the species identities survive removal of colour; record the comparisons rather than claiming the numeric tests establish realism.
- [ ] **Step 5: Commit the task files, subject `Rebuild oak birch and maple anatomy`.**

## Task 3: Rebuild cherry and jacaranda as different flowering trees

**Files:** Create `lib/trees/flowering.ts`. Modify `profiles.ts`, `foliage.ts`, `lib/tree.ts`, `tests/tree-morphology.test.ts`, and relevant `tests/garden.test.ts` flower assertions.

**Interfaces:** `buildFloweringSkeleton(seed: number, species: 'Cherry Blossom' | 'Jacaranda'): TreeSkeleton`, using the shared pipeline/colonizer. Blossom and green-leaf sites are separate tagged organ groups on real supporting shoots.

- [ ] **Step 1: Add failing assertions for seeds `3/11/19` Cherry and `6/14/22` Jacaranda.** Assert spec proportions; Cherry has stiff ascending vase arms and a more open central top than a central-pole model; Jacaranda has a longer visible bole, outward forks, finer bipinnate foliage groups and blue-violet terminal panicles. Cherry blossoms are clustered pink double-flower motifs, not recoloured simple leaves; jacaranda blossoms are separate panicle groups. Assert blossom starts ≥0.65, each visible motif has wood support, leaf/flower groups have different IDs/tags, and all graph/budget checks pass. Replace colour-share tests that assumed permanent blooming with organ/attachment checks.
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-morphology.test.ts tests/garden.test.ts`; observe FAIL on the old flowering models.**
- [ ] **Step 3: Implement the two scaffold/organ models.** Use upright-spreading 'Kanzan' branches, horizontal bark lenticels and bronze-capable new foliage; for jacaranda use open longer-stemmed forks, subdued rough gray bark, small leaflet pairs on subdivided fronds and separate purple panicles. Keep air between major crowns. Reuse low-level colonization/attachment code without treating these as pink and purple versions of the same tree.
- [ ] **Step 4: Re-run tests; expect PASS.** Capture the same three-seed front/side, bare structure and silhouette comparisons against their distinct reference pages. Inspect leaf and flower close-ups; reject solid spherical bloom masses or flowers sprouting from an immature seedling stem.
- [ ] **Step 5: Commit the task files, subject `Rebuild flowering cherry and jacaranda`.**

## Task 4: Separate mature pine, spruce and willow construction

**Files:** Create `lib/trees/pine.ts`, `spruce.ts`, `willow.ts`. Modify `profiles.ts`, `foliage.ts`, `lib/tree.ts`, `lib/tree-removal.ts`, `tests/tree-morphology.test.ts`, `tests/garden.test.ts`, and real-generator removal regressions in `tests/tree-removal.test.ts`.

**Interfaces:** `buildPineSkeleton(seed: number): TreeSkeleton`, `buildSpruceSkeleton(seed: number): TreeSkeleton`, `buildWillowSkeleton(seed: number): TreeSkeleton`. After dispatching these, all eight real families use the new pipeline; remove the replaced monolithic generator and unused old palettes/helpers from `lib/tree.ts`.

- [ ] **Step 1: Write failing tests for seeds `5/13/21` Pine, `7/15/23` Spruce, `4/12/20` Willow.** Pine: upper irregular crown and clear lower bole, <15% of needle groups below 40% height, paired needles, orange upper versus darker lower bark. Spruce: narrow leader, decreasing outer branch reach toward the top, pendant secondary branchlets, individual needles around shoots, hanging cones. Willow: rising/arching structural arms followed by finer pendant shoots, with ≥20% of its leaf groups below 35% height and no foliage below the local root plane. Assert all spec ranges, budgets and support checks. Replace the old assertion that both conifers must share shrinking low-to-high foliage tiers. Retain the seed-4/12 falling-willow regression, with tagged structural collision (Task 6 finalizes snapshots).
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-morphology.test.ts tests/garden.test.ts tests/tree-removal.test.ts`; observe the new form checks fail.**
- [ ] **Step 3: Implement independent construction rules.** Mature pine uses an irregular upper scaffold with sparse outer needle tufts and branch loss below; spruce uses a continuous leader, uneven whorls, smaller hanging secondary shoots and denser radial needles. Willow uses arching supports and separately sampled gravity-biased trailing shoots with disconnected-looking gaps avoided by real twig support. Give cones `organ: 'fruit'`; they cannot serve as structural collision support. Remove the superseded generator rather than retaining parallel legacy geometry indefinitely. Keep the public eight-label order unchanged.
- [ ] **Step 4: Re-run focused tests; expect PASS.** Perform the same three-seed reference comparisons. Inspect pine beside spruce in grayscale, and willow in winter bare-branch view. Check generated fall/contact for all three models; if small wood cells invalidate the old contact size heuristic, introduce tagged support selection here and retain its legacy-fixture fallback, carrying that interface into Task 6.
- [ ] **Step 5: Commit the task files, subject `Give pine spruce and willow distinct structures`.**

## Task 5: Add Moonveil and safe explicit nine-way identity

**Files:** Create `lib/trees/moonveil.ts`. Modify `profiles.ts`, `foliage.ts`, `lib/tree.ts`, `lib/garden.ts`, `lib/tree-removal.ts`, `components/Garden.tsx`, `components/Scene.tsx`, `components/Tree.tsx`, `lib/ambience.ts`, `tests/tree-selection.test.ts`, and `tests/tree-morphology.test.ts`.

**Interfaces:**
- `buildMoonveilSkeleton(seed: number): TreeSkeleton` feeds the shared pipeline.
- `Letter.species?: TreeSpecies`; include it in `TreeRecord`'s picked fields.
- `treeFamily(seed: number, species?: TreeSpecies): TreeSpecies`; `generateTree(seed: number, species?: TreeSpecies): Voxel[]`; retain one-argument legacy behavior.
- `chooseTree(seed: number, requested: string): { seed: number; species: TreeSpecies }`. A known manual choice resolves exactly; empty means a seeded nine-way Surprise me choice; an unknown nonempty string returns the unchanged seed and its legacy derived species. For original eight manual choices, retain `seedForTree`'s numeric result; Moonveil keeps the raw seed and relies on explicit metadata.
- `TREE_SPECIES` now exposes all nine labels in original order plus Moonveil. `seedForTree` continues using the original eight-count encoder and returns unchanged seed for Moonveil/unknown/empty; update tests to exercise the new nine-way chooser instead of treating the old seed-only helper as a nine-way identity format.

- [ ] **Step 1: Write failing identity/storage and Moonveil tests.** For raw seeds `[0,7,8,1024,4294967295]`, all nine `chooseTree` manual choices generate and resolve their requested species. `treeFamily(seed)` remains the old mapping for `[0..4095]`, `2**32`, `2**40+3`, and `Number.MAX_SAFE_INTEGER`; old letter JSON round-trips unchanged. New Moonveil and Oak records with the same seed produce different cached geometry and reload correctly. Malformed optional `species` metadata is removed/ignored while preserving the valid letter body, seed, position and plot. Across seeds `[0..4095]`, Surprise me is deterministic and includes all nine types. Moonveil seeds `100/200/300` satisfy graph/budget/range checks, have attached offset twists/tiers/pods, and an emission bound ≤0.6; all real species have zero emission.
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-selection.test.ts tests/tree-morphology.test.ts`; observe FAIL before adding the ninth identity/model.**
- [ ] **Step 3: Implement identity and Moonveil end to end.** Store explicit species only on new plantings; preserve legacy records without introducing defaults into their saved JSON. Validate optional metadata without discarding otherwise valid letters. Update every `treeFamily`/`generateTree`/`TreeRecord` caller and key the scene cache by `${resolvedSpecies}:${seed}`; cache cleanup uses the same keys. Use `Moonveil (mystical)` as the option's display text, with raw value `Moonveil`. Build connected twisting strands, unequal crown layers and attached small gold pods per spec. Add an optional per-instance emission attribute to the existing tree material; real trees write zero and keep the current material appearance. Use the spec's daylight multiplier with no extra lights/draws. Preserve the existing placement/growth/deletion plumbing.
- [ ] **Step 4: Re-run tests and `npm run typecheck`; expect PASS.** Browser-plant/reload the ninth choice and a real tree; exercise Surprise me and the existing draft reader. Inspect Moonveil at day/night on desktop/mobile, near/far and beside real species. Verify branch support and a distinct bare silhouette; reject a recoloured willow or disconnected floating ornaments.
- [ ] **Step 5: Commit the task files, subject `Add Moonveil with safe nine-way tree identity`.**

## Task 6: Apply seasonal organ appearance consistently to trees, debris and removal

**Files:** Create `lib/trees/phenology.ts`, `tests/tree-phenology.test.ts`. Modify `components/Tree.tsx`, `components/Scene.tsx`, `lib/tree-removal.ts`, `lib/ambience.ts`, `components/environment/GardenAmbience.tsx`, `tests/tree-removal.test.ts`, `tests/ambience.test.ts`, and remaining obsolete anatomy tests in `tests/garden.test.ts`.

**Interfaces:** `sampleTreeAppearance(voxel: Voxel, species: TreeSpecies, season: Season, growth?: number): VoxelAppearance`, with growth default 1, in `phenology.ts`. `Tree` receives `environment: Pick<EnvironmentFrame, 'season' | 'daylight'>`. Extend `freezeBlocks(data: Voxel[], displayedGrowth: number, appearance?: readonly VoxelAppearance[]): FrozenBlock[]`; frozen blocks carry optional organ/emission and resolved visible scale/colour. Preserve its two-argument fixture behavior. Keep `leafSources(...)`/`leafOrigin(source, time, season)` call shapes, but resolve each source's explicit/legacy species and current visible organ; use the same appearance helper for spawned debris colour.

- [ ] **Step 1: Write failing phenology/integration tests.** For all nine species × all six season values, assert spec fraction configuration and deterministic whole-organ visibility; no half maple leaf after thinning. Check summer Maple green, Cherry blossom scale zero outside spring, Jacaranda residual summer bloom, deciduous winter leaf/blossom scale zero, Pine/Spruce needles retained, neutral/tropical healthy summer fallback, real-tree emission zero and Moonveil bounded emission. Blossoms cannot appear below growth .65; juvenile leaves disappear above .2. Anatomy JSON/hash remains unchanged across sampling. A supplied winter appearance excludes hidden leaves from `freezeBlocks`; autumn captures its displayed colours. Switching season after capture does not change frozen blocks. Debris rejects hidden/wrong organ classes, evergreen needles and Moonveil, and uses visible pink/violet/autumn leaf colours. Test structural contact on small tagged wood cubes as well as old untagged fixture blocks.
- [ ] **Step 2: Run `node --experimental-strip-types --test tests/tree-phenology.test.ts tests/tree-removal.test.ts tests/ambience.test.ts`; observe FAIL for missing/inconsistent seasonal appearance.**
- [ ] **Step 3: Implement the pure seasonal resolver.** Copy the exact density/palette rules from the spec, use stable organ-ID thresholds, retain wood, and gate complete motifs. Treat flowers/needles/fruit separately from ordinary leaves. Compute new-tree tag-driven appearance and kind-derived legacy fixture fallbacks without mutating the geometry array or PRNG stream.
- [ ] **Step 4: Wire rendering, picking and snapshots.** Reuse fixed instanced arrays; write colours/emission on appearance changes and force transform invalidation even when growth has not advanced. Hidden organs get zero scale and are filtered from raycast hits. Freeze the displayed pose/organ set/colour/emission once at removal start; do not put changing season appearance in dependencies that rebuild the falling snapshot. Keep tagged trunk/branch structural contact plus the old size fallback. Resolve debris eligibility and colours from the same current appearance; no spring petal from a green leaf and no winter debris from a hidden group. Update any source cache metadata/key that depended on seed alone.
- [ ] **Step 5: Re-run focused tests and `npm test`; expect PASS.** Browser-check paused mature season switches, winter selection surfaces, summer-to-autumn-to-winter changes, environment/master toggles, and season changes during partial/mature deletion. Verify retained land, vacancy reuse, growth continuity, reduced motion and no hidden-organ resurrection. Capture the same tree/seed/camera in four seasons.
- [ ] **Step 6: Commit the task files, subject `Apply botanical seasons to tree organs and effects`.**

## Task 7: Prove resemblance, integrate the nine-species garden and record evidence

**Files:** Create `scripts/verify-trees.mjs`; update `VERIFICATION.md`; capture `screenshots/trees-*` and `recordings/trees-*`. Production fixes found by the checks belong to their owning files/tests, not a second generator implementation or a permanent gallery route.

**Interfaces:** The verification script imports the public facade and pure seasonal sampler. It generates synthetic fixtures, metric JSON and repeatable study inputs. It does not install browser packages, create a product route, read real letter bodies or add runtime assets. Use the available bundled browser tools for renders.

- [ ] **Step 1: Add an assert-based self-check to the verification script.** Verify it resolves all nine labels, selects the exact three-seed groups from Tasks 2–5, produces all 54 species/season states and finite metrics, and records source/reference links without downloading photographs. Run `node --experimental-strip-types scripts/verify-trees.mjs --check`; expect failure until the script is implemented, then PASS.
- [ ] **Step 2: Produce the actual comparison studies and inspect them.** For each real species, juxtapose dossier reference links/photos with actual front/side colour, black silhouette, bare branch and leaf/bark close-up renders. Show all nine at growth **.05, .25, .60, 1** and the same representative seed in spring/summer/autumn/winter. Inspect multiple seeds at normal garden distance. Fix geometry that misses diagnostic traits even when tests pass; add a targeted regression for each structural defect rather than changing numeric assertions to bless it.
- [ ] **Step 3: Exercise the complete browser garden.** At **1440×1000** and **390×844**, plant/select all nine, reload legacy/new fixtures, and compare IDs/seeds/species/positions/plots. Cover zero/one/49 plots, explicit species sharing the same seed, partial/mature deletion, a season switch during falling, hidden/resumed tab, reduced motion and near/far zoom. Verify no new lights/draws per tree, no console errors/overflow, and no ghost leaf hit surfaces. Keep the existing weather/audio checks targeted to any interface actually changed.
- [ ] **Step 4: Benchmark against Task 1 Step 0's saved baseline on the identical legacy-identity fixture.** Report per-species voxel counts/generation times, full 49-tree median generation, draw calls and p95 frame time from the same browser/environment. Measure an additional 49-tree mix including Moonveil separately rather than comparing a different mix to baseline. Investigate >25% regression in 49-tree median or p95 frame time. Limit redundant cells, sampling and microdetail before sacrificing silhouette/branch structure. Retain fixed budgets. Clearly label headless measurements; physical-device FPS/memory remains unclaimed without a device test.
- [ ] **Step 5: Run `npm test`, `npm run typecheck`, `npm run build`, and `git diff --check`; all must exit zero.** Snapshot and restore the existing development `next-env.d.ts` content around builds rather than staging generated type-import changes. Run one fresh whole-change source review after implementation, with the spec, references, Review Focus, measured evidence and any deviations; fix material findings with observed failing/passing checks.
- [ ] **Step 6: Write actual verification results and commit only task-owned files.** Record the reference comparisons, seasonal matrix, growth/deletion/persistence outcomes, output budgets, timing measurements, evidence paths and unperformed subjective/hardware checks. Update plan checkboxes from real evidence. Subject `Verify botanical tree revamp and seasonal behavior`. Leave the requested worktree in place; do not merge/push/deploy without separate instruction.

## Plan self-review

Coverage: trunk/root/branch/leaf fidelity is owned by Tasks 1–4 and the reference gate; the distinct ninth tree and all persistence/caller changes by Task 5; confirmed seasonal cycles, debris and frozen removal by Task 6; proof at multiple seeds/views, normal distance and realistic garden sizes by Task 7. No `Math.random`, modulo-nine migration, new runtime dependency, permanent comparison UI or physics/biological simulation is required.

The research/design builder check found **nothing important left**. This plan was separately self-reviewed for type/signature consistency, dependency order, all five Review Focus conditions, replacement of obsolete assertions, and actual visual rather than numerical acceptance. Application implementation has not started.

## Execution handoff

Please review this plan with the design and visual board, especially the chosen real exemplars, applying the new appearance to existing trees, seasonal states, and Moonveil. Retain **Native** execution from the preceding approved work: implement these tasks in this session, then obtain one fresh final source review. Wait for the user's review before implementation. If the user chooses Subagent-driven instead, use the corresponding required skill and task reviews.
