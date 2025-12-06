/**
 * Tests for Query Key Factories
 *
 * Verifies that the queryKeys factory functions:
 * - Return correct array structures for React Query keys
 * - Maintain proper hierarchies (all -> lists -> list, etc.)
 * - Include filters and parameters correctly
 * - Work with cache invalidation patterns
 * - Provide expected query configuration presets
 */

import { describe, it, expect } from 'vitest';
import { queryKeys, queryConfigs } from '../queryKeys';

describe('queryKeys', () => {
  describe('Auth Keys', () => {
    it('should return correct auth.all key', () => {
      expect(queryKeys.auth.all).toEqual(['auth']);
    });

    it('should return correct auth.user key', () => {
      expect(queryKeys.auth.user()).toEqual(['auth', 'user']);
    });

    it('should return correct auth.session key', () => {
      expect(queryKeys.auth.session()).toEqual(['auth', 'session']);
    });
  });

  describe('Users Keys', () => {
    it('should return correct users.all key', () => {
      expect(queryKeys.users.all).toEqual(['users']);
    });

    it('should return correct users.lists key', () => {
      expect(queryKeys.users.lists()).toEqual(['users', 'list']);
    });

    it('should return correct users.list key without filters', () => {
      expect(queryKeys.users.list()).toEqual(['users', 'list', undefined]);
    });

    it('should return correct users.list key with filters', () => {
      const filters = { role: 'ASSESSOR', active: true };
      expect(queryKeys.users.list(filters)).toEqual(['users', 'list', filters]);
    });

    it('should return correct users.details key', () => {
      expect(queryKeys.users.details()).toEqual(['users', 'detail']);
    });

    it('should return correct users.detail key with id', () => {
      expect(queryKeys.users.detail(123)).toEqual(['users', 'detail', 123]);
    });
  });

  describe('Assessments Keys', () => {
    it('should return correct assessments.all key', () => {
      expect(queryKeys.assessments.all).toEqual(['assessments']);
    });

    it('should return correct assessments.lists key', () => {
      expect(queryKeys.assessments.lists()).toEqual(['assessments', 'list']);
    });

    it('should return correct assessments.list key with filters', () => {
      const filters = { status: 'SUBMITTED', barangay_id: 5 };
      expect(queryKeys.assessments.list(filters)).toEqual(['assessments', 'list', filters]);
    });

    it('should return correct assessments.detail key', () => {
      expect(queryKeys.assessments.detail(456)).toEqual(['assessments', 'detail', 456]);
    });

    it('should return correct assessments.responses key', () => {
      expect(queryKeys.assessments.responses(456)).toEqual([
        'assessments',
        'detail',
        456,
        'responses',
      ]);
    });

    it('should return correct assessments.movs key', () => {
      expect(queryKeys.assessments.movs(456)).toEqual(['assessments', 'detail', 456, 'movs']);
    });

    it('should return correct assessments.annotations key', () => {
      expect(queryKeys.assessments.annotations(456)).toEqual([
        'assessments',
        'detail',
        456,
        'annotations',
      ]);
    });
  });

  describe('Dashboard Keys', () => {
    it('should return correct dashboard.all key', () => {
      expect(queryKeys.dashboard.all).toEqual(['dashboard']);
    });

    it('should return correct dashboard.blgu key without lang', () => {
      expect(queryKeys.dashboard.blgu(100)).toEqual(['dashboard', 'blgu', 100, undefined]);
    });

    it('should return correct dashboard.blgu key with lang', () => {
      expect(queryKeys.dashboard.blgu(100, 'en')).toEqual(['dashboard', 'blgu', 100, 'en']);
    });

    it('should return correct dashboard.assessor key', () => {
      expect(queryKeys.dashboard.assessor(10)).toEqual(['dashboard', 'assessor', 10]);
    });

    it('should return correct dashboard.validator key', () => {
      expect(queryKeys.dashboard.validator(20)).toEqual(['dashboard', 'validator', 20]);
    });

    it('should return correct dashboard.mlgoo key', () => {
      expect(queryKeys.dashboard.mlgoo()).toEqual(['dashboard', 'mlgoo']);
    });

    it('should return correct dashboard.katuparan key', () => {
      expect(queryKeys.dashboard.katuparan()).toEqual(['dashboard', 'katuparan']);
    });
  });

  describe('Governance Areas Keys', () => {
    it('should return correct governanceAreas.all key', () => {
      expect(queryKeys.governanceAreas.all).toEqual(['governance-areas']);
    });

    it('should return correct governanceAreas.detail key', () => {
      expect(queryKeys.governanceAreas.detail(3)).toEqual(['governance-areas', 'detail', 3]);
    });

    it('should return correct governanceAreas.indicators key', () => {
      expect(queryKeys.governanceAreas.indicators(3)).toEqual([
        'governance-areas',
        'detail',
        3,
        'indicators',
      ]);
    });
  });

  describe('Indicators Keys', () => {
    it('should return correct indicators.all key', () => {
      expect(queryKeys.indicators.all).toEqual(['indicators']);
    });

    it('should return correct indicators.list key with filters', () => {
      const filters = { governance_area_id: 2 };
      expect(queryKeys.indicators.list(filters)).toEqual(['indicators', 'list', filters]);
    });

    it('should return correct indicators.detail key', () => {
      expect(queryKeys.indicators.detail(50)).toEqual(['indicators', 'detail', 50]);
    });

    it('should return correct indicators.drafts key', () => {
      expect(queryKeys.indicators.drafts()).toEqual(['indicators', 'drafts']);
    });

    it('should return correct indicators.draft key', () => {
      expect(queryKeys.indicators.draft(15)).toEqual(['indicators', 'drafts', 15]);
    });
  });

  describe('BBIs Keys', () => {
    it('should return correct bbis.all key', () => {
      expect(queryKeys.bbis.all).toEqual(['bbis']);
    });

    it('should return correct bbis.detail key', () => {
      expect(queryKeys.bbis.detail(7)).toEqual(['bbis', 'detail', 7]);
    });

    it('should return correct bbis.results key', () => {
      expect(queryKeys.bbis.results(100)).toEqual(['bbis', 'results', 100]);
    });
  });

  describe('MOVs Keys', () => {
    it('should return correct movs.all key', () => {
      expect(queryKeys.movs.all).toEqual(['movs']);
    });

    it('should return correct movs.detail key', () => {
      expect(queryKeys.movs.detail(88)).toEqual(['movs', 'detail', 88]);
    });

    it('should return correct movs.files key', () => {
      expect(queryKeys.movs.files(88)).toEqual(['movs', 'detail', 88, 'files']);
    });

    it('should return correct movs.annotations key', () => {
      expect(queryKeys.movs.annotations(99)).toEqual(['movs', 'annotations', 99]);
    });
  });

  describe('Submissions Keys', () => {
    it('should return correct submissions.all key', () => {
      expect(queryKeys.submissions.all).toEqual(['submissions']);
    });

    it('should return correct submissions.queue key', () => {
      const filters = { governance_area_id: 1 };
      expect(queryKeys.submissions.queue('assessor', filters)).toEqual([
        'submissions',
        'queue',
        'assessor',
        filters,
      ]);
    });

    it('should return correct submissions.assessor key', () => {
      const filters = { status: 'PENDING' };
      expect(queryKeys.submissions.assessor(filters)).toEqual([
        'submissions',
        'queue',
        'assessor',
        filters,
      ]);
    });

    it('should return correct submissions.validator key', () => {
      expect(queryKeys.submissions.validator()).toEqual([
        'submissions',
        'queue',
        'validator',
        undefined,
      ]);
    });

    it('should return correct submissions.mlgoo key', () => {
      expect(queryKeys.submissions.mlgoo()).toEqual([
        'submissions',
        'queue',
        'mlgoo',
        undefined,
      ]);
    });
  });

  describe('Analytics Keys', () => {
    it('should return correct analytics.all key', () => {
      expect(queryKeys.analytics.all).toEqual(['analytics']);
    });

    it('should return correct analytics.municipal key', () => {
      expect(queryKeys.analytics.municipal()).toEqual(['analytics', 'municipal']);
    });

    it('should return correct analytics.governanceArea key', () => {
      expect(queryKeys.analytics.governanceArea(2)).toEqual([
        'analytics',
        'governance-area',
        2,
      ]);
    });

    it('should return correct analytics.trends key with filters', () => {
      const filters = { year: 2024, quarter: 1 };
      expect(queryKeys.analytics.trends(filters)).toEqual(['analytics', 'trends', filters]);
    });

    it('should return correct analytics.external key', () => {
      expect(queryKeys.analytics.external()).toEqual(['analytics', 'external']);
    });

    it('should return correct analytics.externalDashboard key', () => {
      expect(queryKeys.analytics.externalDashboard()).toEqual([
        'analytics',
        'external',
        'dashboard',
      ]);
    });
  });

  describe('Cycles Keys', () => {
    it('should return correct cycles.all key', () => {
      expect(queryKeys.cycles.all).toEqual(['cycles']);
    });

    it('should return correct cycles.detail key', () => {
      expect(queryKeys.cycles.detail(5)).toEqual(['cycles', 'detail', 5]);
    });

    it('should return correct cycles.active key', () => {
      expect(queryKeys.cycles.active()).toEqual(['cycles', 'active']);
    });
  });

  describe('Barangays Keys', () => {
    it('should return correct barangays.all key', () => {
      expect(queryKeys.barangays.all).toEqual(['barangays']);
    });

    it('should return correct barangays.list key with filters', () => {
      const filters = { municipality: 'Taguig' };
      expect(queryKeys.barangays.list(filters)).toEqual(['barangays', 'list', filters]);
    });

    it('should return correct barangays.detail key', () => {
      expect(queryKeys.barangays.detail(30)).toEqual(['barangays', 'detail', 30]);
    });
  });

  describe('Lookups Keys', () => {
    it('should return correct lookups.all key', () => {
      expect(queryKeys.lookups.all).toEqual(['lookups']);
    });

    it('should return correct lookups.barangays key', () => {
      expect(queryKeys.lookups.barangays()).toEqual(['lookups', 'barangays']);
    });

    it('should return correct lookups.governanceAreas key', () => {
      expect(queryKeys.lookups.governanceAreas()).toEqual(['lookups', 'governance-areas']);
    });

    it('should return correct lookups.roles key', () => {
      expect(queryKeys.lookups.roles()).toEqual(['lookups', 'roles']);
    });

    it('should return correct lookups.statuses key', () => {
      expect(queryKeys.lookups.statuses()).toEqual(['lookups', 'statuses']);
    });
  });

  describe('Notifications Keys', () => {
    it('should return correct notifications.all key', () => {
      expect(queryKeys.notifications.all).toEqual(['notifications']);
    });

    it('should return correct notifications.lists key', () => {
      expect(queryKeys.notifications.lists()).toEqual(['notifications', 'list']);
    });

    it('should return correct notifications.unread key', () => {
      expect(queryKeys.notifications.unread()).toEqual(['notifications', 'unread']);
    });

    it('should return correct notifications.count key', () => {
      expect(queryKeys.notifications.count()).toEqual(['notifications', 'count']);
    });
  });

  describe('Audit Logs Keys', () => {
    it('should return correct auditLogs.all key', () => {
      expect(queryKeys.auditLogs.all).toEqual(['audit-logs']);
    });

    it('should return correct auditLogs.lists key', () => {
      expect(queryKeys.auditLogs.lists()).toEqual(['audit-logs', 'list']);
    });

    it('should return correct auditLogs.list key with filters', () => {
      const filters = { user_id: 10, action: 'CREATE' };
      expect(queryKeys.auditLogs.list(filters)).toEqual(['audit-logs', 'list', filters]);
    });
  });

  describe('Cache Invalidation Patterns', () => {
    it('should allow invalidating all assessments', () => {
      const key = queryKeys.assessments.all;
      expect(key).toEqual(['assessments']);
    });

    it('should allow invalidating all assessment lists', () => {
      const key = queryKeys.assessments.lists();
      expect(key).toEqual(['assessments', 'list']);
    });

    it('should allow invalidating specific assessment detail', () => {
      const key = queryKeys.assessments.detail(100);
      expect(key).toEqual(['assessments', 'detail', 100]);
    });

    it('should support hierarchical invalidation', () => {
      // Invalidating assessments.all should also invalidate detail(100)
      const allKey = queryKeys.assessments.all;
      const detailKey = queryKeys.assessments.detail(100);

      // Check that detailKey starts with allKey
      expect(detailKey.slice(0, allKey.length)).toEqual(allKey);
    });
  });
});

describe('queryConfigs', () => {
  describe('Realtime Config', () => {
    it('should have correct staleTime for realtime data', () => {
      expect(queryConfigs.realtime.staleTime).toBe(30 * 1000); // 30 seconds
    });

    it('should have correct gcTime for realtime data', () => {
      expect(queryConfigs.realtime.gcTime).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should enable refetchOnWindowFocus for realtime data', () => {
      expect(queryConfigs.realtime.refetchOnWindowFocus).toBe(true);
    });

    it('should enable refetchOnReconnect for realtime data', () => {
      expect(queryConfigs.realtime.refetchOnReconnect).toBe(true);
    });
  });

  describe('Standard Config', () => {
    it('should have correct staleTime for standard data', () => {
      expect(queryConfigs.standard.staleTime).toBe(2 * 60 * 1000); // 2 minutes
    });

    it('should have correct gcTime for standard data', () => {
      expect(queryConfigs.standard.gcTime).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should enable refetchOnWindowFocus for standard data', () => {
      expect(queryConfigs.standard.refetchOnWindowFocus).toBe(true);
    });

    it('should enable refetchOnReconnect for standard data', () => {
      expect(queryConfigs.standard.refetchOnReconnect).toBe(true);
    });
  });

  describe('Slow Config', () => {
    it('should have correct staleTime for slow-changing data', () => {
      expect(queryConfigs.slow.staleTime).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should have correct gcTime for slow-changing data', () => {
      expect(queryConfigs.slow.gcTime).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should disable refetchOnWindowFocus for slow-changing data', () => {
      expect(queryConfigs.slow.refetchOnWindowFocus).toBe(false);
    });
  });

  describe('Static Config', () => {
    it('should have infinite staleTime for static data', () => {
      expect(queryConfigs.static.staleTime).toBe(Infinity);
    });

    it('should have infinite gcTime for static data', () => {
      expect(queryConfigs.static.gcTime).toBe(Infinity);
    });

    it('should disable refetchOnWindowFocus for static data', () => {
      expect(queryConfigs.static.refetchOnWindowFocus).toBe(false);
    });

    it('should disable refetchOnReconnect for static data', () => {
      expect(queryConfigs.static.refetchOnReconnect).toBe(false);
    });
  });

  describe('Config Comparison', () => {
    it('should have realtime config more aggressive than standard', () => {
      expect(queryConfigs.realtime.staleTime).toBeLessThan(
        queryConfigs.standard.staleTime
      );
      expect(queryConfigs.realtime.gcTime).toBeLessThan(queryConfigs.standard.gcTime);
    });

    it('should have standard config more aggressive than slow', () => {
      expect(queryConfigs.standard.staleTime).toBeLessThan(queryConfigs.slow.staleTime);
      expect(queryConfigs.standard.gcTime).toBeLessThan(queryConfigs.slow.gcTime);
    });

    it('should have slow config more aggressive than static', () => {
      expect(queryConfigs.slow.staleTime).toBeLessThan(queryConfigs.static.staleTime);
    });
  });
});
