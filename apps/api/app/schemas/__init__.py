# 📋 Schemas Package
# Pydantic schemas for API data validation

# 📝 Schema Exports
# Central location for importing all Pydantic schemas

from .assessment import (
    MOV,
    Assessment,
    AssessmentCreate,
    AssessmentListResponse,
    AssessmentResponse,
    AssessmentResponseCreate,
    AssessmentResponseListResponse,
    AssessmentResponseUpdate,
    AssessmentResponseWithDetails,
    AssessmentSubmissionValidation,
    AssessmentUpdate,
    AssessmentWithIndicators,
    AssessmentWithResponses,
    FeedbackComment,
    FeedbackCommentCreate,
    FeedbackCommentListResponse,
    FeedbackCommentUpdate,
    FormSchemaValidation,
    GovernanceAreaWithIndicators,
    Indicator,
    IndicatorWithResponse,
    MOVCreate,
    MOVListResponse,
    MOVUpdate,
)
from .analytics import (
    AreaBreakdown,
    BarangayRanking,
    ComplianceRate,
    DashboardKPIResponse,
    FailedIndicator,
    TrendData,
)
from .assessor import (
    AssessorAnalyticsResponse,
    AssessmentDetailsResponse,
    AssessorQueueItem,
    MOVUploadResponse,
    PerformanceOverview,
    SystemicWeakness,
    ValidationRequest,
    ValidationResponse,
    WorkflowMetrics,
)
from .system import ApiResponse, ErrorResponse, HealthCheck, SuccessResponse
from .token import AuthToken, LoginRequest, Token, TokenPayload
from .user import User, UserCreate, UserInDB, UserUpdate

__all__ = [
    # Analytics schemas
    "DashboardKPIResponse",
    "ComplianceRate",
    "AreaBreakdown",
    "FailedIndicator",
    "BarangayRanking",
    "TrendData",
    # Assessment schemas
    "Assessment",
    "AssessmentCreate",
    "AssessmentUpdate",
    "AssessmentWithResponses",
    "AssessmentResponse",
    "AssessmentResponseCreate",
    "AssessmentResponseUpdate",
    "AssessmentResponseWithDetails",
    "MOV",
    "MOVCreate",
    "MOVUpdate",
    "FeedbackComment",
    "FeedbackCommentCreate",
    "FeedbackCommentUpdate",
    "Indicator",
    "IndicatorWithResponse",
    "AssessmentWithIndicators",
    "GovernanceAreaWithIndicators",
    "AssessmentListResponse",
    "AssessmentResponseListResponse",
    "MOVListResponse",
    "FeedbackCommentListResponse",
    "AssessmentSubmissionValidation",
    "FormSchemaValidation",
    # User schemas
    "User",
    "UserCreate",
    "UserUpdate",
    "UserInDB",
    # Token schemas
    "LoginRequest",
    "AuthToken",
    "Token",
    "TokenPayload",
    # System schemas
    "ApiResponse",
    "HealthCheck",
    "ErrorResponse",
    "SuccessResponse",
    # Assessor schemas
    "AssessorQueueItem",
    "AssessmentDetailsResponse",
    "ValidationRequest",
    "ValidationResponse",
    "MOVUploadResponse",
    "AssessorAnalyticsResponse",
    "PerformanceOverview",
    "SystemicWeakness",
    "WorkflowMetrics",
]
