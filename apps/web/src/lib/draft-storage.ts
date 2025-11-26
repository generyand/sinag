import type { IndicatorTreeState } from '@/store/useIndicatorBuilderStore';
import { serializeNodes, deserializeNodes } from './indicator-tree-utils';

/**
 * Draft Storage Service
 *
 * Manages local storage of indicator drafts for offline persistence
 * and quick recovery. Works alongside server-side draft storage.
 *
 * Storage Strategy:
 * - Each draft is stored as a separate localStorage key
 * - Metadata index tracks all drafts
 * - Storage limit: 5MB per draft (configurable)
 * - Data versioning for future migrations
 */

// ============================================================================
// Types
// ============================================================================

export interface DraftMetadata {
  /** Draft ID (UUID) */
  id: string;

  /** Governance area ID */
  governanceAreaId: number;

  /** Draft title/name */
  title: string;

  /** Creation mode */
  creationMode: string;

  /** Current wizard step */
  currentStep: number;

  /** Last modified timestamp */
  lastModified: number;

  /** Number of indicators in draft */
  nodeCount: number;

  /** Storage size in bytes */
  storageSize: number;

  /** Data version (for migrations) */
  version: number;

  /** Server draft ID (if synced) */
  serverDraftId?: string;

  /** Server version (for optimistic locking) */
  serverVersion?: number;
}

export interface StorageStats {
  /** Total number of drafts */
  draftCount: number;

  /** Total storage used (bytes) */
  totalSize: number;

  /** Available storage (bytes) */
  availableSize: number;

  /** Storage quota (bytes) */
  quota: number;

  /** Percentage used */
  usagePercent: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_PREFIX = 'sinag_indicator_draft_';
const METADATA_INDEX_KEY = 'sinag_draft_metadata_index';
const CURRENT_VERSION = 1; // Data version for migrations
const MAX_DRAFT_SIZE = 5 * 1024 * 1024; // 5MB per draft
const STORAGE_QUOTA = 10 * 1024 * 1024; // 10MB total for all drafts

// ============================================================================
// Draft Storage Class
// ============================================================================

/**
 * Local storage manager for indicator drafts
 *
 * Features:
 * - Save/load drafts from localStorage
 * - Metadata indexing for quick listing
 * - Storage limit enforcement
 * - Data versioning for migrations
 * - Automatic cleanup of old drafts
 */
export class IndicatorDraftStorage {
  /**
   * Save a draft to localStorage
   *
   * @param tree - Tree state to save
   * @param metadata - Optional metadata (title, etc.)
   * @returns Draft ID
   * @throws Error if storage quota exceeded
   */
  saveDraft(
    tree: IndicatorTreeState,
    metadata?: Partial<DraftMetadata>
  ): string {
    const draftId = tree.draftId || this.generateDraftId();

    // Serialize tree data
    const serializedTree = {
      ...tree,
      nodes: serializeNodes(tree.nodes),
    };

    const dataStr = JSON.stringify({
      version: CURRENT_VERSION,
      tree: serializedTree,
      savedAt: Date.now(),
    });

    // Check storage size
    const storageSize = new Blob([dataStr]).size;
    if (storageSize > MAX_DRAFT_SIZE) {
      throw new Error(
        `Draft size (${(storageSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${MAX_DRAFT_SIZE / 1024 / 1024}MB)`
      );
    }

    // Check total quota
    const stats = this.getStorageStats();
    if (stats.totalSize + storageSize > STORAGE_QUOTA) {
      throw new Error(
        `Storage quota exceeded. Please delete old drafts to free up space.`
      );
    }

    // Save draft data
    const draftKey = this.getDraftKey(draftId);
    localStorage.setItem(draftKey, dataStr);

    // Update metadata index
    const draftMetadata: DraftMetadata = {
      id: draftId,
      governanceAreaId: tree.governanceAreaId || 0,
      title: metadata?.title || 'Untitled Draft',
      creationMode: tree.creationMode,
      currentStep: tree.currentStep,
      lastModified: Date.now(),
      nodeCount: tree.nodes.size,
      storageSize,
      version: CURRENT_VERSION,
      serverDraftId: tree.draftId,
      serverVersion: tree.version,
    };

    this.updateMetadataIndex(draftMetadata);

    return draftId;
  }

  /**
   * Load a draft from localStorage
   *
   * @param draftId - Draft ID to load
   * @returns Tree state or null if not found
   */
  loadDraft(draftId: string): IndicatorTreeState | null {
    const draftKey = this.getDraftKey(draftId);
    const dataStr = localStorage.getItem(draftKey);

    if (!dataStr) {
      return null;
    }

    try {
      const data = JSON.parse(dataStr);

      // Version migration (if needed in future)
      const tree = this.migrateData(data);

      // Deserialize nodes Map
      return {
        ...tree,
        nodes: deserializeNodes(tree.nodes),
      };
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  /**
   * List all drafts
   *
   * @returns Array of draft metadata
   */
  listDrafts(): DraftMetadata[] {
    const indexStr = localStorage.getItem(METADATA_INDEX_KEY);
    if (!indexStr) {
      return [];
    }

    try {
      const index = JSON.parse(indexStr) as DraftMetadata[];
      // Sort by last modified (most recent first)
      return index.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Failed to load draft index:', error);
      return [];
    }
  }

  /**
   * Delete a draft
   *
   * @param draftId - Draft ID to delete
   */
  deleteDraft(draftId: string): void {
    // Remove draft data
    const draftKey = this.getDraftKey(draftId);
    localStorage.removeItem(draftKey);

    // Update metadata index
    const index = this.listDrafts();
    const updatedIndex = index.filter(meta => meta.id !== draftId);
    localStorage.setItem(METADATA_INDEX_KEY, JSON.stringify(updatedIndex));
  }

  /**
   * Get draft metadata (without loading full data)
   *
   * @param draftId - Draft ID
   * @returns Metadata or null
   */
  getDraftMetadata(draftId: string): DraftMetadata | null {
    const drafts = this.listDrafts();
    return drafts.find(draft => draft.id === draftId) || null;
  }

  /**
   * Update draft metadata (without changing data)
   *
   * @param draftId - Draft ID
   * @param updates - Metadata updates
   */
  updateDraftMetadata(
    draftId: string,
    updates: Partial<DraftMetadata>
  ): void {
    const drafts = this.listDrafts();
    const index = drafts.findIndex(draft => draft.id === draftId);

    if (index >= 0) {
      drafts[index] = { ...drafts[index], ...updates };
      localStorage.setItem(METADATA_INDEX_KEY, JSON.stringify(drafts));
    }
  }

  /**
   * Get storage statistics
   *
   * @returns Storage stats
   */
  getStorageStats(): StorageStats {
    const drafts = this.listDrafts();
    const totalSize = drafts.reduce((sum, draft) => sum + draft.storageSize, 0);
    const availableSize = STORAGE_QUOTA - totalSize;
    const usagePercent = (totalSize / STORAGE_QUOTA) * 100;

    return {
      draftCount: drafts.length,
      totalSize,
      availableSize,
      quota: STORAGE_QUOTA,
      usagePercent: Math.min(usagePercent, 100),
    };
  }

  /**
   * Clear all drafts (use with caution!)
   */
  clearAllDrafts(): void {
    const drafts = this.listDrafts();
    drafts.forEach(draft => {
      const draftKey = this.getDraftKey(draft.id);
      localStorage.removeItem(draftKey);
    });
    localStorage.removeItem(METADATA_INDEX_KEY);
  }

  /**
   * Check if a draft exists
   *
   * @param draftId - Draft ID
   * @returns True if draft exists
   */
  hasDraft(draftId: string): boolean {
    const draftKey = this.getDraftKey(draftId);
    return localStorage.getItem(draftKey) !== null;
  }

  /**
   * Get total number of drafts
   */
  getDraftCount(): number {
    return this.listDrafts().length;
  }

  /**
   * Cleanup old drafts (keep only N most recent)
   *
   * @param keepCount - Number of drafts to keep (default: 10)
   */
  cleanupOldDrafts(keepCount: number = 10): number {
    const drafts = this.listDrafts();

    if (drafts.length <= keepCount) {
      return 0;
    }

    // Delete oldest drafts
    const toDelete = drafts.slice(keepCount);
    toDelete.forEach(draft => {
      this.deleteDraft(draft.id);
    });

    return toDelete.length;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate a unique draft ID
   */
  private generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get localStorage key for a draft
   */
  private getDraftKey(draftId: string): string {
    return `${STORAGE_PREFIX}${draftId}`;
  }

  /**
   * Update metadata index with draft info
   */
  private updateMetadataIndex(metadata: DraftMetadata): void {
    const drafts = this.listDrafts();
    const existingIndex = drafts.findIndex(d => d.id === metadata.id);

    if (existingIndex >= 0) {
      // Update existing
      drafts[existingIndex] = metadata;
    } else {
      // Add new
      drafts.push(metadata);
    }

    localStorage.setItem(METADATA_INDEX_KEY, JSON.stringify(drafts));
  }

  /**
   * Migrate data between versions (for future use)
   */
  private migrateData(data: any): any {
    const { version, tree } = data;

    // Currently only version 1 exists
    if (version === CURRENT_VERSION) {
      return tree;
    }

    // Future migrations would go here
    // Example:
    // if (version === 1) {
    //   tree = migrateV1toV2(tree);
    // }

    return tree;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of draft storage service
 * Use this throughout the application
 */
export const draftStorage = new IndicatorDraftStorage();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get human-readable size string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get human-readable time ago string
 */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return new Date(timestamp).toLocaleDateString();
}
