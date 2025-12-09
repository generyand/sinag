# Type Generation Guide

This guide explains the automatic TypeScript type generation system in the SINAG project.

## Overview

SINAG uses [Orval](https://orval.dev/) to automatically generate TypeScript types and React Query
hooks from the FastAPI backend's OpenAPI specification. This ensures end-to-end type safety between
the backend (Python/Pydantic) and frontend (TypeScript/React).

## Architecture

```
FastAPI Backend (Python)
  ↓ Pydantic schemas define data models
  ↓ FastAPI generates OpenAPI spec at /openapi.json
  ↓
Orval Type Generator
  ↓ Fetches OpenAPI spec
  ↓ Generates TypeScript types from Pydantic schemas
  ↓ Generates React Query hooks from API endpoints
  ↓ Organizes by FastAPI tags
  ↓
packages/shared/src/generated/
  ├── schemas/{tag}/       ← TypeScript type definitions
  └── endpoints/{tag}/     ← React Query hooks
  ↓
Frontend imports from @sinag/shared
```

## When to Run Type Generation

**Always run type generation after:**

1. ✅ Adding a new FastAPI endpoint
2. ✅ Modifying an existing endpoint's request/response schema
3. ✅ Creating or updating Pydantic models
4. ✅ Changing endpoint parameters or return types
5. ✅ Adding new FastAPI tags
6. ✅ Modifying database models that affect API responses

**Command:**

```bash
pnpm generate-types
```

## How It Works

### Step 1: FastAPI OpenAPI Generation

FastAPI automatically generates an OpenAPI specification based on:

- Pydantic schema definitions in `apps/api/app/schemas/`
- Endpoint definitions in `apps/api/app/api/v1/`
- FastAPI tags for organization

**Example Pydantic Schema:**

```python
# apps/api/app/schemas/assessment.py
from pydantic import BaseModel, Field

class SubmitAssessmentResponse(BaseModel):
    """Response after submitting an assessment."""
    message: str = Field(..., description="Success message")
    assessment_id: int = Field(..., description="ID of submitted assessment")
    status: str = Field(..., description="New assessment status")
    rework_count: int = Field(..., description="Number of rework cycles")
```

**Example FastAPI Endpoint:**

```python
# apps/api/app/api/v1/assessments.py
from app.schemas.assessment import SubmitAssessmentResponse

@router.post("/{assessment_id}/submit", tags=["assessments"])
def submit_assessment(
    assessment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> SubmitAssessmentResponse:
    """Submit an assessment for review."""
    return assessment_service.submit_assessment(db, assessment_id, current_user.id)
```

### Step 2: Orval Type Generation

Orval reads the OpenAPI spec and generates:

1. **TypeScript Types** (from Pydantic schemas)
2. **React Query Hooks** (from FastAPI endpoints)

**Generated TypeScript Type:**

```typescript
// packages/shared/src/generated/schemas/assessments/index.ts
export interface SubmitAssessmentResponse {
  /** Success message */
  message: string;
  /** ID of submitted assessment */
  assessment_id: number;
  /** New assessment status */
  status: string;
  /** Number of rework cycles */
  rework_count: number;
}
```

**Generated React Query Hook:**

```typescript
// packages/shared/src/generated/endpoints/assessments/index.ts
export const usePostAssessmentsAssessmentIdSubmit = <TError = HTTPValidationError>(options?: {
  mutation?: UseMutationOptions<
    Awaited<ReturnType<typeof postAssessments$AssessmentIdSubmit>>,
    TError,
    { assessmentId: number },
    unknown
  >;
}) => {
  // ... React Query mutation hook implementation
};
```

### Step 3: Tag-Based Organization

Orval organizes generated files by FastAPI tags:

**Schema Organization:**

```
packages/shared/src/generated/schemas/
├── assessments/       ← tag="assessments"
│   └── index.ts      (SubmitAssessmentResponse, AssessmentResponse, etc.)
├── users/            ← tag="users"
│   └── index.ts      (User, UserCreate, UserUpdate, etc.)
├── movs/             ← tag="movs"
│   └── index.ts      (MOVFileResponse, MOVUploadResponse, etc.)
└── ...
```

**Endpoint Organization:**

```
packages/shared/src/generated/endpoints/
├── assessments/       ← tag="assessments"
│   └── index.ts      (usePostAssessmentsSubmit, useGetAssessmentsList, etc.)
├── users/            ← tag="users"
│   └── index.ts      (useGetUsers, usePostUsers, etc.)
└── ...
```

## Configuration

Type generation is configured in [`orval.config.ts`](../../orval.config.ts):

```typescript
export default {
  sinag: {
    input: {
      target: "http://localhost:8000/openapi.json",
    },
    output: {
      target: "packages/shared/src/generated/endpoints/index.ts",
      schemas: "packages/shared/src/generated/schemas",
      client: "react-query",
      mode: "tags-split",
      override: {
        mutator: {
          path: "apps/web/src/lib/api.ts",
          name: "customInstance",
        },
      },
    },
  },
};
```

**Key Settings:**

- `input.target`: OpenAPI spec URL (backend must be running)
- `output.target`: Where to generate endpoint hooks
- `output.schemas`: Where to generate TypeScript types
- `client: 'react-query'`: Generate React Query hooks
- `mode: 'tags-split'`: Organize by FastAPI tags

## Usage in Frontend

### Importing Types

```typescript
// Import specific types
import { SubmitAssessmentResponse } from "@sinag/shared";

// Import from specific tag
import type { User, UserCreate } from "@sinag/shared/schemas/users";
```

### Using Generated Hooks

```typescript
import { usePostAssessmentsAssessmentIdSubmit } from '@sinag/shared';

function SubmitButton({ assessmentId }: { assessmentId: number }) {
  const submitMutation = usePostAssessmentsAssessmentIdSubmit();

  const handleSubmit = () => {
    submitMutation.mutate(
      { assessmentId },
      {
        onSuccess: (data) => {
          console.log('Submitted!', data.message);
          // data is fully typed as SubmitAssessmentResponse
        },
      }
    );
  };

  return (
    <button onClick={handleSubmit} disabled={submitMutation.isPending}>
      {submitMutation.isPending ? 'Submitting...' : 'Submit Assessment'}
    </button>
  );
}
```

## Generated Files Overview

### Epic 5.0 Submission & Rework Types

**Schemas:**

- `schemas/assessments/SubmitAssessmentResponse.ts`
- `schemas/assessments/ResubmitAssessmentResponse.ts`
- `schemas/requestrework/RequestReworkRequest.ts`
- `schemas/requestrework/RequestReworkResponse.ts`
- `schemas/error/SubmissionValidationResult.ts`
- `schemas/system/SubmissionStatusResponse.ts`

**Hooks:**

- `endpoints/assessments/usePostAssessmentsAssessmentIdSubmit` - Submit assessment
- `endpoints/assessments/usePostAssessmentsAssessmentIdRequestRework` - Request rework
- `endpoints/blgu-dashboard/useGetBlguDashboardAssessmentId` - Get dashboard data

### Tag Summary (as of Epic 6 Story 6.2)

| Tag            | Schemas | Endpoints | Description                             |
| -------------- | ------- | --------- | --------------------------------------- |
| assessments    | 50      | 15+       | Assessment CRUD, submission, validation |
| users          | 37      | 10+       | User management, authentication         |
| movs           | 13      | 4         | MOV file upload and management          |
| blgu-dashboard | -       | 2         | BLGU dashboard data                     |
| assessor       | 4       | 5+        | Assessor review and queue               |
| indicators     | 59      | 12+       | Indicator management                    |
| system         | 46      | 8+        | System health, audit logs               |
| bbis           | 31      | 8+        | BBI management                          |
| auth           | 2       | 2         | Authentication                          |
| analytics      | 2       | 3+        | Analytics and reporting                 |
| admin          | 8       | 6+        | Admin operations                        |
| lookups        | -       | 5+        | Lookup data                             |

**Total:** 352+ TypeScript types generated across 26 schema files

## Troubleshooting

### Error: "Cannot connect to http://localhost:8000"

**Cause:** Backend API is not running.

**Solution:**

```bash
# Start the backend first
cd apps/api
pnpm dev:api

# Then run type generation
pnpm generate-types
```

### Error: TypeScript compilation errors after generation

**Cause:** Breaking changes in backend schema.

**Solution:**

1. Check what changed in the backend schema
2. Update frontend code to match new types
3. Fix any type errors in your IDE
4. Run `pnpm type-check` to verify

### Types are outdated

**Cause:** Forgot to run type generation after backend changes.

**Solution:**

```bash
pnpm generate-types
```

**Tip:** Add this to your workflow:

1. Make backend changes
2. Run `pnpm generate-types`
3. Fix any frontend type errors
4. Commit both backend and frontend changes together

### Duplicate type definitions

**Cause:** Same schema used in multiple tags.

**Solution:** Orval handles this automatically by namespacing. Import from the correct tag:

```typescript
// ✅ Good - specific import
import { User } from "@sinag/shared/schemas/users";

// ⚠️ Might work but less clear
import { User } from "@sinag/shared";
```

### Generated hooks not working

**Cause:** Missing or incorrect API client configuration.

**Solution:** Verify `apps/web/src/lib/api.ts` exports `customInstance`:

```typescript
// apps/web/src/lib/api.ts
import axios from "axios";

export const customInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_V1_URL,
  // ... other config
});
```

## Best Practices

### ✅ DO

1. **Run type generation after every backend change**

   ```bash
   pnpm generate-types
   ```

2. **Use generated types everywhere**

   ```typescript
   import { SubmitAssessmentResponse } from "@sinag/shared";

   function handleSubmit(data: SubmitAssessmentResponse) {
     // TypeScript knows all fields!
   }
   ```

3. **Use generated hooks for API calls**

   ```typescript
   const { data, isLoading } = useGetAssessmentsList();
   ```

4. **Check generated types into version control**
   - Commit generated files so everyone has the same types

5. **Update types before reviewing frontend PRs**
   - Ensures reviewers see correct types

### ❌ DON'T

1. **Don't manually edit generated files**
   - They will be overwritten on next generation

2. **Don't duplicate types manually**

   ```typescript
   // ❌ Bad - manual duplication
   interface SubmitResponse {
     message: string;
     assessment_id: number;
   }

   // ✅ Good - use generated type
   import { SubmitAssessmentResponse } from "@sinag/shared";
   ```

3. **Don't skip type generation**
   - Frontend will break if types don't match backend

4. **Don't use `any` to bypass type errors**

   ```typescript
   // ❌ Bad
   const data: any = await fetch("/api/submit");

   // ✅ Good
   const submitMutation = usePostAssessmentsSubmit();
   submitMutation.mutate(payload);
   ```

## CI/CD Integration

For continuous integration, ensure type generation runs as part of your build:

**In `.github/workflows/ci.yml`:**

```yaml
- name: Generate Types
  run: pnpm generate-types

- name: Type Check
  run: pnpm type-check
```

**In production build:**

```bash
# Type generation is included in web build
cd apps/web
pnpm build  # Runs generate-types first
```

## Migration Guide

If you have manual type definitions that should be replaced with generated types:

1. **Find manual type definitions**

   ```typescript
   // Old manual type
   interface AssessmentResponse {
     id: number;
     status: string;
   }
   ```

2. **Check if type is generated**

   ```bash
   grep -r "AssessmentResponse" packages/shared/src/generated/
   ```

3. **Replace with import**

   ```typescript
   // New generated import
   import { AssessmentResponse } from "@sinag/shared";
   ```

4. **Fix any type mismatches**
   - Generated types are the source of truth
   - Update code to match generated types

## Related Documentation

- [Orval Documentation](https://orval.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [FastAPI OpenAPI Documentation](https://fastapi.tiangolo.com/tutorial/metadata/)
- [Project Architecture](../architecture.md)
- [Epic 6 Testing Guide](../../tasks/tasks-prd-blgu-table-assessment-workflow/epic-6-testing-integration.md)

## Support

If you encounter issues with type generation:

1. Check this documentation
2. Verify backend is running (`http://localhost:8000/docs`)
3. Check Orval configuration (`orval.config.ts`)
4. Review recent backend changes
5. Ask the team in #dev-frontend or #dev-backend channels
