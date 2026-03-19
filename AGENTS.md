# Repository Guidelines

## Project Structure & Ownership

This repo is a Turborepo monorepo with a generated shared contract between the backend and web app.

- `apps/web`: Next.js 16 + React 19 frontend.
- `apps/web/src/app`: App Router routes and layouts.
- `apps/web/src/components`: UI and feature components.
- `apps/web/src/lib`, `src/hooks`, `src/providers`, `src/store`: client utilities, hooks, providers,
  and state.
- `apps/web/tests/e2e`: Playwright end-to-end tests.
- `apps/api`: FastAPI backend.
- `apps/api/app/api/v1`: HTTP routers. Keep these thin.
- `apps/api/app/services`: business logic and orchestration.
- `apps/api/app/schemas`: Pydantic request/response models and API contract.
- `apps/api/app/db`: SQLAlchemy models and database access.
- `apps/api/app/workers`: Celery tasks.
- `apps/api/alembic`: database migrations.
- `apps/api/tests`: backend pytest suites.
- `packages/shared/src/generated`: generated TypeScript client and schema types. Do not hand-edit.
- `scripts`: local automation, worktree helpers, migration checks, and developer tooling.
- `docs`, `tasks`: product, architecture, and planning material.

Keep work scoped by layer. API routes should delegate to services, services should own business
rules, and API contract changes must flow through regenerated shared types.

## Prerequisites & Environment

Run commands from the repo root unless noted otherwise.

- Node.js + `pnpm` are required for the monorepo.
- Python 3.13+ and `uv` are required for the API.
- Docker is required for Redis, local service orchestration, and migration health checks.
- Backend env lives in `apps/api/.env`.
- Frontend env lives in `apps/web/.env.local`.

Typical setup:

```bash
pnpm install
cd apps/api && uv sync
```

If you need local services, use the repo scripts instead of manually recreating their behavior.

## Development Commands

- `pnpm dev`: start the standard local stack through `scripts/dev-worktree.sh`. This is
  worktree-aware, auto-detects ports, updates `apps/web/.env.local`, and ensures Redis is running.
- `pnpm dev:web`: start the frontend only, using the current worktree port.
- `pnpm dev:api`: start the backend only, using the current worktree port.
- `pnpm dev:no-celery`: start web + api without Celery.
- `pnpm dev:ports`: show the current worktree port assignment.
- `pnpm build`: build all workspaces through Turbo.
- `pnpm lint`: run lint checks across workspaces.
- `pnpm type-check`: run TypeScript and Python type checks wired through workspace scripts.
- `pnpm test`: run monorepo test tasks.
- `pnpm test:web`: run frontend Vitest tests.
- `pnpm test:api`: run backend pytest tests.
- `cd apps/web && pnpm test:e2e`: run Playwright end-to-end tests.
- `pnpm generate-types`: regenerate `packages/shared/src/generated` from the backend OpenAPI spec.
- `pnpm watch-types`: watch backend API changes and regenerate shared types.
- `cd apps/api && pnpm migrate`: apply Alembic migrations.
- `./scripts/test-migration.sh [revision]`: verify migration upgrade and downgrade behavior in a
  temporary Postgres container.

## Critical Workflows

### Backend API Changes

When changing FastAPI endpoints, Pydantic schemas, or response payloads:

1. Update models, schemas, services, and routers in the appropriate layer.
2. Run any required migration work.
3. Run `pnpm generate-types`.
4. Include generated files from `packages/shared/src/generated` in the same change.
5. Run the relevant backend and frontend tests if the contract change is user-facing.

### Database Changes

When changing SQLAlchemy models or persistent data behavior:

1. Create or update an Alembic migration.
2. Apply it locally with `cd apps/api && pnpm migrate`.
3. Run `./scripts/test-migration.sh` before opening a PR.
4. Call out irreversible or risky migration behavior in the PR description.

### Frontend Changes

When changing UI or client behavior:

- Use `pnpm test:web` for unit and integration coverage.
- Use `cd apps/web && pnpm test:e2e` for flows that cross route, auth, upload, or backend
  boundaries.
- If the change depends on generated API hooks or types, verify `packages/shared/src/generated` is
  current.

## Coding Conventions

- Prettier: 2 spaces, semicolons, double quotes, 100 character width.
- Frontend linting: ESLint in
  [`apps/web/eslint.config.mjs`](/home/kiedajhinn/Projects/sinag/apps/web/eslint.config.mjs).
- Backend lint/format: Ruff in
  [`apps/api/pyproject.toml`](/home/kiedajhinn/Projects/sinag/apps/api/pyproject.toml).
- Backend type checking: mypy in
  [`apps/api/pyproject.toml`](/home/kiedajhinn/Projects/sinag/apps/api/pyproject.toml).
- React components: `PascalCase.tsx`.
- Hooks: `useX.ts`.
- Python modules and functions: `snake_case`.
- Tests should follow framework defaults and stay close to the behavior they verify.

Prefer small, layer-appropriate changes over cross-cutting rewrites. Preserve existing patterns
unless there is a clear repository-wide reason to change them.

## Testing Expectations

- Use targeted test runs while developing, then run broader validation before submitting work.
- Frontend Vitest coverage has configured thresholds; do not assume there is no enforced floor.
- Backend tests use pytest under `apps/api/tests`.
- Playwright tests live under `apps/web/tests/e2e`.
- Add or update tests for each behavioral change. If you intentionally skip tests, explain why in
  the PR.

Recommended validation before PR:

- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `cd apps/web && pnpm test:e2e` for relevant user flows
- `./scripts/test-migration.sh` for migration changes

## Worktrees

This repo has first-class git worktree support.

- Use `pnpm worktree:create`, `pnpm worktree:list`, `pnpm worktree:status`, and related scripts when
  working in parallel branches.
- `pnpm dev*` commands are designed to work correctly inside a worktree.
- Worktree startup may use non-default ports via `.worktree-info`.
- Do not hardcode `3000` or `8000` assumptions into local-only instructions when worktree scripts
  already manage ports.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits and commitlint enforcement: `feat`, `fix`, `docs`, `refactor`,
  `test`, `chore`, etc.
- Recommended format: `type(scope): short summary`.
- PRs should include a clear problem statement, the applied solution, linked issue/task, and test
  evidence.
- Include screenshots for frontend UI changes.
- Include generated client updates when backend schemas or endpoints change.
- Mention migrations, env changes, and operational follow-up explicitly when relevant.

## Do / Don't

- Do keep FastAPI routers thin and push logic into `apps/api/app/services`.
- Do treat `packages/shared/src/generated` as generated output only.
- Do use repo scripts for dev startup, migrations, and worktree management when available.
- Do verify contract, migration, and end-to-end impacts before merging.
- Don't hand-edit generated API client files.
- Don't hide backend contract changes without regenerating the shared client.
- Don't bypass migration verification for schema changes.
