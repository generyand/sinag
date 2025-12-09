---
description: Manage git worktrees for parallel development
---

You are helping the user manage git worktrees for parallel development in the SINAG project. Git
worktrees allow multiple branches to be checked out simultaneously in different directories,
enabling true parallel development with separate Claude Code instances.

## Understanding the Request

Parse the user's command to determine which action to take:

- `/worktree` or `/worktree help` - Show help
- `/worktree create <name>` - Create new worktree (simple branch name)
- `/worktree create <type> <name>` - Create with type prefix (feature/, fix/, etc.)
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
  /worktree create <name>         Create a new worktree
  /worktree create <type> <name>  Create with type prefix (optional)
  /worktree list                  List all worktrees
  /worktree remove <name>         Remove a worktree
  /worktree status                Show detailed worktree status
  /worktree sync                  Sync with develop branch
  /worktree ports                 Show port assignments
  /worktree env <path>            Sync .env files to a worktree
  /worktree env --all             Sync .env files to all worktrees
  /worktree finish <name>         Merge into develop and clean up

Optional types for create:
  feature   - New features (feature/name branch)
  fix       - Bug fixes (fix/name branch)
  perf      - Performance improvements (perf/name branch)
  docs      - Documentation (docs/name branch)
  refactor  - Code refactoring (refactor/name branch)

Examples:
  /worktree create my-feature                 # Branch: my-feature
  /worktree create feature analytics-dashboard # Branch: feature/analytics-dashboard
  /worktree create fix pagination-bug          # Branch: fix/pagination-bug
  /worktree remove my-feature
```

## Action: Create Worktree

If the user runs `/worktree create <name>` or `/worktree create <type> <name>`:

1. Run the worktree creation script:

```bash
# Simple (no type prefix)
./scripts/worktree.sh create my-feature

# With type prefix (optional)
./scripts/worktree.sh create feature my-feature
```

The script will:

- Create the worktree with a new branch
- Copy `.env` files from the main worktree
- Configure unique ports (API and Web)
- Prompt to install dependencies (`pnpm install`)
- Set up Python environment if `uv` is available

3. After creation, inform the user:

```
Worktree created successfully!

Branch: <type>/<name>
Path: /home/kiedajhinn/Projects/sinag-worktrees/<type>-<name>
Ports: API=<port>, Web=<port>

To start development:
  cd /home/kiedajhinn/Projects/sinag-worktrees/<type>-<name>
  pnpm dev                 # Auto-detects and uses worktree ports

Other commands:
  pnpm dev:api             # API only
  pnpm dev:web             # Web only
  pnpm dev:no-celery       # No background tasks
  pnpm dev:ports           # Show port configuration
```

**Key Feature**: The `pnpm dev` command automatically detects if it's running in a worktree and uses
the correct ports. No manual port configuration needed!

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

2. Ask for confirmation: "Are you sure you want to remove the worktree '<name>'? This will delete
   the directory but the branch can be preserved."

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
./scripts/worktree.sh env ../sinag-feature-analytics
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

If the user runs `/worktree create` without a name, guide them interactively:

**Step 1**: Ask for a short name (kebab-case, e.g., "user-analytics", "pagination-bug")

**Step 2**: Optionally ask if they want a type prefix (feature/, fix/, etc.) - default to no prefix

**Step 3**: Confirm and create the worktree

## Important Notes

### Automatic Port Configuration

- **Zero manual configuration needed!** Just run `pnpm dev` in any worktree
- The `dev-worktree.sh` script automatically reads `.worktree-info` for port assignments
- Main worktree uses default ports (API: 8000, Web: 3000)
- Each additional worktree gets unique ports (8001/3001, 8002/3002, etc.)

### Directory Structure

- Worktrees are organized in `/home/kiedajhinn/Projects/sinag-worktrees/`
- The main worktree at `/home/kiedajhinn/Projects/sinag` cannot be removed

### Environment Files

- `.env` files are automatically copied from main worktree during creation
- Web `.env.local` is auto-generated with correct API URLs for each worktree
- Use `/worktree env --all` to sync .env updates to all worktrees at once

### Shared Resources

- All worktrees share the same database (Supabase)
- All worktrees share the same Redis container
- Worktrees share the same git history but have independent working directories

### Development Tips

- Dependencies are installed during creation (prompts to confirm)
- Run `pnpm generate-types` in each worktree after API schema changes
- Use `pnpm dev:ports` to check your current port configuration

## Error Handling

If the script fails, check for common issues:

- Branch already exists (offer to check it out instead)
- Directory already exists
- Uncommitted changes blocking merge
- Network issues fetching from remote

Provide helpful guidance for resolving each issue.
