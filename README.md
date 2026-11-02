<div align="center">

![Mneme header](https://capsule-render.vercel.app/api?type=waving&color=0:0f2a1a,35:1b4332,65:2d6a4f,100:40916c&height=240&section=header&text=MNEME&fontSize=84&fontColor=ffffff&fontAlignY=35&desc=A%20letter%20for%20tomorrow.%20A%20little%20life%20for%20today.&descSize=17&descAlignY=55&animation=twinkling&fontFamily=Papyrus,%20Georgia,%20serif)

> **Write a letter. Plant it. Watch it grow.**
> Mneme is a browser-local 3D garden where every letter becomes a seeded voxel tree on a floating island — and only opens on its reveal date.

<br />

![Meta AI](https://img.shields.io/badge/Meta_AI-Powered-0467DF?style=for-the-badge&logo=meta&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-0.182-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![License MIT](https://img.shields.io/badge/License-MIT-2d6a4f?style=for-the-badge)

![Stars](https://img.shields.io/github/stars/katniis/mneme?style=flat-square&color=2d6a4f)
![Forks](https://img.shields.io/github/forks/katniis/mneme?style=flat-square&color=2d6a4f)
![Last commit](https://img.shields.io/github/last-commit/katniis/mneme?style=flat-square&color=2d6a4f)

<br />

[![Meta AI Developer Hackathon](https://img.shields.io/badge/Built_for-Meta_AI_Developer_Hackathon-0467DF?style=for-the-badge&logo=meta&logoColor=white)](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)

</div>

---

>  **Hackathon entry — [Meta AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon)** · Theme: *Build for Your World*
>
> Mneme is powered by **Meta AI via the Meta Model API**: with your consent, Meta reads your letter's intention and designs the tree that grows from it — then, at reveal, helps you reflect on how far you've come. See [Powered by Meta AI](#-powered-by-meta-ai) below.

##  Why Mneme?

Some messages shouldn't be read right away.

Mneme turns a future letter — to yourself, or to someone you love — into something living. You write it, pick a reveal date, and a unique tree starts growing from its seed on a shared floating island. Day by day (on Mneme's demo clock) it sprouts, branches, and leafs out. When the reveal date arrives, the tree is mature and the letter finally opens.

No accounts. No cloud. No feed. Just a quiet garden that lives entirely in your browser.

##  Powered by Meta AI

**This is the hackathon core of Mneme: Meta AI gives every tree its meaning.**

Most AI features generate text or images. Mneme does something different — Meta AI generates a *structured botanical identity*, and Mneme's own procedural generator grows a real 3D tree from it. Meta supplies the design direction; the app creates the geometry.

```text
┌─────────────┐     ┌───────────┐     ┌────────────────────┐     ┌────────────────┐
│ Your letter │ ──▶ │  Meta AI  │ ──▶ │ Botanical Identity │ ──▶ │ Seeded 3D tree │
└─────────────┘     └───────────┘     └────────────────────┘     └────────────────┘
      └─ only with your consent               ✓ validated · you review first
                                              └─ intention · themes · species · form · explanation
```

### What Meta AI does in Mneme

| Capability | API action | What happens |
| :--- | :--- | :--- |
|  **Personalise my tree** | `interpret` | Meta reads your letter and proposes a `BotanicalIdentity`: a concise intention, 1–3 themes, a species, bounded form traits, and a short explanation of the symbolism. You can review and correct it before planting. |
|  **Reflection question** | `question` | When your tree matures, Meta generates a personal reflection question grounded in your original letter. |
|  **Then vs. now** | `compare` | Meta places exact quotes from your original letter beside your present reflection, with a brief, tentative comparison — so you can see what changed. |

The accepted identity shapes the tree itself through [`applyIdentity()`](lib/meta-identity.ts) — trunk shape (`straight` / `curved` / `twisted` / `branching`), crown shape, branching style, foliage density, and height variation — within one of 8 species: **Oak, Birch, Maple, Cherry Blossom, Weeping Willow, Pine, Jacaranda, and Spruce**. Your persistent seed then adds individual branch, twig, and leaf detail, so two letters with the same theme never grow identical trees.

### Built responsibly

- **Consent first, always.** Nothing is sent to Meta unless you tick *“Personalise my tree with Meta AI.”* Your letter otherwise never leaves the browser, and it is still only ever saved locally.
- **Strictly validated.** Model output is checked in [`validateBotanicalIdentity()`](lib/meta-identity.ts) against the species allowlist and trait bounds (0–1) — unsupported output is rejected and your letter and draft stay untouched.
- **Symbolic, never diagnostic.** The mapping from words to tree is poetic, not scientific. Meta never scores your personality, diagnoses feelings, or judges whether you “improved.”
- **Graceful without AI.** If Meta isn't configured or a request fails, you simply plant an ordinary seeded tree — no letter is ever lost to an AI error. A clearly labelled cached fictional example demonstrates the flow offline.

### How it's wired

All Meta calls go through one server route, [`app/api/meta/route.ts`](app/api/meta/route.ts), which calls the **Meta Model API** (`/chat/completions`) so your API key never reaches the browser. Configure it in `.env.local`:

```bash
META_API_KEY=your-meta-api-key
META_MODEL_ID=your-meta-model-id
META_API_BASE_URL=https://api.meta.ai/v1
```

The model is selected via `META_MODEL_ID` — see [MNEME.md](MNEME.md) for the planned Muse Spark series integration and the full hackathon product direction. Without these variables the garden works fully; only Meta personalisation is disabled.

##  Features

-  **Meta AI-personalised trees** — With your consent, Meta AI turns your letter's intention into a validated botanical identity (species, form, symbolism) that shapes the actual 3D tree you grow — plus a reflection question and then-vs-now comparison at reveal. See [Powered by Meta AI](#-powered-by-meta-ai).
- **Letters that grow** — Every letter gets one persistent seed and position, growing into an oak, birch, or maple-inspired tree. Wood, twigs, petioles, and leaf blades develop in dependency order — nothing pops in or swaps models.
-  **A living island** — Connected terrain extends around permanent tree positions, with textured soil, grass, tapered rock, pebbles, tufts, and flowers. New ground forms *before* a new sprout appears, thickening into one continuous island.
-  **One shared demo clock** — A letter planted today reaches its reveal date in ~50 seconds of garden time. Pause, 0.5×, 1×, 2×, and 4× controls are real, and old trees keep their growth when new letters are planted.
-  **Atmosphere that follows your day** — Real local time, season, and weather (optional Open-Meteo) drive sky, lighting, rain, snow, pollen, petals, and fireflies — each with independent Auto/manual control and per-effect switches. Manual choices work fully offline.
-  **Generated nature sounds** — Optional Web Audio soundscapes (breeze, rain, birds, insects) synthesized in-browser. No audio files, no microphone, no external service.
-  **Full 3D, fully usable** — Orbit, zoom, and pan on desktop and touch; click/tap a tree or pick it from a keyboard-accessible list; recenter anytime. Letters stay readable even without WebGL.
-  **Private by design** — Everything lives in `localStorage`. By default letters are never sent anywhere (weather lookups send only an approximate location or city name); the sole exception is Meta personalisation, and only when you explicitly opt in.
-  **Considerate by default** — Mobile bottom sheets, focus management, inline form errors, draft autosave, and reduced-motion support that quiets particles while keeping lighting and ground cover.

<div align="center">

![Grow with Mneme](https://capsule-render.vercel.app/api?type=soft&color=0:1b4332,100:40916c&height=90&text=plant%20%E2%80%A2%20write%20%E2%80%A2%20wait%20%E2%80%A2%20reveal&fontSize=22&fontColor=ffffff&fontFamily=Papyrus,%20Georgia,%20serif)

</div>

##  The Garden

<div align="center">

![Trees baseline at 1440px](screenshots/trees-baseline-1440.png)

</div>

>  Prefer motion? Watch [the growth preview](recordings/mneme-growth.mp4) — a frame-sampled recording of the live 4× simulation. Full check-by-check detail lives in [VERIFICATION.md](VERIFICATION.md).

##  Quickstart

**Requirements:** Node.js 24

```bash
git clone https://github.com/katniis/mneme.git
cd mneme
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — your garden starts empty. Write your first letter and plant it.

**Production build:**

```bash
npm run build
npm start
```

> Stop the dev server before starting production on the same port. Storage belongs to an origin, so `localhost:3000` and `localhost:3001` keep separate gardens.

No accounts or backend are required for the core garden. **Meta AI personalisation is optional** — to enable it, add `META_API_KEY`, `META_MODEL_ID`, and `META_API_BASE_URL` to `.env.local` (see [Powered by Meta AI](#-powered-by-meta-ai)). Without them, planting an ordinary seeded tree still works.

##  How It Works

1. **Write** — A letter (title optional), with formatting preserved. Drafts autosave while you type.
2. **Personalise (optional)** — Tick the Meta AI consent box and Meta proposes a botanical identity for your letter. Review or correct it — or skip it entirely for an ordinary tree.
3. **Choose a reveal date** — Must be in the future; validation is inline and friendly.
4. **Plant** — Your letter gets a permanent seed and island position. A tree begins to grow on the shared demo clock.
5. **Watch it grow** — Click or tap the tree anytime to see its dates and growth stage.
6. **Reveal & reflect** — At the simulated reveal date, the tree is mature and the original letter opens — with an optional Meta-generated reflection question and then-vs-now comparison.

##  Tech Stack

| Layer | Technology |
| :--- | :--- |
| AI | **Meta AI via Meta Model API** (`META_MODEL_ID`) — botanical identity, reflection |
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5.9, CSS Modules |
| 3D | Three.js, React Three Fiber, Drei |
| Audio | Generated Web Audio (no audio files) |
| Weather | Open-Meteo (optional, no API key) |
| Storage | Browser `localStorage` only |

No external fonts or image services are needed — textures and geometry are generated locally.

##  Project Structure

```text
app/          Next.js App Router entry points, layout, global CSS
components/   Garden (interface + persistence), Scene (Three.js world), Tree (growth/removal)
  environment/  Atmosphere controls, weather orchestration, lighting/sky, particles, audio lifecycle
lib/          Deterministic garden/clock, tree/terrain/removal, environment/daylight/particle logic
tests/        Deterministic logic tests (node:test)
screenshots/  Visual evidence
recordings/   Growth preview video
```

| File | Responsibility |
| :--- | :--- |
| [`app/api/meta/route.ts`](app/api/meta/route.ts) | Server route to the Meta Model API (`interpret` / `question` / `compare`) — keeps the API key off the browser |
| [`lib/meta-identity.ts`](lib/meta-identity.ts) | Botanical identity types, prompts, strict validation, `applyIdentity()` tree shaping |
| [`lib/garden.ts`](lib/garden.ts) | Data schema, storage validation, dates, shared-clock math |
| [`lib/tree.ts`](lib/tree.ts) | Seeded anatomy and dependency-aware growth schedule |
| [`lib/terrain.ts`](lib/terrain.ts) | Permanent placement, topography, materials, connected terrain |
| [`components/Scene.tsx`](components/Scene.tsx) | Instanced geometry, lighting, growth transforms, picking, camera |
| [`components/Garden.tsx`](components/Garden.tsx) | Persistence, simulation, letters, drafts, interface |

Each tree and the terrain each render as a single instanced mesh; stable matrices aren't rewritten every frame, and mature trees stop updating.

##  Your Data

Only browser local storage is used:

| Key | Stores |
| :--- | :--- |
| `mneme-garden-v1` | Letters, seeds, positions, simulation state |
| `mneme-draft-v1` | The in-progress draft |
| `mneme-environment-v1` | Environment preferences + chosen approximate location |
| `mneme-weather-v1` | Weather cache (cleared when location is cleared) |
| `mneme-audio-v1` | Soundtrack volume only |

**Be aware:** this is a local prototype. Content is not encrypted, the reveal date is a demonstration rather than a secure lock, and clearing browser data deletes the garden. There is no cloud sync or backup. The simulation pauses when the tab is hidden and doesn't catch up to real-world time on reopening.

Location is only requested through an explicit setup action, and only when active effects need it.

**Meta AI exception:** letter text is sent to Meta only when you opt in — ticking the personalisation consent, or explicitly requesting a Meta reflection question/comparison. It is never sent by default, and letters are still only saved in your browser.

##  Checks

```bash
npm test           # deterministic logic tests (node:test)
npm run typecheck  # TypeScript, no emit
npm run build      # production build
```

Tests cover seed determinism, physical attachments, connected terrain, retained land/reuse, clock boundaries, storage validation, time/season/weather resolution and migrations, particle bounds/collision, and deterministic sound profiles.

##  Limitations

- Botanical archetypes are constrained, not species-accurate; some crowns overlap in projection as you orbit.
- No LOD system yet for very large gardens.
- Physical mobile hardware, real software-keyboard behavior, screen readers, and long-session GPU performance haven't been tested (desktop + mobile emulation have).
- Wind affects particles and sound rather than deforming tree geometry; audio timbre still awaits human/device listening review.
- If the browser loses a running WebGL context, recovery depends on the browser — reload keeps your saved letters.


##  License

[MIT](LICENSE) © 2026 Justine

<div align="center">

![Mneme footer](https://capsule-render.vercel.app/api?type=waving&color=0:40916c,50:2d6a4f,100:0f2a1a&height=140&section=footer&text=thanks%20for%20visiting%20the%20garden%20%F0%9F%8C%B1&fontSize=18&fontColor=ffffff&fontAlignY=65&fontFamily=Papyrus,%20Georgia,%20serif)

**[Mneme](https://github.com/katniis/mneme)** — a letter for tomorrow, a little life for today.

</div>
