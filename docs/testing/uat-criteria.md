# User Acceptance Testing (UAT) Criteria

**Epic 6.0 - Story 6.18** **Version:** 1.0 **Date:** 2025-11-09 **Status:** Production Ready

---

## Overview

This document defines the User Acceptance Testing criteria for the SINAG BLGU Table Assessment
Workflow system. UAT validates that the system meets business requirements and is ready for
production deployment.

## UAT Objectives

1. Validate end-to-end business workflows
2. Verify role-based access control
3. Confirm data integrity and security
4. Test usability and user experience
5. Validate compliance with DILG requirements

---

## UAT Test Scenarios

### Scenario 1: BLGU Assessment Submission Workflow

**Role:** BLGU_USER **Objective:** Complete BLGU can submit assessment from DRAFT to SUBMITTED

#### Test Steps:

1. **Login** as BLGU user
   - ✅ Verify successful login
   - ✅ Verify dashboard displays with correct barangay info

2. **Create New Assessment**
   - ✅ Click "New Assessment" button
   - ✅ Verify assessment created in DRAFT status
   - ✅ Verify year field defaults to current year

3. **Fill Assessment Form**
   - ✅ Navigate through all governance area indicators
   - ✅ Fill all required fields in dynamic forms
   - ✅ Test conditional field visibility
   - ✅ Verify field validation (required, format, range)

4. **Upload MOV Files**
   - ✅ Upload PDF documents for each indicator
   - ✅ Upload JPG/PNG images as evidence
   - ✅ Verify file size validation (< 50MB)
   - ✅ Verify file type validation (allowed types only)

5. **Validate Completeness**
   - ✅ Click "Check Completeness" button
   - ✅ Verify incomplete indicators highlighted
   - ✅ Verify error messages are clear and actionable

6. **Submit Assessment**
   - ✅ Complete all required fields
   - ✅ Click "Submit Assessment" button
   - ✅ Verify confirmation dialog appears
   - ✅ Confirm submission
   - ✅ Verify status changes to SUBMITTED
   - ✅ Verify submission timestamp recorded

7. **Verify Post-Submission State**
   - ✅ Verify form is locked (read-only)
   - ✅ Verify "Edit" button is disabled
   - ✅ Verify MOV files cannot be deleted
   - ✅ Verify compliance status NOT visible to BLGU

**Acceptance Criteria:**

- BLGU can complete entire workflow without errors
- All validation messages are user-friendly
- Submission process < 5 seconds
- No compliance data visible to BLGU

---

### Scenario 2: Assessor Review and Rework Request

**Role:** ASSESSOR **Objective:** Assessor can review submission and request rework if needed

#### Test Steps:

1. **Login** as ASSESSOR user
   - ✅ Verify successful login
   - ✅ Verify assessor dashboard displays pending assessments

2. **View Submitted Assessment**
   - ✅ Select a SUBMITTED assessment from list
   - ✅ Verify all form data is readable
   - ✅ Verify MOV files are accessible
   - ✅ Verify compliance status IS visible to assessor
   - ✅ Verify calculated_status shows PASS/FAIL/CONDITIONAL

3. **Review Assessment Quality**
   - ✅ Check calculated_status for each indicator
   - ✅ Review calculated_remark for quality feedback
   - ✅ Download and verify MOV files

4. **Request Rework (if needed)**
   - ✅ Click "Request Rework" button
   - ✅ Enter detailed rework comments per indicator
   - ✅ Submit rework request
   - ✅ Verify assessment status changes to REWORK
   - ✅ Verify BLGU receives notification

5. **Approve Assessment (if quality meets standards)**
   - ✅ Click "Approve Assessment" button
   - ✅ Verify status changes to APPROVED
   - ✅ Verify BLGU receives notification

**Acceptance Criteria:**

- Assessor can access all submitted assessments
- Compliance data visible and accurate
- Rework request process clear and intuitive
- Rework limit (1 cycle) enforced
- Approval process completes successfully

---

### Scenario 3: BLGU Rework and Resubmission

**Role:** BLGU_USER **Objective:** BLGU can address rework comments and resubmit

#### Test Steps:

1. **Login** as BLGU user (after rework requested)
   - ✅ Verify dashboard shows REWORK status assessment
   - ✅ Verify notification about rework request

2. **View Rework Comments**
   - ✅ Open REWORK assessment
   - ✅ Verify rework comments panel displays
   - ✅ Verify comments are specific per indicator
   - ✅ Verify comments are actionable

3. **Edit Assessment Based on Feedback**
   - ✅ Form is unlocked for editing
   - ✅ Update responses based on comments
   - ✅ Upload additional/replacement MOV files
   - ✅ Verify changes are saved (auto-save)

4. **Resubmit Assessment**
   - ✅ Click "Resubmit Assessment" button
   - ✅ Verify completeness validation runs again
   - ✅ Verify resubmission confirmation
   - ✅ Verify status changes to SUBMITTED
   - ✅ Verify rework_count incremented

5. **Verify Second Rework Not Allowed**
   - ✅ Assessor requests rework again
   - ✅ Verify system rejects second rework request
   - ✅ Verify error message: "Maximum rework cycles reached"

**Acceptance Criteria:**

- Rework comments clearly visible
- Editing process smooth and intuitive
- Resubmission successful
- Rework limit enforced (max 1 cycle)

---

### Scenario 4: Validator Governance Area Filtering

**Role:** VALIDATOR **Objective:** Validator only sees assessments from assigned governance area

#### Test Steps:

1. **Login** as VALIDATOR user (assigned to "Social Protection")
   - ✅ Verify successful login
   - ✅ Verify validator dashboard displays

2. **View Assigned Assessments Only**
   - ✅ Verify only Social Protection assessments visible
   - ✅ Attempt to access Peace & Order assessment
   - ✅ Verify 403 Forbidden error
   - ✅ Verify governance area filter applied automatically

3. **Validate Assessment**
   - ✅ Review Social Protection assessment
   - ✅ Verify compliance data visible
   - ✅ Request rework or approve
   - ✅ Verify validation recorded with validator info

**Acceptance Criteria:**

- Validators only see assigned governance areas
- Cannot access assessments outside their area
- Validation process same as assessors
- Governance area assignment enforced at API level

---

### Scenario 5: MLGOO Admin Full Access

**Role:** MLGOO_DILG **Objective:** Admin can access all assessments and manage system

#### Test Steps:

1. **Login** as MLGOO admin
   - ✅ Verify successful login
   - ✅ Verify admin dashboard with full statistics

2. **View All Assessments**
   - ✅ Access assessments from all barangays
   - ✅ Access assessments from all governance areas
   - ✅ Verify no filtering restrictions

3. **Manage Users**
   - ✅ Create new BLGU user
   - ✅ Assign barangay to BLGU user
   - ✅ Create new VALIDATOR user
   - ✅ Assign governance area to VALIDATOR
   - ✅ Deactivate user account
   - ✅ Reset user password

4. **View System Analytics**
   - ✅ Access analytics dashboard
   - ✅ View compliance statistics (PASS/FAIL rates)
   - ✅ Export reports to CSV/PDF
   - ✅ Verify data accuracy

**Acceptance Criteria:**

- Admin has unrestricted access
- User management fully functional
- Analytics accurate and exportable
- No performance issues with large datasets

---

### Scenario 6: Data Integrity and Security

**Objective:** Verify data is protected and audit trails exist

#### Test Steps:

1. **Concurrent Editing Prevention**
   - ✅ Two users attempt to edit same assessment
   - ✅ Verify optimistic locking or conflict detection
   - ✅ Verify data integrity maintained

2. **Audit Trail**
   - ✅ View assessment history
   - ✅ Verify all status changes logged
   - ✅ Verify timestamps accurate
   - ✅ Verify user attribution correct

3. **File Security**
   - ✅ BLGU A uploads file
   - ✅ BLGU B attempts to access file
   - ✅ Verify 403 Forbidden error
   - ✅ Verify RLS policies enforced

4. **Session Security**
   - ✅ Login with valid credentials
   - ✅ Verify JWT token issued
   - ✅ Let session idle for > token expiry
   - ✅ Verify automatic logout
   - ✅ Verify forced re-authentication

**Acceptance Criteria:**

- No data loss during concurrent operations
- Complete audit trail maintained
- File access properly restricted
- Session security enforced

---

## UAT Sign-off Checklist

### Functional Requirements

- [ ] BLGU assessment submission workflow works end-to-end
- [ ] Assessor review workflow complete and functional
- [ ] Rework request and resubmission process works
- [ ] Validator governance area filtering enforced
- [ ] MLGOO admin has full system access
- [ ] User management fully functional
- [ ] Dynamic form rendering works for all field types
- [ ] Conditional fields display correctly
- [ ] Form validation enforces all rules
- [ ] File upload/download works reliably
- [ ] Compliance calculation accurate
- [ ] Completeness validation accurate
- [ ] Compliance data hidden from BLGU users
- [ ] Compliance data visible to assessors/validators
- [ ] Auto-save prevents data loss
- [ ] Notification system delivers messages

### Non-Functional Requirements

- [ ] Page load times < 3 seconds
- [ ] Form interactions feel responsive (< 200ms)
- [ ] File uploads complete successfully (up to 50MB)
- [ ] System handles 100+ concurrent users
- [ ] No security vulnerabilities identified
- [ ] RBAC properly enforced
- [ ] Data encryption at rest and in transit
- [ ] Backup and recovery procedures tested
- [ ] Cross-browser compatibility (Chrome, Firefox, Edge, Safari)
- [ ] Mobile responsiveness acceptable
- [ ] Accessibility standards met (WCAG 2.1 Level A minimum)

### Business Requirements

- [ ] Meets DILG SGLGB requirements
- [ ] 3+1 scoring methodology correctly implemented
- [ ] Two-tier validation (completeness vs compliance) working
- [ ] Rework limit (1 cycle) enforced
- [ ] Governance area assignments working
- [ ] Reporting capabilities meet requirements
- [ ] Export functionality (CSV, PDF) works
- [ ] User roles aligned with organizational structure

---

## UAT Sign-off

### Stakeholder Approval

| Role                    | Name                       | Signature                  | Date         |
| ----------------------- | -------------------------- | -------------------------- | ------------ |
| DILG Project Manager    | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | **\_\_\_\_** |
| BLGU Representative     | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | **\_\_\_\_** |
| Assessor Representative | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | **\_\_\_\_** |
| Technical Lead          | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | **\_\_\_\_** |
| QA Lead                 | **\*\*\*\***\_**\*\*\*\*** | **\*\*\*\***\_**\*\*\*\*** | **\_\_\_\_** |

### UAT Result

- [ ] **PASS** - System ready for production deployment
- [ ] **PASS WITH MINOR ISSUES** - Deploy with issue tracking
- [ ] **FAIL** - Critical issues must be resolved before deployment

### Issues Log

| Issue ID | Description | Severity | Status | Resolution |
| -------- | ----------- | -------- | ------ | ---------- |
|          |             |          |        |            |
|          |             |          |        |            |
|          |             |          |        |            |

### Notes

_Additional comments, observations, or recommendations:_

---

## Post-UAT Activities

1. **Deploy to Production**
   - Schedule deployment window
   - Notify all stakeholders
   - Prepare rollback plan

2. **User Training**
   - Conduct BLGU user training
   - Conduct assessor/validator training
   - Provide user manuals and video guides

3. **Hypercare Period**
   - 2-week intensive monitoring
   - Daily issue triage
   - Rapid bug fixes
   - User support hotline

4. **Performance Monitoring**
   - Track Core Web Vitals
   - Monitor error rates
   - Analyze user feedback
   - Measure adoption rates

---

**Document Status:** Approved **Prepared By:** Development Team **Reviewed By:** QA Team **Approved
By:** Project Manager
