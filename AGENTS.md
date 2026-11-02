# Repository Guidelines

## Project Structure & Module Organization

This guide covers the Mneme repository root (the directory containing `package.json`). Leave `prev-algo/`, sibling prototypes, and other worktree checkouts untouched unless explicitly requested.

- `app/`: Next.js App Router entry points, layout, global CSS, and favicon.
- `components/`: `Garden` manages the interface and persistence; `Scene` composes the Three.js world; `Tree` handles growth and removal rendering. Component styles use CSS Modules.
- `components/environment/`: atmosphere controls, local weather orchestration, lighting/sky, instanced rain/snow/seasonal particles, and the optional audio lifecycle.
- `lib/`: deterministic garden/clock, tree/terrain/removal, environment/daylight/particle, weather validation, and generated soundscape logic. `ambient-audio.ts` builds the Web Audio graph; its hook owns browser resources.
- `tests/`: deterministic logic tests. `screenshots/`, `recordings/`, and `VERIFICATION.md` hold visual evidence; textures and geometry are generated locally.

## Build, Test, and Development Commands

Use Node.js 24. Run commands from the repository root:

```sh
npm install
npm run dev
```

- `npm run dev`: development server at `http://localhost:3000`.
- `npm test`: run TypeScript tests using Node's built-in test runner.
- `npm run typecheck`: check TypeScript without emitting files.
- `npm run build`: create the production build.
- `npm start`: serve the production build on port 3000; stop the development server first.

## Coding Style & Naming Conventions

Use TypeScript, two-space indentation, single quotes, and semicolons. Name React components in PascalCase, functions and variables in camelCase, and shared constants in UPPER_SNAKE_CASE. Use `*.module.css` for component styling. No formatter or lint command is configured; follow neighboring files.

Keep generation and resolver logic in `lib/`, rendering in scene components, and browser resource lifecycles in hooks. Preserve stored seeds, tree positions, retained plots after deletion, and the shared simulation clock. Reuse instanced geometry and scratch objects; update animation transforms outside React state.

## Environment and Audio Invariants

- Resolve real local time independently of the demo growth clock. Preserve independent Auto/manual time, season, and weather choices and the master/individual effect switches.
- Migrate preferences through the existing readers and stable storage keys without touching letters. Legacy Cloudy becomes Clear; provider cloud cover still affects lighting. The scene uses procedural sky/lighting and stars, with no cloud geometry or sun/moon models.
- Keep moving particle pools bounded on desktop and mobile. Reduced motion hides moving decoration and precipitation while retaining static lighting/ground cover; hidden tabs pause animation without catch-up.
- Request location only through an explicit setup action. Weather requests require a configured location and demand from active effects; send approximate coordinates or city searches to Open-Meteo, never letter content. Clearing location also clears its weather cache.
- Request soundtrack autoplay on startup and retry suspended audio on a pointer or keyboard gesture when browser policy blocks it. The bottom-right mute button controls only the soundtrack; generated bird/insect calls play independently without their own toggle. Start each load unmuted at the default mix volume. Bound voices and scheduling, fade transitions, pause on hidden tabs/master-off/WebGL loss, and close resources on unmount. Reduced motion and Living details do not control sound.

## Testing Guidelines

Add tests to `tests/*.test.ts` using `node:test` and `node:assert/strict`. Name cases after observable behavior. Cover seed determinism, physical attachments, connected terrain, retained land/reuse, clock boundaries, and storage validation when relevant. For atmosphere changes, cover time/season/weather resolution and migrations, particle bounds/collision, and deterministic sound profiles/events.

Run tests, type checking, and the production build before submitting code changes. For visual changes, inspect desktop and mobile rendering, exercise planting and reload persistence, and capture screenshots. Record actual checks in `VERIFICATION.md`.

For audio lifecycle changes, check opt-in, volume, reload, visibility, rapid enable/disable, rejected resume, and WebGL loss. Distinguish offline waveform checks from subjective listening, browser emulation from physical-device performance, and accelerated clocks from prolonged playback.

## Commit & Pull Request Guidelines

Use short imperative commit subjects without assistant attribution, such as `Connect island rock cores`. PRs should explain the problem, resulting behavior, validation, and limitations; link relevant issues and include screenshots for visual changes.

## Configuration & Agent Instructions

The prototype needs no environment variables or backend. Preserve Git metadata and existing environment files. Letters remain browser-local and unencrypted; use synthetic letters in test artifacts. Open-Meteo is optional; manual atmosphere choices work offline.

Before Next.js-specific changes, read the relevant bundled guides in `node_modules/next/dist/docs/`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
