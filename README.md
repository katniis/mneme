# Mneme

A letter for tomorrow. A little life for today.

Mneme is a working, browser-local 3D garden. Write a letter, choose a reveal date, and watch a seeded voxel tree grow on a textured floating island. The garden starts empty; letters in the screenshots were written during testing.

## Run

Use Node.js 24, the version used for verification.

```powershell
cd C:\Users\jbree\pelican-test\mneme
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000).

For the production build:

```powershell
npm run build
npm start
```

Stop the development server before starting production on the same port. The verified production preview for this session runs at [localhost:3001](http://localhost:3001). Storage belongs to an origin: port 3000 and port 3001 have separate gardens.

No environment variables, credentials, API routes, accounts, or backend are required. Existing sibling folders, Git metadata, and environment files were left alone.

## What works

- Real Three.js geometry with React Three Fiber, soft shadows, seeded pixel materials, grass, soil, tapered rock, pebbles, tufts, and flowers.
- Drag to orbit, wheel/pinch to zoom, right-drag or Shift-drag to pan, one-finger touch orbit, and a Recenter action. Rotation is manual.
- Required letter content, optional titles, future-date validation, preserved formatting, and drafts saved while typing.
- One persistent seed and position per letter, with oak, birch, and maple-inspired branching. Wood, fine twigs, petioles, and leaf blades develop from completed supports rather than changing between models.
- One shared demo clock. A letter planted at 1× reaches its own reveal date in approximately 50 seconds. Pause, 0.5×, 1×, 2×, and 4× controls are real. Old trees retain their growth when a new letter is planted.
- Connected terrain extends around permanent tree positions. Its underside uses distance from the whole island's shoreline, with a shared rock spine reinforcing narrow joins. New rock grows down from supported layers, thickening existing ground into one continuous body. New supporting ground forms before the new sprout appears.
- Click/tap a tree or select its letter from the keyboard-accessible list. Details show dates and growth; original text appears at the simulated reveal date.
- Local persistence, mobile bottom sheets, focus management, adjacent form errors, reduced-motion support, and readable saved letters without WebGL.

## Your data

Environment settings can follow your real local day and night independently of demo growth time, or let you choose time of day, island season, and weather separately. Each selector has Follow local, and manual choices work offline. Seasonal island colours and local rain use an optional location or selected city; there is a master switch and a switch for each effect. Weather is approximate, model-derived Open-Meteo data. No location prompt or weather request occurs before setup. Choosing a location sends approximate coordinates to Open-Meteo; city searches send the city name. Letters are never included.

`mneme-environment-v1` stores these preferences and the chosen approximate location; `mneme-weather-v1` stores weather cache data. Clear location removes that cache. Turning effects off retains the individual preferences. Sky colours, lighting, and stars represent day and night; overcast weather changes atmospheric lighting. No cloud geometry or sun/moon models are loaded.

Only browser local storage is used. `mneme-garden-v1` stores the letters, seeds, positions, and simulation state; `mneme-draft-v1` stores the draft. Rendering caches and GPU geometry stay in memory.

This is a **local prototype**. Content is not encrypted. The reveal date is a demonstration, not a secure lock. Clearing browser data deletes the garden. There is no cloud sync or backup. The simulation pauses when the document is hidden and does not catch up to real-world time after reopening.

## Checks and captures

```powershell
npm test
npm run typecheck
npm run build
```

All seven Node test groups passed. They cover seed determinism and variation, physical parent attachment and growth ordering across seven seeds, connected expansion and stable terrain positions, coastline irregularity, a connected deep rock core at every addition from two to eight trees, shared-clock boundaries and pause/visibility rules, date validation, and malformed storage.

Browser checks covered empty → editor → planting → sprout → intermediate growth → maturity → exact letter reveal, gardens with one/three/eight trees, orbit and wheel zoom, click versus drag, 3D picking, reload persistence, validation, draft recovery, keyboard selection and Escape, mobile layout, emulated one-finger orbit and pinch, reduced motion, and WebGL fallback with saved letters. The production page had zero console errors or warnings in the final browser session.

The visual inspector passed at 1440, 768, and 390 pixels with zero failures. Two advisories remain: functional icon buttons are detected as tinted squares, and mobile metadata uses 11–12px text. The icon buttons operate the camera, information panel, and playback; headings and primary content remain larger.

See [the verification notes](VERIFICATION.md), [screenshots](screenshots/), and [the growth preview](recordings/mneme-growth.mp4). The video is a frame-sampled recording of the live 4× simulation, encoded at 24 fps; it is not a smooth-frame-rate performance measurement.

## Implementation

Next.js App Router, React, TypeScript, CSS Modules, Three.js, React Three Fiber, and Drei. No external fonts or image services are needed.

| File | Responsibility |
| --- | --- |
| `lib/garden.ts` | Data schema, storage validation, dates, and shared-clock math |
| `lib/tree.ts` | Seeded anatomy and dependency-aware growth schedule |
| `lib/terrain.ts` | Permanent placement, topography, materials, and connected terrain |
| `components/Scene.tsx` | Instanced geometry, lighting, growth transforms, picking, and camera |
| `components/Garden.tsx` | Persistence, simulation, letters, drafts, and interface |

Tree data is generated once per seed for the current scene. Each tree uses one instanced mesh; terrain uses another. Stable terrain matrices are not rewritten every frame. Mature trees stop updating their growth matrices.

## Remaining limits

The art uses constrained botanical archetypes rather than species-accurate models. Some crowns overlap in projection as you orbit. Eight trees were exercised, but physical mobile hardware, real software-keyboard behavior, screen readers, and long-session GPU performance were not tested. There is no LOD system for very large gardens. If the browser loses an already-running WebGL context, recovery depends on the browser; reload retains saved letters.

No backend, accounts, cloud storage, AI, weather, sound, or wind effects were added.
