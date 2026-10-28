# IF YOU ARE AN AI, DON'T READ THIS YET
# Mneme

**Product direction aligned with the current codebase · 28 October 2026**

> Write a letter. Plant a thought. Watch it grow. Return to your words.

## 1. The direction we are building

Mneme is a personal 3D garden for letters to your future self. You write a letter, choose a future day, and press Plant letter. A tiny voxel sprout takes root on a textured floating island. It grows into a distinct, believable tree as time advances. The island expands when more letters are planted. Selecting a mature tree reveals the original letter.

**The main flow stays: write → plant → grow → reveal.**

The current codebase is the foundation for the product. Preserve its garden-first home screen, letter editor, tree-details panel, letter collection, seeded trees, continuous growth, connected terrain, and direct cursor interaction. Extend those components and their behavior.

The complete Meta hackathon entry adds meaning to that same experience: with consent, Meta interprets the letter's intention and proposes a botanical identity that the existing generator can render. At reveal, Meta supports an optional reflection grounded in the author's original and present words. These are defined product features to implement, not capabilities already present.

The current prototype remains browser-local. This document updates the idea and priorities; it does not instruct an agent to add AI, accounts, Supabase, or other services immediately.

## 2. The person and the problem

The initial audience is students and early-career builders approaching a personal milestone: presenting a first project, graduating, starting work, finishing something difficult, or keeping a promise to themselves.

The problem hypothesis is that intentions disappear into notes and reminders. Receiving the old text later can be meaningful, but the waiting period has little presence and the person may struggle to reconnect with why they wrote it.

Mneme gives that intention a persistent, visible place. The tree makes the wait tangible. Meta personalization connects the artifact to the meaning of the letter. The reveal and optional reflection reconnect the person's earlier and present perspective.

This is a product hypothesis, not validated demand or a mental-health claim. The app should encourage reflection without grading personal improvement, diagnosing feelings, predicting the future, or pressuring people to write frequently.

## 3. What the current code actually contains

The following baseline comes from reading the current source. Runtime behavior and visual quality were not rechecked while editing this document.

| Area | Current implementation |
| --- | --- |
| Entry point | The root route opens the garden; editor, collection, details, and information are panels within it |
| Letter creation | Optional title, required original body, future calendar date, validation, and a locally saved draft |
| Planting | Generates a random persistent seed and ID, reserves a permanent position, saves one letter, then shows its tree |
| Tree identity | Procedural variation from the seed; the letter's contents do not currently affect anatomy |
| Species | Oak, Birch, Maple, Cherry Blossom, Weeping Willow, Pine, Jacaranda, and Spruce |
| Growth | Parent-dependent element timing and animated transforms; wood and foliage develop continuously |
| Clock | One accelerated simulation clock shared by all trees; a new tree reaches its date in about 50 seconds at 1× |
| Time controls | Pause/play and 0.5×, 1×, 2×, and 4× speed; time pauses while the document is hidden |
| Reveal | At 100% progress, the details panel displays the original letter text |
| Date precision | A calendar date interpreted at local noon; no user-selected time or explicit timezone field |
| Garden | Permanent spiral placement, connected terrain expansion, pixel texture, grass/soil/rock, a shared deep rock core, and sparse decoration |
| Exploration | Drag orbit, scroll/pinch zoom, pan, click/tap selection, and Recenter; manual rotation |
| Persistence | Browser-local letters, seeds, positions, draft, and simulation state |
| Accessibility foundations | Keyboard-accessible collection, focus handling, form errors, reduced-motion handling, mobile panels, and WebGL fallback |
| Model/backend | No Meta runtime integration, account, cloud persistence, email delivery, or server-enforced lock |

“Planting” currently means saving locally and adding a tree. It does not send an email or deliver a message through a remote service.

The original body is already stored in the browser before the simulated reveal. The interface hides it until maturity; that is not a secure lock. Closing the app does not advance the simulation to real-world time on return.

## 4. The experience, extended in place

### Write

Keep the existing editor: title, letter body, future day, and Plant letter. Preserve drafts and exact text.

Add Meta personalization as a compact, optional capability inside this editor. Explain that the letter will be processed to propose a tree identity, and obtain consent before making a request. The person can generate a suggestion, read its explanation, and correct it within the same panel before planting.

The existing random-tree path remains available and is labeled honestly. Do not force everyone through a separate interpretation wizard, mandatory purpose questionnaire, new route, or account screen to write a letter.

### Plant

Plant letter remains the primary action. When personalization is accepted, save its validated identity alongside the existing seed and position. When it is declined or unavailable, preserve the seeded natural-tree path.

Keep the draft during a pending or failed request. Offer a clear retry or ordinary planting path. Do not plant a temporary random tree and replace it with a different mature structure when a late model response arrives.

Create one letter and one tree per successful planting. Duplicate clicks and retries must not accidentally add extra trees.

### Grow

Keep the same live scene and growth system. The tree's accepted identity and random seed determine its appearance. The clock determines its development. Model output must not change how much time has passed.

In the current prototype, retain the clearly labeled shared demo clock and approximately 50-second default lifecycle. Existing trees do not rewind or move when another tree is planted.

Growth stops at maturity. Mature trees remain in the garden.

### Reveal

Keep the original letter in the selected tree's details panel. Reaching the simulated date currently reveals it automatically in that panel. A restrained ready state can make the moment clearer without requiring a new screen.

Flowering trees may develop flowers as part of their normal growth. A new blossom animation for every species is not a prerequisite for reveal. A pine or oak should retain its natural character.

### Reflect

Extend the existing mature-tree panel with an optional reflection field and a Meta-assisted question. With separate consent, place exact earlier and present quotes beside a brief tentative comparison.

Keep the garden and original letter accessible. Reflection must not create another tree, reset the old one, or become a required journaling session.

## 5. The Meta feature that gives the tree meaning

**Defined hackathon feature: letter meaning → accepted botanical identity → the existing procedural tree.**

The current generator accepts a seed. The next capability is a bounded identity that can select one of the eight existing species and influence supported variation within that species.

A proposed structured identity contains:

- A concise intention summary.
- One to three themes drawn from the supplied text.
- One of the existing natural species.
- A small set of bounded anatomy parameters supported by the generator.
- A short explanation connecting the proposed design to the letter.

Useful parameters can include restrained height variation, crown openness or spread, branch tendency, and foliage density. Implement only parameters that have a visible, stable effect in the renderer. Do not promise that arbitrary model instructions become geometry.

For example, a fictional letter about gradually gaining confidence presenting work might produce an interpretation of patient practice and openness. The accepted identity could favor a branching form with a progressively open crown. The explanation makes that relationship understandable, and the author can correct it.

These choices are symbolic, not scientific mappings from emotions to tree species. A difficult letter must not become a dead or inferior-looking tree. Never present inferred themes as a diagnosis, personality score, or proof of future success.

**Meaning and randomness have different jobs.** Meta selects an understandable design direction. The persistent seed creates individual branch, twig, and leaf detail within it. Multiple people can share a theme without receiving identical trees.

Validate output against an allowed species list and supported parameter bounds. Meta supplies data; the application creates geometry. Reject unsupported output and retain the original letter and draft.

Use the Muse Spark series through the Meta Model API as the planned application model integration. Confirm the actual model identifier, account access, and request contract at implementation time. Development with Muse Wonder or Muse Code should be described separately from real runtime model features.

## 6. Meta-assisted reflection

### One question grounded in the letter

After reveal and consent, generate one concise question that refers to the author's intention without assuming that life improved or a goal was achieved. A static question remains available when the person declines or the model is unavailable.

### Then and now, using the person's words

After the author writes a reflection and separately consents to comparison, request:

- One quote from the original letter.
- One quote from the reflection.
- A short, tentative observation about their relationship.

Check both quotes against the exact source texts before displaying the result. Reject fabricated quotations. Preserve line breaks and original wording in the letter itself.

The author judges what changed. The app does not award a growth score, infer a diagnosis, or invent events that happened between the messages.

These two features close the personal loop around the tree. They stay within the existing details panel and are optional for the person to use.

## 7. Preserve and develop the current tree art

The current eight-species generator is the art direction to continue. Retain Oak, Birch, Maple, Cherry Blossom, Weeping Willow, Pine, Jacaranda, and Spruce, along with their different structural families.

Preserve species-specific features already represented in code: forked trunks, open or dense crowns, drooping birch twigs, willow curtains, conifer tiers and needles, blossom clusters, bark variation, leaf orientation, and differences between shaded and exposed foliage.

Autumn maple colors, cherry blossoms, and jacaranda flowers are natural botanical variation. Interface accent colors and tree material colors serve different purposes.

The requirement is a believable real-world tree interpreted through voxel forms:

- A grounded root flare and connected, tapering trunk.
- Branches that divide into finer branches and twigs.
- Leaves or needles attached to supporting structure.
- Distinct, imperfect silhouettes with useful negative space.
- Constrained variation that changes anatomy rather than merely tinting a clone.

Avoid lollipop crowns, repeated spheres, horizontal branch racks, floating disks, and disconnected foliage.

### Voxel detail follows the current implementation

Use the current combination of differently sized boxes and fine details. Thin, elongated, and rotated leaf forms are appropriate when they preserve the voxel character and improve botanical readability. The old requirement for every part to follow a strict 1×/2×/4× cube grid is superseded.

Keep wood structurally readable and control intersections and excess duplication. Optimize invisible geometry and rendering cost without stripping out distinctive twigs and foliage.

Persist the accepted species, identity, seed, and a generator version when extending storage. Currently only the seed determines species; changing the species-selection formula can change an older tree's appearance. Future generator changes need an explicit compatibility decision.

## 8. Actual continuous growth

Keep the parent-dependent growth schedule and per-instance animation. A tiny grounded stem and attached early leaves develop into the same generated tree that eventually matures.

Wood emerges from supported wood. Fine branches support buds and petioles. Foliage expands from those attachment points. Use gradual transforms and ordered appearance so the object visibly develops.

Visual stage labels describe this progression; they must not switch between finished models. Camera motion and uniform whole-tree scaling do not demonstrate growth.

Preserve stable tree geometry during selection, panel changes, resizing, and reloads. The stored seed and accepted identity remain the same throughout the lifecycle.

Latest anatomy and rotated foliage need new browser inspection. Mathematical attachment checks are useful evidence, but do not establish that every intermediate frame looks natural.

## 9. One textured, expanding floating island

Keep the existing permanent placement and connected terrain algorithm. New letters add land around one floating body. Preserve existing positions, surface features, and rock where possible.

The island should read from several angles: irregular grassy top, soil beneath it, substantial connected rock underneath, stepped edges, uneven thickness, and a downward-tapering silhouette. Minecraft is a reference for voxel material clarity; use the application's own generated textures and geometry.

Keep coherent material regions and fine pixel detail: related grass shades, exposed earth, stone variation, mineral flecks, pebbles, sparse tufts, and flowers. Avoid a uniform green plate, perfect disk, smooth cylinder pedestal, or separate cone beneath each tree.

New supporting ground forms before the sprout. Existing trees and mature crowns need appropriate spacing. Crowns may overlap in projection; address severe collisions using actual mature dimensions.

The garden retains mature and revealed trees as a landscape of earlier intentions. Large gardens will need measured budgets and further culling or level of detail. The current code's instancing is a foundation, not proof of unlimited scale.

## 10. Keep the modern nature interface

Continue the existing forest-green, sage, stone, and off-white visual direction. Use clean readable typography, restrained controls, good contrast, and a scene that dominates the viewport.

Keep the garden at the root route with the existing write, letters, details, and about panels. Mobile uses the current compact/bottom-panel approach. Improve individual layouts and controls as needed without replacing the product with a dashboard or a long marketing site.

Cursor interaction remains primary: drag to orbit, scroll to zoom, appropriate drag gestures to pan, and click to select. Touch supports orbit, pinch, and tap. Keep automatic rotation off by default.

Do not add turn-left, turn-right, or directional orbit buttons. Recenter is useful. Respect keyboard access, reduced motion, focus, form validation, panel scrolling, and the WebGL fallback.

## 11. Feature status and priorities

| Feature | Current baseline | Next hackathon capability |
| --- | --- | --- |
| Write and recover a letter draft | Implemented in source | Preserve exact content and error recovery |
| Plant a letter as one tree | Implemented locally | Store accepted identity without duplicates |
| Eight natural species and seeded anatomy | Implemented in source | Bounded semantic parameters and identity versioning |
| Connected growth and floating terrain | Implemented in source | Visually verify latest anatomy and multi-tree scenes |
| Cursor exploration and responsive panels | Implemented in source | Preserve and check regressions |
| Shared demo clock and simulated reveal | Implemented in source | Keep demo labeling clear |
| Meta botanical interpretation | Missing | Core next capability, inside the editor |
| Consent, correction, and honest fallback | Missing | Ship with personalization |
| Reflection field and Meta question | Missing | Extend the revealed-letter panel |
| Verified exact-quote comparison | Missing | Complete the reflection loop |
| Accounts, cloud sync, and server-enforced locks | Missing | Separate hosted-product workstream if chosen |
| Large-garden LOD and physical-device measurements | Missing | Measure limits; optimize where evidence warrants |

The first Meta-capable entry can remain explicitly browser-local with a small server-side model adapter for credential protection. Do not claim secure scheduled delivery, private cloud storage, or production locking in that version.

A durable hosted time-capsule product needs authenticated ownership, database-enforced access, and authoritative server time. These remain part of the longer-term product vision. They are not stated here as organizer-mandated hackathon requirements.

The priority is to complete and demonstrate the meaning-to-tree and reflection loop around the current working garden. A large account system must not crowd out that central experience.

## 12. Technical direction and continuity

Keep the current stack: Next.js App Router, React, TypeScript, CSS Modules, Three.js, React Three Fiber, and Drei. Continue generating the world's textures and geometry locally.

Preserve the module boundaries:

| Module | Responsibility to retain |
| --- | --- |
| components/Garden.tsx | Letter editor, panels, local persistence, and simulation control |
| components/Scene.tsx | Instanced rendering, growth transforms, camera, and picking |
| lib/garden.ts | Letter/storage validation and clock/date logic |
| lib/tree.ts | Seeded species anatomy and growth dependencies |
| lib/terrain.ts | Stable placement, surface detail, and connected rock |

An eventual Meta adapter keeps credentials on the server and uses bounded validated output, reasonable timeouts, and honest error handling. The initial local version sends text only after explicit consent. It must explain that consenting text leaves the browser even while storage remains local.

Extend the tree generator with accepted identity parameters while retaining the existing seed-only behavior for old records and ordinary planting. Cache geometry using seed, accepted identity, and generator version so a seed-only cache cannot silently ignore personalization.

Migrate browser records without erasing letters, positions, or clock progress. Do not regenerate or reroll a planted identity on reload.

If a hosted version is later authorized, Supabase Auth/Postgres is the previously proposed persistence direction. Cloud storage, atomic sealing/slot allocation, immutable records, and server-authorized reveal require their own implementation and migration work. They are not present in this checkout.

For genuine scheduled capsules, add explicit date/time/timezone semantics and use authoritative time. The current local-noon date and paused simulation should not be described as that production behavior.

## 13. Privacy and honest product claims

Current letters are browser-local and unencrypted. The simulation hides their display until maturity but does not prevent someone with browser access from reading stored content. Clearing browser data can remove the garden.

Describe those limits plainly. Do not call the local demo a secure vault, claim email delivery, or imply that demo-time controls protect a sealed message.

Meta processing is explicit and optional for the person. Explain which text is sent, why it is sent, and that the tree explanation can reveal a hint of its themes. Keep raw letters, prompts, responses, and credentials out of logs and public evidence.

For any future hosted lock, keep letter bodies out of browser responses before authorization. A visual time-lapse must never bypass the real access gate.

## 14. The actual Meta hackathon criteria

The official waiver gives the project judging weights below. These are project-submission criteria, distinct from application selection. The public event page's brief indie description is useful context, but the weighted rubric should guide the entry. [Official rules and event waiver](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver)

| Official criterion | Weight | Mneme's response and evidence to produce |
| --- | --- | --- |
| Impact | 30% | Define one real audience and milestone problem; show that the tree and return help people reconnect with an intention; collect early user feedback |
| Use of Meta AI Tooling | 25% | Show an actual letter interpretation changing supported tree parameters, plus grounded reflection; demonstrate validated model output and author correction |
| Technical Depth & Execution | 20% | Show deterministic identities, connected growth, species anatomy, persistent placement, coherent terrain, and sound integration boundaries |
| Demo | 25% | Deliver a working, polished write-to-reveal flow and a clear video that survives live interaction and model failure |

The public event describes the indie track for individual builders/students and the theme Build for Your World. That is Mneme's proposed positioning, based on its personal milestone use case. Track choice and eligibility still depend on the participant's actual circumstances. [Event overview](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)

This rubric makes two priorities clear: impact needs evidence beyond attractive art, and the Meta contribution must be visible in the resulting experience. Beautiful random trees alone do not substantiate semantic personalization.

The distinctive technical idea is translating a person's meaning into bounded parameters for a persistent, growing procedural world, then using the same original words to support a later reflection. The renderer and clock remain deterministic so the experience is reproducible and controllable.

These are our product choices and assessment of the fit, not an official score or a prediction of winning.

## 15. How to prove the idea

### Impact evidence

Use fictional examples for public demonstrations. With willing early testers, ask whether the accepted interpretation feels connected to their intention, whether the tree gives the waiting period meaning, and whether returning to their words is useful. Report the sample size and actual responses. Do not infer retention or therapeutic benefit from a few short sessions.

### Evidence of Meta's contribution

Show a real response becoming a validated identity and then a visible tree. Use controlled demo fixtures to distinguish the semantic parameters from random variation: hold a seed constant while changing accepted identities, and show that replaying the same accepted identity and seed produces the same result.

Provide honest provenance for live output, cached output, ordinary seeded trees, and fallbacks. Preserve the author's ability to correct an interpretation.

### Technical and visual evidence

Inspect the latest eight species and intermediate growth states on desktop and mobile. The source currently defines fifteen tests; existing verification notes report historical runs, not fresh results for this document. They also say the latest anatomy screenshots need recapturing.

Capture the empty island, a sprout, intermediate wood and foliage growth, several distinct mature trees, connected expansion, and the editor/details panels. Verify reload persistence, clock boundaries, a declined or failed model request, and exact-quote validation. Publish measured performance and concrete limits.

## 16. A demo built around the current flow

This sequence is a proposed presentation, not an official duration requirement.

1. Open the actual garden and write a short fictional letter about an upcoming milestone.
2. In that editor, explicitly opt in to Meta personalization. Show the real intention summary, supported identity, and concise explanation. Accept or correct it.
3. Press the existing Plant letter action. Show connected land forming if needed, followed by a grounded sprout.
4. Run the clearly labeled accelerated clock. Let the audience see branches extend and leaves grow from supports.
5. Show several different existing species and stable island expansion. Explain which design choices came from Meta and which fine details came from the seed.
6. Select the mature tree and reveal the exact original words in the existing panel. State that the local entry uses simulated time.
7. Write a short fictional reflection and demonstrate an actual Meta question or verified then-and-now comparison.
8. End on the garden as a landscape of intentions the person can return to.

Keep the scene interactive throughout. A disclosed cached fixture is acceptable recovery material; it must not be presented as a live request. If demonstrating a future hosted version, use an already-due authorized fixture for reveal and keep demo time separate from the real lock.

## 17. Scope boundaries

Preserve and refine the existing garden. Do not restart the renderer, replace the natural trees with generated pictures, introduce a separate interpretation wizard, or require unrelated navigation before planting.

Keep social feeds, tree trading, leaderboards, streaks, shops, payments, a general chatbot, image generation, voice input, and fantasy styles outside this entry's core scope.

The current editing task does not authorize implementation, credential changes, database migrations, or deployment. Preserve Git metadata, environment files, browser records, and other worktrees.

## 18. Submission description

**Mneme gives a letter to your future self somewhere to grow.** Write a message, choose a future day, and plant a tiny voxel sprout on a textured floating island. Every tree has distinct natural anatomy, and every new letter expands the connected garden. With consent, Meta interprets the intention behind the letter and proposes a botanical identity that the author can understand and correct. That accepted identity becomes bounded inputs to Mneme's procedural tree system, while deterministic time controls its growth. At reveal, the original words return unchanged, and optional Meta-assisted reflection connects them to the author's present perspective. The entry builds on a working browser-local 3D garden and demonstrates how personal meaning can become an interactive object people return to over time.

Describe features as implemented only after they work in the submitted build. If the entry remains local and uses accelerated dates, state that explicitly in the submission and demo.

## 19. Sources and verification boundary

- Product baseline: the current root-route app and the Garden, Scene, garden-state, tree, terrain, and test modules reviewed in this checkout.
- Event overview, model ecosystem, track context, and theme: [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon).
- Event details: [Details](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details). In this session the rendered page redirected to sign-in, so participant-only requirements were not read.
- Official scoring and event terms: [Waiver and Official Rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/waiver), successfully read in a rendered browser on 28 October 2026 after the text fetch returned only a loading shell.
- The waiver describes recording/public-use permissions and submission rights and originality responsibilities. Use fictional letters in public materials, retain dependency-license records, and review the actual terms before submission. This brief does not establish participant eligibility or replace the official rules.
- No application tests, build, model call, migration, or local-app browser session was run for this documentation edit. Existing app verification records remain historical evidence.

This document defines the current product direction, the missing Meta capabilities, and a concrete case for the hackathon. It does not certify completion or guarantee an award.

