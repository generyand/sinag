# Error Handling Guide

This guide documents the standardized error handling patterns used in the SINAG frontend application.

## Overview

The SINAG frontend implements a comprehensive error handling system that:
- Classifies errors by type (network, server, auth, validation, etc.)
- Provides user-friendly, actionable error messages
- Maintains consistency across all components
- Supports accessibility requirements

## Core Utilities

### Error Classification Utility

**Location**: `/apps/web/src/lib/error-utils.ts`

This utility provides functions for classifying and formatting error messages:

```typescript
import { classifyError, getErrorMessage, isNetworkError, isAuthError, isValidationError } from '@/lib/error-utils';
```

#### `classifyError(error)`

Classifies any error object and returns structured error information:

```typescript
const errorInfo = classifyError(error);
// Returns: { type: 'network' | 'server' | 'auth' | 'validation' | 'rate_limit' | 'permission' | 'unknown',
//            title: string,
//            message: string }
```

#### Helper Functions

- `getErrorIcon(type)` - Returns appropriate Lucide icon name for the error type
- `getErrorColor(type)` - Returns Tailwind color classes for styling
- `getErrorMessage(error)` - Quick helper for simple error message extraction
- `isNetworkError(error)` - Boolean check for network errors
- `isAuthError(error)` - Boolean check for authentication errors
- `isValidationError(error)` - Boolean check for validation errors

### Error Display Component

**Location**: `/apps/web/src/components/shared/ErrorDisplay.tsx`

A reusable component for displaying errors with consistent styling and accessibility:

```typescript
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';

// In component render:
{mutation.isError && <ErrorDisplay error={mutation.error} />}
```

Features:
- Automatic icon selection based on error type
- Color-coded by severity (orange for network, red for critical, amber for validation)
- Dark mode support
- ARIA attributes for screen readers

## Error Types and User Messages

| Error Type | Detection Criteria | User-Facing Message | Icon | Color |
|------------|-------------------|---------------------|------|-------|
| **Network** | `Network Error`, `Failed to fetch`, `ERR_NETWORK` | "Unable to connect to server" | WifiOff | Orange |
| **Server** | HTTP 500+ | "Server error - try again later" | ServerCrash | Red |
| **Auth** | HTTP 401 | "Authentication failed" | Lock | Red |
| **Permission** | HTTP 403 | "Access denied" | ShieldAlert | Red |
| **Validation** | HTTP 400, 422 | "Validation failed" + details | AlertCircle | Amber |
| **Rate Limit** | HTTP 429 | "Too many requests" | Clock | Yellow |
| **Unknown** | Everything else | Extracted error message | AlertTriangle | Red |

## Usage Patterns

### Mutation Error Handling

**Before** (avoid this pattern):
```typescript
onError: (error: any) => {
  const errorMessage =
    error?.response?.data?.detail ||
    error?.message ||
    "Failed to submit";

  toast({
    title: "Submission Failed",
    description: errorMessage,
    variant: "destructive",
  });
}
```

**After** (recommended pattern):
```typescript
import { classifyError } from '@/lib/error-utils';

onError: (error: any) => {
  const errorInfo = classifyError(error);

  toast({
    title: errorInfo.title,
    description: errorInfo.message,
    variant: "destructive",
  });
}
```

### Persistent Error Display

For errors that should remain visible (not just toast notifications):

```typescript
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';

function MyComponent() {
  const mutation = useMutation({...});

  return (
    <div>
      {mutation.isError && <ErrorDisplay error={mutation.error} />}
      {/* rest of component */}
    </div>
  );
}
```

### Field-Level Error Routing

For forms where certain errors should appear on specific fields:

```typescript
const errorInfo = classifyError(error);

if (errorInfo.type === 'auth') {
  // Show on password field
  form.setError('currentPassword', { message: 'Incorrect password' });
} else {
  // Show as toast for other errors
  toast.error(`${errorInfo.title}: ${errorInfo.message}`);
}
```

## Global Error Handling

The application includes a global error interceptor in `/apps/web/src/lib/api.ts` that handles:

- Automatic redirect on 401 (session expiration)
- Global toast notifications for common errors (403, 429, 500, network errors)

Component-level error handling provides additional context for errors that need specific handling.

## Best Practices

### Do

- Use `classifyError()` for all mutation error handling
- Use `<ErrorDisplay>` for persistent error states
- Provide context-specific messages when the error type allows
- Test error scenarios during development

### Don't

- Create custom error extraction logic in components
- Show technical details (HTTP codes, stack traces) to users
- Treat all errors the same (network vs. validation vs. server)
- Forget to handle the error case in mutations

## Testing Error Scenarios

When testing, verify these scenarios work correctly:

1. **Network Down**: Kill backend, verify "Unable to connect to server" (orange styling)
2. **500 Error**: Trigger server error, verify "Server error" (red styling)
3. **401 Error**: Invalid credentials, verify "Authentication failed" (red styling)
4. **422 Error**: Bad input, verify "Validation failed" with specific field errors (amber styling)
5. **429 Error**: Rate limit, verify "Too many requests" (yellow styling)

## Components Using This Pattern

The following components have been updated to use the standardized error handling:

- `UserForm.tsx` - User creation and update
- `SubmitAssessmentButton.tsx` - Assessment submission
- `ResubmitAssessmentButton.tsx` - Assessment resubmission (regular and calibration)
- `FileFieldComponent.tsx` - File upload and download
- `FileListWithDelete.tsx` - File deletion
- `ProfileForm.tsx` - Password change

## Related Documentation

- [Service Layer Pattern](/docs/guides/service-layer-pattern.md) - Backend error response patterns
- [Testing Guide](/docs/guides/testing.md) - Testing error scenarios
