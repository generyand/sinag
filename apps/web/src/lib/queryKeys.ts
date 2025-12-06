/**
 * Query Key Factories
 *
 * Centralized query key management for React Query cache operations.
 * Using factory functions prevents typos and enables type-safe cache invalidation.
 *
 * @example
 * // Using in a hook
 * const { data } = useQuery({
 *   queryKey: queryKeys.assessments.detail(assessmentId),
 *   queryFn: () => fetchAssessment(assessmentId),
 * });
 *
 * // Invalidating cache
 * queryClient.invalidateQueries({
 *   queryKey: queryKeys.assessments.lists()
 * });
 */

export const queryKeys = {
  // Auth & User
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
  },

  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.users.details(), id] as const,
  },

  // Assessments
  assessments: {
    all: ['assessments'] as const,
    lists: () => [...queryKeys.assessments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.assessments.lists(), filters] as const,
    details: () => [...queryKeys.assessments.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.assessments.details(), id] as const,
    responses: (assessmentId: number) =>
      [...queryKeys.assessments.detail(assessmentId), 'responses'] as const,
    movs: (assessmentId: number) =>
      [...queryKeys.assessments.detail(assessmentId), 'movs'] as const,
    annotations: (assessmentId: number) =>
      [...queryKeys.assessments.detail(assessmentId), 'annotations'] as const,
  },

  // Dashboard data
  dashboard: {
    all: ['dashboard'] as const,
    blgu: (assessmentId: number, lang?: string) =>
      [...queryKeys.dashboard.all, 'blgu', assessmentId, lang] as const,
    assessor: (userId?: number) =>
      [...queryKeys.dashboard.all, 'assessor', userId] as const,
    validator: (userId?: number) =>
      [...queryKeys.dashboard.all, 'validator', userId] as const,
    mlgoo: () => [...queryKeys.dashboard.all, 'mlgoo'] as const,
    katuparan: () => [...queryKeys.dashboard.all, 'katuparan'] as const,
  },

  // Governance Areas & Indicators
  governanceAreas: {
    all: ['governance-areas'] as const,
    lists: () => [...queryKeys.governanceAreas.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.governanceAreas.lists(), filters] as const,
    details: () => [...queryKeys.governanceAreas.all, 'detail'] as const,
    detail: (id: number) =>
      [...queryKeys.governanceAreas.details(), id] as const,
    indicators: (areaId: number) =>
      [...queryKeys.governanceAreas.detail(areaId), 'indicators'] as const,
  },

  indicators: {
    all: ['indicators'] as const,
    lists: () => [...queryKeys.indicators.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.indicators.lists(), filters] as const,
    details: () => [...queryKeys.indicators.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.indicators.details(), id] as const,
    drafts: () => [...queryKeys.indicators.all, 'drafts'] as const,
    draft: (id: number) => [...queryKeys.indicators.drafts(), id] as const,
  },

  // BBIs
  bbis: {
    all: ['bbis'] as const,
    lists: () => [...queryKeys.bbis.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.bbis.lists(), filters] as const,
    details: () => [...queryKeys.bbis.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.bbis.details(), id] as const,
    results: (assessmentId: number) =>
      [...queryKeys.bbis.all, 'results', assessmentId] as const,
  },

  // MOVs (Means of Verification)
  movs: {
    all: ['movs'] as const,
    lists: () => [...queryKeys.movs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.movs.lists(), filters] as const,
    details: () => [...queryKeys.movs.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.movs.details(), id] as const,
    files: (movId: number) => [...queryKeys.movs.detail(movId), 'files'] as const,
    annotations: (fileId: number) =>
      [...queryKeys.movs.all, 'annotations', fileId] as const,
  },

  // Submissions Queue
  submissions: {
    all: ['submissions'] as const,
    queue: (role: string, filters?: Record<string, unknown>) =>
      [...queryKeys.submissions.all, 'queue', role, filters] as const,
    assessor: (filters?: Record<string, unknown>) =>
      queryKeys.submissions.queue('assessor', filters),
    validator: (filters?: Record<string, unknown>) =>
      queryKeys.submissions.queue('validator', filters),
    mlgoo: (filters?: Record<string, unknown>) =>
      queryKeys.submissions.queue('mlgoo', filters),
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    municipal: () => [...queryKeys.analytics.all, 'municipal'] as const,
    governanceArea: (areaId: number) =>
      [...queryKeys.analytics.all, 'governance-area', areaId] as const,
    trends: (filters?: Record<string, unknown>) =>
      [...queryKeys.analytics.all, 'trends', filters] as const,
    external: () => [...queryKeys.analytics.all, 'external'] as const,
    externalDashboard: () =>
      [...queryKeys.analytics.external(), 'dashboard'] as const,
  },

  // Assessment Cycles
  cycles: {
    all: ['cycles'] as const,
    lists: () => [...queryKeys.cycles.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.cycles.lists(), filters] as const,
    details: () => [...queryKeys.cycles.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.cycles.details(), id] as const,
    active: () => [...queryKeys.cycles.all, 'active'] as const,
  },

  // Barangays
  barangays: {
    all: ['barangays'] as const,
    lists: () => [...queryKeys.barangays.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.barangays.lists(), filters] as const,
    details: () => [...queryKeys.barangays.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.barangays.details(), id] as const,
  },

  // Lookups (static data - can be cached indefinitely)
  lookups: {
    all: ['lookups'] as const,
    barangays: () => [...queryKeys.lookups.all, 'barangays'] as const,
    governanceAreas: () =>
      [...queryKeys.lookups.all, 'governance-areas'] as const,
    roles: () => [...queryKeys.lookups.all, 'roles'] as const,
    statuses: () => [...queryKeys.lookups.all, 'statuses'] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
    count: () => [...queryKeys.notifications.all, 'count'] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['audit-logs'] as const,
    lists: () => [...queryKeys.auditLogs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.auditLogs.lists(), filters] as const,
  },
} as const;

/**
 * Query configuration presets for different data freshness requirements
 */
export const queryConfigs = {
  /**
   * For data that changes frequently (dashboard, submissions)
   * Stale after 30 seconds, refetch on window focus
   */
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /**
   * For data that changes moderately (user profile, assessment details)
   * Stale after 2 minutes
   */
  standard: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  },

  /**
   * For data that changes infrequently (governance areas, indicators)
   * Stale after 10 minutes
   */
  slow: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  },

  /**
   * For static/lookup data (roles, statuses, barangay list)
   * Never goes stale during session
   */
  static: {
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
} as const;

export type QueryKeys = typeof queryKeys;
export type QueryConfigs = typeof queryConfigs;
