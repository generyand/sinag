---
description: Add or manage changelog entries interactively
---

You are helping the user update the CHANGELOG.md file. Follow these steps:

## Step 1: Understand the Change

Ask the user what they want to add to the changelog:

**Question**: "What change would you like to add to the changelog?"

Wait for their response.

## Step 2: Determine the Category

Based on their change, ask:

**Question**: "Which category does this fall under?"

Provide these options:

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security vulnerability fixes

## Step 3: Craft the Entry

Help the user write a concise changelog entry following these guidelines:

**Good changelog entries**:

- Start with a verb (Add, Fix, Update, Remove, etc.)
- Are concise but descriptive
- Focus on user-facing changes
- Include context when helpful

**Examples**:

- ✅ "Add bulk import functionality for barangays with CSV support"
- ✅ "Fix login error when credentials are invalid"
- ✅ "Update assessment query performance from 2s to 200ms"
- ❌ "Fix bug" (too vague)
- ❌ "Refactor internal helper function" (too technical)

**Ask**: "Here's a suggested entry: `[your suggestion based on their input]`. Does this look good,
or would you like to modify it?"

## Step 4: Read the Current CHANGELOG.md

Use the Read tool to read `/home/kiedajhinn/Projects/sinag/CHANGELOG.md`.

Find the `## [Unreleased]` section.

## Step 5: Add the Entry

Use the Edit tool to add the new entry under the appropriate category in the `[Unreleased]` section.

**Format**:

```markdown
## [Unreleased]

### [Category]

- [New entry]
- [Existing entries...]
```

**Rules**:

- Add the new entry as the first item under the category (most recent first)
- If the category doesn't exist under `[Unreleased]`, create it
- Maintain the category order: Added, Changed, Deprecated, Removed, Fixed, Security
- Keep one blank line between categories

## Step 6: Confirm

After updating, tell the user:

"✅ Added to changelog under `[Category]`:

```
- [their entry]
```

The entry has been added to the `[Unreleased]` section of CHANGELOG.md. Remember to commit this
change:

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for [brief description]"
```

Need to add another entry? Just run `/changelog` again!"

## Additional Subcommands

If the user runs `/changelog` with a subcommand, handle it:

### `/changelog release`

Guide them through creating a new release:

1. Ask: "What version number? (e.g., 0.5.0)"
2. Validate it follows semantic versioning (X.Y.Z)
3. Get today's date in YYYY-MM-DD format
4. Read CHANGELOG.md
5. Rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`
6. Add a new `## [Unreleased]` section at the top
7. Confirm and provide git tag commands:
   ```bash
   git add CHANGELOG.md
   git commit -m "chore: release vX.Y.Z"
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin main vX.Y.Z
   ```

### `/changelog show`

Read and display the `## [Unreleased]` section of CHANGELOG.md so the user can review pending
changes.

### `/changelog help`

Show a brief help message:

- `/changelog` or `/changelog add` - Add a new entry
- `/changelog release` - Prepare a new release
- `/changelog show` - Show unreleased changes
- `/changelog help` - Show this help

See full guide: `docs/guides/maintaining-changelog.md`

## Important Notes

- Always read CHANGELOG.md before editing to ensure you're working with current content
- Preserve existing formatting and structure
- Be helpful and guide the user to write clear, useful entries
- If unsure about categorization, ask the user to clarify
