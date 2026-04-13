# SNG-31 Login Footer Metadata and Support Design

**Problem**

The login page footer contains outdated support and release metadata:

- `© 2024 MLGRC Davao del Sur`
- support still shows an old phone number and generic email
- `Version 1.0.0 | Build 2024.01.15`

The ticket requires the footer to show the current Sulop-specific support email and updated release
metadata while keeping the existing look and alignment.

**Decision**

Update only the hardcoded login footer copy.

- copyright becomes `© 2026 MLGRC Davao del Sur`
- support becomes only `sulop.mlgoo@dilg.gov.ph`
- remove the phone number entirely
- version/build become `Version 1.1.0 | Build 2026.04.13`

**Why This Approach**

This is a pure text change. The login page already hardcodes these values, so the smallest safe fix
is to update the footer strings in place without introducing shared metadata plumbing.

**Validation**

- Verify the old support and metadata strings are gone
- Run targeted frontend linting against the login page file
