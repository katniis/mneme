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
