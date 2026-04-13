# SNG-32 Landing Footer Metadata Design

**Problem**

The landing page footer still shows outdated release metadata:

- `© 2025 Municipality of Sulop`
- `Version 1.0`

The ticket requires a simple content refresh without changing layout, icons, or other footer
elements.

**Decision**

Update only the hardcoded footer copy in the landing page footer component.

- copyright becomes `© 2026 Municipality of Sulop`
- version becomes `Version 1.1`
- `Developed by SINAG Team` stays unchanged
- social icons and `System Online` stay untouched

**Why This Approach**

The values are already hardcoded in the landing footer component, so the smallest safe fix is a
direct text update with no shared config refactor.

**Validation**

- Verify the updated strings in the footer component source
- Run targeted frontend linting against the touched file
