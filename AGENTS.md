# Repository Guidelines

## Project Structure & Module Organization

This repo is a Turborepo monorepo.

- `apps/web`: Next.js 16 + TypeScript frontend (`src/app`, `src/components`, `tests/e2e`).
- `apps/api`: FastAPI backend (`app/api`, `app/services`, `app/db`, `tests`).
- `packages/shared`: generated TypeScript API client/types used by web.
- `docs/`, `tasks/`, `scripts/`: project docs, planning artifacts, and automation scripts.

Keep feature work scoped by layer: API routes stay thin, business logic belongs in
`apps/api/app/services`, and shared API contract changes flow through regenerated types.

## Build, Test, and Development Commands

Run from repo root unless noted.

- `pnpm dev`: start web + api + supporting services via scripts.
- `pnpm dev:web` / `pnpm dev:api`: run one app only.
- `pnpm build`: build all workspaces through Turbo.
- `pnpm lint` and `pnpm type-check`: run monorepo quality gates.
- `pnpm test`, `pnpm test:web`, `pnpm test:api`: run test suites.
- `pnpm generate-types`: regenerate `packages/shared/src/generated` from backend OpenAPI.
- Backend direct: `cd apps/api && pnpm migrate` (Alembic upgrade).

## Coding Style & Naming Conventions

- Prettier: 2 spaces, semicolons, double quotes, 100-char width.
- Frontend linting: ESLint (`apps/web/eslint.config.mjs`).
- Backend lint/format: Ruff + mypy (`apps/api/pyproject.toml`).
- Naming: React components `PascalCase.tsx`, hooks `useX.ts`, Python modules/functions `snake_case`,
  tests follow framework defaults.

## Testing Guidelines

- Frontend unit/integration: Vitest (`*.test.ts` / `*.test.tsx`).
- Frontend e2e: Playwright (`apps/web/tests/e2e/*.spec.ts`).
- Backend: Pytest (`apps/api/tests/test_*.py`, plus domain subfolders).
- Use targeted runs while developing, then run `pnpm test` before opening a PR.
- No strict coverage threshold is enforced, but add/adjust tests for each behavior change.

## Commit & Pull Request Guidelines

- Commits use Conventional Commits (enforced by commitlint): `feat`, `fix`, `docs`, `refactor`,
  `test`, `chore`, etc.
- Recommended format: `type(scope): short summary` (example:
  `fix(blgu): reopen MOV uploads for rework`).
- PRs should include: clear problem/solution description, linked issue/task, test evidence, and UI
  screenshots for frontend changes.
- If backend schemas/endpoints change, include regenerated files from
  `packages/shared/src/generated`.
