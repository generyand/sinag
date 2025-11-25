---
description: Manage git worktrees for parallel development
---

You are helping the user manage git worktrees for parallel development in the SINAG project. Git worktrees allow multiple branches to be checked out simultaneously in different directories, enabling true parallel development with separate Claude Code instances.

## Understanding the Request

Parse the user's command to determine which action to take:

- `/worktree` or `/worktree help` - Show help
- `/worktree create <type> <name>` - Create new worktree
- `/worktree list` - List all worktrees
- `/worktree remove <name>` - Remove a worktree
- `/worktree status` - Show detailed status
- `/worktree sync` - Sync current worktree with develop
- `/worktree ports` - Show port assignments
- `/worktree env <path>` - Sync .env files to a worktree
- `/worktree env --all` - Sync .env files to all worktrees
- `/worktree finish <name>` - Merge worktree into develop and clean up

## Action: Help (default)

If the user runs `/worktree` without arguments or `/worktree help`, show this guide:

```
Git Worktree Manager for SINAG

Commands:
  /worktree create <type> <name>  Create a new worktree
  /worktree list                  List all worktrees
  /worktree remove <name>         Remove a worktree
  /worktree status                Show detailed worktree status
  /worktree sync                  Sync with develop branch
  /worktree ports                 Show port assignments
  /worktree env <path>            Sync .env files to a worktree
  /worktree env --all             Sync .env files to all worktrees
  /worktree finish <name>         Merge into develop and clean up

Types for create:
  feature   - New features (feature/name branch)
  fix       - Bug fixes (fix/name branch)
  perf      - Performance improvements (perf/name branch)
  docs      - Documentation (docs/name branch)
  refactor  - Code refactoring (refactor/name branch)

Examples:
  /worktree create feature analytics-dashboard
  /worktree create fix pagination-bug
  /worktree remove analytics-dashboard
```

## Action: Create Worktree

If the user runs `/worktree create <type> <name>`:

1. Validate the type is one of: feature, fix, perf, docs, refactor
2. Run the worktree creation script:

```bash
./scripts/worktree.sh create <type> <name>
```

3. After creation, inform the user:

```
Worktree created successfully!

Branch: <type>/<name>
Path: /home/kiedajhinn/Projects/vantage-<type>-<name>
Ports: API=<port>, Web=<port>

Next steps:
1. Open a new terminal
2. cd /home/kiedajhinn/Projects/vantage-<type>-<name>
3. pnpm install
4. pnpm dev
5. Or start Claude Code: claude
```

## Action: List Worktrees

If the user runs `/worktree list`:

Run:
```bash
./scripts/worktree.sh list
```

Display the output showing all worktrees with their branches, paths, and port assignments.

## Action: Remove Worktree

If the user runs `/worktree remove <name>`:

1. First list worktrees to confirm the target exists:
```bash
./scripts/worktree.sh list
```

2. Ask for confirmation: "Are you sure you want to remove the worktree '<name>'? This will delete the directory but the branch can be preserved."

3. If confirmed, run:
```bash
./scripts/worktree.sh remove <name>
```

4. Report the result to the user.

## Action: Status

If the user runs `/worktree status`:

Run:
```bash
./scripts/worktree.sh status
```

Display detailed status including uncommitted changes, ahead/behind counts, and port assignments.

## Action: Sync

If the user runs `/worktree sync`:

This syncs the CURRENT worktree (the one Claude Code is running in) with the develop branch.

1. First check if there are uncommitted changes:
```bash
git status --porcelain
```

2. If there are uncommitted changes, warn the user and ask if they want to proceed.

3. If clean or user confirms, run:
```bash
git fetch origin && git merge origin/develop --no-edit
```

4. Ask if they want to regenerate types:
```bash
pnpm generate-types
```

## Action: Ports

If the user runs `/worktree ports`:

Run:
```bash
./scripts/worktree.sh ports
```

Display a table of all worktrees and their assigned ports.

## Action: Env (Sync Environment Files)

If the user runs `/worktree env <path>` or `/worktree env --all`:

This syncs .env files from the main worktree to other worktrees. This is useful when:
- You've updated API keys or credentials in the main worktree
- A worktree was created before the main .env was configured
- You want to ensure all worktrees have consistent configuration

**For a specific worktree:**
```bash
./scripts/worktree.sh env ../vantage-feature-analytics
```

**For all worktrees:**
```bash
./scripts/worktree.sh env --all
```

**What gets synced:**
1. **API .env** (`apps/api/.env`): Copies all settings (database, secrets, API keys)
   - Prompts for confirmation if target already has an .env file
   - Adds a header comment indicating the worktree name and sync time

2. **Web .env.local** (`apps/web/.env.local`): Always recreated with correct ports
   - Uses the port assignments from the worktree's `.worktree-info` file
   - Merges any additional settings from main (excluding API URL settings)

Report the sync results to the user.

## Action: Finish (Merge and Clean Up)

If the user runs `/worktree finish <name>`:

This merges the worktree's branch into develop and cleans up. Run:

```bash
./scripts/worktree.sh finish <name>
```

**What it does (in order):**
1. Checks for uncommitted changes (fails if dirty)
2. Fetches latest from remote
3. Updates develop branch
4. Merges feature branch into develop (with `--no-ff`)
5. Pushes develop to remote
6. Asks to remove worktree and delete branch

**If merge conflicts occur:**
- The script will stop and show the conflicts
- User must resolve conflicts manually in the main worktree
- Then commit and optionally clean up the worktree

**Example output:**
```
✓ Worktree is clean
✓ Fetched latest
✓ develop is up to date
✓ Merged successfully
✓ Pushed to origin/develop

Remove worktree and delete branch 'feature/analytics'? [Y/n]
```

## Interactive Creation (No Arguments)

If the user runs `/worktree create` without type and name, guide them interactively:

**Step 1**: Ask what type of work they're doing:
- Feature (new functionality)
- Fix (bug fix)
- Perf (performance improvement)
- Docs (documentation)
- Refactor (code restructuring)

**Step 2**: Ask for a short name (kebab-case, e.g., "user-analytics", "pagination-bug")

**Step 3**: Confirm and create the worktree

## Important Notes

- Worktrees are organized in `/home/kiedajhinn/Projects/sinag-worktrees/`
- The main worktree at `/home/kiedajhinn/Projects/vantage` cannot be removed
- Each worktree gets unique ports to avoid conflicts when running multiple dev servers
- Dependencies must be installed separately in each worktree (`pnpm install`)
- Worktrees share the same git history but have independent working directories
- Run `pnpm generate-types` in each worktree after API schema changes
- `.env` files are automatically copied from main worktree during creation
- Use `/worktree env --all` to sync .env updates to all worktrees at once
- All worktrees share the same database and Redis (configured in .env)

## Directory Structure

```
Projects/
├── vantage/                      (main worktree)
└── sinag-worktrees/            (worktree container)
    ├── feature-analytics/        (feature/analytics branch)
    ├── fix-pagination/           (fix/pagination branch)
    └── perf-database/            (perf/database branch)
```

## Error Handling

If the script fails, check for common issues:
- Branch already exists (offer to check it out instead)
- Directory already exists
- Uncommitted changes blocking merge
- Network issues fetching from remote

Provide helpful guidance for resolving each issue.
