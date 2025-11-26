# Maintaining the Changelog

This guide explains how to maintain the CHANGELOG.md file for the SINAG project.

## Overview

We follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format, which provides a structured way to document changes for users and developers.

**Location**: `/CHANGELOG.md` (project root)

## Quick Start

### Using the Slash Command (Recommended)

```bash
/changelog add
```

This interactive command will guide you through adding a changelog entry.

### Manual Update

1. Open `CHANGELOG.md`
2. Add your entry under `## [Unreleased]` in the appropriate category
3. Follow the format: `- Brief description ([#PR](link) if applicable)`
4. Commit with your changes

## Change Categories

Organize changes under these categories (in order):

### Added
For new features.

```markdown
### Added
- New user dashboard with real-time metrics
- Export functionality for assessment reports
- `/health` endpoint for monitoring
```

### Changed
For changes in existing functionality.

```markdown
### Changed
- Improved performance of assessment query by 50%
- Updated UI design for login page
- Refactored service layer to use dependency injection
```

### Deprecated
For soon-to-be removed features (give users warning).

```markdown
### Deprecated
- Old `/api/v1/users/legacy` endpoint (use `/api/v1/users` instead)
- `AssessmentOldSchema` (will be removed in v2.0.0)
```

### Removed
For removed features.

```markdown
### Removed
- Legacy authentication system
- Deprecated `/api/v1/old-endpoint`
```

### Fixed
For bug fixes.

```markdown
### Fixed
- Login page infinite loop when credentials invalid
- Memory leak in assessment processing
- Incorrect date formatting in reports
```

### Security
For security vulnerability fixes (always highlight these).

```markdown
### Security
- Fixed SQL injection vulnerability in search endpoint
- Updated dependencies to patch security issues
```

## Writing Good Changelog Entries

### Do ✅

**Be concise but descriptive**
```markdown
- Add bulk import functionality for barangays with CSV support
```

**Start with a verb**
```markdown
- Fix memory leak in Celery worker
- Add validation for MOV file uploads
- Update Next.js to v15.1.0
```

**Include context when helpful**
```markdown
- Improve assessment query performance from 2s to 200ms
- Add pagination to user list (default 25 per page)
```

**Link to PRs or issues when relevant**
```markdown
- Fix login error on Safari ([#123](https://github.com/org/repo/pull/123))
- Add dark mode support ([#45](https://github.com/org/repo/issues/45))
```

**Group related changes**
```markdown
- Enhance assessment workflow:
  - Add validation step before submission
  - Allow attachments up to 10MB
  - Improve error messages
```

### Don't ❌

**Don't be vague**
```markdown
❌ - Fix bug
❌ - Update stuff
❌ - Various improvements
```

**Don't include internal details users don't care about**
```markdown
❌ - Refactor internal helper function `_processData`
❌ - Update dev dependencies
```

**Don't duplicate information**
```markdown
❌ - Add feature X
    - Implement feature X  # Same thing!
```

**Don't include commit hashes** (users don't need these)
```markdown
❌ - Add feature (commit abc123)
```

## Releasing a New Version

When you're ready to release a new version:

### 1. Decide the Version Number

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR** (0.X.0): New features, backward compatible (e.g., 1.2.0 → 1.3.0)
- **PATCH** (0.0.X): Bug fixes, backward compatible (e.g., 1.2.3 → 1.2.4)

**Examples**:
- `0.1.0` → `0.2.0`: Added assessor validation workflow (new feature)
- `1.2.0` → `1.2.1`: Fixed login bug (bug fix)
- `1.5.0` → `2.0.0`: Changed API authentication (breaking change)

### 2. Update CHANGELOG.md

```markdown
## [Unreleased]

<!-- Empty for now -->

## [1.3.0] - 2025-11-15

### Added
- Bulk import for barangays
- Dark mode support

### Fixed
- Login error on Safari
```

### 3. Commit the Changes

```bash
git add CHANGELOG.md
git commit -m "chore: prepare release v1.3.0"
```

### 4. Create a Git Tag

```bash
# Create annotated tag
git tag -a v1.3.0 -m "Release v1.3.0: Bulk import and dark mode"

# Push tag to remote
git push origin v1.3.0
```

### 5. Push to Main

```bash
git push origin main
```

### 6. Create GitHub Release (Optional)

1. Go to GitHub repository → Releases
2. Click "Create a new release"
3. Select the tag (v1.3.0)
4. Copy changelog entries for this version as release notes
5. Publish release

## Workflow Examples

### Adding Changes During Development

**Scenario**: You just merged a PR that adds a new feature.

1. Open `CHANGELOG.md`
2. Under `## [Unreleased]`, add to `### Added`:
   ```markdown
   - Export assessments to PDF format with custom branding
   ```
3. Commit:
   ```bash
   git add CHANGELOG.md
   git commit -m "docs: update changelog for PDF export feature"
   ```

### Fixing a Bug

**Scenario**: You fixed a critical bug.

1. Add under `### Fixed`:
   ```markdown
   - Fix crash when uploading MOV files larger than 5MB
   ```
2. Commit with the fix:
   ```bash
   git add CHANGELOG.md src/...
   git commit -m "fix: handle large MOV file uploads correctly"
   ```

### Preparing a Release

**Scenario**: You're ready to release version 0.5.0.

1. Review all `[Unreleased]` entries
2. Rename section:
   ```markdown
   ## [0.5.0] - 2025-11-20

   ### Added
   - ...
   ```
3. Add new `[Unreleased]` section at top:
   ```markdown
   ## [Unreleased]

   <!-- Changes go here -->

   ## [0.5.0] - 2025-11-20
   ```
4. Commit, tag, and push:
   ```bash
   git add CHANGELOG.md
   git commit -m "chore: release v0.5.0"
   git tag -a v0.5.0 -m "Release v0.5.0"
   git push origin main v0.5.0
   ```

## Best Practices

### Update Frequently
Update the changelog with each PR or significant commit, not all at once before release.

### Be User-Focused
Write for your users (other developers, stakeholders), not for yourself.

### Review Before Release
Before releasing, review all `[Unreleased]` entries for:
- Clarity
- Completeness
- Proper categorization
- User value

### Keep It Clean
- Remove duplicate entries
- Merge related changes
- Fix typos and grammar

### Version Consistency
Ensure version numbers in:
- CHANGELOG.md
- package.json (if applicable)
- Git tags
all match.

## Tools and Automation

### Slash Command: `/changelog add`

Interactive command to add changelog entries.

### GitHub Actions (Future)

Consider automating:
- Changelog validation (ensure [Unreleased] exists)
- Release notes generation from changelog
- Version bump automation

### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```
feat: add new feature
fix: fix a bug
docs: update documentation
chore: routine task
refactor: code refactoring
test: add tests
```

These can help auto-generate changelog entries.

## Common Mistakes to Avoid

❌ **Forgetting to update the changelog**
- Solution: Make it part of your PR checklist

❌ **Adding too much detail**
- Solution: Focus on user-facing changes

❌ **Using technical jargon**
- Solution: Write for users, not developers (unless it's a technical library)

❌ **Not categorizing properly**
- Solution: If unsure, discuss with team

❌ **Forgetting the date on releases**
- Solution: Use today's date in YYYY-MM-DD format

❌ **Not creating git tags**
- Solution: Always tag releases for easy reference

## Questions?

- Check the [Keep a Changelog](https://keepachangelog.com/) guide
- Review recent entries in `CHANGELOG.md` for examples
- Ask the team in the development channel

---

**Remember**: A well-maintained changelog is a gift to your future self and your users! 🎁
