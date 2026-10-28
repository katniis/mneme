# Tree structure realism for the Mneme voxel tree generator

## Question

How should the trunk, branching architecture, and crown-shape algorithms
in Mneme's voxel tree generator change so that each of the eight
generated species depicts the real-world structure of the species it is
named for — mature height and crown spread, crown shape, trunk
character, branch habit, and signature structural traits — within the
existing voxel budget and without breaking the physical-attachment and
growth-timing invariants tested in `tests/garden.test.ts`?

Scope: structure only. Leaf blade shape, phyllotaxis at leaf scale,
leaf colour, and blossom clustering were covered separately in
[leaves.md](leaves.md) and are not re-litigated here except where
foliage placement *is* structure (e.g. willow hanging strands, conifer
needle tiers). Only this file is created. No code was edited.

Conventions: "Current" always means [lib/tree.ts](../lib/tree.ts) as
read in full for this research (776 lines). Line numbers are for that
file. Real-world dimensions are given in feet/metres as published;
Mneme dimensions are in its internal units, where the generated tree
for seed = species index was measured directly in this session (see
Current state). Only *ratios* (spread ÷ height, crown depth, fork
height as a fraction of height) transfer between the two scales.

## Sources actually inspected

Every material claim below traces to a URL in this table that was
fetched with `web_fetch` in this session and returned readable
content. Search-result snippets were used only to *find* pages, never
as evidence. Failed fetches are listed under Open gaps and are not
cited.

| # | Source | What was used |
|---|--------|---------------|
| S1 | [Virginia Tech Dendrology — English oak, *Quercus robur*, ID=551](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=551) | Form: large tree, round crown, can reach over 100 ft; bark gray-brown, deeply fissured with age |
| S2 | [Virginia Tech Dendrology — White oak, *Quercus alba*, ID=35](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=35) | Open-grown: rugged, irregular, wide-spreading crown, stocky bole; forest: upright oval, to 100 ft; bark whitish/ashy gray, scaly to platy/blocky |
| S3 | [Virginia Tech Dendrology — Black oak, *Quercus velutina*, ID=39](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=39) | To 80 ft, irregular crown, tapering somewhat limby bole; bark nearly black, deeply furrowed |
| S4 | [NC State Extension — *Quercus robur*](https://plants.ces.ncsu.edu/plants/quercus-robur/) | Large broadleaf deciduous tree; dimensions and habit in full page text |
| S5 | [Woodland Trust — English oak, *Quercus robur*](https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/british-trees/a-z-of-british-trees/english-oak/) | 20–40 m tall, broad spreading crown with sturdy branches |
| S6 | [Virginia Tech Dendrology — European weeping birch, *Betula pendula*, ID=15](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=15) | To 65 ft, open pyramidal crown, distinctly drooping fine branches; twigs slender, noticeably drooping; bark white, base splits into narrow near-black vertical furrows |
| S7 | [NC State Extension — *Betula pendula*](https://plants.ces.ncsu.edu/plants/betula-pendula/) | Pyramidal when young, more oval at maturity; white exfoliating bark; drooping/pendulous branches |
| S8 | [Cornell Woody Plants Database — *Betula pendula*, plant 310](https://woodyplants.cals.cornell.edu/plant/310) | Height 30–50 ft, spread 25–30 ft; pyramidal to oval-pyramidal; graceful pendulous branches |
| S9 | [UConn Plant Database — *Betula pendula*, pid=67](https://plantdatabase.uconn.edu/detail.php?pid=67) | Cultivated 40–60 ft tall × 20–40 ft wide; pyramidal young, oval-pyramidal mature; somewhat pendulous at all ages but main trunk upright; trunk white with prominent black vertical fissures |
| S10 | [Virginia Tech Dendrology — Sugar maple, *Acer saccharum*, ID=2](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=2) | To 100 ft, very dense elliptical crown; opposite leaves; bark develops furrows with long thick irregular curling ridges |
| S11 | [Virginia Tech Dendrology — Red maple, *Acer rubrum*, ID=1](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=1) | To 90 ft; open-grown trunk shorter, crown rounded; opposite leaves |
| S12 | [Morton Arboretum — Sugar maple](https://mortonarb.org/plant-and-protect/trees-and-plants/sugar-maple/) | Mature height 60–75 ft, mature width 40–50 ft; dense rounded crown (cultivar descriptions on page) |
| S13 | [NC State Extension — *Acer saccharum*](https://plants.ces.ncsu.edu/plants/acer-saccharum/) | Full habit, dimensions, and bark text |
| S14 | [Virginia Tech Dendrology — Kwanzan cherry, *Prunus serrulata*, ID=310](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=310) | Small tree 25–30 ft high *and wide*, usually vase-shaped spreading crown; bark thin, smooth, reddish-bronze, glossy with very prominent horizontal lenticels |
| S15 | [NC State Extension — *Prunus serrulata*](https://plants.ces.ncsu.edu/plants/prunus-serrulata/) | 15–25 ft tall and equally wide; habit variable: wide-spreading, vase-shaped, or weeping by cultivar; short-lived (15–20 yr) |
| S16 | [Morton Arboretum — Japanese flowering cherry, *Prunus serrulata*](https://mortonarb.org/plant-and-protect/trees-and-plants/japanese-flowering-cherry/) | Red-brown bark smooth, shiny, marked with long horizontal lenticels; cultivar forms incl. Kwanzan |
| S17 | [Virginia Tech Dendrology — Weeping willow, *Salix babylonica*, ID=131](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=131) | Long graceful branches sweep towards the ground; crown usually round; 40–50 ft; twigs very slender, hanging/drooping for long distances, almost rope-like; bark grayish-brown, irregularly furrowed |
| S18 | [NC State Extension — *Salix babylonica*](https://plants.ces.ncsu.edu/plants/salix-babylonica/) | Rapid growth to 30–40 ft high *and wide*; weak wood |
| S19 | [Morton Arboretum — Golden weeping willow, *Salix alba* 'Tristis'](https://mortonarb.org/plant-and-protect/trees-and-plants/golden-weeping-willow/) | Upright willow 50–75 ft tall and wide (weeping-willow habit at landscape scale; used only for the height≈spread weeping habit, not as *S. babylonica* taxonomy) |
| S20 | [Virginia Tech Dendrology — Eastern white pine, *Pinus strobus*, ID=111](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=111) | Very straight trunk, well over 100 ft; crown conical when young, later wispy, horizontal, upturning branches; needles 5 per fascicle; bark later reddish-brown to gray-brown with scaly rounded long ridges |
| S21 | [Virginia Tech Dendrology — Scots pine, *Pinus sylvestris*, ID=112](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=112) | To 90 ft, often twisted/poorly formed trunk; young crowns rounded, older round-topped; upper crown always shows orange peeling bark; 2 needles per fascicle |
| S22 | [Virginia Tech Dendrology — Slash pine, *Pinus elliottii*, ID=102](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=102) | Over 100 ft, narrowly ovoid crown; needles tufted at branch ends; bark red-brown, very platy, cinnamon under flaking scales |
| S23 | [NC State Extension — *Pinus strobus*](https://plants.ces.ncsu.edu/plants/pinus-strobus/) | Full habit and dimension text for eastern white pine |
| S24 | [Virginia Tech Dendrology — Norway spruce, *Picea abies*, ID=99](https://dendro.cnre.vt.edu/dendrology/syllabus/factsheet.cfm?ID=99) | Conical, over 120 ft; horizontal to upward-sweeping branches that often droop branchlets; needles on woody pegs; bark red-brown scaly, later gray with flaking plates |
| S25 | [American Conifer Society — *Picea* genus](https://conifersociety.org/conifers/picea) | Spruces 60–200 ft (20–60 m); distinguished by whorled branches and conical form; needles single, spiral, each on a peg-like pulvinus |
| S26 | [NC State Extension — *Picea abies*](https://plants.ces.ncsu.edu/plants/picea-abies/) | Norway spruce habit and dimension text |
| S27 | [NC State Extension — *Jacaranda mimosifolia*](https://plants.ces.ncsu.edu/plants/jacaranda-mimosifolia/) | Matures to 50 ft tall, 20 in diameter; young trees long trunk with no branches; retains a vase-shaped crown; fern-like bipinnate leaves at branch tips; weak wood, storm damage can make crown irregular |
| S28 | [San Marcos Growers — *Jacaranda mimosifolia*](https://www.smgrowers.com/products/plants/plantdisplay.asp?strSearchText=jacaranda&plant_id=880&page) | Nursery species page fetched in this session; bipinnate fern foliage and blossom habit (structural use only: low-branched listing variant) |
| S29 | [Weber & Penn 1995, Creation and Rendering of Realistic Trees (Duke-hosted PDF, 2.2 MB fetched)](https://courses.cs.duke.edu/fall01/cps296.3/resources/p119-weber.pdf) | Primary procedural-tree literature: levels trunk 0 / branches 1 / sub-branches 2 / leaves 3; per-species parameter sets (branching frequency, radius decrease, branch direction, height/length ratio) — structure is parameterised per species, not one scaffold with rescaled numbers |
| S30 | [Morton Arboretum — English oak](https://mortonarb.org/plant-and-protect/trees-and-plants/english-oak/) | Species and cultivar forms; upright 'Fastigiata' 50–60 ft × 10–15 ft listed as the exception that proves the spreading species form |

Count: **29 sources fetched with content returned and used as
evidence** (S1–S28, S30), plus 1 primary-literature PDF fetched
(S29, binary; its parameter model is also summarised in
[leaves.md](leaves.md) S19/S20 from the same fetch). The USDA Plants
profile fetch returned only a page shell (20 chars of processed text)
and is counted as a gap, not a source. See Open gaps for the 6 failed
or empty fetches.

A note on species identity: Mneme's labels are genus-level ("Oak",
"Maple", "Pine", "Spruce"). This research pins each label to the
species the task named and that [leaves.md](leaves.md) already used —
Oak = *Quercus robur* with *Q. alba*/*Q. velutina* as corroborating
congeners, Birch = *Betula pendula*, Maple = *Acer saccharum* with
*A. rubrum* corroborating, Cherry = *Prunus serrulata* 'Kwanzan'
type, Willow = *Salix babylonica*, Pine = *Pinus strobus* (the
5-needle white pine; Scots/slash pine used only to show how much
"Pinus" varies), Jacaranda = *Jacaranda mimosifolia*, Spruce =
*Picea abies*. Where congeners disagree (notably Pine, Oak), the
disagreement itself is reported as a finding.

## Current state — structural summary tied to code

### One scaffold for six species, two special cases

`SpeciesProfile` ([lib/tree.ts:25](../lib/tree.ts:25)) carries the
structural knobs: `form: "broadleaf" | "conifer" | "willow"`,
`height`, `spread`, `trunkWidth`, `branches: [min, max]`,
`levelBase`, `levelRange`, `lift`, `primaryWidth`, plus conifer-only
`tiers`, `perTier`, `canopyBase`, `branchWood`. There is no field for
fork height, fork count, branch angle separate from `lift`, crown
taper/curvature, branch droop, whorl regularity, trunk lean, or bark
geometry. Every structural difference between Oak and Cherry is
therefore forced through five scalars: height, spread, trunkWidth,
lift, and the level window.

Exact profiles ([lib/tree.ts:60](../lib/tree.ts:60)):

| Species | height | spread | trunkWidth | branches | levelBase+Range | lift | primaryWidth | Distinguishing flags |
|---------|--------|--------|------------|----------|-----------------|------|--------------|----------------------|
| Oak | 4.3 | 2.4 | 0.34 | [6,8] | 0.32 + 0.57 | 0.65 | 0.20 | — |
| Birch | 5.7 | 1.45 | 0.24 | [8,8] | 0.32 + 0.57 | 1.25 | 0.15 | `barkFleck` |
| Maple | 4.7 | 2.2 | 0.30 | [7,9] | 0.32 + 0.57 | 0.80 | 0.18 | `opposite`, `autumn` (leaves only) |
| Cherry Blossom | 3.8 | 2.7 | 0.30 | [7,8] | 0.30 + 0.50 | 0.30 | 0.17 | `barkBand` |
| Weeping Willow | 5.0 | 2.3 | 0.38 | [8,8] | 0.30 + 0.50 | 0.70 | 0.16 | `form: "willow"` |
| Pine | 6.6 | 2.1 | 0.30 | [0,0] | — | — | 0.09 | `tiers: 9, perTier: 3, canopyBase: 0.30` |
| Jacaranda | 4.9 | 2.7 | 0.28 | [7,9] | 0.48 + 0.38 | 0.35 | 0.16 | `compound` (leaves only) |
| Spruce | 7.2 | 1.7 | 0.26 | [0,0] | — | — | 0.105 | `tiers: 12, perTier: 4, canopyBase: 0.14` |

`height` is jittered per seed: `height + rng() * 0.8`
([lib/tree.ts:82](../lib/tree.ts:82)). `spread` is used unjittered.

### Trunk, roots, and shell fillers (all species)

- Base voxel at `[0, 0.1, 0]`, size `[0.38, 0.22, 0.38]`
  ([lib/tree.ts:462](../lib/tree.ts:462)), then 5 surface roots:
  `path` from `[0, 0.09, 0]` to radius 0.55 at ground level, width
  0.18, at angles `j * 2.4 + rng() * 0.2`
  ([lib/tree.ts:463](../lib/tree.ts:463)). Root count, length, and
  flare are identical for a 0.24-wide birch trunk and a 0.38-wide
  willow trunk. No species has buttress, flare, or leaning roots.
- One single trunk for every species: `path([0, 0.1, 0],
  [curveX, height, curveZ], trunkWidth, base, bend 0.22, shell true)`
  ([lib/tree.ts:475](../lib/tree.ts:475)), where
  `curveX = (rng() − 0.5) * 0.6`, `curveZ = (rng() − 0.5) * 0.5`
  ([lib/tree.ts:473](../lib/tree.ts:473)). The trunk never forks,
  never terminates at the crown base, and always reaches full
  `height`. Crown shape is therefore always "branches stuck on a
  pole that continues to the tip", closed by leader shoots (below).
- `path` ([lib/tree.ts:229](../lib/tree.ts:229)) lays wood voxels
  every `width * 0.6` along a straight `from → to` line with a
  sinusoidal sideways bend (`bend`, default 0.08; trunk 0.22), and
  tapers width by `1 − t * 0.27` along each segment. Width never
  steps down at a branch junction except by starting the next
  segment thinner (primaries do this once: `primaryWidth * 0.8`
  for the second segment).
- Shell fillers: when `shell` is true and width > 0.18, each trunk /
  primary node spawns 4 filler voxels at `±offset` on X and Z,
  `offset = w * 0.52`, size `w * 0.9`
  ([lib/tree.ts:249](../lib/tree.ts:249)). This makes trunks and
  primaries read as thick square-ish columns. It applies to the
  trunk of *every* species and to both primary segments of every
  broadleaf — so a birch trunk and an oak trunk have the same
  cross-section construction, differing only in `trunkWidth`.
- Bark colour is the only trunk differentiator: random pick from
  `bark[4]` per wood voxel in `put`
  ([lib/tree.ts:174](../lib/tree.ts:174)), with two exceptions —
  Cherry `barkBand` forces `bark[3]` on every third 0.24-high band
  ([lib/tree.ts:175](../lib/tree.ts:175)), and Birch `barkFleck`
  picks white-ish tones with 8% dark flecks
  ([lib/tree.ts:177](../lib/tree.ts:177)). There is no fissure,
  plate, or lenticel geometry; colour noise is the whole bark model.

### Broadleaf branching (Oak, Birch, Maple, Cherry, Jacaranda)

The generic broadleaf loop ([lib/tree.ts:512](../lib/tree.ts:512)):

- Branch count: `branches[0] + floor(rng() * (branches[1] −
  branches[0] + 1))` — 6–9 primaries for every broadleaf.
- Stratification: branch *b* attaches at trunk fraction
  `level = clamp(levelBase + (b / branches) * levelRange ± 0.03,
  levelBase, 0.89)` ([lib/tree.ts:516](../lib/tree.ts:516)).
  Branches are thus evenly stratified up the trunk. Four of five
  broadleaves share `levelBase 0.30–0.32`; only Jacaranda starts
  higher (0.48). No species branches below 30% of trunk height,
  and the lowest branch is never dominant.
- Azimuth: `angle = b * 2.39996 + rng() * 0.55` (golden angle,
  [lib/tree.ts:533](../lib/tree.ts:533)) — scattered spiral for all,
  including Maple, whose `opposite: true` is consumed only at leaf
  scale ([lib/tree.ts:599](../lib/tree.ts:599),
  [lib/tree.ts:660](../lib/tree.ts:660)). Primary branches are
  never opposite, never whorled, never paired.
- Length: `spread * (0.65 + rng() * 0.35) * (1 − max(0, level −
  0.55))` ([lib/tree.ts:534](../lib/tree.ts:534)) — upper branches
  shorten only above 55% height, linearly, to 0.55× at the top
  branch. Crown outline is therefore a cylinder with a slightly
  pinched top, not a sphere, cone, vase, or umbrella. The pinch
  factor is species-independent.
- Two-segment lift: `end.y = from.y + lift + rng() * 0.8`
  ([lib/tree.ts:538](../lib/tree.ts:538)); `mid` sits at 45% of the
  horizontal run and 62% of the vertical rise
  ([lib/tree.ts:541](../lib/tree.ts:541)), so every primary rises
  steeply first, then flattens — the same arch for oak limbs and
  cherry limbs. First segment width `primaryWidth` with shell
  fillers, second `primaryWidth * 0.8` with shell fillers
  ([lib/tree.ts:546](../lib/tree.ts:546)). Every primary is a thick
  two-piece arm; no species gets thin, twiggy, or drooping
  primaries from this loop.
- Sprays and twigs: each primary carries 3–5 sprays
  (`path` width 0.115, reach 0.65–1.3, rise `+0.5 + rng() * 0.75`,
  [lib/tree.ts:565](../lib/tree.ts:565)), each spray 3–5 twigs
  (width 0.065, rise `+0.2 + rng() * 0.45`,
  [lib/tree.ts:578](../lib/tree.ts:578)). Every spray and twig
  rises. Nothing in the broadleaf loop ever goes down: the minimum
  vertical step is positive for primaries, sprays, and twigs. This
  single fact drives several per-species mismatches below
  (birch, cherry horizontality is only faked by low `lift`).
- Leader finish ([lib/tree.ts:714](../lib/tree.ts:714)): from the
  trunk node at 88% height, `leaderCount` shoots (Oak/Maple 7,
  Birch 6, Cherry 5, Jacaranda 4) radiate at golden angle with
  `leaderReach` 0.5–1.0 and rise `+0.45 + rng() * 0.5`. Every
  broadleaf crown is closed by the same upward tuft. This is what
  guarantees the "leader zone" test (≥10 leaves and ≥5 wood voxels
  above 90% of max Y), and it forces every crown top to be a dome
  or point — a flat top (jacaranda) or a forked top (oak, cherry)
  cannot occur.

### Conifers — `growConifer` ([lib/tree.ts:280](../lib/tree.ts:280))

- The same single trunk is grown first; conifer form returns early
  ([lib/tree.ts:504](../lib/tree.ts:504)) so no broadleaf branching
  runs. Tiers: `tiers` levels from `canopyBase` to 0.92 of trunk
  nodes, each with `perTier` branches at
  `angle = tier * 0.85 + k * 2π / perTier + rng() * 0.35`
  ([lib/tree.ts:292](../lib/tree.ts:292)) — whorled in count but
  azimuthally jittered and tier-rotated, which reads as near-whorls.
- Reach: `spread * (1 − f^1.15 * 0.78) * (0.85 + rng() * 0.3)` where
  `f` is tier fraction ([lib/tree.ts:293](../lib/tree.ts:293)) —
  bottom tier reaches ~`spread`, top tier ~0.22 × `spread`. The
  taper exponent 1.15 and floor 0.22 are shared by Pine and
  Spruce; only `spread`, `tiers`, `perTier`, and `canopyBase`
  differ. End height: `from.y − 0.14 − reach * 0.07 + rng() * 0.12`
  ([lib/tree.ts:297](../lib/tree.ts:297)) — every conifer branch
  droops slightly and none upturns at the tip. Branches are single
  `path` segments (bend 0.03), width `branchWood` (Pine 0.09,
  Spruce 0.105), no second segment, no sub-branching: needles
  (covered in [leaves.md](leaves.md)) attach directly along the
  branch. There are no drooping secondary branchlets (spruce) and
  no tufting at branch ends (pine).
- Crown-base difference is real and sourced (below): Pine
  `canopyBase 0.30` (lowest tier at 30% height, i.e. a clear trunk
  for the bottom third), Spruce `canopyBase 0.14`. Tip tuft: 14
  needles + 1 leaf voxel at the trunk tip
  ([lib/tree.ts:340](../lib/tree.ts:340)).

### Willow — `growWillow` ([lib/tree.ts:348](../lib/tree.ts:348))

- Hardcoded 8 branches (profile `branches` ignored), levels
  0.30–0.85 ([lib/tree.ts:351](../lib/tree.ts:351)), azimuth golden
  angle + jitter. Each branch: `path` up to an apex at 52% of
  `reach` (1.7 + rng() * 0.7) and `+0.75 + rng() * 0.4` up
  ([lib/tree.ts:360](../lib/tree.ts:360)), width 0.16 with shell;
  then a second `path` (width 0.085) to `droopEnd` at full reach
  and `y = max(0.7, from.y − 0.9 − rng() * 1.3)`
  ([lib/tree.ts:366](../lib/tree.ts:366)). This arch-then-droop is
  the only species-specific branch geometry in the generator, and
  it is genuinely willow-like in profile. Leaves hang from both
  segments, plus chained hanging strands from every third droop
  node ([lib/tree.ts:401](../lib/tree.ts:401)). Crown tufts on the
  last 6 trunk nodes hide the trunk tip
  ([lib/tree.ts:418](../lib/tree.ts:418)) — the willow is the only
  broadleaf whose trunk tip is deliberately concealed.

### Measured current output (seed = species index, this session)

Generated with `generateTree(seed)` and measured directly
(max Y, max leaf radius, voxel counts). These are observations of
the code above, not external claims:

| Seed / species | Voxels | maxY | Crown diameter ÷ height (2·radius/maxY) | Reading |
|---|---|---|---|---|
| 0 Oak | 6,621 | 5.69 | 1.26 | Wide, but see fork/limb findings |
| 1 Birch | 7,566 | 7.73 | 0.68 | Narrow and tall |
| 2 Maple | 8,725 | 7.14 | 0.87 | Mid oval |
| 3 Cherry | 10,708 | 5.17 | 1.35 | Widest and lowest — directionally right |
| 4 Willow | 1,829 | 5.74 | 0.84 | Far fewer voxels; droop reaches radius 2.40 |
| 5 Pine | 3,079 | 7.29 | 0.64 | Tall, narrow cone |
| 6 Jacaranda | 8,095 | 6.34 | 0.94 | Near-spherical, not flat-topped |
| 7 Spruce | 4,413 | 7.35 | 0.56 | Tallest-feeling, narrowest cone |

All eight sit inside the tested 1,000–12,000 budget
([garden.test.ts:69](../tests/garden.test.ts:69)); Cherry at
10,708 is closest to the ceiling, Willow at 1,829 closest to the
floor. Any structural change that adds wood must be costed against
Cherry first.

### Invariants any structural change must keep

From [tests/garden.test.ts](../tests/garden.test.ts), as also
summarised in [leaves.md](leaves.md):

- **Attachment** ([garden.test.ts:42](../tests/garden.test.ts:42)):
  for every voxel, `parent < i`, `start >= parent.end`,
  `anchor` equals the parent position exactly, and on every axis
  `|position − parent.position| <= (size + parent.size) / 2 +
  0.001`. In `put` ([lib/tree.ts:138](../lib/tree.ts:138)) the
  start time is inherited as `parent.end`, so timing follows the
  parent chain automatically *provided* every new voxel is
  parented to a voxel that already exists and is spatially within
  half-sum-of-sizes on all three axes. Long thin branches are the
  risk: `path` steps `width * 0.6`, which is safe; any new
  "jump" placement (fork tips, droop ends) must still step through
  `path` or keep hops under the half-sum bound.
- **Growth timing / leader zone**
  ([garden.test.ts:86](../tests/garden.test.ts:86)): every species
  needs ≥10 leaf voxels and ≥5 wood voxels above 90% of max Y, and
  some leaf with `start < 0.7` (normalised). Removing the trunk
  tip or the leader tuft (the obvious fix for forked species)
  breaks this test unless replacement wood+leaves are placed just
  as high. `finish()` normalises all times by the maximum `end`
  ([lib/tree.ts:272](../lib/tree.ts:272)), so a longer deepest
  chain rescales everyone else's timing.
- **Voxel budget** ([garden.test.ts:63](../tests/garden.test.ts:63)):
  1,000–12,000 voxels per tree. Forking a trunk multiplies trunk
  wood; whorl densification multiplies branch wood.
- **No near-duplicate structural wood**
  ([garden.test.ts:63](../tests/garden.test.ts:63)): structural
  wood (size ≥ 0.12) must be ≥0.03 apart. `put` enforces this for
  wood ≥0.12 via the occupancy map (`findOccupied`,
  [lib/tree.ts:92](../lib/tree.ts:92)); forked trunks that run
  close together near the fork crotch are the natural violator.
- **Determinism** ([garden.test.ts:7](../tests/garden.test.ts:7)):
  `generateTree(seed)` deep-equals itself and differs across seeds.
  Any new `rng()` draw reshuffles all downstream draws for that
  species. Structural changes are therefore one-time appearance
  changes for every seed of that species — acceptable if intended,
  but they must be *only* where intended (guard new draws behind
  the species' own branch of code, as `growConifer`/`growWillow`
  already do).
- **Species signatures** ([garden.test.ts:15](../tests/garden.test.ts:15)):
  conifers tall and narrow (`maxY > 6`, radius < 0.45·maxY, tiers
  shrink upward, spruce leafier than pine); cherry wide and low
  (width/height > 0.9); willow leaves hang low. Structural changes
  must not invert any of these ratios.

## Per-species findings

Each species: sourced structure first (with source IDs), then what
the generator does today, then the largest structural mismatches in
priority order. Dimensions are mature landscape/forest dimensions
from the sources; the generator comparison uses ratios and
architecture, never absolute units.

### 1. Oak — *Quercus robur* (corroborated by *Q. alba*, *Q. velutina*)

**Sourced structure.**

- *Height and spread.* English oak "can reach over 100 feet tall"
  with a round crown [S1]; 20–40 m with a broad spreading crown
  [S5]. White oak reaches 100 ft [S2], black oak 80 ft [S3]. The
  defining ratio is spread ≈ height or greater: open-grown white
  oak has a "wide spreading" crown on a "stocky bole" [S2], and
  US extension figures for white oak are height 60–100 ft with
  spread 50–80 ft (see [leaves.md](leaves.md) source context; the
  form statement itself is [S2]). The crown "often appears open
  with large branches dominating the round crown" (UF/IFAS wording
  found via search; the fetched corroboration is [S1][S2][S5]: round,
  broad, wide-spreading).
- *Crown shape.* Round to broadly spreading and irregular when
  open-grown [S1][S2][S5]; only forest-grown white oak is "upright
  and oval" [S2]. Black oak: "irregular crown" [S3]. Regularity is
  the wrong target for an open-garden oak.
- *Trunk.* Short and stocky relative to crown in the open [S2];
  white oak forest form is the exception with a tall bole [S2].
  The UF/IFAS sheet found in search describes the main trunk as
  "normally straight up or slightly bent up through the center of
  the crown" — i.e. the trunk persists but is visually dominated by
  the limbs. Bark: gray-brown and "deeply fissured with age" [S1];
  white oak whitish/ashy gray, scaly to platy/blocky [S2]; black
  oak nearly black and deeply furrowed [S3].
- *Branch habit.* Few, massive, wide-spreading, mostly horizontal
  limbs (the [S2] "wide spreading" + stocky bole combination; the
  broad sturdy branches of [S5]). Low branching relative to total
  height: the limbs that dominate the crown leave a short bole,
  they are not evenly stratified to the tip.
- *Signature trait.* Massive low horizontal limbs wider than the
  tree is tall, on a short fissured trunk. If a viewer cannot see
  individual huge limbs, it does not read as oak.

**Current generation.** Profile: height 4.3 (shortest-but-one),
spread 2.4, thickest broadleaf trunk except willow
(`trunkWidth 0.34`), 6–8 primaries, lift 0.65. Measured seed 0:
diameter/height 1.26 — the *outline ratio* is already oak-like.
Everything inside the outline is not: a single trunk runs the full
4.3–5.1 height ([lib/tree.ts:475](../lib/tree.ts:475)), primaries
start at 32% and stratify evenly to 89%
([lib/tree.ts:516](../lib/tree.ts:516)), every primary is the same
two-segment rising arm (lift 0.65 + up to 0.8 jitter), and 7 leader
shoots close the top. Bark is a random 4-brown mix with no fissure
signal.

**Largest mismatches.**

1. **No low fork, no dominant limbs.** Real oak structure is a
   short bole splitting into 3–5 massive limbs; Mneme oak is 6–8
   equal primaries distributed over the top two-thirds of an
   unbroken pole. This is the single largest structural mismatch
   in the whole generator, because the scaffold forbids it for
   every broadleaf (see Ranked changes #1).
2. **Branches too upright and too regular.** Lift 0.65 with the
   universal 62%-rise mid-point makes ascending arms; oak limbs
   leave near-horizontally. Even stratification + golden angle
   makes a regularity that [S2][S3] explicitly contradict
   ("rugged, irregular").
3. **Trunk too dominant, crown too domed.** The full-height trunk
   plus 7 leaders produce a dome apex; an open oak's top is the
   irregular meeting of limb ends, lower than the current leader
   tuft implies. Bark fissuring is inexpressible in the current
   colour-only model and is not counted as a top mismatch for that
   reason.

### 2. Birch — *Betula pendula*

**Sourced structure.**

- *Height and spread.* To 65 ft [S6]; cultivated 40–60 ft tall ×
  20–40 ft wide [S9]; Cornell: 30–50 ft × 25–30 ft [S8]. Spread is
  roughly 0.5–0.65× height — a distinctly narrow tree.
- *Crown shape.* "Open, pyramidal crown" [S6]; pyramidal when
  young, oval-pyramidal to oval at maturity [S7][S8][S9]. Open
  (see-through) is part of the definition in [S6].
- *Trunk.* Slender, upright — "main trunk is upright" even though
  branches pend [S9]. Bark is the signature: white, smooth,
  peeling a bit, with the base developing "thick bark which
  splits into narrow, vertical furrows which are nearly black"
  [S6]; "white with prominent black vertical fissures" [S9].
- *Branch habit.* "Distinctly drooping fine branches" [S6];
  twigs "slender … and noticeably drooping" [S6]; "graceful
  pendulous branches" [S8]; "somewhat pendulous branches at all
  ages" [S9]. The droop is in the *outer, fine* branching, not
  the scaffold.
- *Signature trait.* White trunk + a veil of drooping fine outer
  branchlets over a pyramidal-oval, open crown.

**Current generation.** Height 5.7 (tallest broadleaf), spread
1.45 (narrowest), `trunkWidth 0.24` (thinnest) — the proportions
are the best-matched of any broadleaf: measured diameter/height
0.68 sits right in the sourced 0.5–0.65 band's neighbourhood.
`barkFleck` already gives the white-with-dark-fleck trunk (the
[research/leaves.md](research/leaves.md) bark work). But `lift
1.25` is the *steepest* primary rise of any species — birch
primaries ascend more violently than oak's — and sprays/twigs
rise a further +0.5–1.25 / +0.2–0.65. Nothing droops anywhere in
the broadleaf loop; the crown is a dense ascending cone-ish oval
built from 8 primaries × 3–5 sprays × 3–5 twigs, far from "open".

**Largest mismatches.**

1. **No drooping outer branches.** The signature trait is absent:
   birch reads as a generic narrow tree with white bark. The droop
   belongs at spray/twig scale (fine branches), exactly where the
   generator currently forces a rise.
2. **Crown too dense and too ascending.** "Open" [S6] vs the
   standard spray/twig multiplication; lift 1.25 overshoots even
   the pyramidal young form — real birch primaries ascend, then
   the branchlets fall. Current geometry has only the first half.
3. **Bark base not differentiated.** The near-black furrowed base
   [S6][S9] is a *vertical gradient* the random fleck cannot make:
   white above, black-fissured below ~15% height. (Colour-only
   fix, listed in Ranked changes as a cheap rider.)

### 3. Maple — *Acer saccharum* (corroborated by *A. rubrum*)

**Sourced structure.**

- *Height and spread.* Sugar maple to 100 ft [S10]; Morton mature
  60–75 ft tall × 40–50 ft wide [S12] — spread ≈ 0.65× height.
  Red maple to 90 ft [S11].
- *Crown shape.* "Very dense elliptical crown" [S10]; dense
  rounded crown [S12 (cultivar text)]; open-grown red maple:
  shorter trunk, rounded crown [S11]. Dense is definitional —
  the opposite of birch's open crown.
- *Trunk.* Straight; forest red maple "trunk usually clear for
  some distance", open-grown shorter [S11]. Bark brown, on older
  trees darker with furrows and "long, thick irregular curling
  outward, firm ridges" [S10]; red maple smooth light gray when
  young, breaking into long fine scaly plates [S11 context in
  fetched sheet].
- *Branch habit.* **Opposite branching** is the genus signature:
  both fetched sheets state "Opposite, simple" leaves [S10][S11],
  and in Acer opposite leaves mean opposite twigs/branches —
  branches leave the trunk in pairs. Crown density comes from
  this paired, subdivided branching.
- *Signature trait.* Opposite (paired) branching building a dense
  elliptical-to-rounded crown.

**Current generation.** Height 4.7, spread 2.2, lift 0.8, 7–9
primaries; measured diameter/height 0.87 — wider than the sourced
0.65 ratio, acceptable. `opposite: true` exists but is consumed
only when placing leaves on twigs
([lib/tree.ts:599](../lib/tree.ts:599)): the trunk still emits
single primaries at golden angle
([lib/tree.ts:533](../lib/tree.ts:533)), and sprays alternate
singly. The crown's density is the generic spray/twig density —
the same recipe that makes birch too dense makes maple roughly
right by accident.

**Largest mismatches.**

1. **Branch-level opposite branching absent.** At reading
   distance the paired structure is what separates maple from
   every other broadleaf in the garden; today only a leaf-scale
   pairing hints at it. Primaries (and ideally sprays) should
   emit in opposite pairs with successive pairs rotated ~90°
   (decussate), the branch-level analogue of what leaves already
   do.
2. **Crown outline too cylindrical.** The shared linear
   length-taper above 55% height gives a barrel; the sourced
   form is an ellipse — widest near mid-crown, closing above
   *and* below. Maple is the species that most wants a shaped
   length-vs-level curve.
3. **Trunk clearance undifferentiated.** Open-grown maple's
   shorter clear trunk [S11] is expressible via `levelBase`, but
   Maple shares Oak/Birch's 0.32 — a missed cheap distinction.

### 4. Cherry Blossom — *Prunus serrulata* ('Kwanzan' type)

**Sourced structure.**

- *Height and spread.* 25–30 ft "high and wide" [S14]; 15–25 ft
  tall and equally wide [S15]. Spread ≈ height — the widest
  ratio of any species in this set except willow/jacaranda.
- *Crown shape.* "Usually a vase-shaped, spreading crown" [S14];
  habit variable by cultivar: wide-spreading, vase-shaped, or
  weeping [S15]. The vase = branches leave low and diverge
  upward-outward like a wine glass, the opposite of a dome on a
  pole.
- *Trunk.* Short: the vase forking is low, the tree is small and
  short-lived [S15]. Bark is a signature in itself: "thin, smooth,
  reddish to bronze, glossy with very prominent horizontal
  lenticels" [S14]; "smooth, shiny, marked with long horizontal
  lenticels" [S16].
- *Branch habit.* Spreading, ascending-outward branches forming
  the vase walls; horizontal tendency in wide-spreading cultivars.
- *Signature trait.* Low vase fork + horizontal-lenticel bark
  bands + (in season) blossom, covered in
  [leaves.md](leaves.md).

**Current generation.** Height 3.8 (lowest — right for a small
tree), spread 2.7 (joint widest), lift 0.3 (flattest primaries —
a partial vase gesture), `barkBand` already bands the bark every
third 0.24 band ([lib/tree.ts:175](../lib/tree.ts:175)). Measured
diameter/height 1.35, and the garden test asserts cherry canopy is
wide and low (ratio > 0.9,
[garden.test.ts:20](../tests/garden.test.ts:20)) — the outline is
the best-matched of the broadleaves after birch.

**Largest mismatches.**

1. **No low vase fork.** Branches stratify from 30% to 80% up a
   full-height single trunk; a vase needs 3–5 stems diverging from
   ~15–25% height with the centre open. The current crown has a
   trunk and leader tuft exactly where a vase is empty.
2. **Primaries still rise too symmetrically.** Lift 0.3 is flat,
   but the universal two-segment 62% mid-rise + leader dome keeps
   the silhouette domed rather than vase-walled (steep low,
   flattening top rim).
3. **Bark bands too regular and too sparse.** Real lenticels are
   many thin horizontal marks [S14][S16]; the 1-in-3 × 0.24 band
   reads as stripes at voxel scale. Minor, colour-only.

### 5. Weeping Willow — *Salix babylonica*

**Sourced structure.**

- *Height and spread.* 40–50 ft, crown usually round [S17];
  30–40 ft high *and wide* [S18]; landscape weeping willows
  50–75 ft tall and wide [S19]. Height ≈ spread.
- *Crown shape.* Round dome whose surface is made of hanging
  curtains: "long, graceful branches that sweep towards the
  ground" [S17].
- *Trunk.* Short, thick, often leaning/forking in landscape
  specimens (the fetched sheets emphasise the branches, not the
  trunk; trunk claims here are limited to: bark "grayish brown
  and irregularly furrowed" [S17], wood weak [S18]). Trunk
  character is the least-sourced item in this report — see Open
  gaps.
- *Branch habit.* Primary branches ascend out of the crown, then
  the *branchlets* do the weeping: twigs "very slender …
  hanging or drooping for long distances, almost rope-like"
  [S17]. Two orders of structure: a normal ascending scaffold
  hidden inside, and rope-like hanging foliage-bearing strands
  outside reaching (nearly) to the ground.
- *Signature trait.* Curtains of rope-like branchlets sweeping
  to the ground from a rounded crown.

**Current generation.** The only bespoke broadleaf geometry
(`growWillow`, [lib/tree.ts:348](../lib/tree.ts:348)): 8 arch-
then-droop primaries, hanging leaf strands, crown tufts hiding
the tip. Measured diameter/height 0.84; the garden test asserts
>40 leaves below 30% of tree height
([garden.test.ts:25](../tests/garden.test.ts:25)) — the willow is
the generator's structural success story. Remaining gaps are of
degree.

**Largest mismatches.**

1. **Droop stops at knee height.** `droopEnd.y = max(0.7, …)`
   ([lib/tree.ts:368](../lib/tree.ts:368)) floors every curtain at
   0.7 units on a 5.0–5.8 tree (~13% height), and hanging strands
   are capped by `(pos.y − 0.3) / 0.2` steps
   ([lib/tree.ts:407](../lib/tree.ts:407)). Real curtains sweep
   *towards the ground* [S17] — outer strands should reach
   0.1–0.3. The test's low-foliage assertion would still pass
   (it gets easier), but ground-touching voxels must keep the
   attachment chain stepping through `path`-like hops.
2. **Curtains hang from branch lines, not from a surface.**
   Strands spawn only every third droop node
   ([lib/tree.ts:401](../lib/tree.ts:401)); between branches the
   dome surface has holes. Real weeping reads as a continuous
   curtain surface. Denser strand spawning is a voxel-budget
   trade (willow is at 1,829 voxels — it has headroom no other
   species has).
3. **Trunk too straight and too visible below the crown.**
   A single `path` trunk with bend 0.22 to full height (tufts
   hide only the tip). A shorter, thicker, more bent trunk with
   the crown taking over from ~50% would match the 30–40 ft
   square habit [S18] better. Lowest priority of the three.

### 6. Pine — *Pinus strobus* (white pine; genus varies widely)

**Sourced structure.**

- *Height and spread.* "Well over 100 feet", "very straight
  trunk" [S20]. Scots pine to 90 ft [S21], slash pine over
  100 ft with a "narrowly ovoid crown" [S22] — even within
  *Pinus*, crown width varies, so a single "pine" profile is
  necessarily a choice. This report follows the task's implicit
  white-pine paradigm (5-needle fascicles in the code's
  `needleMode: "fascicle"`).
- *Crown shape.* "Conical when young, later developing wispy,
  horizontal, upturning branches" [S20]. Mature white pine is
  the classic *irregular, open, flat-topped-ish* emergent: the
  cone dissolves with age. Scots pine: "young crowns rounded,
  older crowns round-topped" [S21].
- *Trunk.* Very straight, tall, clear of branches for much of
  its length in forest form [S20]; bark later "reddish brown to
  gray-brown with prominent finely scaly, rounded, long ridges
  and darker furrows" [S20]. Scots pine's upper trunk is always
  orange and peeling [S21] — a colour-gradient trait.
- *Branch habit.* Whorled tiers (the conifer ground plan; for
  spruce stated explicitly in [S25], and white pine's tiered
  silhouette is the textbook example — but note: the *fetched*
  white-pine sheet [S20] says "horizontal, upturning", it does
  not use the word whorled; whorl regularity for pine is
  therefore asserted at genus level, not over-claimed).
  Branches horizontal with upturned tips [S20]; needles "tufted
  at the ends of the branches" in slash pine [S22] — foliage
  mass sits distally, giving the wispy/open look.
- *Signature trait.* A straight clear trunk topped by a sparse,
  irregular crown of a few heavy horizontal-upturning limbs —
  not a neat cone.

**Current generation.** `growConifer` with tiers 9, perTier 3,
canopyBase 0.30, spread 2.1, branchWood 0.09 (thinnest branches
in the generator — good for "wispy"). Measured diameter/height
0.64, garden test requires conifers tall and narrow with tiers
shrinking upward ([garden.test.ts:26](../tests/garden.test.ts:26))
— satisfied. The cone it makes is, however, the *young* white
pine [S20], perfectly regular: 9 identical whorls shrinking by
the shared `1 − f^1.15 * 0.78` rule, every branch drooping
−0.14 with no upturn.

**Largest mismatches.**

1. **Mature irregularity absent; crown too perfect a cone.**
   Nine evenly spaced whorls of 3 equal branches is a Christmas-
   tree model. Mature pine needs whorl dropout (missing tiers,
   one dominant limb per tier), longer gaps, and a less conical
   top — the reach taper should flatten (round-topped [S21] /
   irregular [S20]) rather than shrink to 22%.
2. **No upturned branch tips.** Every branch end droops
   ([lib/tree.ts:297](../lib/tree.ts:297)); white pine branches
   are "horizontal, upturning" [S20]. A two-segment conifer
   branch (out, then up at the tip) is the fix — the broadleaf
   loop already has this two-segment idiom to copy.
3. **Foliage not tufted distally.** Needles attach along the
   whole branch ([lib/tree.ts:301](../lib/tree.ts:301)); slash
   pine's tufted ends [S22] and white pine's wispiness both want
   needle density weighted to the outer half, bare wood inside.
   (Placement aspect of structure; blade aspect stays in
   [leaves.md](leaves.md).)

### 7. Jacaranda — *Jacaranda mimosifolia*

**Sourced structure.**

- *Height and spread.* Matures to 50 ft tall [S27]; UF/IFAS
  figures found in search: height 25–40 ft, *spread 45–60 ft* —
  spread exceeds height (search-level, corroborated by the
  vase/spreading form in the fetched [S27] and the umbrella
  habit in garden references; the fetched hard number is the
  50 ft height and vase crown [S27]). This is the widest-ratio
  tree in the set.
- *Crown shape.* "Retains the vase-shaped crown of branches"
  [S27]; UF/IFAS (search-found): crown shape vase/spreading,
  density open, uniformity irregular. Popularly the flat-topped
  umbrella: long spreading branches make a light, umbrella-like
  canopy (garden-literature wording; fetched support is the
  vase + open + spreading combination [S27]).
- *Trunk.* Young trees: "a long trunk with no branches" [S27];
  mature trunk to 20 in diameter, weak wood, storm-prone [S27].
  So: a clear trunk for roughly the lower half, then the vase.
- *Branch habit.* Ascending-spreading vase limbs, open density,
  foliage (fern-like bipinnate leaves) borne at branch tips
  [S27].
- *Signature trait.* A flat-topped umbrella/vase of spreading
  limbs on a clear trunk, wider than tall, open enough to see
  through.

**Current generation.** The one broadleaf that tries:
`levelBase 0.48` (clear trunk for the lower ~half — matches
[S27]'s branchless young trunk), lift 0.35, spread 2.7,
leaderCount only 4 with leaderReach 1.0. Measured
diameter/height 0.94 — the least wide of the "wide" species
relative to its real ratio (>1.0, up to ~1.5). Crown is still
closed by leaders into a dome and branches stratify 0.48–0.86
evenly; the outline measured is near-spherical.

**Largest mismatches.**

1. **No flat top.** The leader finish
   ([lib/tree.ts:714](../lib/tree.ts:714)) domes every crown;
   jacaranda's umbrella needs the top primaries at near-equal
   height forming a plane, with leaders flattened or suppressed.
   This conflicts directly with the leader-zone test (≥5 wood
   above 90% max Y) — see Ranked changes for the reconciliation.
2. **Not wide enough, not open enough.** Spread 2.7 at height
   4.9 should read wider-than-tall once foliage radius is added;
   measured 0.94 says near-spherical. Open density (fewer sprays
   in the interior) is also missing — it uses the standard
   3–5 × 3–5 multiplication.
3. **Vase walls missing (shared with cherry).** Evenly
   stratified primaries on a full-height trunk, rather than
   limbs diverging from the top of the clear trunk.

### 8. Spruce — *Picea abies* (Norway spruce)

**Sourced structure.**

- *Height and spread.* Over 120 ft, conical [S24]; genus 60–200
  ft (20–60 m) [S25]. The narrowest height:spread of the set.
- *Crown shape.* Conical [S24][S25] — the one species where a
  neat cone *is* the mature form. Crown carries nearly to the
  ground in open form (the fetched sheets state the conical form
  without a clear-bole fraction; the generator's low canopy base
  is consistent and is not contradicted).
- *Trunk.* Single straight central leader (the conical excurrent
  ground plan). Bark "red-brown and scaly, later turning gray
  with flaking scales or plates" [S24].
- *Branch habit.* **Whorled branches** [S25] — stated explicitly
  at genus level. Branches "horizontal to upward sweeping …
  that often droop branchlets" [S24]: the primary goes out and
  sweeps up, the *secondary branchlets hang* — a two-order
  signature (upswept limb, drooping curtain of branchlets).
- *Signature trait.* Tiered whorls + upswept primaries with
  drooping branchlets, in a ground-to-tip cone.

**Current generation.** Tiers 12, perTier 4, canopyBase 0.14
(lowest — branches start nearest the ground), spread 1.7,
height 7.2. Measured diameter/height 0.56, narrowest of the set;
garden test requires tiers shrinking upward and spruce leafier
than pine ([garden.test.ts:26](../tests/garden.test.ts:26),
[garden.test.ts:36](../tests/garden.test.ts:36)) — satisfied.
The cone is right; the branch *character* is generic: single-
segment branches, slight uniform droop (−0.14), needles directly
on the branch, no secondary branchlets at all.

**Largest mismatches.**

1. **No drooping secondary branchlets.** The [S24] "upward
   sweeping branches that often droop branchlets" is a
   two-segment/two-order structure; `growConifer` has one order.
   Short down-hanging twig paths from the outer half of each
   primary would create the Norway-spruce curtain silhouette.
2. **Primaries droop instead of sweeping up.** End height is
   `−0.14 − reach * 0.07` for every tier
   ([lib/tree.ts:297](../lib/tree.ts:297)); sourced primaries are
   horizontal-to-*upward* sweeping [S24]. Low tiers horizontal,
   upper tiers upswept, tips upturned — the inverse of the
   current droop.
3. **Whorls too perfect.** `tier * 0.85` rotation + jitter 0.35
   already softens this; real whorls are regular in spruce (this
   is the *least* wrong regularity in the generator — keep it,
   only jitter reach per branch so tiers don't read as stacked
   discs).

## Ranked structural changes

Ranking weighs visual gain per voxel and per unit of risk, and
the number of species unblocked. Each item names the functions /
fields in [lib/tree.ts](../lib/tree.ts) to touch, the expected
visual effect, the voxel-budget impact, and the risk to the two
tested invariants: **attachment** (parent before child,
`start >= parent.end`, `anchor` = parent position, axis overlap
≤ half-sum of sizes + 0.001) and **growth timing** (normalised
`start`/`end`, some leaf with `start < 0.7`, ≥10 leaves and
≥5 wood above 90% of max Y — the "leader zone" test).

Weber & Penn [S29] parameterise structure *per species*
(branching frequency, radius decrease, branch direction,
height/length ratio per level). Items 1–4 move Mneme in that
direction: new per-species structural fields, consumed by the
existing loops, rather than new generators per species.

### 1. Forkable trunk: `forkHeight` + `forkCount` (Oak, Cherry, Jacaranda; Willow rider)

- **Change.** Add `forkHeight?: number` (trunk fraction) and
  `forkCount?: number` to `SpeciesProfile`
  ([lib/tree.ts:25](../lib/tree.ts:25)). In `generateTree`, when
  set, terminate the main `path` trunk at `forkHeight * height`
  and emit `forkCount` limb trunks from the fork point (each a
  `path` with `shell: true`, width tapering from `trunkWidth *
  0.7`), angled outward; broadleaf primaries then attach to the
  *nearest limb node* instead of the main-trunk node, and the
  leader finish attaches at the limb tips. Defaults (absent =
  current behaviour) keep Birch/Maple/Pine/Spruce byte-identical.
  Suggested starts: Oak fork 0.30 × 4 limbs, Cherry fork 0.22 ×
  4, Jacaranda fork 0.48 × 5. Oak limbs take `primaryWidth`
  0.26–0.30 (massive); cherry/jacaranda 0.16–0.18.
- **Visual effect.** The three "dome on a pole" species gain
  their sourced silhouettes: oak's low massive limbs [S2][S5],
  cherry's vase [S14][S15], jacaranda's vase/umbrella on a clear
  trunk [S27]. This is the highest-value change in the report —
  it removes the scaffold's most visible lie.
- **Voxel cost.** Positive. Splitting one trunk into 3–5 limbs
  roughly doubles trunk wood below the crown and re-routes
  primary attachment. Estimate +300–700 wood voxels on Oak (from
  6,621 total; headroom to 12,000 is ample), +400–800 on Cherry
  — but Cherry is already at 10,708, so cherry's fork *must* be
  paired with spray/bud thinning or a blossom-budget offset
  from [leaves.md](leaves.md). Jacaranda (8,095) has room.
- **Attachment risk: medium-high, the highest in this list.**
  Fork crotches concentrate thick (`≥0.12`) wood near the fork
  point: the no-duplicate rule (≥0.03 apart,
  [garden.test.ts:63](../tests/garden.test.ts:63)) and the
  `findOccupied` early-return (`put` returns the *hit* index,
  [lib/tree.ts:149](../lib/tree.ts:149)) can silently re-parent
  a limb onto a neighbouring trunk voxel, kinking the limb.
  Mitigate: emit limbs through `path` from the fork voxel (never
  jump-place), keep the first limb step ≥ width·0.6 as `path`
  does, and spread fork azimuths by golden angle so crotch
  voxels diverge immediately. Every limb voxel's parent is the
  previous limb voxel, so `start`/`anchor` follow automatically.
- **Timing risk: medium.** The trunk no longer reaches the tip,
  so the leader-zone test (≥5 wood, ≥10 leaves above 0.9·maxY)
  must be satisfied by limb-tip + leader wood. Leaders currently
  root at the 88% trunk node
  ([lib/tree.ts:715](../lib/tree.ts:715)); re-root them at the
  highest limb nodes and verify per species. `finish()`
  renormalisation means the deepest forked chain sets the clock;
  keep limb path lengths comparable to the current trunk length
  so early leaves still start before 0.7.

### 2. Per-species crown-outline curve: branch length as a function of level

- **Change.** Replace the shared taper
  `1 − max(0, level − 0.55)` ([lib/tree.ts:535](../lib/tree.ts:535))
  with a profile-driven curve. Cheapest form: two new fields,
  `crownPeak` (level of maximum branch length) and
  `crownTop` (length multiplier at the top branch), with length
  interpolated triangularly (rise from `levelBase` to
  `crownPeak`, fall to `crownTop`). Targets: Maple peak 0.55,
  top 0.45 (ellipse [S10]); Oak peak 0.45, top 0.6 (round,
  wide top kept [S1][S2]); Cherry peak 0.5, top 0.85 (vase rim
  stays wide [S14]); Jacaranda peak 0.7, top 0.95 (flat
  umbrella rim); Birch peak 0.45, top 0.3 (pyramidal-oval
  [S6][S9]). Conifer analogue: replace the shared
  `1 − f^1.15 * 0.78` reach rule ([lib/tree.ts:293](../lib/tree.ts:293))
  with per-species exponent/floor — Spruce keeps the cone
  (floor 0.22), Pine floor rises to ~0.45 with dropout (item 5).
- **Visual effect.** Crowns stop sharing one cylinder-with-pinch
  silhouette; each species' outline (barrel vs ellipse vs vase
  vs umbrella vs cone) becomes distinguishable from across the
  garden, which no leaf change can achieve.
- **Voxel cost.** ~Zero. Same branch counts; longer top branches
  add a few `path` nodes (≈ +1–3% wood on Cherry/Jacaranda),
  shorter low Maple branches save a few.
- **Attachment risk: low.** Only `end` positions move; `path`
  stepping is unchanged, so parent chains and overlaps are
  preserved. Watch the leader-zone test on Maple: closing the
  crown top (top 0.45) must not pull the highest leaves below
  0.9·maxY — leaders still root at 88% and rise 0.45–0.95, so
  maxY is leader-set, not primary-set; verify, don't assume.
- **Timing risk: low.** No new chains; deepest-chain length
  changes by <10%.

### 3. Drooping fine branches for Birch (and the "nothing ever goes down" fix)

- **Change.** Add `droop?: number` to `SpeciesProfile`. In the
  spray/twig section ([lib/tree.ts:565](../lib/tree.ts:565),
  [lib/tree.ts:578](../lib/tree.ts:578)), when `droop` is set,
  make the *twig* segment two-piece like primaries already are:
  rise for the first half, then fall by `droop * reach` to the
  twig tip, with leaves budding along the falling piece (the
  bud loop already walks twig nodes generically). Birch:
  `droop ≈ 0.5–0.8` on twigs, sprays keep rising. Reuse the
  willow idiom (`growWillow` apex/droop split,
  [lib/tree.ts:360](../lib/tree.ts:360)) rather than inventing a
  second one.
- **Visual effect.** Birch gains its signature veil of pendulous
  fine branches [S6][S8][S9] over the (already correct) narrow
  pyramidal-oval scaffold; the tree reads as birch even in
  winter silhouette, which white bark alone cannot do.
- **Voxel cost.** Neutral to +2%. The falling piece replaces
  rising length; bud count per twig unchanged. Pair with item
  6's interior thinning to also fix the "too dense, not open
  [S6]" mismatch — birch is at 7,566 voxels and can afford the
  redistribution, not a net add.
- **Attachment risk: low-medium.** Falling twig tips descend
  toward the spray below them. Wood voxels < 0.12 (twigs 0.065)
  are exempt from the duplicate rule and the occupancy early-
  return only triggers for wood ≥ 0.12
  ([lib/tree.ts:147](../lib/tree.ts:147)), so the risk is visual
  intersection, not test failure. Keep droop tips ≥0.15 above
  the next spray's line or accept interpenetration (real birch
  curtains interpenetrate freely).
- **Timing risk: none.** Same chain structure, same depths.

### 4. Branch-level opposite branching for Maple

- **Change.** Consume the existing `opposite?: boolean` at
  branch scale. In the broadleaf loop
  ([lib/tree.ts:515](../lib/tree.ts:515)), when `opposite` is
  set, emit primaries in pairs: two branches at the same trunk
  level, azimuths θ and θ+π, with successive pairs rotated
  π/2 and stepped up by `levelRange / pairs`. Apply the same
  pairing to sprays (two per primary node, opposite). Halve
  the per-branch spray count when pairing sprays, to hold
  density (Maple wants dense [S10], but 8,725 voxels is already
  mid-budget; paired sprays at full count would push toward
  11k).
- **Visual effect.** Maple's scaffold itself becomes paired and
  layered — visible in winter and unmistakable at garden
  distance; the dense elliptical crown [S10] gains its real
  construction instead of generic density.
- **Voxel cost.** Neutral by construction (pairs replace the
  same count of singles; paired sprays at halved count). If
  spray halving is skipped: +25–35% wood+leaf on Maple
  (~+2,500 voxels) — do not skip it.
- **Attachment risk: low.** Both members of a pair parent to
  the same trunk node via their own `path` chains — the
  pattern leaf-pairing already uses safely
  ([lib/tree.ts:660](../lib/tree.ts:660)). Opposite azimuths
  diverge immediately, so crotch crowding (item 1's risk) does
  not arise.
- **Timing risk: low.** Pairs share a level, so chain depths are
  balanced; leaders (7, from 88%) unchanged and still satisfy
  the leader-zone test.

### 5. Conifer split in `growConifer`: Pine irregularity + upturn vs Spruce upsweep + branchlets

- **Change.** Branch inside `growConifer`
  ([lib/tree.ts:280](../lib/tree.ts:280)) on two new fields,
  e.g. `whorlDropout?: number` and `tipLift?: number`, plus a
  `branchletDroop?: boolean`:
  - *Pine* (`whorlDropout ≈ 0.35`): skip whole tiers or single
    whorl members deterministically from the rng stream; raise
    the reach floor (item 2) so the top stops shrinking to a
    point (round/irregular top [S20][S21]); make each branch
    two-segment — out-horizontal, then `tipLift` up at the tip
    ("horizontal, upturning" [S20]). Weight needle emission to
    the outer half of branch nodes (tufted ends [S22]).
  - *Spruce* (`branchletDroop: true`): keep regular whorls;
    change end height from uniform droop to tier-dependent
    sweep (low tiers ~horizontal, upper tiers up-swept), tips
    upturned; from the outer half of each primary, hang 2–4
    short branchlet `path`s (width 0.05–0.06, down 0.25–0.45)
    carrying the single-needle emission ("droop branchlets"
    [S24]).
- **Visual effect.** Pine and Spruce — currently the same cone
  with different tier counts — become two recognisable mature
  conifers: sparse irregular emergent vs dense curtained cone.
- **Voxel cost.** Pine: negative (dropout removes whole branch
  + needle chains; est. −15–25% from 3,079). Spruce: positive
  (branchlets add wood + needles; est. +20–35% from 4,413 →
  ~5,500 — inside budget, and *must* stay leafier than pine
  ([garden.test.ts:36](../tests/garden.test.ts:36)), which the
  Pine reduction makes easier, not harder.
- **Attachment risk: medium (Spruce branchlets).** Each
  branchlet is a new `path` parented to a primary node —
  safe if stepped at `width * 0.6` like all paths; the failure
  mode is branchlet tips landing within 0.03 of a lower tier's
  structural wood (≥0.12 test only applies to wood ≥0.12;
  branchlets at 0.05–0.06 are exempt, primaries unchanged).
  Pine dropout/tip-lift: low risk (segments shortened or
  re-angled through `path`).
- **Timing risk: low-medium.** The conifer leader-zone test
  needs wood+leaves above 0.9·maxY; the trunk tip tuft
  ([lib/tree.ts:340](../lib/tree.ts:340)) already provides this
  independently of tiers, so dropout cannot break it provided
  the tip tuft is untouched. Spruce branchlets lengthen the
  deepest chain slightly; renormalisation absorbs it.

### 6. Willow curtains to the ground + denser curtain surface

- **Change.** In `growWillow`: lower the droop floor from
  `max(0.7, …)` ([lib/tree.ts:368](../lib/tree.ts:368)) to
  `max(0.15, …)` for the outer branches (scale floor by branch
  reach so inner branches stay higher); raise the strand
  length cap ([lib/tree.ts:405](../lib/tree.ts:405)) so strands
  can step to y ≈ 0.25; spawn strands every 2nd droop node
  instead of every 3rd ([lib/tree.ts:401](../lib/tree.ts:401)).
- **Visual effect.** Curtains sweep towards the ground [S17]
  and read as a continuous weeping surface, completing the
  generator's best species instead of leaving it at knee height.
- **Voxel cost.** Positive, and uniquely affordable: Willow is
  at 1,829 / 12,000. Denser + longer strands estimate +400–900
  leaf voxels (still the smallest tree in the garden). No other
  species can buy its signature trait this cheaply.
- **Attachment risk: low-medium.** Strands are leaf chains
  stepping 0.2 down per voxel
  ([lib/tree.ts:412](../lib/tree.ts:412)); the attachment bound
  needs each hop ≤ (0.42 + 0.42)/2 + 0.001 vertically for the
  willow leaf size [0.045, 0.42, 0.045] — 0.2 steps are safe.
  The risk is strands passing through terrain/other trees
  visually (garden placement is out of scope here) and leaves
  below ground if the floor is removed entirely — keep the
  0.15 floor.
- **Timing risk: none.** Strand chains deepen slightly; the
  low-foliage test ([garden.test.ts:25](../tests/garden.test.ts:25))
  only gets easier.

### 7. Bark as vertical gradient and banding density (colour-only riders)

- **Change.** In `put`'s wood-colour branch
  ([lib/tree.ts:174](../lib/tree.ts:174)): (a) Birch — force the
  dark palette entries below 15% height (near-black furrowed
  base [S6][S9]), white above, instead of the uniform 8% fleck;
  (b) Cherry — raise `barkBand` frequency (band every 0.12–0.15
  instead of every third 0.24) and thin the band to one voxel
  row where possible [S14][S16]; (c) Pine (if Scots character
  is ever wanted) — orange upper-trunk entries above 60%
  [S21]; skip unless the pine paradigm changes. No geometry,
  no new fields beyond (a)'s height test.
- **Visual effect.** Trunks gain the sourced vertical bark
  signatures; cheap species recognition at trunk distance.
- **Voxel cost.** Zero.
- **Attachment / timing risk.** None — colour only, no new
  `rng()` draws if implemented with position tests instead of
  probability (adding draws would reshuffle downstream seeds;
  use deterministic position rules, not `rng()`).

**Explicitly not recommended:** rotating wood voxels, per-voxel
bark geometry (fissure plates), and multi-stem birch/maple
clumps. The first risks the shell-filler logic
([lib/tree.ts:249](../lib/tree.ts:249)) and the leaf-only
rotation contract the tests assert
([garden.test.ts:94](../tests/garden.test.ts:94)); the second
and third buy little silhouette change per voxel compared with
items 1–5.

## Open gaps

Fetches that failed or returned no usable content in this
session. Nothing below is cited as evidence anywhere above;
claims that would have needed these sources are either supported
by a fetched alternative or flagged as search-level / gaps in
the text.

| Attempted source | Outcome | What it leaves open |
|---|---|---|
| USDA Plants Database profile, *Quercus robur* (plants.usda.gov → plants.sc.egov.usda.gov/plant-profile/QURO2) | Redirect followed; returned a 710-byte shell (20 chars processed) — no plant data | No USDA hardiness/characteristics numbers; height/spread rests on [S1][S2][S4][S5] instead |
| UF/IFAS EDIS ST558, *Quercus robur* (ask.ifas.ufl.edu/publication/ST558) | HTTP 410 Gone | The Gilman & Watson crown-shape/density/trunk lines ("oval, round; moderate; trunk straight through crown") are known only from search snippets and are marked search-level where mentioned; fetched corroboration is [S1][S2][S5] |
| UF/IFAS EDIS ST317, *Jacaranda mimosifolia* | Redirect limit exceeded | The exact UF/IFAS height 25–40 ft / spread 45–60 ft / vase-spreading / open figures are search-level only; fetched hard support for jacaranda is [S27] (50 ft, vase crown, clear young trunk) + [S28]. The ">1.0 spread ratio" should be re-verified against a fetched UF/IFAS or Missouri Botanical Garden page before being used to size `spread` |
| Missouri Botanical Garden Plant Finder, *Jacaranda mimosifolia* (taxonid 277923) | TLS certificate error (UnknownIssuer) | Same as above — the usual MBG height/spread corroboration is missing |
| Morton Arboretum — European birch page | HTTP 404 | Birch dimensions rest on [S6][S7][S8][S9] (two universities + VT), which is sufficient; no gap in claims |
| US Forest Service FEIS, *Pinus strobus* (fs.usda.gov/database/feis/…) | HTTP 403 Forbidden | No FEIS silvics text for white-pine stand form / self-pruning height; the "clear trunk" fraction for pine therefore rests on [S20]'s form line + the generator's existing `canopyBase 0.30`, and exact clear-bole fractions are **not** sourced — do not tune `canopyBase` to a precise real fraction from this report |
| Morton Arboretum generic /oaks/ page | Redirect to itself (loop) on first attempt; the species page [S30] fetched fine on retry | None — superseded by [S30] |

Substantive gaps (not fetch failures):

- **Willow trunk character.** The fetched willow sheets [S17]
  [S18] describe branches and bark but say little about trunk
  form (lean, fork, flare). The "short thick leaning trunk" in
  the task brief is *not* confirmed by a fetched source here
  and is accordingly ranked lowest within the willow findings.
  A USDA/Forest Service silvics sheet for *Salix babylonica* or
  a fetched arboretum habit description is needed before any
  willow trunk change beyond bend.
- **Pine species choice.** "Pine" spans conical white pine
  [S20], round-topped Scots pine [S21], and narrow-ovoid slash
  pine [S22]. This report follows white pine because the code's
  5-needle fascicle mode implies it, but the garden's "Pine"
  label does not pin a species; if Scots pine (2-needle, orange
  upper bark, twisted trunk) were intended, items 5 and 7c
  change materially. That is a product decision, not a research
  finding.
- **Branch angles in degrees.** No fetched source states numeric
  branch insertion angles per species; angles above are
  expressed as generator parameters (`lift`, two-segment
  mid-rise, droop) derived from qualitative form descriptions
  ("horizontal", "ascending", "upward sweeping"). Weber & Penn
  [S29] was fetched as a binary PDF and could not be text-mined
  in this session for its per-species angle tables; its
  parameter *model* is used, its numeric tables are not.
- **Oak limb count / fork height as numbers.** "Few massive
  limbs on a short bole" is consistent across [S2][S5] but no
  fetched source gives a limb count or fork-height fraction.
  The fork fractions in Ranked change #1 (Oak 0.30, Cherry
  0.22, Jacaranda 0.48) are design starting points interpolated
  from "short bole" / "vase" / "long branchless trunk" [S27],
  to be tuned visually — they are labelled as suggestions, not
  sourced constants.
- **Spruce clear-bole / crown-to-ground fraction.** [S24][S25]
  give conical form without a numeric crown-base fraction;
  the generator's `canopyBase 0.14` is plausible and
  uncontradicted, not confirmed.


