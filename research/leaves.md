# Leaf realism for the Mneme voxel tree generator

## Question

How should the leaf algorithms in Mneme's voxel tree generator change so
foliage depicts real-world tree leaves more closely, in placement, shape,
orientation, clustering, colour, and per-species morphology — within the
existing voxel budget and without breaking the physical-attachment
invariant?

Scope: only this file proposes changes. No code was edited.

## Sources actually inspected

Every external claim below traces to a URL in this table that was fetched
and returned content in this session. Failed fetches are listed separately
under Open gaps and are not cited as evidence.

| # | Source | What was used |
|---|--------|---------------|
| S1 | [Unified rule of phyllotaxis (PMC6408360)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6408360/) | Golden angle 137.5°, spiral vs distichous / decussate / whorled arrangements |
| S2 | [Biophysical optimality of the golden angle (PMC4607949)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4607949/) | Golden angle at shoot apex, Fibonacci fractions in developed leaves |
| S3 | [Virginia Tech Dendrology — English oak, *Quercus robur*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=551) | Alternate, simple, obovate, 4–6 in, rounded lobes, short petiole, dark above / paler beneath |
| S4 | [Virginia Tech Dendrology — European weeping birch, *Betula pendula*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=15) | Alternate, simple, ovate-triangular, 2–4 in, doubly serrate, drooping fine branches |
| S5 | [Virginia Tech Dendrology — Sugar maple, *Acer saccharum*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=2) | Opposite, simple, palmately veined, 3–6 in, 5 rounded lobes, paler below, dense elliptical crown |
| S6 | [Virginia Tech Dendrology — Red maple, *Acer rubrum*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=1) | Opposite, simple, 3–5 palmate lobes, serrated, 2–4 in, green above / whitened beneath |
| S7 | [Virginia Tech Dendrology — Black oak, *Quercus velutina*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=39) | Alternate, simple, 4–10 in, sun leaves deep sinuses vs shade leaves shallow, shiny above / paler below |
| S8 | [Virginia Tech Dendrology — Weeping willow, *Salix babylonica*](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=131) | Alternate, simple, very narrowly lance-shaped, 3–6 in long × 3/8–1/2 in wide, hanging rope-like twigs |
| S9 | [Cornell Small Farms — How to ID needle-bearing trees](https://smallfarms.cornell.edu/2019/02/arent-they-all-just-pines-how-to-id-conifer-trees/) | Pine needles always in fascicles (bundles) of 2, 3, or 5 with basal sheath |
| S10 | [American Conifer Society — *Picea* (spruce)](https://conifersociety.org/conifers/picea) | Spruce needles attached singly in a spiral, each on a peg-like pulvinus; whorled branches, conical form |
| S11 | [Leaf angle distribution of natural populations (PMC4359433)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4359433/) | Leaf inclination varies; young, spaced plants orient for interception, crowding changes erection |
| S12 | [Leaf inclination in complex canopies (PMC6417479)](https://pmc.ncbi.nlm.nih.gov/articles/PMC6417479/) | Inclination is a major trait for light distribution; erect upper leaves improve penetration to deeper layers |
| S13 | [Early senescence in red maple and anthocyanin (PMC4844408)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4844408/) | Red autumn colour tracks anthocyanin accumulation; timing varies within the species |
| S14 | [Photosynthetic rates of sun vs shade leaves, *Hyptis* (PMC542216)](https://pmc.ncbi.nlm.nih.gov/articles/PMC542216/) | Sun leaves much smaller and thicker; shade leaves several times longer, less chlorophyll per area |
| S15 | [Sun vs shade anatomy in *Vitis* (PMC10029806)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10029806/) | Sun leaves allocate more to support structure; leaf area differs between sun and shade positions |
| S16 | [Leaf angle distribution (Wikipedia summary of de Wit types)](https://en.wikipedia.org/wiki/Leaf_angle_distribution) | Planophile vs erectophile canopies; some trees erectophile at top, planophile at bottom |
| S17 | [*Prunus serrulata* (Japanese cherry)](https://en.wikipedia.org/wiki/Prunus_serrulata) | Alternate, simple, ovate-lanceolate, 5–13 cm × 2.5–6.5 cm, serrate margin, short petiole, dense crown |
| S18 | [Are all the leaves on a tree the same? (Northern Woodlands)](https://northernwoodlands.org/outside_story/article/are-all-the-leaves-on-a-tree-pretty-much-the-same) | Interior / lower shade leaves thinner but larger, often many times larger than sun leaves |
| S19 | [Weber & Penn 1995, Creation and Rendering of Realistic Trees (Duke-hosted PDF)](https://courses.cs.duke.edu/fall01/cps296.3/resources/p119-weber.pdf) | Primary procedural-tree paper; PDF retrieved (2.2 MB). Levels: trunk 0, branches 1, sub-branches 2, leaves 3 |
| S20 | [Procedural fruit-tree framework using Weber & Penn (arXiv:1907.04759)](https://arxiv.org/abs/1907.04759) | Weber & Penn parameter set (branching frequency, radius decrease, branch direction, height/length ratio); leaves added on the naked tree |
| S21 | [San Marcos Growers — *Jacaranda mimosifolia*](https://www.smgrowers.com/products/plants/plantdisplay.asp?strSearchText=jacaranda&plant_id=880&page) | Bipinnately compound leaves at least 1 ft long, 1/2-in narrow elliptical leaflets, fernlike; lavender-blue 1.5-in flowers in terminal panicles that can smother the tree |

Count: 21 sources fetched with content returned. See Open gaps for the
5 fetches that failed and were not used as evidence.

## Current state — tied to exact code

### Data model: no orientation exists

- [tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:2) `Voxel` is
  `{ position, anchor, size: Vec3, color: string, start, end, parent, kind }`.
  There is no rotation, tilt, or normal field. Every leaf is therefore an
  axis-aligned box by construction.
- [Scene.tsx](/C:/Users/jbree/mneme/components/Scene.tsx:81) `Tree` renders
  one `boxGeometry` through an `InstancedMesh`. Per instance it sets only
  position (anchor → position interpolation, line 99) and scale
  (`size * g`, line 101). `dummy.rotation` is never assigned, so every
  instance keeps the identity rotation. Colour is per-instance via
  `setColorAt` (line 88); that channel already exists and is cheap to reuse.

### Broadleaf leaf creation: one recipe for five species

- Profiles live in [tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:55)
  `palettes[0..7]`: Oak, Birch, Maple, Cherry Blossom, Weeping Willow,
  Pine, Jacaranda, Spruce. The only leaf-geometry knob per broadleaf
  species is the scalar `leafScale` (Oak 1, Birch 1, Maple 1.05,
  Cherry 0.85, Jacaranda 0.62) plus `extraLeaf: boolean`.
- The broadleaf loop ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:467))
  places, for each of 6 buds on a twig, a petiole (`path`, width 0.055),
  then a first leaf of size `[leafSize, leafSize * 0.65, leafSize]` where
  `leafSize = (0.16 + rng() * 0.065) * leafScale` — a near-square flat
  box — then a second, chained leaf `[0.15, 0.1, 0.15] * leafScale`, and
  with probability 0.7 (`extraLeaf`) a third leaf offset perpendicular.
  That is the 2–3 leaves per bud. The leader finish
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:529)) repeats the same
  recipe with 3 leaves per shoot and no second chained leaf.
- Placement azimuth alternates by leaf index:
  `la = ta + (l % 2 ? 1 : -1) * (1 + rng() * 0.5)`. Every broadleaf
  species gets the same two-sided alternation. No species is opposite,
  spiral, or distichous by design; the branch azimuth itself uses the
  golden-angle increment `b * 2.39996` (2.39996 rad ≈ 137.5°) for primary
  branches, but leaf azimuth does not.
- Vertical step is `(rng() - 0.3) * 0.13` — near-horizontal petioles with
  slight upward bias. Leaves sit at bud height; there is no height- or
  depth-dependent inclination, size, or colour.
- Colour is chosen inside `put`
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:114)): for non-blossom
  species, a uniform random pick from the species `leaf[]` palette.
  Position plays no role. Within one leaf there is exactly one colour,
  because one leaf is one voxel (plus its chained companions, each
  independently re-picked — so a "leaf cluster" can show two palette
  colours side by side, but a single leaf cannot show a gradient).

### Blossom: per-voxel coin flip, not a cluster

- Cherry (`blossomRatio: 0.85`): each leaf voxel independently becomes
  blossom with probability 0.85
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:135)).
- Jacaranda (`blossomTop: true`): probability 0.7 above
  `height * 0.72`, else 0.18. Same per-voxel Bernoulli mechanism; only
  the probability changes with height. Blossom and leaf voxels are the
  same size and shape; only colour differs.

### Conifers: flat square tufts

- `growConifer` ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:220))
  walks tiers of branches. At each branch node it places needle voxels
  of `needleSize` — Pine `[0.3, 0.08, 0.3]`, Spruce `[0.26, 0.07, 0.26]`
  — a flat square plate, offset ±0.11 perpendicular to the branch and
  −0.03 down. Pine (9 tiers) gets one plate per node (`sides: [1]`);
  Spruce (12 tiers) gets two, opposite (`sides: [-1, 1]`). Neither
  resembles a needle: the voxel is wider than it is long, and Pine's
  defining fascicle and Spruce's defining single spiral attachment are
  both absent. Pine cones are brown `kind: "leaf"` voxels
  (`[0.09, 0.15, 0.09]`, probability 0.07 per node).

### Willow: vertical pills on hanging strands

- `growWillow` ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:267))
  builds 8 golden-angle branches that rise to an apex then droop.
  Leaves are `[0.07, 0.3, 0.07]` vertical boxes hung below branch
  nodes, plus vertical strands: every third node of the drooping
  section spawns a chain of 4–8 such boxes stepping 0.17 down. Aspect
  ratio is about 4.3 : 1. Crown tufts (4 per node on the last 6 trunk
  nodes) use the same box.

### Invariants any change must keep

- Physical attachment (test in
  [garden.test.ts](/C:/Users/jbree/mneme/tests/garden.test.ts:42)):
  for every voxel, `parent < i`, `start >= parent.end`,
  `anchor` equals the parent position, and on every axis
  `|position − parent.position| <= (size + parent.size) / 2 + 0.001`.
  A leaf whose centre moves, or whose size shrinks, can silently break
  this even if it still looks attached.
- Voxel budget (same test file, line 63–69): every tree is
  1,000–12,000 voxels. Leaf multiplications must be accounted against
  the 12,000 ceiling.
- Determinism: `generateTree(seed)` must stay byte-identical for the
  same seed. Any new `rng()` call changes all downstream values, so new
  randomness must be added where it does not reshuffle existing draws,
  or accepted as a one-time appearance change for every seed.

## Findings per topic

### 1. Placement and phyllotaxis

Real shoots do not place leaves by alternating left/right at each bud.
In spiral phyllotaxis the divergence angle between successive leaves is
fixed at the golden angle, 137.5°, at the shoot apex [S1][S2]; developed
leaves show Fibonacci fractions (1/3, 2/5, 3/8…) converging on that
angle [S1]. Non-spiral systems are different in kind, not degree:
distichous (two ranks, 180°), decussate (opposite pairs rotated 90° per
node), and whorled arrangements have simple fractional divergence [S1].

The Mneme species split across both systems, and the dendrology sheets
state the arrangement explicitly:

- Alternate (one leaf per node): Oak [S3][S7], Birch [S4],
  Cherry [S17], Willow [S8], and Jacaranda's compound leaves are
  alternately arranged [S21].
- Opposite (two leaves per node): Maple — both sugar maple [S5] and
  red maple [S6] are described as "Opposite, simple".

Current code gives all five broadleaf species the same alternating
two-sided pattern. Two concrete mismatches follow. First, Maple should
emit paired leaves at a node, with successive pairs rotated, not
single alternating leaves. Second, the alternate species should step
by roughly 137.5° along the twig rather than flipping side to side;
the generator already uses that increment (2.39996 rad) for primary
branches, so the constant and the idiom exist in the codebase — they
are just not applied at leaf scale. Weber & Penn's model, the primary
procedural-tree reference, likewise treats leaves as a distinct final
level placed on the finished branching structure [S19][S20], which
matches Mneme's twig-bud placement and means phyllotaxis can be fixed
locally in the leaf loops without restructuring growth.

### 2. Shape — voxel size anisotropy

A voxel leaf has only three numbers to express shape: its size Vec3.
Used well, anisotropy (one long axis, one thin axis) reads as a leaf
blade far better than the current near-square plate. Real proportions:

- Oak (English oak): obovate, 4–6 in long with rounded lobes [S3];
  black oak 4–10 in [S7]. Large, broad, longer than wide — roughly
  1.5–2 : 1, with lobes a voxel cannot draw. Size, not outline, is the
  available signal.
- Birch: ovate to triangular, only 2–4 in [S4] — the smallest broadleaf
  blade in the set. Current code gives Birch the same 0.16 base size as
  Oak; it should be distinctly smaller and more triangular (wide base,
  pointed tip is not expressible — but smaller and slightly wider than
  long is).
- Maple: 3–6 in (sugar) [S5] / 2–4 in (red) [S6], palmately lobed —
  the blade is about as wide as it is long, the widest relative width
  of any species here. Maple is the one species where a near-square
  footprint is actually right; its lobes are not expressible at voxel
  scale and should not be faked with extra voxels.
- Cherry: ovate-lanceolate, 5–13 cm × 2.5–6.5 cm [S17] — about 2 : 1.
- Willow: very narrowly lance-shaped, 3–6 in × 3/8–1/2 in [S8] — an
  aspect ratio of roughly 8–12 : 1. The current willow box
  (0.07 × 0.3) is 4.3 : 1: directionally right, quantitatively only
  half as extreme as the real leaf.
- Jacaranda: the leaf is bipinnately compound, at least a foot long,
  made of 1/2-in narrow elliptical leaflets, fernlike overall [S21].
  The visual unit is not a blade but a feathery spray of tiny leaflets.
  A single 0.1-scale box per leaf (current `leafScale: 0.62`) is the
  least faithful representation of any species in the generator.
- Pine vs Spruce needles: Pine needles come in fascicles of 2, 3, or 5
  joined at a sheathed base [S9]; Spruce needles are single, spiral,
  each on its own peg [S10]. Both are long and thin — the opposite
  proportions from the current flat square plates
  (`[0.3, 0.08, 0.3]`).

### 3. Orientation — is adding rotation worth it?

Yes, with a narrow scope. Leaf inclination is not decoration: it is a
major determinant of how light is distributed inside a canopy, and
erect upper leaves are favoured because they let light reach deeper
layers [S12]. Natural populations show systematic inclination patterns
rather than random tilt, and crowding itself changes leaf erection
[S11]. Several tree canopies are erectophile (steep) near the top and
planophile (flat) near the bottom, a strategy read as maximising
exposure across the whole crown [S16].

None of this is expressible today: with identity rotation, a leaf's
"inclination" can only be mimicked by stretching its axis-aligned box,
which also moves its silhouette in ways a tilt would not. The cost
side is favourable. Rotation needs no new voxels — one quaternion (or
two angles) per voxel and one `dummy.rotation` assignment in Scene.
The render loop already composes a matrix per instance per frame; a
rotation term does not change its complexity. The real costs are
(a) schema: `Voxel` gains a field, which changes stored/compared tree
data and the determinism test's deep-equality surface, and
(b) attachment honesty: the attachment test measures axis-aligned
overlap of centres and sizes, so a rotated leaf still passes the test
while its corners may visually detach from the petiole. Rotation must
therefore pivot around the leaf centre with the centre kept where the
unrotated leaf was anchored, and leaf sizes must retain enough overlap
with the petiole voxel that no tilt opens a visible gap.

Verdict: add rotation for leaves only, as yaw around the vertical plus
a height-dependent pitch (steep at the crown top, flat at the bottom).
Do not rotate wood: branches read correctly axis-aligned at this scale,
and rotating wood risks the structural look and the shell-filler logic
in `path`.

### 4. Clustering and density — outer shell vs interior

Two different real-canopy facts matter here, and they pull in opposite
directions.

First, foliage is not uniformly distributed through the crown volume:
it is clumped. The clumping literature formalises this — a canopy
whose leaves sit on top of each other along shoots intercepts light
differently from a random distribution at the same leaf area, and
natural canopies are predominantly clumped. (This session's clumping
sources were search-level only; see Open gaps — the claim used here is
limited to "leaves are grouped on shoots, not Poisson-distributed
through the crown", which is also directly visible in the phyllotaxis
and twig structure sources above.) Mneme already gets shoot-level
clumping for free: leaves exist only where twigs are. What it lacks
is variation above that scale — every twig gets 6 buds, every bud 2–3
leaves, every branch 3–5 sprays. Real crowns have dense outer shells
and sparse, shaded interiors.

Second, interior leaves are not small copies of exterior leaves.
Shade leaves — interior and lower — are thinner but larger, often many
times larger, than sun leaves, the better to capture filtered light
[S18]. The experimental record agrees quantitatively: in *Hyptis*,
sun leaves under 1 cm long compared with 7 cm shade leaves on the same
plant, with threefold differences in thickness and chlorophyll per
area [S14]; in *Vitis*, sun and shade leaves differ in support
allocation and area [S15]. Black oak shows the same within-tree
plasticity in shape: sun leaves with deep sinuses, shade leaves with
shallow ones [S7].

So the faithful density model is: keep total leaf count roughly
constant, move leaves outward (more buds on outer twigs, skipped buds
on interior ones), and make the interior leaves that remain larger,
flatter, and darker. That is a redistribution, not an addition — it
can be made voxel-neutral.

### 5. Colour variation

Three separable colour effects are currently collapsed into one
uniform palette pick per voxel.

- Sun vs shade. Shade leaves carry more chlorophyll per mass and read
  darker green; sun leaves are lighter, more yellow-green [S14][S18].
  Combined with the size effect above, a depth-based colour lerp —
  lighter at the shell, darker inside — is the single highest-value
  colour change. Note the direction carefully: interior = darker, not
  lighter. The naive "shadow = grey" lerp would be wrong; the real
  signal is a deeper green.
- Within-canopy autumn colour (Maple). Mneme's Maple ships permanently
  in autumn dress (`#c33d26`…`#e5a44a`). Real red maples redden
  through anthocyanin accumulation during senescence, and the timing
  and intensity vary between trees and leaves [S13]; yellow-orange
  comes from carotenoids that remain as chlorophyll breaks down.
  A height/light gradient within the existing palette — ambers low
  and inside, saturated reds at the lit shell — would read as one
  tree in autumn rather than five colours dealt at random. Sugar
  maple is described as green above, paler below [S5], and red maple
  as green above, whitened beneath [S6]: a voxel cannot show two
  faces different colours with a single instance colour, so this
  specific trait is out of reach without shader or geometry changes
  and is not recommended below.
- Blossom. Cherry flowers arrive with or just before the leaves and
  the leaf is a normal green ovate blade [S17]; Jacaranda's
  lavender-blue flowers sit in terminal panicles and can smother the
  tree [S21], which supports the existing `blossomTop` height bias
  but not per-voxel scattering: panicles and corymbs are clusters.
  Blossom should be placed as 3–5-voxel clusters at bud points, of
  smaller voxels than leaves, not as leaves recoloured by a coin
  flip. The current mechanism can put a pink voxel as a chained
  "second leaf" floating off a green first leaf, which reads as noise
  at garden distance.

### 6. Per-species morphology

- Oak. Large, broad, alternate simple leaves [S3][S7]. Faithful
  voxel move: biggest broadleaf footprint, 1.5–2 : 1 anisotropy,
  clustered toward twig ends, deep-green palette kept. Lobes: skip.
- Birch. Small triangular-ovate alternate leaves, 2–4 in, on fine
  drooping branches [S4]. Faithful move: smallest broadleaf leaves,
  higher bud density on finer twigs to keep the airy crown. The white
  bark fleck logic already differentiates this species; the leaf
  should too.
- Maple. Opposite, palmate, as wide as long [S5][S6]. Faithful move:
  paired opposite emission, wide footprint, autumn gradient. This is
  the only broadleaf whose arrangement is categorically wrong today.
- Cherry Blossom. Alternate ovate-lanceolate 2 : 1 leaves [S17] plus
  clustered blossom at buds. Faithful move: separate blossom clusters
  from leaf voxels; keep leaves green and blossom-dominant overall
  (the species test already requires >50% blossom-coloured leaf
  voxels — any clustering change must preserve that ratio or update
  the test's expectation deliberately).
- Weeping Willow. Extremely narrow lanceolate leaves (8–12 : 1) on
  long hanging rope-like twigs [S8]. Faithful move: thinner, longer
  leaf boxes hung alternately along the drooping strands, not only at
  strand tips; keep the low-hanging test signature (many leaves below
  30% of tree height).
- Pine. Needles in fascicles of 2–5 from a single sheathed point,
  fanning outward [S9]. Faithful move: at each attachment point emit
  3 thin elongated voxels (a defensible middle fascicle count)
  diverging from one base point, replacing the flat plate. Cones
  should be `kind: "wood"` or a new kind, not leaves — they currently
  pollute leaf statistics and the growth ordering.
- Spruce. Single needles, spiralled around the twig on pegs [S10],
  denser and narrower crown than Pine. Faithful move: single thin
  voxels placed in a short helical sequence around each branch node,
  more per node than Pine emits fascicle bases, preserving the
  existing "spruce denser than pine" test relationship.
- Jacaranda. Bipinnate fern: a rachis bearing many tiny opposite
  leaflets; blossom in terminal panicles at the crown [S21]. Faithful
  move: compound-leaf sprays — one short rachis `path` with 4–6 pairs
  of tiny leaflet voxels — plus blossom clusters concentrated at
  shoot tips and the crown top. This is the most expensive change
  per leaf and must be budgeted by using fewer, larger compound
  leaves rather than leafletising every current leaf voxel.

## Ranked recommendations

Each item names the functions/fields to touch, the expected visual
effect, the voxel cost, and the risk to the physical-attachment
invariant (centre overlap per axis) defined in Current state.
Ranking weighs visual gain per voxel and per unit of risk.

### 1. Sun/shade gradient: depth-based leaf size and colour

- Change: in `put` ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:114)),
  add an optional light/depth factor, or compute it from voxel
  position relative to tree height and canopy radius at the broadleaf,
  leader, conifer, and willow call sites. Exterior leaves: smaller
  footprint, lighter palette entry. Interior leaves: up to ~1.6×
  footprint area, thinner (smaller Y size), palette shifted to the
  darkest entries. Interpolate; do not use two discrete classes.
- Visual effect: trees stop reading as uniformly speckled and gain a
  lit shell and a deep interior — the strongest realism cue available
  without new geometry [S14][S15][S18].
- Voxel cost: zero. Same voxels, different sizes and colours.
- Attachment risk: low, with one trap — enlarging a leaf is safe, but
  shrinking an exterior leaf can break centre overlap with its
  petiole. Clamp shrunk sizes so `(leafSize + petioleSize) / 2` still
  exceeds the centre offset on every axis, or shrink around the
  anchored edge rather than the centre.

### 2. Leaf-only rotation (yaw + height-dependent pitch)

- Change: add `rotation?: Vec3` (Euler, radians) to `Voxel`
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:2)); set it at leaf
  creation from the petiole azimuth (yaw) and a pitch that is steep
  (erectophile) in the upper crown and flat (planophile) in the lower
  crown [S11][S12][S16]; in Scene `Tree`
  ([Scene.tsx](/C:/Users/jbree/mneme/components/Scene.tsx:97)), assign
  `dummy.rotation` from it before `updateMatrix`. Wood leaves the
  field empty.
- Visual effect: foliage gains directional texture; canopies catch
  light unevenly like real ones, and the flat-box "dice" look is
  greatly reduced. Willow strands and conifer needles benefit most.
- Voxel cost: zero voxels; a few bytes per voxel and one rotation
  compose per instance.
- Attachment risk: medium-low. The stored centre does not move, so
  the tested invariant still passes, but a pitched leaf's near corner
  can lift off the petiole visually. Mitigate: rotate about the centre,
  keep pitch within ±60°, and keep the centre offset unchanged (see
  item 1's clamp). Note the deep-equality determinism test will see
  the new field; that is expected and should be part of the change.

### 3. Species-true phyllotaxis: opposite maple, spiral alternate

- Change: add `phyllotaxis: "alternate" | "opposite"` to
  `SpeciesProfile` ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:24)).
  Maple emits two leaves at ±la from the same bud with successive
  bud pairs rotated 90° (decussate) [S5][S6][S1]. Alternate species
  advance leaf azimuth by 2.39996 rad (137.5°) along the twig instead
  of `l % 2` side-flipping [S1][S2]; apply the same stepping in the
  leader loop.
- Visual effect: maple crowns show the paired, layered look of real
  maples; alternate species lose the mechanical two-sided fringe
  along twigs. Subtle at distance, obvious close up — and cheap.
- Voxel cost: zero to slightly negative. Paired maple emission must
  replace, not add to, the current per-bud count, or maple density
  silently doubles at the crown.
- Attachment risk: low. Both leaves of a pair share the bud anchor
  chain through their own petioles; keep each petiole its own `path`
  from the bud so `parent` and `anchor` remain exact.

### 4. Anisotropic per-species leaf footprints

- Change: replace the scalar `leafScale` with a per-species Vec3
  footprint (length, thickness, width) in `SpeciesProfile`; broadleaf
  ratio targets: Oak ~1.7 : 1, Birch smallest with width close to
  length, Maple ~1 : 1 (widest), Cherry ~2 : 1, and leader leaves
  reuse the species footprint [S3][S4][S5][S6][S17].
- Visual effect: species become distinguishable by foliage texture
  alone at garden distance, not only by colour and crown shape.
- Voxel cost: zero.
- Attachment risk: low-medium. Width growth is safe; length growth
  along the petiole direction moves the leaf centre if placement code
  offsets by half the old size. Recompute the centre offset from the
  new size so the leaf's near edge still overlaps the petiole tip.

### 5. Clustered blossom at buds (Cherry, Jacaranda)

- Change: in `put`, remove blossom from the per-voxel colour lottery.
  At broadleaf bud sites, with species probability, emit a blossom
  cluster: 3–5 small voxels (about 0.09–0.12) arranged around the bud
  point, parented in a short chain; leaves at that bud stay green.
  Keep Jacaranda's crown-top bias, but express it as cluster
  probability by height and shoot-tip position, not voxel probability
  [S21][S17]. Preserve Cherry's >50% blossom voxel share that the
  species test asserts, or renegotiate that test explicitly.
- Visual effect: blossom reads as blossom — soft clustered masses —
  instead of pink leaves. Jacaranda gains its smothered crown top.
- Voxel cost: positive. Clusters add roughly 2–4 voxels per flowering
  bud. Offset by flowering only a subset of buds (real trees do not
  flower at every bud) and by item 6's interior thinning. Estimate
  +5–15% on Cherry and Jacaranda; check against the 12,000 ceiling.
- Attachment risk: low. Each cluster voxel parents to the previous
  cluster voxel or the bud; keep hops within half the summed sizes,
  as the existing chained second leaf already does.

### 6. Outer-shell redistribution (density follows light)

- Change: at the spray/twig selection in the broadleaf loop, weight
  bud survival by radial depth: interior twigs skip 30–50% of their
  buds (deterministically, via the existing rng stream at that
  point), outer twigs keep all. Leaders (crown top) keep full
  density. Conifer tiers keep needles on outer branch nodes at full
  rate and thin the innermost nodes.
- Visual effect: crowns develop light gaps and a defined surface
  instead of a uniform solid — the silhouette irregularity of real
  trees — while total leaf count stays flat [S18].
- Voxel cost: neutral by construction (removals fund item 5).
- Attachment risk: low. Skipping a bud removes its whole petiole
  chain; nothing else parents to removed voxels provided skipping is
  decided before the chain is emitted. Never skip a twig or branch
  node that later leaves parent to.

### 7. Conifer split: pine fascicles vs spruce singles

- Change: branch inside `growConifer`
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:220)) on a new
  profile field, e.g. `needleMode: "fascicle" | "single"`. Fascicle:
  at each node emit 3 thin voxels (about `[0.045, 0.05, 0.3]`
  before rotation; with item 2, fanned ±20° from the branch
  direction) from one base point [S9]. Single: emit 4–6 short thin
  voxels stepping helically around successive branch nodes [S10].
  Retag cones from `kind: "leaf"` to `"wood"` or a dedicated kind.
- Visual effect: Pine and Spruce — currently near-identical — become
  two recognisable conifers; needle direction replaces plate texture.
- Voxel cost: positive per node (plates become 3–6 voxels) but needles
  can be emitted every 2nd node (`needleEvery: 2` exists) to stay
  neutral. Verify spruce remains denser than pine, as the test
  requires.
- Attachment risk: medium. Fanned fascicle tips are children of the
  base needle voxel; lateral fan offsets must stay within the
  half-size overlap of the base. Without rotation (if item 2 is
  deferred), keep fascicle needles axis-aligned in a small cross
  pattern and accept less fan realism.

### 8. Willow: true lanceolate proportions, alternate strand leaves

- Change: in `growWillow`
  ([tree.ts](/C:/Users/jbree/mneme/lib/tree.ts:267)), change the leaf
  box from `[0.07, 0.3, 0.07]` to about `[0.045, 0.42, 0.045]`
  (ratio ≈ 9 : 1, inside the real 8–12 : 1 [S8]), and hang leaves
  alternately with small lateral offsets along the drooping section,
  not only directly below nodes. With rotation (item 2), tilt strands
  a few degrees off vertical with per-strand yaw.
- Visual effect: curtains get finer, longer, and more willow-like;
  the current chunky icicles are the main tell to fix.
- Voxel cost: zero (same count, slimmer boxes); strand chains may
  shorten by one voxel where slimmer leaves keep the tested
  low-foliage share.
- Attachment risk: low-medium. Longer boxes overlap more, which is
  safe; the risk is the lateral alternate offset — keep it ≤ 0.03 so
  the leaf top still overlaps its parent strand voxel.

### 9. Jacaranda compound-leaf sprays

- Change: a dedicated broadleaf variant for Jacaranda: per leaf site,
  emit a short rachis `path` (2–3 wood-tinted thin nodes) bearing
  4–6 opposite pairs of tiny leaflet voxels
  (about `[0.07, 0.03, 0.1]`), using the small `leafScale: 0.62`
  lineage as the leaflet scale. Blossom clusters (item 5) sit at
  spray tips.
- Visual effect: the fern-tree texture [S21] replaces generic small
  leaves — the largest per-species fidelity gain available.
- Voxel cost: highest of any item — roughly 8–14 voxels per compound
  leaf vs 2–3 today. Fund by using compound leaves at about one third
  of current broadleaf sites and expanding spread rather than count;
  hard-check the 12,000 ceiling per seed.
- Attachment risk: medium. Long chains accumulate offset error; parent
  each leaflet to the nearest rachis node, never leaflet-to-leaflet
  across the rachis, and keep rachis nodes `kind: "wood"` thin enough
  not to read as twigs.

### 10. Maple autumn gradient within the existing palette

- Change: special-case colour selection for Maple in `put`: choose
  from the existing red/amber palette by the item 1 depth factor —
  saturated reds at the lit shell, ambers and oranges inside and low
  [S13]. No new palette entries required.
- Visual effect: one tree turning colour unevenly, rather than confetti.
- Voxel cost: zero.
- Attachment risk: none (colour only).

### Deferred: two-faced leaves, lobed outlines, heliotropic motion

- Paler leaf undersides [S3][S5][S6] need per-face colour: a second
  instanced mesh, a shader, or doubled voxels. Cost and complexity are
  disproportionate at this scale. Defer.
- Lobed oak/maple outlines need either shaped geometry (breaks the
  single-box instancing) or satellite voxels (multiplies leaf cost
  for a close-up-only cue). Defer; anisotropy carries the species
  signal at viewing distance.
- Diurnal leaf movement (dia/paraheliotropism [S11][S12]) would need
  per-frame rotation updates. The Scene growth animation already
  rewrites matrices per frame while growing, so it is feasible later,
  but it is motion design, not leaf morphology. Defer.

## Open gaps

Fetches attempted in this session that returned no usable content.
Claims depending on them were either re-sourced above or dropped:

- Springer book page for *The Algorithmic Beauty of Plants*
  (Prusinkiewicz & Lindenmayer) — redirected to an authorisation
  endpoint; book contents not inspected. The full-book PDF at
  algorithmicbotany.org exceeded the 10 MB fetch limit and was not
  parsed. L-system claims here are therefore limited to Weber & Penn
  [S19][S20]; a dedicated L-system pass remains open.
- ACM Digital Library record for Weber & Penn 1995 — HTTP 403. The
  primary paper was instead inspected via the Duke-hosted PDF [S19].
- Field Studies Council "Comparing Sun and Shade" — HTTP 403. The
  sun/shade claims were re-sourced to [S14][S15][S18].
- University of Florida IFAS *Prunus serrulata* 'Kwanzan' PDF —
  redirected to a generic host; not inspected. Cherry morphology rests
  on [S17] plus the search-visible IFAS leaf-arrangement snippet was
  not used as evidence.
- University of Illinois woody-plant arrangement tutorial —
  connection closed by the remote host. Arrangement claims rest on
  the dendrology sheets [S3]–[S8] and phyllotaxis papers [S1][S2].
- Canopy clumping-index literature — only search-result level was
  inspected; no full text was fetched. Findings use clumping only in
  its weakest form (foliage grouped on shoots), and a primary-source
  clumping pass (Chen & Black; Nilson) remains open before any
  quantitative gap-fraction target is set.
- No primary source was fetched for blossom cluster size counts in
  *Prunus* corymbs (2–5 flowers) — that number appears in secondary
  snippets only — so item 5 specifies cluster size from voxel-budget
  reasoning, not botany. A Kew or Arnold Arboretum pass remains open.
- Real leaf thickness in millimetres, and needle lengths for the
  specific Pine/Spruce species the generator evokes, were not pinned
  to primary sheets; anisotropy ratios above use length:width from
  the dendrology sheets, and absolute needle length remains open.
