# Form Rendering & Validation Tests

Comprehensive test suite for the dynamic form rendering engine (Epic 3) validation.

## Test Files

### 1. `all-field-types.test.tsx`

Tests rendering of all supported field types.

**Coverage:**

- Text fields with placeholders
- Number fields with min/max/step
- Select fields with options
- Radio fields with options
- Checkbox fields with default values
- File upload fields with accept/maxSize
- Textarea fields with rows
- Date fields

**Validation:**

- Correct field type rendering
- Required vs optional field marking
- Field attribute validation (labels, placeholders, constraints)
- Unique field names
- Valid option structures

### 2. `conditional-fields.test.tsx`

Tests conditional field visibility based on parent field values.

**Coverage:**

- Simple conditional fields (1 level)
- Nested conditional fields (3+ levels)
- Multiple conditions (AND logic)
- Mutually exclusive branches
- Condition operators: ==, !=, >, >=, <, <=
- Visibility toggle behavior
- Condition chain dependencies

**Validation:**

- Condition evaluation logic
- Parent-child field relationships
- Cascading visibility changes
- Required field behavior when hidden vs visible

### 3. `required-field-validation.test.tsx`

Tests required field validation enforcement.

**Coverage:**

- Required field detection
- Empty field detection (empty string, null, undefined, whitespace)
- Validation error messages
- Multiple required fields
- Field-type-specific validation (select, radio, number)
- Conditional required fields
- Submission blocking
- Real-time validation on blur

**Validation:**

- Required vs optional field distinction
- Proper error message generation
- Zero/false as valid values for required fields
- Multi-select array validation

### 4. `format-validation.test.tsx`

Tests field format validation (regex patterns) and number range validation.

**Coverage:**

- Email validation with regex
- Phone number validation (11 digits)
- URL validation (http/https protocol)
- Custom regex patterns
- Number min/max constraints
- Number step validation
- Percentage validation (0-100)
- Combined validations (required + format + range)

**Validation:**

- Pattern matching for various formats
- Boundary value testing
- Error message quality
- Floating point precision handling
- Negative number ranges
- Decimal number ranges

### 5. `edge-cases.test.tsx`

Tests edge cases and error scenarios.

**Coverage:**

- Circular conditional dependencies
- Invalid field types
- Missing required properties (name, type, label)
- Invalid condition operators
- Non-existent field references in conditions
- Empty schemas
- Malformed field definitions
- Invalid select/radio options
- Invalid number constraints (min > max, negative step)
- Invalid file constraints (negative maxSize)
- Condition evaluation edge cases (null, undefined, type coercion)
- Schema structure validation
- Error recovery and graceful degradation

**Validation:**

- Error detection and messaging
- Fallback behavior
- Default value application
- Duplicate field name detection
- Validation skipping for invalid fields

## Running Tests

```bash
# Run all form rendering tests
pnpm test apps/web/src/tests/form-rendering

# Run specific test file
pnpm test apps/web/src/tests/form-rendering/all-field-types.test.tsx

# Run with coverage
pnpm test:coverage apps/web/src/tests/form-rendering
```

## Test Fixtures

All tests use shared fixtures from `apps/web/src/tests/fixtures/form-schemas.ts`:

- `simpleFormSchema`: Basic text and number fields
- `allFieldTypesSchema`: All 8 supported field types
- `conditionalFieldsSchema`: Simple conditional logic
- `nestedConditionalSchema`: 3-level nested conditions
- `complexFormSchema`: Real-world complex form
- `validationRulesSchema`: Format validation patterns
- `emptySchema`: Empty field array
- `edgeCases.*`: Various edge case schemas

## Test Strategy

1. **Unit-level validation**: Tests validate schema structure and field definitions
2. **Logic validation**: Tests verify condition evaluation, visibility logic, validation rules
3. **Edge case coverage**: Tests ensure graceful handling of malformed data
4. **Real-world scenarios**: Tests cover actual form use cases from Epic 3

## Epic 3 Integration

These tests validate the dynamic form rendering engine built in Epic 3:

- Form schema parsing (`lib/forms/formSchemaParser.ts`)
- Validation schema generation (`lib/forms/generateValidationSchema.ts`)
- Field components (`components/features/forms/fields/`)
- Dynamic form renderer (`components/features/forms/DynamicFormRenderer.tsx`)

## Story 6.6 Status

**Completed Tasks:**

- ✅ 6.6.1: Form schema test fixtures
- ✅ 6.6.2: All field types rendering tests
- ✅ 6.6.3: Conditional field visibility tests
- ✅ 6.6.4: Required field validation tests
- ✅ 6.6.5 & 6.6.6: Format and number range validation tests
- ✅ 6.6.7: Edge case tests

**Test Coverage:**

- 200+ test cases across 5 test files
- All field types covered
- All validation rules tested
- Comprehensive edge case handling
- Real-world form scenarios validated
