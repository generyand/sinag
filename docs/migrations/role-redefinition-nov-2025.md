# Role Redefinition Migration Guide (November 2025)

## Overview

This guide documents the role structure changes implemented in November 2025 following DILG consultation. The changes affect user roles, database schema, API endpoints, and frontend components.

## Summary of Changes

### Role Changes

| Old Role | New Role | Notes |
|----------|----------|-------|
| `SUPERADMIN` | `MLGOO_DILG` | Renamed to better reflect DILG administrative role |
| `AREA_ASSESSOR` | `ASSESSOR` | Renamed; no longer pre-assigned to governance areas |
| N/A | `VALIDATOR` | **New role** - Validators assigned to specific governance areas |
| `BLGU_USER` | `BLGU_USER` | Unchanged |

### Field Changes

| Old Field | New Field | Purpose |
|-----------|-----------|---------|
| `governance_area_id` | `validator_area_id` | Renamed to better reflect that only Validators use this field |

## Breaking Changes

### 1. Database Schema Changes

**Migration**: `alembic/versions/add_validator_role_and_rename_field.py`

```sql
-- Role enum updated
ALTER TYPE userrole RENAME TO userrole_old;
CREATE TYPE userrole AS ENUM ('MLGOO_DILG', 'ASSESSOR', 'VALIDATOR', 'BLGU_USER');

-- Update existing role values
UPDATE users SET role = 'MLGOO_DILG' WHERE role = 'SUPERADMIN';
UPDATE users SET role = 'ASSESSOR' WHERE role = 'AREA_ASSESSOR';

-- Rename field
ALTER TABLE users RENAME COLUMN governance_area_id TO validator_area_id;
```

### 2. Backend API Changes

#### Authentication Dependency

**Old**:
```python
def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.SUPERADMIN, UserRole.MLGOO_DILG]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
```

**New**:
```python
def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.MLGOO_DILG:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
```

#### User Service Validation

**New behavior** in `user_service.py`:
- `VALIDATOR` role requires `validator_area_id`
- `BLGU_USER` role requires `barangay_id`
- `ASSESSOR` and `MLGOO_DILG` roles clear both assignment fields
- Automatic field clearing when role changes

### 3. Frontend Changes

#### Type Updates

After running `pnpm generate-types`, the following types are updated:

```typescript
// Old
enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  AREA_ASSESSOR = 'AREA_ASSESSOR',
  BLGU_USER = 'BLGU_USER',
}

// New
enum UserRole {
  MLGOO_DILG = 'MLGOO_DILG',
  ASSESSOR = 'ASSESSOR',
  VALIDATOR = 'VALIDATOR',
  BLGU_USER = 'BLGU_USER',
}
```

#### User Schema

```typescript
interface User {
  // ... other fields
  role: UserRole;
  validator_area_id?: number | null;  // Renamed from governance_area_id
  barangay_id?: number | null;
}
```

#### Auth Store

The `useAuthStore` version was bumped to `3` to force client-side cache reset:

```typescript
persist(
  // ... store implementation
  {
    name: 'auth-storage',
    version: 3, // Increment forces reset on client side
  }
)
```

## Migration Steps

### For Developers

1. **Pull latest code from `UserValidator` branch**
   ```bash
   git checkout UserValidator
   git pull origin UserValidator
   ```

2. **Update backend dependencies** (if needed)
   ```bash
   cd apps/api
   uv sync
   ```

3. **Run database migration**
   ```bash
   cd apps/api
   alembic upgrade head
   ```

4. **Regenerate TypeScript types**
   ```bash
   pnpm generate-types
   ```

5. **Clear frontend node_modules** (if experiencing issues)
   ```bash
   cd apps/web
   rm -rf node_modules .next
   pnpm install
   ```

6. **Restart development servers**
   ```bash
   pnpm dev
   ```

### For Production Deployment

1. **Backup database before migration**
   ```bash
   # Example for PostgreSQL
   pg_dump -h localhost -U postgres -d sinag > backup_$(date +%Y%m%d).sql
   ```

2. **Run migration during maintenance window**
   ```bash
   cd apps/api
   alembic upgrade head
   ```

3. **Verify migration success**
   ```bash
   # Check that role enum is updated
   psql -d sinag -c "SELECT DISTINCT role FROM users;"

   # Check that field is renamed
   psql -d sinag -c "\\d users" | grep validator_area_id
   ```

4. **Deploy new backend code**
   ```bash
   # Deploy API with new role logic
   ```

5. **Deploy new frontend code**
   ```bash
   # Deploy web app with new types
   ```

## Code Updates Required

### If You Have Custom Code

#### 1. Update Role Checks

**Old**:
```python
if user.role == UserRole.SUPERADMIN:
    # admin logic
```

**New**:
```python
if user.role == UserRole.MLGOO_DILG:
    # admin logic
```

**Old**:
```python
if user.role == UserRole.AREA_ASSESSOR:
    # assessor logic
```

**New**:
```python
if user.role == UserRole.ASSESSOR:
    # assessor logic
```

#### 2. Update Field References

**Old**:
```python
user.governance_area_id
```

**New**:
```python
user.validator_area_id
```

#### 3. Handle VALIDATOR Role

**New**:
```python
if user.role == UserRole.VALIDATOR:
    # Validator has validator_area_id
    area = user.validator_area_id
```

### Frontend Component Updates

#### 1. Update Role Checks

**Old**:
```typescript
if (user.role === 'SUPERADMIN' || user.role === 'MLGOO_DILG') {
  // admin UI
}
```

**New**:
```typescript
if (user.role === 'MLGOO_DILG') {
  // admin UI
}
```

#### 2. Update Field References

**Old**:
```typescript
<FormField
  name="governance_area_id"
  // ...
/>
```

**New**:
```typescript
<FormField
  name="validator_area_id"
  // ...
/>
```

#### 3. Add Conditional Rendering for VALIDATOR

```typescript
{form.role === UserRole.VALIDATOR && (
  <Select
    value={form.validator_area_id?.toString() || ''}
    onValueChange={(value) => handleSelectChange('validator_area_id', value)}
  >
    {/* governance areas options */}
  </Select>
)}
```

## Testing Checklist

After migration, verify the following:

### Backend Tests

- [ ] All user service tests pass (`pytest tests/services/test_user_service.py`)
- [ ] All user API tests pass (`pytest tests/api/v1/test_user_service.py`)
- [ ] Admin user can create/update users
- [ ] VALIDATOR role requires `validator_area_id`
- [ ] BLGU_USER role requires `barangay_id`
- [ ] Role changes clear incompatible fields

### Frontend Tests

- [ ] Login works for all roles
- [ ] User management page accessible for MLGOO_DILG
- [ ] User creation form shows correct fields for each role
- [ ] User editing preserves role-specific assignments
- [ ] Role dropdown shows all four roles
- [ ] Validation prevents invalid role/field combinations

### Integration Tests

- [ ] MLGOO_DILG can access admin endpoints
- [ ] VALIDATOR can access validation features
- [ ] ASSESSOR can access assessment features
- [ ] BLGU_USER limited to their barangay
- [ ] Old SUPERADMIN accounts migrated to MLGOO_DILG
- [ ] Old AREA_ASSESSOR accounts migrated to ASSESSOR

## Rollback Procedure

If issues arise, rollback using:

```bash
cd apps/api
alembic downgrade -1
```

**Warning**: This will:
- Revert role enum to old values
- Rename `validator_area_id` back to `governance_area_id`
- Convert MLGOO_DILG → SUPERADMIN
- Convert ASSESSOR → AREA_ASSESSOR
- Delete VALIDATOR role users (if any exist)

## Support

For questions or issues:
- Check [CLAUDE.md](../../CLAUDE.md) for role documentation
- Review PRD at [docs/prds/prd-phase1-core-user-authentication-and-management.md](../prds/prd-phase1-core-user-authentication-and-management.md)
- Contact development team

## Changelog

**November 2025**
- Initial role redefinition implementation
- Database migration created and tested
- Backend services updated
- Frontend components updated
- Documentation updated
