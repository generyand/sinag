# Task Documentation Restructure - Executive Summary

**Date**: 2025-11-13
**Full Document**: `TASK-DOCUMENTATION-RESTRUCTURE-RECOMMENDATION.md`

---

## TL;DR Recommendation

**HYBRID APPROACH: Archive outdated content + Update core files + Create new MOV-focused tasks**

**Timeline**: 1 week documentation work, then begin 4-week development

**Impact**: Minimal disruption, preserves 80% of existing work, aligns with Spec v1.4

---

## Quick Decision Matrix

| File | Size | Action | Rationale | Time Required |
|------|------|--------|-----------|---------------|
| **README.md** | 27KB | ✏️ **UPDATE** | Core task list; add version history | 4 hours |
| **IMPLEMENTATION-PLAN-SPLIT-PANE.md** | 70KB | ✏️ **UPDATE** | Split-pane UI valid; add MOV integration section | 2 hours |
| **SCHEMA-CONFIGURATION-ARCHITECTURE.md** | 53KB | 📦 **ARCHIVE** | 90% outdated (schema-focused) | 1 hour |
| **QUICK-REFERENCE-SCHEMA-CONFIG.md** | 16KB | 📦 **ARCHIVE** | 100% outdated | 1 hour |
| **sample-indicator-data.json** | 20KB | 📦 **ARCHIVE** | Predates Spec v1.4 | 1 hour |
| **AI-FEATURES-ROADMAP.md** | 32KB | ✅ **KEEP** | Post-MVP, approach-agnostic | 0 hours |
| **EXPERT-RECOMMENDATIONS.md** | 37KB | ✅ **KEEP** | UX insights still valid | 0 hours |
| **TESTING-GUIDE-PHASE1.md** | 12KB | ✏️ **UPDATE** | Add MOV test cases | 2 hours |

**Total Time**: 11 hours (1.5 days)

---

## 5 New Files to Create

| File | Purpose | Size Estimate | Time Required |
|------|---------|---------------|---------------|
| **MOV-CHECKLIST-IMPLEMENTATION.md** | Task breakdown for 9 MOV item types | 15KB | 6 hours |
| **BBI-SYSTEM-IMPLEMENTATION.md** | Task breakdown for 9 BBI mappings | 10KB | 4 hours |
| **FORM-BUILDER-REUSE-GUIDE.md** | Integration guide for FormSchemaBuilder.tsx | 8KB | 3 hours |
| **SPEC-V1.4-COMPLIANCE-CHECKLIST.md** | Validation checklist (29 indicators) | 12KB | 5 hours |
| **MIGRATION-FROM-V1.md** | Transition guide (v1.0 → v2.0) | 10KB | 4 hours |

**Total Time**: 22 hours (3 days)

---

## What's Actually Changing?

### ❌ What's Being Removed (20% of Code)
- Generic form schema builder UI (replaced with MOV-specific builder)
- Complex calculation rule engine (simplified to threshold validation)
- Sample data from old schema model

### ✅ What's Staying (80% of Code)
- ✅ **100% of backend work** (drafts, bulk creation, auto-save) - No changes needed
- ✅ **90% of frontend foundation** (Zustand, tree utils, split-pane layout)
- ✅ **60% of FormSchemaBuilder.tsx** (drag-drop patterns reusable)

### 🆕 What's Being Added
- 9 MOV checklist item types (checkbox, group, currency, date with grace period, assessment, etc.)
- BBI system (9 mandatory BBIs with one-to-one indicator mappings)
- Advanced validation (OR logic, grace periods, thresholds, conditional display)

---

## Key Questions Answered

### Q1: Should we create NEW files or UPDATE existing ones?
**A**: HYBRID - Archive 3 files, update 4 files, create 5 new files

### Q2: Will we lose any completed work?
**A**: No - 80% of code is reusable, archives preserve context

### Q3: How do we track progress when approach changes mid-stream?
**A**: Version history in README.md:
- v1.0 (Nov 9): Backend complete, generic schema builder
- v2.0 (Nov 13): MOV-checklist-first, aligned with Spec v1.4

### Q4: How to integrate FormSchemaBuilder.tsx with new requirements?
**A**: **Reuse drag-drop patterns** - Copy component, replace field types, add MOV properties

### Q5: What's the gap between current work and Spec v1.4?
**A**:
- ✅ Have: 4/9 MOV item types (number, text, radio, dropdown)
- ❌ Missing: 5/9 MOV item types (checkbox, group, currency, date with grace period, assessment)
- ❌ Missing: 8 advanced features (OR logic, conditional display, thresholds, grace periods)
- ❌ Missing: BBI system (9 BBIs)

---

## Recommended Action Plan (Week-by-Week)

### Week 1: Documentation Cleanup (You Are Here)
- [ ] **Day 1**: Review recommendation document (team meeting)
- [ ] **Day 2**: Archive 3 files, create migration notes
- [ ] **Day 3**: Update README.md, Split-Pane Plan, Testing Guide
- [ ] **Day 4-5**: Create 5 new task files

### Week 2: MOV Checklist Foundation
- [ ] Create MOVChecklistBuilder.tsx (copy FormSchemaBuilder patterns)
- [ ] Implement first 5 MOV item types (checkbox, group, currency, number, text)

### Week 3: Advanced MOV Features
- [ ] Implement remaining 4 MOV item types (date with grace period, assessment, radio, dropdown)
- [ ] Add OR logic, conditional display, threshold validation

### Week 4: BBI System
- [ ] Database migration (seed 9 BBIs)
- [ ] Service layer (BBI status determination)
- [ ] UI (BBI management page, status display)

### Week 5-6: Testing & Validation
- [ ] Unit tests (MOV validation logic)
- [ ] Integration tests (full workflow)
- [ ] Spec v1.4 compliance (29 indicator examples)
- [ ] User acceptance testing

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Team confusion about pivot** | High | Medium | This doc + daily standups |
| **Lost context from v1.0** | Medium | Low | Archive (don't delete) + version history |
| **Scope creep** | High | Medium | Strict Spec v1.4 adherence + compliance checklist |
| **FormSchemaBuilder reuse fails** | High | Low | Proof-of-concept + 1-week buffer |

---

## Decision Required

**Approve this restructure plan?**

- [ ] ✅ **Approved** - Proceed with hybrid approach, begin Week 1 documentation work
- [ ] ⚠️ **Approved with changes** - Specify changes: ___________________
- [ ] ❌ **Rejected** - Alternative approach: ___________________

**Sign-off**:
- Tech Lead: ______________ Date: __________
- Product Owner: ______________ Date: __________
- QA Engineer: ______________ Date: __________

---

## Next Immediate Action

1. **Team reviews full recommendation**: `TASK-DOCUMENTATION-RESTRUCTURE-RECOMMENDATION.md`
2. **Team meeting** (1 hour): Questions, concerns, approval
3. **If approved**: Begin Day 1 archival work tomorrow

**Contact for questions**: [Your Name/Team Lead]
