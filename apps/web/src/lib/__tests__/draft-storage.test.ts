import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IndicatorDraftStorage,
  isLocalStorageAvailable,
  formatBytes,
  timeAgo,
} from '../draft-storage';
import type { IndicatorTreeState } from '@/store/useIndicatorBuilderStore';

describe('draft-storage', () => {
  let storage: IndicatorDraftStorage;

  // Helper function to create a test tree state
  const createTestTree = (nodeCount: number = 2): IndicatorTreeState => {
    const nodes = new Map();

    for (let i = 0; i < nodeCount; i++) {
      nodes.set(`node-${i}`, {
        temp_id: `node-${i}`,
        parent_temp_id: null,
        order: i,
        name: `Test Node ${i}`,
        is_active: true,
        is_auto_calculable: false,
        is_profiling_only: false,
      });
    }

    return {
      nodes,
      rootIds: Array.from({ length: nodeCount }, (_, i) => `node-${i}`),
      governanceAreaId: 1,
      creationMode: 'incremental',
      currentStep: 1,
    };
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new IndicatorDraftStorage();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('IndicatorDraftStorage', () => {
    describe('saveDraft', () => {
      it('should save a draft to localStorage', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Test Draft' });

        expect(draftId).toBeDefined();
        expect(typeof draftId).toBe('string');
      });

      it('should return the same ID for existing draft', () => {
        const tree = createTestTree();
        const draftId1 = storage.saveDraft(tree, { title: 'Test Draft' });

        tree.draftId = draftId1;
        const draftId2 = storage.saveDraft(tree, { title: 'Test Draft Updated' });

        expect(draftId2).toBe(draftId1);
      });

      it('should update metadata index', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Test Draft' });

        const drafts = storage.listDrafts();
        expect(drafts).toHaveLength(1);
        expect(drafts[0].id).toBe(draftId);
        expect(drafts[0].title).toBe('Test Draft');
      });

      it('should include node count in metadata', () => {
        const tree = createTestTree(5);
        storage.saveDraft(tree, { title: 'Five Nodes' });

        const drafts = storage.listDrafts();
        expect(drafts[0].nodeCount).toBe(5);
      });

      it('should throw error if draft exceeds size limit', () => {
        // Create a very large tree
        const tree = createTestTree(1);
        // Add large data to exceed 5MB limit
        tree.nodes.get('node-0')!.description = 'x'.repeat(6 * 1024 * 1024); // 6MB

        expect(() => {
          storage.saveDraft(tree, { title: 'Too Large' });
        }).toThrow(/exceeds maximum/);
      });

      it('should use default title if not provided', () => {
        const tree = createTestTree();
        storage.saveDraft(tree);

        const drafts = storage.listDrafts();
        expect(drafts[0].title).toBe('Untitled Draft');
      });
    });

    describe('loadDraft', () => {
      it('should load a saved draft', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Test Draft' });

        const loaded = storage.loadDraft(draftId);

        expect(loaded).not.toBeNull();
        expect(loaded?.governanceAreaId).toBe(1);
        expect(loaded?.nodes.size).toBe(2);
      });

      it('should return null for non-existent draft', () => {
        const loaded = storage.loadDraft('nonexistent');

        expect(loaded).toBeNull();
      });

      it('should deserialize nodes Map correctly', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree);

        const loaded = storage.loadDraft(draftId);

        expect(loaded?.nodes instanceof Map).toBe(true);
        expect(loaded?.nodes.has('node-0')).toBe(true);
        expect(loaded?.nodes.get('node-0')?.name).toBe('Test Node 0');
      });

      it('should handle corrupted data gracefully', () => {
        // Manually corrupt data in localStorage
        localStorage.setItem('sinag_indicator_draft_test', 'corrupted{json');

        const loaded = storage.loadDraft('test');

        expect(loaded).toBeNull();
      });
    });

    describe('listDrafts', () => {
      it('should return empty array when no drafts exist', () => {
        const drafts = storage.listDrafts();

        expect(drafts).toEqual([]);
      });

      it('should list all saved drafts', () => {
        storage.saveDraft(createTestTree(), { title: 'Draft 1' });
        storage.saveDraft(createTestTree(), { title: 'Draft 2' });
        storage.saveDraft(createTestTree(), { title: 'Draft 3' });

        const drafts = storage.listDrafts();

        expect(drafts).toHaveLength(3);
      });

      it('should sort drafts by last modified (most recent first)', () => {
        const tree1 = createTestTree();
        const draftId1 = storage.saveDraft(tree1, { title: 'First' });

        // Wait a bit to ensure different timestamps
        const now = Date.now();
        vi.spyOn(Date, 'now').mockReturnValue(now + 1000);

        const tree2 = createTestTree();
        const draftId2 = storage.saveDraft(tree2, { title: 'Second' });

        const drafts = storage.listDrafts();

        expect(drafts[0].id).toBe(draftId2); // Most recent first
        expect(drafts[1].id).toBe(draftId1);

        vi.restoreAllMocks();
      });

      it('should handle corrupted index gracefully', () => {
        // Manually corrupt index
        localStorage.setItem('sinag_draft_metadata_index', 'corrupted{json');

        const drafts = storage.listDrafts();

        expect(drafts).toEqual([]);
      });
    });

    describe('deleteDraft', () => {
      it('should delete a draft from localStorage', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'To Delete' });

        expect(storage.hasDraft(draftId)).toBe(true);

        storage.deleteDraft(draftId);

        expect(storage.hasDraft(draftId)).toBe(false);
      });

      it('should remove draft from metadata index', () => {
        const draftId = storage.saveDraft(createTestTree(), { title: 'To Delete' });
        storage.saveDraft(createTestTree(), { title: 'To Keep' });

        expect(storage.listDrafts()).toHaveLength(2);

        storage.deleteDraft(draftId);

        const drafts = storage.listDrafts();
        expect(drafts).toHaveLength(1);
        expect(drafts[0].title).toBe('To Keep');
      });

      it('should handle deleting non-existent draft gracefully', () => {
        expect(() => {
          storage.deleteDraft('nonexistent');
        }).not.toThrow();
      });
    });

    describe('getDraftMetadata', () => {
      it('should return metadata for existing draft', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Test Draft' });

        const metadata = storage.getDraftMetadata(draftId);

        expect(metadata).not.toBeNull();
        expect(metadata?.id).toBe(draftId);
        expect(metadata?.title).toBe('Test Draft');
        expect(metadata?.nodeCount).toBe(2);
      });

      it('should return null for non-existent draft', () => {
        const metadata = storage.getDraftMetadata('nonexistent');

        expect(metadata).toBeNull();
      });
    });

    describe('updateDraftMetadata', () => {
      it('should update draft metadata', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Original Title' });

        storage.updateDraftMetadata(draftId, { title: 'Updated Title' });

        const metadata = storage.getDraftMetadata(draftId);
        expect(metadata?.title).toBe('Updated Title');
      });

      it('should preserve other metadata fields', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree, { title: 'Original' });

        const originalMetadata = storage.getDraftMetadata(draftId);

        storage.updateDraftMetadata(draftId, { title: 'Updated' });

        const updatedMetadata = storage.getDraftMetadata(draftId);
        expect(updatedMetadata?.nodeCount).toBe(originalMetadata?.nodeCount);
        expect(updatedMetadata?.governanceAreaId).toBe(originalMetadata?.governanceAreaId);
      });

      it('should handle updating non-existent draft gracefully', () => {
        expect(() => {
          storage.updateDraftMetadata('nonexistent', { title: 'Updated' });
        }).not.toThrow();
      });
    });

    describe('getStorageStats', () => {
      it('should return correct stats for empty storage', () => {
        const stats = storage.getStorageStats();

        expect(stats.draftCount).toBe(0);
        expect(stats.totalSize).toBe(0);
        expect(stats.usagePercent).toBe(0);
        expect(stats.availableSize).toBe(stats.quota);
      });

      it('should calculate total size correctly', () => {
        storage.saveDraft(createTestTree(2), { title: 'Draft 1' });
        storage.saveDraft(createTestTree(3), { title: 'Draft 2' });

        const stats = storage.getStorageStats();

        expect(stats.draftCount).toBe(2);
        expect(stats.totalSize).toBeGreaterThan(0);
        expect(stats.availableSize).toBe(stats.quota - stats.totalSize);
      });

      it('should calculate usage percentage correctly', () => {
        storage.saveDraft(createTestTree(5), { title: 'Draft' });

        const stats = storage.getStorageStats();
        const expectedPercent = (stats.totalSize / stats.quota) * 100;

        expect(stats.usagePercent).toBeCloseTo(expectedPercent, 2);
      });

      it('should cap usage percentage at 100', () => {
        const stats = storage.getStorageStats();

        // Even if calculation exceeds 100, should be capped
        expect(stats.usagePercent).toBeLessThanOrEqual(100);
      });
    });

    describe('clearAllDrafts', () => {
      it('should remove all drafts from localStorage', () => {
        storage.saveDraft(createTestTree(), { title: 'Draft 1' });
        storage.saveDraft(createTestTree(), { title: 'Draft 2' });
        storage.saveDraft(createTestTree(), { title: 'Draft 3' });

        expect(storage.getDraftCount()).toBe(3);

        storage.clearAllDrafts();

        expect(storage.getDraftCount()).toBe(0);
        expect(storage.listDrafts()).toEqual([]);
      });

      it('should remove metadata index', () => {
        storage.saveDraft(createTestTree(), { title: 'Draft' });

        storage.clearAllDrafts();

        expect(localStorage.getItem('sinag_draft_metadata_index')).toBeNull();
      });
    });

    describe('hasDraft', () => {
      it('should return true for existing draft', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree);

        expect(storage.hasDraft(draftId)).toBe(true);
      });

      it('should return false for non-existent draft', () => {
        expect(storage.hasDraft('nonexistent')).toBe(false);
      });

      it('should return false after deleting draft', () => {
        const tree = createTestTree();
        const draftId = storage.saveDraft(tree);

        storage.deleteDraft(draftId);

        expect(storage.hasDraft(draftId)).toBe(false);
      });
    });

    describe('getDraftCount', () => {
      it('should return 0 when no drafts exist', () => {
        expect(storage.getDraftCount()).toBe(0);
      });

      it('should return correct count', () => {
        storage.saveDraft(createTestTree(), { title: 'Draft 1' });
        expect(storage.getDraftCount()).toBe(1);

        storage.saveDraft(createTestTree(), { title: 'Draft 2' });
        expect(storage.getDraftCount()).toBe(2);

        storage.saveDraft(createTestTree(), { title: 'Draft 3' });
        expect(storage.getDraftCount()).toBe(3);
      });

      it('should update count after deletion', () => {
        const draftId = storage.saveDraft(createTestTree(), { title: 'Draft' });
        storage.saveDraft(createTestTree(), { title: 'Draft 2' });

        expect(storage.getDraftCount()).toBe(2);

        storage.deleteDraft(draftId);

        expect(storage.getDraftCount()).toBe(1);
      });
    });

    describe('cleanupOldDrafts', () => {
      it('should not delete drafts if count is within limit', () => {
        storage.saveDraft(createTestTree(), { title: 'Draft 1' });
        storage.saveDraft(createTestTree(), { title: 'Draft 2' });

        const deletedCount = storage.cleanupOldDrafts(10);

        expect(deletedCount).toBe(0);
        expect(storage.getDraftCount()).toBe(2);
      });

      it('should delete oldest drafts when exceeding limit', () => {
        // Create 5 drafts with increasing timestamps
        for (let i = 0; i < 5; i++) {
          const now = Date.now();
          vi.spyOn(Date, 'now').mockReturnValue(now + i * 1000);
          storage.saveDraft(createTestTree(), { title: `Draft ${i + 1}` });
          vi.restoreAllMocks();
        }

        const deletedCount = storage.cleanupOldDrafts(3);

        expect(deletedCount).toBe(2);
        expect(storage.getDraftCount()).toBe(3);

        // Should keep the 3 most recent
        const remaining = storage.listDrafts();
        expect(remaining[0].title).toBe('Draft 5');
        expect(remaining[1].title).toBe('Draft 4');
        expect(remaining[2].title).toBe('Draft 3');
      });

      it('should use default keep count of 10', () => {
        // Create 12 drafts
        for (let i = 0; i < 12; i++) {
          storage.saveDraft(createTestTree(), { title: `Draft ${i + 1}` });
        }

        const deletedCount = storage.cleanupOldDrafts();

        expect(deletedCount).toBe(2);
        expect(storage.getDraftCount()).toBe(10);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('isLocalStorageAvailable', () => {
      it('should return true in test environment', () => {
        expect(isLocalStorageAvailable()).toBe(true);
      });

      it('should return false if localStorage throws', () => {
        const originalSetItem = Storage.prototype.setItem;
        Storage.prototype.setItem = () => {
          throw new Error('QuotaExceededError');
        };

        expect(isLocalStorageAvailable()).toBe(false);

        Storage.prototype.setItem = originalSetItem;
      });
    });

    describe('formatBytes', () => {
      it('should format 0 bytes', () => {
        expect(formatBytes(0)).toBe('0 Bytes');
      });

      it('should format bytes', () => {
        expect(formatBytes(500)).toBe('500 Bytes');
      });

      it('should format kilobytes', () => {
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(2048)).toBe('2 KB');
      });

      it('should format megabytes', () => {
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
      });

      it('should format gigabytes', () => {
        expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      });

      it('should handle decimal values', () => {
        expect(formatBytes(1536)).toBe('1.5 KB');
      });
    });

    describe('timeAgo', () => {
      it('should return "just now" for recent timestamps', () => {
        const now = Date.now();
        expect(timeAgo(now)).toBe('just now');
        expect(timeAgo(now - 30 * 1000)).toBe('just now'); // 30 seconds ago
      });

      it('should return minutes for timestamps within an hour', () => {
        const now = Date.now();
        expect(timeAgo(now - 5 * 60 * 1000)).toBe('5 minutes ago');
        expect(timeAgo(now - 30 * 60 * 1000)).toBe('30 minutes ago');
      });

      it('should return hours for timestamps within a day', () => {
        const now = Date.now();
        expect(timeAgo(now - 2 * 60 * 60 * 1000)).toBe('2 hours ago');
        expect(timeAgo(now - 12 * 60 * 60 * 1000)).toBe('12 hours ago');
      });

      it('should return days for timestamps within a week', () => {
        const now = Date.now();
        expect(timeAgo(now - 24 * 60 * 60 * 1000)).toBe('1 days ago');
        expect(timeAgo(now - 3 * 24 * 60 * 60 * 1000)).toBe('3 days ago');
      });

      it('should return formatted date for old timestamps', () => {
        const oldDate = new Date('2024-01-01');
        const result = timeAgo(oldDate.getTime());

        // Should be a formatted date string
        expect(result).toMatch(/1\/1\/2024|2024/); // Different locales
      });
    });
  });
});
