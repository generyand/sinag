# GEMINI.md

Guidance for Gemini when working with the SINAG codebase.

## Purpose

This file is the primary project instruction file for Gemini. Use it to understand the repository,
choose the right layer for changes, run the right validation, and avoid unsafe git operations.

## Project Snapshot

**SINAG** (Seal of Good Local Governance Information Navigation and Assessment Gateway) is a
full-stack platform for the DILG's SGLGB assessment process. It supports barangay assessment
submission, MOV uploads, assessor review, validation, MLGOO approval, analytics, and reporting.

**Stack:**

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand.
- **Backend:** Python 3.13+, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2.
- **Infrastructure:** Docker, Redis, Celery, Supabase PostgreSQL and Storage.
- **Tooling:** Turborepo, pnpm workspaces, uv, Orval API client generation.

## Repository Map

This is a Turborepo monorepo with a generated shared API contract.

- `apps/web`: Next.js frontend.
- `apps/web/src/app`: App Router routes and layouts.
- `apps/web/src/components`: UI and feature components.
- `apps/web/src/lib`, `src/hooks`, `src/providers`, `src/store`: frontend utilities, hooks,
  providers, and state.
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
- `docs`, `tasks`: product, architecture, workflow, and planning material.

Keep work scoped by layer. Routers should delegate to services, services should own business rules,
and API contract changes must flow through regenerated shared types.

## Non-Negotiable Rules

- Do not hand-edit `packages/shared/src/generated`.
- After changing FastAPI endpoints, Pydantic schemas, or response payloads, run
  `pnpm generate-types` and include generated output.
- Keep FastAPI routers thin; put business logic in `apps/api/app/services`.
- Use Alembic migrations for persistent database schema changes.
- Do not make persistent database changes through one-off database tooling without migrations.
- Add or update tests for behavioral changes.
- Use repo scripts for dev startup, migrations, type generation, and worktree management.
- Read existing patterns before editing and preserve local style.
- Keep changes focused. Do not rewrite unrelated code or perform broad refactors unless the task
  explicitly requires it.
- Do not revert user changes unless explicitly asked.
- If validation is skipped or cannot run, explain why.

## Git Safety

- Never push directly to `main`.
- Never force-push to `main`.
- Before any push, check the current branch with `git branch --show-current`.
- If the current branch is `main`, stop and ask for direction instead of pushing.
- Use feature branches and pull requests for integration.
- Prefer normal pushes. Do not use `git push --force` unless the user explicitly asks and the branch
  is not `main`.
- If a force push is truly needed on a non-main branch, prefer `git push --force-with-lease`.
- Commits should follow Conventional Commits, such as `feat(scope): summary`, `fix(scope): summary`,
  `docs(scope): summary`, or `chore(scope): summary`.

## Prerequisites

Run commands from the repo root unless noted otherwise.

- Node.js compatible with the repo toolchain.
- `pnpm` 10.11.0, as pinned in `package.json`.
- Python 3.13+ and `uv`.
- Docker for Redis, local services, and migration health checks.
- Backend env lives in `apps/api/.env`.
- Frontend env lives in `apps/web/.env.local`.

Typical setup:

```bash
pnpm install
cd apps/api && uv sync
```

## Development Commands

- `pnpm dev`: start the standard local stack through `scripts/dev-worktree.sh`.
- `pnpm dev:web`: start the frontend only, using the current worktree port.
- `pnpm dev:api`: start the backend only, using the current worktree port.
- `pnpm dev:no-celery`: start web + API without Celery.
- `pnpm dev:ports`: show the current worktree port assignment.
- `pnpm build`: build all workspaces through Turbo.
- `pnpm lint`: run lint checks across workspaces.
- `pnpm type-check`: run TypeScript and Python type checks.
- `pnpm test`: run monorepo test tasks.
- `pnpm test:web`: run frontend Vitest tests.
- `pnpm test:api`: run backend pytest tests.
- `cd apps/web && pnpm test:e2e`: run Playwright end-to-end tests.
- `pnpm generate-types`: regenerate `packages/shared/src/generated` from the backend OpenAPI spec.
- `pnpm watch-types`: watch backend API changes and regenerate shared types.
- `cd apps/api && pnpm migrate`: apply Alembic migrations.
- `./scripts/test-migration.sh [revision]`: verify migration upgrade and downgrade behavior in a
  temporary Postgres container.

## Worktrees And Local Ports

This repo has first-class git worktree support.

- Use `pnpm worktree:create`, `pnpm worktree:list`, `pnpm worktree:status`, and related scripts when
  working in parallel branches.
- `pnpm dev*` commands are worktree-aware.
- Worktree startup may use non-default ports via `.worktree-info`.
- Do not hardcode `3000` or `8000` assumptions in local-only instructions when worktree scripts
  manage ports.
- Use `pnpm dev:ports` to inspect assigned local ports.

## Backend Workflow

When changing backend behavior:

1. Update SQLAlchemy models in `apps/api/app/db` if persistence changes.
2. Create or update Alembic migrations in `apps/api/alembic` for schema changes.
3. Update Pydantic schemas in `apps/api/app/schemas` for request/response contracts.
4. Implement business logic in `apps/api/app/services`.
5. Keep routers in `apps/api/app/api/v1` limited to HTTP mapping, dependencies, and service calls.
6. Add or update pytest coverage under `apps/api/tests`.
7. Run relevant validation, usually `pnpm test:api`, `pnpm type-check`, and `pnpm lint`.

For migrations:

```bash
cd apps/api
uv run alembic revision --autogenerate -m "describe_changes"
pnpm migrate
cd ../..
./scripts/test-migration.sh
```

Call out irreversible or risky migration behavior in PR notes.

## Frontend Workflow

When changing frontend behavior:

- Use App Router conventions under `apps/web/src/app`.
- Prefer existing components and patterns in `apps/web/src/components`.
- Use generated hooks and types from `@sinag/shared` for API access.
- Keep client utilities in `apps/web/src/lib`, hooks in `src/hooks`, providers in `src/providers`,
  and state in `src/store`.
- Run `pnpm test:web` for unit and integration coverage.
- Run `cd apps/web && pnpm test:e2e` for route, auth, upload, or backend-integrated flows.
- If a frontend change depends on backend API changes, verify `packages/shared/src/generated` is
  current.

## Contract Generation

FastAPI and Pydantic define the API contract. Orval generates the TypeScript client and React Query
hooks.

```text
FastAPI /openapi.json -> Orval -> packages/shared/src/generated
```

Run `pnpm generate-types` after changing:

- FastAPI routes or tags.
- Pydantic request or response schemas.
- Response payload shapes.
- Authentication or error payload contracts that frontend code consumes.

Do not edit generated files manually. Fix the backend contract, regenerate, then update frontend
call sites.

## Testing Matrix

- Backend service or API behavior: `pnpm test:api`.
- Frontend component, hook, or client behavior: `pnpm test:web`.
- Full monorepo confidence: `pnpm test`.
- Type contracts: `pnpm type-check`.
- Formatting and linting: `pnpm lint` and `pnpm format:check` when useful.
- API contract changes: `pnpm generate-types`, then relevant backend and frontend tests.
- End-to-end flows involving routes, auth, uploads, or backend integration:
  `cd apps/web && pnpm test:e2e`.
- Database migrations: `./scripts/test-migration.sh [revision]`.

Use targeted test runs while developing, then broader validation before submitting work.

## Assessment Workflow And Roles

Core SGLGB assessment lifecycle:

```text
DRAFT -> SUBMITTED -> per-area assessor review -> AWAITING_FINAL_VALIDATION
  -> AWAITING_MLGOO_APPROVAL -> COMPLETED
```

Rework and recalibration can return assessments to earlier review states.

Roles:

- `BLGU_USER`: submits assessments and MOVs for their barangay.
- `ASSESSOR`: reviews assigned governance areas.
- `VALIDATOR`: validates the full assessment after all assessors approve.
- `MLGOO_DILG`: system-wide admin and final approver.
- `KATUPARAN_CENTER_USER`: read-only external analytics viewer.

See `docs/workflows/assessor-validation.md` and `docs/workflows/blgu-assessment.md` before changing
workflow behavior.

## Documentation Index

- Project structure: `docs/architecture/project-structure.md`.
- Backend architecture: `docs/architecture/backend-architecture.md`.
- Frontend architecture: `docs/architecture/frontend-architecture.md`.
- Database schema: `docs/architecture/database-schema.md`.
- User roles: `docs/architecture/user-roles.md`.
- Service layer pattern: `docs/guides/service-layer-pattern.md`.
- Type generation: `docs/guides/type-generation.md`.
- Database migrations: `docs/guides/database-migrations.md`.
- Testing guide: `docs/guides/testing.md`.
- Workflows: `docs/workflows/`.
- API docs: `docs/api/` and `http://localhost:<api-port>/docs` when running locally.

Prefer these repo docs over assumptions. If docs and code disagree, inspect the code and mention the
discrepancy.
