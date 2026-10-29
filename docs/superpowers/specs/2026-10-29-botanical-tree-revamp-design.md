# Botanical tree revamp and Moonveil

Status: proposed for user review. Research and design only; no application implementation yet.

## Confirmed intent

Completely replace the eight real tree depictions with recognizable, reference-led voxel trees: their trunk, branch hierarchy, foliage, and overall form must resemble their real exemplars. Add a ninth fictional tree with its own creative form. The user selected **several botanical procedural models with seeded variation**, confirmed **real seasonal leaf and flowering cycles**, and requested a **visual reference board**.

Work in `C:/Users/jbree/.codex/worktrees/local-environment/mneme`, currently `main` at `2f6bb3e`. Preserve the existing `next-env.d.ts` edit. The original chat checkout is a different, older branch. Existing trees should acquire the revamped geometry on reload, while their letter, seed, species identity, position, plot, and growth clock remain intact. This last application-to-existing-trees behavior is the agent's interpretation of “full revamp,” highlighted for review.

## Evidence and references

- [Botanical dossier](../../../research/tree-botany-2026-10-29.md): primary horticultural/forestry descriptions, photographs, qualifications, and characteristic seasonal states for each species.
- [Algorithm and code assessment](../../../research/tree-revamp-2026-10-29.md): research papers, measured baseline, current generator risks, compatibility decision.
- [Reference board](../../../research/tree-reference-board.html): linked real photographs and schematic target studies with season, silhouette, and bare-branch controls. These illustrations are design studies, not generated voxel previews or proof of implementation quality.

References establish relative structure and organ organization, not one universal branch angle or exact flowering date. Botanical facts and rendering choices remain distinguished. Model established open-grown specimens; do not mix a sapling stem with a veteran crown or selected dwarf habit.

## Approach and rejected alternative

Use different construction rules for broadleaf scaffolds/outer branching, flowering vase crowns, mature pine, spruce whorls, willow curtains, and Moonveil. Share seeded randomness, a connected skeleton representation, tapered voxelization, organ placement, and growth validation. Broadleaf outer shoots can use bounded space colonization around species-shaped crown volumes; it must not override the diagnostic scaffold. Use a pipe-model exponent of **2.3** as a rendering starting point, then inspect the result against references.

The user chose this over authored branch templates with variation: templates give tighter canonical control but less natural structural variation. A full light/resource/physiology simulation is out of scope. No new runtime dependency, external model, generated bitmap asset, or service is required.

## Species targets

Keep the existing eight labels and append **Moonveil**. The numeric ranges below are **proposed miniature art-direction bounds**, not botanical measurements. Width is crown width, measured without isolated buds/fruit. Random variation must remain inside each range; existing tree positions do not move to accommodate a new crown.

| Label / reference | Established form and close detail | Height target | Crown width / height |
| --- | --- | --- | --- |
| Oak / *Quercus robur* | Short stout flared bole; uneven spreading heavy limbs; dark fissured bark; rounded-lobed leaf groups | 6.4 ± 0.5 | 0.90–1.20 |
| Birch / *Betula pendula* | Slender pale upper trunk and darker rough base; ascending framework with pendant fine tips; small pointed leaf groups and air gaps | 7.0 ± 0.5 | 0.40–0.65 |
| Maple / upright green *Acer palmatum* | Low fine forks and separated spreading layers; opposite leaves on shoots; pointed palmate lobes | 4.6 ± 0.4 | 0.90–1.30 |
| Cherry Blossom / *Prunus* 'Kanzan' | Stiff ascending vase arms that spread; horizontal bark lenticels; clustered double pink blossoms and bronze new leaves | 5.2 ± 0.4 | 0.90–1.20 |
| Weeping Willow / weeping *Salix babylonica* habit | Stout arching skeleton; many finer pendant shoots with broken curtains of long narrow leaves; gray-brown furrowed bark | 6.0 ± 0.4 | 1.00–1.25 |
| Pine / established *Pinus sylvestris* | Clear lower bole, orange upper bark, irregular spreading upper crown; paired blue-green needles in separated tufts; small woody cones | 7.5 ± 0.6 | 0.55–0.80 |
| Jacaranda / *Jacaranda mimosifolia* | Longer visible bole and open spreading forks; rough gray bark; fine bipinnate sprays; blue-violet flower panicles | 6.4 ± 0.5 | 0.85–1.20 |
| Spruce / *Picea abies* | Dominant leader, tapering whorled framework, drooping secondary branchlets; short individual needles around shoots; hanging cones | 8.0 ± 0.6 | 0.35–0.55 |
| Moonveil / fictional | Pale twisting connected stem, offset crown layers, indigo/teal leaves and small suspended golden seed pods; restrained night emission | 7.2 ± 0.5 | 0.75–1.00 |

All roots must meet the existing terrain. Use modest base flares appropriate to the species; no identical exposed root stars on every tree. Preserve crotch continuity and progressively finer branch orders. Major limbs are asymmetric rather than equally spaced identical spokes. Leaves are connected organ groups, not arbitrary thin plates enlarged until their unrotated bounds touch. Coherent bark patches/ridges/lenticels must follow the wood, rather than random high-contrast cubes.

Keep recognizability at the normal garden camera. Fine leaf serrations are simplified into small voxel motifs: rounded oak lobes, pointed birch blades, palmate maple lobes, serrated cherry blades, narrow willow leaves, paired pine fascicles, bipinnate jacaranda sprays, and spruce needles. At close scale, explain the organ with connected blocks; at distance, retain masses, gaps, and the scaffold silhouette. This is botanical fidelity in a voxel medium, not a promise of individual-leaf photorealism.

## Core generation contract

- Keep `lib/tree.ts` as the existing import facade. Preserve `random(seed)`, `Vec3`, `Voxel`, `elementProgress`, and legacy call forms.
- Add `TreeSpecies` as the union of the nine labels. Extend `Voxel` with optional `organ`, `organId`, and `emissive` fields. Organs: `root | trunk | branch | twig | leaf | needle | blossom | fruit | bud | juvenile-leaf`. Preserve `kind: 'wood' | 'leaf'` for compatibility.
- A shared skeleton contains parent-before-child branch nodes with position, radius, wood organ and growth order, plus organ attachment sites. Construction is separate from voxel emission. Its exact interfaces are pinned in the plan.
- Wood is voxelized as continuous tapered volumes with deduplicated cells and shared crotches. Cross-section cells connect through a rooted support tree; support links must not jump to a disconnected nearby limb. One primary root voxel; all other voxels have a valid earlier parent, including extra base cells.
- Every non-root voxel touches its support in its actual orientation at full growth. Leaves within one motif share `organId`, so seasonal thinning cannot leave isolated lobe fragments. No leaf inflation to repair incorrect attachment.
- Keep `anchor = parent.position`, `start >= parent.end`, finite positive dimensions, `0 <= start < end <= 1`, deterministic ordering and all intended growth finished at 1. Seedling leaves may be tagged `juvenile-leaf` and disappear after growth 0.2. Flower groups begin at growth **0.65 or later**. The accelerated growth display remains an illustration, not actual botanical years.
- Bounds: **12,000 voxels/tree**, **512 skeleton nodes**, **256 attractors**, **128 colonization iterations**, **512 sampling attempts for a crown attractor set**. Stop on exhaustion/no progress. A limit must prune complete terminal subtrees/organs, never truncate a parent graph or emit an unfinished dangling organ. No dependency or unbounded retry loop.
- Retain one instanced tree draw per tree. No individual React leaf components, per-frame React state, new scene lights or postprocessing. Cache mature geometry by resolved species plus seed; seasons never regenerate skeletons.

## Identity and saved data

Do **not** change the legacy `% 8` mapping to `% 9`, tag numeric seed bits, reserve seed ranges, or rewrite existing seeds. The storage reader accepts more than uint32; all previously valid nonnegative integer seeds must retain the old derived species when no explicit species exists.

Add optional `species?: TreeSpecies` to `Letter`. New plantings explicitly store their selected/resolved species. Legacy records remain valid without a migration or version bump; invalid optional species is ignored while preserving the otherwise valid letter. `treeFamily(seed, species?)` accepts a valid explicit species, otherwise uses the original eight-type mapping. `generateTree(seed, species?)` uses that same resolution. `chooseTree(seed, requested)` resolves all nine manual choices and a deterministic nine-way Surprise me choice; legacy `seedForTree` continues to encode only the original eight exactly as before. The ninth choice requires explicit metadata. Update every caller, cache key, detail label, collection label, removal tree record, and debris source accordingly.

## Seasonal appearance

Resolve appearance separately from stable geometry. Use the resolved environment season and the real environment clock; the demo growth clock continues to control growth only. The fractions below are **chosen illustrative stage densities**, not measured calendar percentages. Select whole organ IDs with a stable seeded threshold. Applying a season twice yields exactly the same visible organs; no random resampling or stored-seed mutation.

| Species | Spring foliage / flowers | Summer foliage / flowers | Autumn foliage / flowers | Winter foliage / flowers |
| --- | --- | --- | --- | --- |
| Oak | .80 / 0, fresh green | 1 / 0, dark green | .55 / 0, yellow-brown | 0 / 0 |
| Birch | .75 / 0, light green | 1 / 0, green | .45 / 0, yellow | 0 / 0 |
| Maple | .80 / 0, green | 1 / 0, green | .65 / 0, red/orange/yellow | 0 / 0 |
| Cherry Blossom | .25 / 1, bronze foliage + pink blossoms | 1 / 0, green | .60 / 0, orange-bronze | 0 / 0 |
| Weeping Willow | .80 / 0, light green | 1 / 0, green | .70 / 0, yellow-green | 0 / 0 |
| Pine | 1 / 0, new growth accents | 1 / 0 | 1 / 0 | 1 / 0 |
| Jacaranda | .20 / 1, violet flowers | 1 / .10, green + residual bloom | .80 / 0, warm green | .20 / 0, illustrative dry-season thinning |
| Spruce | 1 / 0, new growth accents | 1 / 0 | 1 / 0 | 1 / 0 |
| Moonveil | 1 / 0, opalescent teal | 1 / 0, indigo/teal | 1 / 0, violet/amber accents | 1 / 0, silver/cyan |

`neutral` and `tropical` use healthy full green summer foliage for real trees, with no cherry/jacaranda mass flowering. Moonveil uses its summer state. This preserves a stable non-dormant fallback without pretending local weather predicts flowering. Jacaranda's dry-season mapping is an explicitly illustrative warm-climate cycle; no frost-survival simulation.

Hidden seasonal organs have zero instance scale and must be excluded from selection/raycast hits and removal snapshots. Mature trees must update when the season changes even if growth is paused or complete. Cap/source arrays remain stable. Existing spring petals/autumn leaves must originate only from currently visible matching blossom/leaf groups and use their current colours; pine/spruce needles and Moonveil do not become deciduous debris.

When deletion begins, snapshot the visible pose, organ set, colours and emission once. Changing season while the tree falls must not rebuild or recolour that snapshot. Structural collision uses organ tags (`trunk`/`branch`) for new trees, with the current size-based fallback for legacy test fixtures; small wood voxels still form a real trunk. Existing ground retention/reuse and reduced-motion deletion continue to work.

## Moonveil design

Build two offset, twisting woody strands that connect at the base and feed unequal crown layers. All visible wood, foliage and hanging pods remain attached; fiction does not excuse disconnected geometry. Use subtle silver/gray bark, indigo-to-teal foliage, and small warm gold pods attached by fine stems. Avoid a giant floating halo, oversized particles, extra trees' lights or a recoloured willow silhouette.

Maximum base emission is **0.6 for pods**, **0.12 for sparse vein/tip accents**, **0 for real trees**. Use one per-instance emission attribute in the existing instanced material and a daylight multiplier `0.25 + 0.75 * (1 - daylight)`; no new light or bloom pass. Freeze that resolved appearance on removal. Foliage remains through all four seasons with the palette shifts above. No new mystical particle system is part of this request.

## Acceptance gates

1. Reference gate per family: real habit/bark/foliage reference beside actual generated front/side renders, black silhouettes, and bare-branch views. Review at least **three seeds per species**; exact seeds in the plan. Revise geometry when resemblance fails; passing numeric bounds is insufficient.
2. Determinism/connectivity: all nine identities, all parent/growth invariants, oriented contacts, no duplicate wood cells, bounded output and invalid optional metadata preservation. Retain meaningful existing garden/removal tests, replacing obsolete permanent-red/permanent-flower/shared-conifer assumptions.
3. Phenology: all **nine species × six environment seasons**, stable whole-organ thinning, summer green maple/no mass cherry blossoms, deciduous bare winter, evergreen needles, and current-only debris. Paused growth still reflects season changes; anatomy hash is unchanged.
4. Integration: manual nine-way choice, Surprise me, old storage and new ninth-tree reload, explicit/legacy seed collision, planting, mature/partial deletion and vacancy reuse, season change during deletion, reduced motion, hidden/resumed tabs, desktop/mobile and 49-plot garden.
5. Bounds/performance: benchmark identical fixtures before/after on the same environment, record generation time, voxel counts, scene draw calls and mobile frame observations. Diagnose a >**25%** regression in median 49-tree generation or p95 frame time; reduce redundant work/detail without replacing botanical structure with generic crowns. Do not claim hardware FPS from headless emulation. Keep all evidence synthetic and record actual checks in `VERIFICATION.md`.

## Non-goals and decisions for review

No island placement/terrain rewrite, changes to letter content or clock semantics, procedural forest competition between different planted trees, disease/pruning simulation, exact local bloom prediction, new audio/weather features, download of reference photos into app assets, or new runtime dependencies.

Review the selected exemplars, application to existing trees, illustrated seasonal states, the Moonveil concept and the reference board before implementation. Native execution from the previous work is retained unless the user chooses a different method. The complete plan is in `docs/superpowers/plans/2026-10-29-botanical-tree-revamp.md`.
