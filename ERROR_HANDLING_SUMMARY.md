# Error Handling Improvements - Quick Reference

## What Was Done

Following the pattern established in `LoginForm.tsx`, we audited and improved error handling across the frontend to distinguish between different error types (network, server, auth, validation, etc.) instead of showing generic "Something went wrong" messages.

## Files Created

1. **`/apps/web/src/lib/error-utils.ts`** (265 lines)
   - Core error classification logic
   - Distinguishes: network, server, auth, validation, rate_limit, permission, unknown
   - Helper functions: `classifyError()`, `getErrorMessage()`, `isNetworkError()`, etc.

2. **`/apps/web/src/components/shared/ErrorDisplay.tsx`** (108 lines)
   - Reusable component for consistent error display
   - Automatic icon selection (WifiOff, ServerCrash, Lock, etc.)
   - Dark mode support, accessibility features

3. **`ERROR_HANDLING_AUDIT_REPORT.md`** (18KB)
   - Comprehensive audit report with findings and recommendations

## Files Updated (7 Components)

| File | What Changed | Lines Changed |
|------|--------------|---------------|
| `users/UserForm.tsx` | Replaced custom error extraction with `classifyError()` | ~10 lines |
| `assessments/submission/SubmitAssessmentButton.tsx` | Used `classifyError()` for better error messages | ~8 lines |
| `assessments/submission/ResubmitAssessmentButton.tsx` | Updated 2 mutations with `classifyError()` | ~16 lines |
| `forms/fields/FileFieldComponent.tsx` | Improved upload/download error handling | ~12 lines |
| `movs/FileListWithDelete.tsx` | Better delete error classification | ~6 lines |
| `profile/ProfileForm.tsx` | Simplified error checking, better routing | ~10 lines |

## Error Types Now Detected

| Error Type | Detection Criteria | User-Facing Message | Icon | Color |
|------------|-------------------|---------------------|------|-------|
| **Network** | `Network Error`, `Failed to fetch`, `ERR_NETWORK` | "Unable to connect to server" | WifiOff | Orange |
| **Server** | HTTP 500+ | "Server error - try again later" | ServerCrash | Red |
| **Auth** | HTTP 401 | "Authentication failed" | Lock | Red |
| **Permission** | HTTP 403 | "Access denied" | ShieldAlert | Red |
| **Validation** | HTTP 400, 422 | "Validation failed" + details | AlertCircle | Amber |
| **Rate Limit** | HTTP 429 | "Too many requests" | Clock | Yellow |
| **Unknown** | Everything else | Extracted error message | AlertTriangle | Red |

## Usage Example

### Before
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

### After
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

### Using the ErrorDisplay Component
```typescript
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';

// In component render:
{mutation.isError && <ErrorDisplay error={mutation.error} />}
```

## Quick Migration Guide

To update other components:

1. **Add import**: `import { classifyError } from '@/lib/error-utils';`
2. **Find**: `error?.response?.data?.detail` or similar manual error extraction
3. **Replace with**: 
   ```typescript
   const errorInfo = classifyError(error);
   // Use errorInfo.title and errorInfo.message
   ```

## Testing Checklist

Test these scenarios to verify:
- [ ] Kill backend → Shows "Unable to connect to server" (orange)
- [ ] Trigger 500 error → Shows "Server error" (red)
- [ ] Wrong credentials → Shows "Authentication failed" (red)
- [ ] Invalid input (400/422) → Shows "Validation failed" with details (amber)
- [ ] Too many requests (429) → Shows "Too many requests" (yellow)

## Benefits

✅ **Better UX**: Users see context-specific, actionable messages
✅ **Less confusion**: Network issues clearly distinguished from input errors
✅ **Code reuse**: Shared utility eliminates duplication
✅ **Consistency**: All components handle errors the same way
✅ **Maintainability**: One place to update error logic
✅ **Accessibility**: Proper ARIA attributes and visual hierarchy

## Next Steps

1. Apply same pattern to remaining components as needed (see audit report)
2. Monitor error types in production logs
3. Gather user feedback on new error messages
4. Consider adding error tracking/analytics integration

---

**For detailed findings and recommendations**, see `ERROR_HANDLING_AUDIT_REPORT.md`
