// 🎯 Custom Hooks - Reusable state logic and data management

// Theme hooks
export { useThemeToggle } from './useThemeToggle';

// User management hooks
export { useUsers } from './useUsers';

// Assessment hooks
export {
    useAssessmentValidation, useCurrentAssessment, useDeleteMOV, useGovernanceArea, useIndicator, useSubmitAssessment, useUpdateIndicatorAnswer,
    useUploadMOV
} from './useAssessment';
export { useIndicatorNavigation } from './useIndicatorNavigation';

// Intelligence hooks
export { useIntelligence } from './useIntelligence';

// Submissions hooks
export { useSubmissions } from './useSubmissions';

// Analytics hooks
export {
    useBarangays as useAnalyticsBarangays, useCrossMatching, useOfficialPerformance, useSystemicWeakness
} from './useAnalytics';

// Dashboard hooks
export { useAdminDashboard } from './useAdminDashboard';
export { useDashboard } from './useDashboard';

// Lookup data hooks
export { useAssessorGovernanceArea } from './useAssessorGovernanceArea';
export { useBarangays } from './useBarangays';
export { useGovernanceAreas } from './useGovernanceAreas';
export { useUserBarangay } from './useUserBarangay';

// System settings hooks
export { useSystemSettings } from './useSystemSettings';

// Notification hooks
export { useNotifications, useNotificationCount } from './useNotifications';
