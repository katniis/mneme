# Repository Guidelines

## Project Structure & Module Organization

This guide covers the Mneme app in `mneme/`. Leave sibling prototype folders untouched unless explicitly requested.

- `mneme/app/`: Next.js App Router entry points, layout, global CSS, and favicon.
- `mneme/components/`: `Garden` manages the interface and persistence; `Scene` renders the Three.js world; `Icon` supplies interface icons. Component styles use CSS Modules.
- `mneme/lib/`: garden state and clock math, seeded tree generation, terrain generation, and permanent placement.
- `mneme/tests/`: deterministic logic tests. `screenshots/`, `recordings/`, and `VERIFICATION.md` hold visual evidence; textures and geometry are generated locally.

## Build, Test, and Development Commands

Use Node.js 24. Run commands from `mneme/`:

```sh
cd mneme
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

Keep generation logic in `lib/` and rendering in `Scene.tsx`. Preserve stored seeds, tree positions, and the shared simulation clock. Reuse instanced geometry and update animation transforms outside React state.

## Testing Guidelines

Add tests to `tests/*.test.ts` using `node:test` and `node:assert/strict`. Name cases after observable behavior. Cover seed determinism, physical attachments, connected terrain, retained existing rock, clock boundaries, and storage validation when relevant. No coverage percentage is enforced.

Run tests, type checking, and the production build before submitting code changes. For visual changes, inspect desktop and mobile rendering, exercise planting and reload persistence, and capture screenshots. Record actual checks in `VERIFICATION.md`.

## Commit & Pull Request Guidelines

No Git history is available in this checkout. Use short imperative commit subjects, such as `Connect island rock cores`. PRs should explain the problem, resulting behavior, validation, and limitations; link relevant issues and include screenshots for visual changes.

## Configuration & Agent Instructions

The prototype needs no environment variables or backend. Preserve Git metadata and existing environment files. Letters remain browser-local and unencrypted; avoid exposing real letter content in test artifacts.

Before Next.js-specific changes, read `mneme/AGENTS.md` and the relevant bundled guides in `mneme/node_modules/next/dist/docs/`.
