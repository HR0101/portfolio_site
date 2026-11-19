# Repository Guidelines

## Project Structure & Module Organization

Next.js App Router portfolio using React, strict TypeScript, Tailwind CSS, and Three.js.

- `src/app/`: routes, layouts, metadata, and Next.js API handlers.
- `src/sections/` and `src/components/`: page sections and reusable UI; colocate component styles.
- `src/hooks/` and `src/lib/`: shared hooks, animation logic, and utilities.
- `src/data/`, `src/config/`, and `src/services/`: portfolio content, configuration, and service clients.
- `public/`: served media, models, and branding; `assets/`: source assets.
- `tests/`: automated tests; `scripts/`, `infra/aws/`, and `docs/`: tooling, infrastructure, and design references. `functions/api/` contains Cloudflare-compatible handlers.

## Build, Test, and Development Commands

Match `package.json` Node.js engines; CI uses Node 22.

- `npm ci`: install locked dependencies.
- `npm run dev`: start development at `http://localhost:3001`.
- `npm run typecheck` / `npm run lint`: check types and ESLint rules.
- `npm run build` / `npm start`: build and serve production locally.
- `npm test`: run all registered tests; requires a production build.
- `npm run test:motion`: run logic and motion tests without the HTTP smoke suite.
- `npm run check`: run typecheck, lint, build, and tests sequentially.
- `npm run build:static`: create the static deployment output.

Stop the development server before building: the build script deletes `.next`. Use `npm run docker:test` for isolated validation alongside Docker development.

## Coding Style & Naming Conventions

Follow adjacent code: two-space indentation, semicolons in TypeScript, and single-quoted imports. Use PascalCase component filenames, camelCase utilities, and `useSomething` hooks. Prefer colocated `Component.module.css` files and existing design tokens. ESLint enforces React Hooks rules, strict equality, and no explicit `any`. No formatter is configured. Keep browser-only behavior behind client boundaries; reuse reduced-motion and canvas lifecycle hooks.

## Testing Guidelines

Tests use `node:test` and `node:assert/strict`, named `tests/<feature>.test.mjs`. Add behavior-focused regression cases for changed logic and register new suites in `package.json`. Run individual suites with `node --test tests/hero-drag.test.mjs`. HTTP smoke tests start production on port 3111; they do not validate visual rendering. Check responsive layouts, both themes, and keyboard interaction manually. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

Follow history: `feat(portfolio): ...`, `fix(navigation): ...`, or `refactor(fluid): ...`. Keep commits focused. PRs should explain the problem, behavior, validation, and linked issues; include screenshots or recordings for visual changes.

## Configuration & Deployment

Use environment examples; never commit credentials or expose secrets through `NEXT_PUBLIC_*`. Preserve static-export compatibility: production cannot execute Next.js API routes. Consult `DEPLOY.md` before deployment changes and bundled `node_modules/next/dist/docs/` before changing Next.js APIs.
