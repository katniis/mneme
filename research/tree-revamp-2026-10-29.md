# Tree revamp: algorithms and current-code assessment

29 October 2026. Research and planning only. Botanical references and photo galleries are in [tree-botany-2026-10-29.md](tree-botany-2026-10-29.md).

## Procedural evidence

[Runions, Lane & Prusinkiewicz, 2007](https://algorithmicbotany.org/papers/colonization.egwnp2007.html) describe space colonization: seed an intended crown volume with attraction points, extend the nearest influenced branch nodes, and remove reached points. The [paper, sections 2–3](https://algorithmicbotany.org/papers/colonization.egwnp2007.pdf) separates skeleton construction, refinement, branch thickness, and organ placement. Its pipe-model thickness relates the supporting radius to child radii through an exponent, commonly 2–3; these are modeling parameters, not universally measured species constants. Crown envelopes and point distributions provide useful artistic control. The paper also explains why regular bud patterns alone do not determine mature crown architecture.

**Proposal:** use a bounded, seeded version for the outer branching of broadleaf crowns, anchored to species-specific scaffold rules. Apply a pipe exponent of 2.3 as a starting rendering choice. Whorled conifers and hanging willow shoots get different construction rules; a single unconstrained colonizer would not establish those forms reliably. These are engineering inferences from the method and botanical references, not claims made by the authors about Mneme.

[Palubicki et al., 2009](https://algorithmicbotany.org/papers/selforg.sig2009.html) model tree development through competition for light/space and internal signals. Their method supports realistic growth and interactive shaping. It is a valuable longer-term reference, but a full light/resource simulator would add substantial runtime and calibration work to this browser-local garden. Use the simpler bounded construction first; do not claim to simulate botanical physiology or actual years of growth.

## Why the existing implementation needs more than palette changes

Observed in `lib/tree.ts` at `2f6bb3e`:

- One 1,249-line generator combines profiles, occupancy, branch construction, foliage, blossoms, and growth timings.
- Five broadleaf labels share the same nested radial branching/spray pattern; many species differences are scalar profile values. Pine and spruce share a tier generator.
- `put()` enlarges a leaf's axis-aligned dimensions until it reaches its parent; rotating it later does not prove actual oriented contact. This can turn a small leaf into a visually oversized plate.
- Trunk shell fillers overlap four large side cubes around each path node. Bark changes are per-block colour variation rather than coherent species bark patterns.
- Cotyledons persist on mature trees; flower-coloured voxels are classified only as `leaf`; maple foliage is permanently autumn-coloured and flowering profiles are permanently in bloom.
- Growth, removal, and debris rely on the current parent/anchor contract. Those safeguards must survive the rewrite, with actual rotated contact checks replacing the existing unrotated proxy where necessary.

These are source-code observations. They explain risks and targets; they are not proof that a new generator already looks better.

## Measured starting point

Single warm-process samples, Node.js 24.14.1, seeds 0–7, same workstation. Milliseconds include simple metrics and are diagnostic, not a performance guarantee.

| Label | Voxels | Wood | Leaf/flower | Height | Width | Approx. ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Oak | 8,182 | 6,267 | 1,915 | 6.02 | 6.15 | 40.2 |
| Birch | 8,859 | 7,319 | 1,540 | 7.17 | 4.35 | 28.8 |
| Maple | 5,274 | 4,321 | 953 | 6.71 | 5.46 | 17.4 |
| Cherry Blossom | 7,644 | 4,771 | 2,873 | 5.44 | 6.04 | 24.5 |
| Weeping Willow | 2,207 | 701 | 1,506 | 6.03 | 4.54 | 12.5 |
| Pine | 2,054 | 831 | 1,223 | 7.40 | 4.18 | 6.0 |
| Jacaranda | 8,501 | 5,116 | 3,385 | 6.43 | 6.38 | 17.1 |
| Spruce | 8,770 | 3,061 | 5,709 | 7.46 | 3.67 | 32.6 |

## Compatibility decision

Keep the legacy seed-to-species rule `% 8` for records without explicit species. Do not change it to `% 9`, reserve a seed range, or rewrite saved seeds. Although the app generates uint32 seeds, the storage reader accepts larger nonnegative integer seeds too; a reserved range could misclassify previously valid records.

**Proposal:** add optional `species` metadata to newly planted letters, and accept it as an optional argument to `treeFamily` and `generateTree`. Existing records retain seed-derived identity; new records explicitly record all nine choices. Cache by resolved species and seed together. Invalid optional species metadata falls back to the legacy seed-derived type without discarding the letter. This is slightly more integration work than a numeric tag, but preserves the complete existing seed domain.

## Validation principle

Compare the real reference, bare branch structure, silhouette, and finished voxel render for each species at the same camera angles. Numeric shape tests catch regressions; they cannot certify botanical resemblance. Require front/side and four-season comparisons, several seeds per species, and explicit visual review before calling the revamp finished.

## Planning artifacts checked

The companion board loaded nine proposal cards and all eight externally linked real photographs. Spring/winter controls changed the schematic foliage; birch was bare in winter while pine retained its crown. The bare-branch control worked, and the mobile view had no horizontal overflow. A missing optional favicon was the only browser console error. These checks validate the reference board, not future application geometry. A fresh design-builder read found no important unanswered planning questions. No application tests/build were run and no application code was changed in this planning pass.
