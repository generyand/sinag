# 🎯 Database Enums
# Python enums for database fields to improve type safety and code readability

import enum


class UserRole(str, enum.Enum):
    """
    Enum for user roles.

    Using a string-based enum improves readability and maintainability.

    Roles:
    - MLGOO_DILG: Admin/Chairman role with system-wide access (enum value 0 in DB)
    - ASSESSOR: Assessor role with arbitrary barangay selection (enum value 1 in DB)
    - VALIDATOR: Validator role with governance area specialization (enum value 2 in DB)
    - BLGU_USER: BLGU user role with specific barangay assignment (enum value 3 in DB)
    - KATUPARAN_CENTER_USER: External user from Katuparan Center with read-only access to aggregated data for research purposes (enum value 4 in DB)
    """

    MLGOO_DILG = "MLGOO_DILG"
    ASSESSOR = "ASSESSOR"
    VALIDATOR = "VALIDATOR"
    BLGU_USER = "BLGU_USER"
    KATUPARAN_CENTER_USER = "KATUPARAN_CENTER_USER"


class AreaType(str, enum.Enum):
    """
    Enum for the type of governance area (Core or Essential).
    """

    CORE = "Core"
    ESSENTIAL = "Essential"


class AssessmentStatus(str, enum.Enum):
    """
    Enum for assessment status throughout the workflow.

    New workflow states (Epic 5.0):
    - DRAFT: Initial state, assessment is being worked on by BLGU
    - SUBMITTED: BLGU has submitted, assessment is locked for editing
    - IN_REVIEW: Assessor is actively reviewing the submission
    - REWORK: Assessor has requested changes, assessment is unlocked for BLGU
    - AWAITING_FINAL_VALIDATION: Assessor completed review, awaiting validator final validation
    - COMPLETED: Final validation complete, assessment is finalized

    Legacy states (preserved for backward compatibility):
    - SUBMITTED_FOR_REVIEW: Old submission state (maps to SUBMITTED)
    - VALIDATED: Old validation state (maps to COMPLETED)
    - NEEDS_REWORK: Old rework state (maps to REWORK)
    """

    # New workflow states (Epic 5.0)
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    IN_REVIEW = "IN_REVIEW"
    REWORK = "REWORK"
    AWAITING_FINAL_VALIDATION = "AWAITING_FINAL_VALIDATION"
    AWAITING_MLGOO_APPROVAL = "AWAITING_MLGOO_APPROVAL"  # NEW: After validators finalize, awaits MLGOO final approval
    COMPLETED = "COMPLETED"

    # Legacy states (backward compatibility)
    SUBMITTED_FOR_REVIEW = "SUBMITTED_FOR_REVIEW"
    VALIDATED = "VALIDATED"
    NEEDS_REWORK = "NEEDS_REWORK"


class MOVStatus(str, enum.Enum):
    """
    Enum for MOV (Means of Verification) file status.
    """

    PENDING = "Pending"
    UPLOADED = "Uploaded"
    DELETED = "Deleted"


class ValidationStatus(str, enum.Enum):
    """
    Enum for individual assessment response validation status.
    """

    PASS = "Pass"
    FAIL = "Fail"
    CONDITIONAL = "Conditional"


class ComplianceStatus(str, enum.Enum):
    """
    Enum for final SGLGB compliance status of an assessment.
    """

    PASSED = "Passed"
    FAILED = "Failed"


class RuleType(str, enum.Enum):
    """
    Enum for calculation rule types in indicator calculation schemas.

    These rule types define how indicator Pass/Fail status is automatically determined:
    - AND_ALL: All conditions must be true
    - OR_ANY: At least one condition must be true
    - PERCENTAGE_THRESHOLD: A numeric field must meet or exceed a percentage threshold
    - COUNT_THRESHOLD: Count of selected items must meet or exceed a threshold
    - MATCH_VALUE: A field must exactly match a specific value
    - BBI_FUNCTIONALITY_CHECK: Check if a BBI is Functional or Non-Functional
    """

    AND_ALL = "AND_ALL"
    OR_ANY = "OR_ANY"
    PERCENTAGE_THRESHOLD = "PERCENTAGE_THRESHOLD"
    COUNT_THRESHOLD = "COUNT_THRESHOLD"
    MATCH_VALUE = "MATCH_VALUE"
    BBI_FUNCTIONALITY_CHECK = "BBI_FUNCTIONALITY_CHECK"


class BBIStatus(str, enum.Enum):
    """
    Enum for BBI (Barangay-based Institutions) functionality status.

    Per DILG MC 2024-417, BBI functionality is determined by compliance rate:
    - HIGHLY_FUNCTIONAL: 75% - 100% compliance rate
    - MODERATELY_FUNCTIONAL: 50% - 74% compliance rate
    - LOW_FUNCTIONAL: Below 50% compliance rate

    Compliance rate is calculated as:
    (Passed Sub-Indicators / Total Sub-Indicators) × 100%

    Legacy values (kept for backward compatibility):
    - FUNCTIONAL: Maps to HIGHLY_FUNCTIONAL
    - NON_FUNCTIONAL: Maps to LOW_FUNCTIONAL
    """

    # New 3-tier rating system (DILG MC 2024-417)
    HIGHLY_FUNCTIONAL = "HIGHLY_FUNCTIONAL"
    MODERATELY_FUNCTIONAL = "MODERATELY_FUNCTIONAL"
    LOW_FUNCTIONAL = "LOW_FUNCTIONAL"

    # Legacy values (backward compatibility)
    FUNCTIONAL = "FUNCTIONAL"
    NON_FUNCTIONAL = "NON_FUNCTIONAL"


class NotificationType(str, enum.Enum):
    """
    Enum for notification types in the assessment workflow.

    Notification types:
    - NEW_SUBMISSION: BLGU submits assessment -> All Assessors notified
    - REWORK_REQUESTED: Assessor requests rework -> BLGU notified
    - REWORK_RESUBMITTED: BLGU resubmits after rework -> All Assessors notified
    - READY_FOR_VALIDATION: Assessor finalizes -> Validator(s) notified
    - CALIBRATION_REQUESTED: Validator requests calibration -> BLGU notified
    - CALIBRATION_RESUBMITTED: BLGU resubmits calibration -> Same Validator notified
    - VALIDATION_COMPLETED: Validator completes validation -> MLGOO and BLGU notified
    - READY_FOR_MLGOO_APPROVAL: All validators done -> MLGOO notified for final approval
    - MLGOO_RECALIBRATION_REQUESTED: MLGOO requests RE-calibration -> BLGU notified
    - ASSESSMENT_APPROVED: MLGOO approves assessment -> BLGU notified
    - DEADLINE_EXPIRED_LOCKED: Grace period expired -> BLGU locked, MLGOO notified
    - GRACE_PERIOD_WARNING: Grace period expiring soon -> BLGU warned
    """

    NEW_SUBMISSION = "NEW_SUBMISSION"
    REWORK_REQUESTED = "REWORK_REQUESTED"
    REWORK_RESUBMITTED = "REWORK_RESUBMITTED"
    READY_FOR_VALIDATION = "READY_FOR_VALIDATION"
    CALIBRATION_REQUESTED = "CALIBRATION_REQUESTED"
    CALIBRATION_RESUBMITTED = "CALIBRATION_RESUBMITTED"
    VALIDATION_COMPLETED = "VALIDATION_COMPLETED"
    # NEW: MLGOO Final Approval Workflow
    READY_FOR_MLGOO_APPROVAL = "READY_FOR_MLGOO_APPROVAL"
    MLGOO_RECALIBRATION_REQUESTED = "MLGOO_RECALIBRATION_REQUESTED"
    ASSESSMENT_APPROVED = "ASSESSMENT_APPROVED"
    DEADLINE_EXPIRED_LOCKED = "DEADLINE_EXPIRED_LOCKED"
    GRACE_PERIOD_WARNING = "GRACE_PERIOD_WARNING"
