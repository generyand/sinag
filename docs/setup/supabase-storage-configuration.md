# Supabase Storage Configuration for MOV Files

This guide provides step-by-step instructions for configuring Supabase Storage to handle Means of Verification (MOV) file uploads for the SINAG platform.

## Overview

The MOV upload system uses Supabase Storage to securely store and manage files uploaded by BLGUs and accessed by assessors and validators. The storage follows a hierarchical path structure and implements Row-Level Security (RLS) policies for access control.

## Story 4.1: Storage Bucket Configuration

### Task 4.1.1: Create Storage Bucket

1. **Access Supabase Dashboard**
   - Navigate to your Supabase project dashboard
   - Go to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"** button
   - Bucket name: `mov-files`
   - Set bucket to **Private** (NOT public)
   - Click **"Create bucket"**

3. **Verify Creation**
   - Confirm the `mov-files` bucket appears in the Storage dashboard
   - Verify the bucket shows as "Private"

**Acceptance Criteria:**
- ✅ Storage bucket named "mov-files" created
- ✅ Bucket is set to private (not public)
- ✅ Bucket visible in Supabase Storage dashboard

---

### Task 4.1.2: Configure Bucket Privacy and CORS Settings

1. **Access Bucket Settings**
   - Click on the `mov-files` bucket
   - Navigate to **Configuration** or **Settings** tab

2. **Configure CORS (Cross-Origin Resource Sharing)**

   CORS configuration allows the frontend application to upload files directly to Supabase Storage.

   **For Development:**
   ```json
   {
     "allowedOrigins": ["http://localhost:3000"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

   **For Production:**
   ```json
   {
     "allowedOrigins": ["https://your-production-domain.com"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "maxAgeSeconds": 3600
   }
   ```

3. **File Size Limits**
   - Default Supabase limit: 50MB per file
   - This aligns with our requirement (max 50MB per file)
   - No additional configuration needed

**Acceptance Criteria:**
- ✅ Bucket set to private access
- ✅ CORS configured for localhost:3000 (development)
- ✅ CORS headers allow multipart uploads
- ✅ File size limit: 50MB

---

### Task 4.1.3: Define RLS Policies for File Access

Row-Level Security (RLS) policies control who can upload, read, and delete files based on user roles and ownership.

#### Storage Path Structure

Files are organized with the following path structure:
```
{assessment_id}/{indicator_id}/{file_name}
```

Example:
```
assessment_123/indicator_456/evidence_photo.jpg
```

#### SQL for RLS Policies

Execute the following SQL in the **SQL Editor** of your Supabase dashboard:

```sql
-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: BLGU users can upload files for their own assessments
-- This policy allows BLGU users to INSERT files into paths matching their assessment IDs
CREATE POLICY "BLGU users can upload MOV files for their assessments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mov-files'
  AND (storage.foldername(name))[1]::int IN (
    SELECT id::text
    FROM assessments
    WHERE barangay_id = (
      SELECT barangay_id
      FROM users
      WHERE id = auth.uid()::int
      AND role = 'BLGU_USER'
    )
  )
);

-- Policy 2: BLGU users can read (SELECT) their own assessment files
CREATE POLICY "BLGU users can view their own MOV files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND (storage.foldername(name))[1]::int IN (
    SELECT id::text
    FROM assessments
    WHERE barangay_id = (
      SELECT barangay_id
      FROM users
      WHERE id = auth.uid()::int
      AND role = 'BLGU_USER'
    )
  )
);

-- Policy 3: BLGU users can delete files from their own assessments
CREATE POLICY "BLGU users can delete their own MOV files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND (storage.foldername(name))[1]::int IN (
    SELECT id::text
    FROM assessments
    WHERE barangay_id = (
      SELECT barangay_id
      FROM users
      WHERE id = auth.uid()::int
      AND role = 'BLGU_USER'
    )
  )
);

-- Policy 4: Assessors can read ALL MOV files
CREATE POLICY "Assessors can view all MOV files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()::int
    AND role = 'ASSESSOR'
  )
);

-- Policy 5: Validators can read MOV files for their assigned governance areas
CREATE POLICY "Validators can view MOV files for assigned areas"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND (storage.foldername(name))[1]::int IN (
    SELECT a.id::text
    FROM assessments a
    JOIN barangays b ON a.barangay_id = b.id
    JOIN users u ON u.id = auth.uid()::int
    WHERE u.role = 'VALIDATOR'
    AND b.governance_area_id = u.validator_area_id
  )
);

-- Policy 6: MLGOO_DILG (admins) can read all files
CREATE POLICY "Admins can view all MOV files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()::int
    AND role = 'MLGOO_DILG'
  )
);

-- Policy 7: MLGOO_DILG (admins) can delete any files (for moderation)
CREATE POLICY "Admins can delete any MOV files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mov-files'
  AND EXISTS (
    SELECT 1
    FROM users
    WHERE id = auth.uid()::int
    AND role = 'MLGOO_DILG'
  )
);
```

#### Policy Summary

| User Role    | Upload (INSERT) | Read (SELECT) | Delete        |
|--------------|-----------------|---------------|---------------|
| BLGU_USER    | Own assessments | Own files     | Own files     |
| ASSESSOR     | ❌              | All files     | ❌            |
| VALIDATOR    | ❌              | Assigned area | ❌            |
| MLGOO_DILG   | ❌              | All files     | All files     |

**Acceptance Criteria:**
- ✅ RLS policies created for all user roles
- ✅ BLGU users can upload/delete files for their own assessments
- ✅ Assessors can read all files
- ✅ Validators can read files for assigned governance areas
- ✅ Admins have full access

---

### Task 4.1.4: Test File Upload and Access

#### Manual Testing Steps

1. **Test BLGU User Upload**
   - Log in as a BLGU user
   - Navigate to assessment form
   - Upload a test file (e.g., test.pdf)
   - Verify file appears in Supabase Storage under correct path
   - Verify path structure: `{assessment_id}/{indicator_id}/test.pdf`

2. **Test BLGU User Access Control**
   - Log in as BLGU User A
   - Verify User A can see their own files
   - Log in as BLGU User B (different barangay)
   - Verify User B CANNOT see User A's files

3. **Test Assessor Access**
   - Log in as an assessor
   - Navigate to any BLGU's assessment
   - Verify assessor can download all MOV files
   - Verify assessor CANNOT delete files

4. **Test Validator Access**
   - Log in as a validator
   - Navigate to assessments in their assigned governance area
   - Verify validator can view files for assigned area
   - Navigate to assessment outside their area
   - Verify validator CANNOT access files

5. **Test Admin Access**
   - Log in as MLGOO_DILG user
   - Verify admin can view all files
   - Verify admin can delete files (if needed for moderation)

#### Automated Test Script (Optional)

A test script can be created later in Story 4.19 (Testing & Validation) to automate these tests using Supabase client libraries and pytest.

**Acceptance Criteria:**
- ✅ BLGU user can upload file to their assessment folder
- ✅ Assessor can download BLGU's file
- ✅ BLGU user cannot access other BLGU's files
- ✅ Validator can access files for assigned areas only
- ✅ Admin has full access to all files

---

## Environment Variables

Add the following to your environment files:

### Backend (`apps/api/.env`)

```env
# Supabase Storage (already configured via SUPABASE_URL and keys)
SUPABASE_STORAGE_BUCKET=mov-files
```

### Frontend (`apps/web/.env.local`)

```env
# Supabase Storage Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=mov-files
```

---

## Troubleshooting

### CORS Errors

If you encounter CORS errors:
1. Verify CORS configuration includes your frontend origin
2. Check that `allowedHeaders` includes `*` or specific headers like `authorization`, `content-type`
3. Ensure `allowedMethods` includes required HTTP methods

### RLS Policy Errors

If files aren't accessible:
1. Check that RLS is enabled: `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`
2. Verify user's role matches policy conditions
3. Test policies using Supabase SQL Editor with `auth.uid()` simulation
4. Check that foreign key relationships (assessments → barangays → users) are correct

### File Upload Failures

If uploads fail:
1. Check file size (must be ≤ 50MB)
2. Verify user has valid session token
3. Check bucket privacy settings (should be private, not public)
4. Verify path structure matches RLS policy expectations

---

## Next Steps

After completing this configuration:

1. ✅ **Story 4.2**: Create database schema for `mov_files` table
2. ✅ **Story 4.3**: Implement SQLAlchemy model
3. ✅ **Story 4.4**: Build file validation service
4. ✅ **Story 4.5**: Build file upload service

---

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
