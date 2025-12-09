---
description: Lint check, commit, and push changes
---

# Commit Workflow

Perform lint checking, create a commit, and optionally push changes.

## Instructions

When this command is invoked, perform the following steps:

### Step 1: Check Git Status

Run the following commands to understand the current state:

```bash
git status
git diff --stat
```

If there are no changes to commit, inform the user and stop.

### Step 2: Run Lint Checks

Run the project's lint checks:

```bash
pnpm lint
```

**If lint fails:**

1. Show the user the lint errors
2. Ask: "Lint check failed. Would you like me to attempt to fix these issues automatically?"
3. If yes, run `pnpm lint --fix` or appropriate fix commands
4. Re-run lint to verify fixes

**If lint passes:** Continue to the next step.

### Step 3: Run Type Check (Optional but Recommended)

```bash
pnpm type-check
```

If type check fails, warn the user but allow them to proceed if they choose.

### Step 4: Stage Changes

Ask the user: "Which files should I stage?"

Options:

- **All changes** - Stage everything (`git add -A`)
- **Specific files** - Let me specify which files
- **Review first** - Show me the diff before staging

### Step 5: Generate Commit Message

Analyze the staged changes and generate a commit message following conventional commits:

**Format**: `<type>(<scope>): <description>`

**Types**:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependency updates
- `ci` - CI/CD changes

**Ask the user**: "Here's a suggested commit message:

```
<suggested message>
```

Does this look good, or would you like to modify it?"

### Step 6: Create Commit

Create the commit with the agreed message:

```bash
git add <files>
git commit -m "$(cat <<'EOF'
<commit message>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 7: Push (Optional)

Ask the user: "Would you like to push this commit?"

Options:

- **Yes, push now** - Push to the current branch
- **No, just commit** - Keep the commit local
- **Create PR** - Push and create a pull request

**If pushing:**

```bash
git push origin <current-branch>
```

**If creating PR:**

1. Push the branch
2. Use `gh pr create` to create a pull request
3. Return the PR URL to the user

### Step 8: Confirm

Show a summary:

```
✅ Commit workflow complete!

📝 Commit: <short hash> <message>
📁 Files changed: <count>
🔀 Branch: <branch-name>
🚀 Pushed: Yes/No
🔗 PR: <url if created>
```

## Subcommands

### `/commit quick`

Skip interactive prompts and use sensible defaults:

- Stage all changes
- Auto-generate commit message
- Don't push (local commit only)

### `/commit push`

Same as `/commit` but automatically push after committing.

### `/commit pr`

Same as `/commit` but push and create a PR after committing.

### `/commit amend`

Amend the last commit with current staged changes:

1. Check that the last commit is yours (not pushed or safe to amend)
2. Stage changes
3. Run `git commit --amend`

### `/commit help`

Show available subcommands:

- `/commit` - Interactive commit workflow
- `/commit quick` - Quick local commit with defaults
- `/commit push` - Commit and push
- `/commit pr` - Commit, push, and create PR
- `/commit amend` - Amend the last commit
- `/commit help` - Show this help

## Important Notes

- Always run lint before committing to maintain code quality
- Follow conventional commit format for clear history
- Never force push to main/master branches
- Check authorship before amending commits
- If pre-commit hooks modify files, re-stage and retry
