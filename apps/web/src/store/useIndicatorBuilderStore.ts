import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateSchemaStatus,
  isLeafIndicator as isLeafIndicatorUtil,
  getAllLeafIndicators,
  getAllDescendantLeaves,
  getParentStatus as getParentStatusUtil,
  getFirstIncompleteLeaf,
  getLeafSchemaProgress,
  canConfigureSchemas as canConfigureSchemasUtil,
  type ParentStatusInfo,
} from '@/lib/indicator-tree-utils';
import { validateIndicatorSchemas, getCompletionStatus } from '@/lib/indicator-validation';

/**
 * Indicator node in the hierarchical tree
 * Uses temp_id for client-side identification before server creation
 */
export interface IndicatorNode {
  /** Temporary client-side UUID */
  temp_id: string;

  /** Parent indicator's temp_id (null for root nodes) */
  parent_temp_id: string | null;

  /** Display order among siblings */
  order: number;

  /** Indicator code (e.g., "1.1", "1.1.1") - auto-calculated */
  code?: string;

  /** Indicator name/title */
  name: string;

  /** Detailed description */
  description?: string;

  /** Whether the indicator is active */
  is_active: boolean;

  /** Whether Pass/Fail is auto-calculated from children */
  is_auto_calculable: boolean;

  /** Whether this is profiling-only (no scoring) */
  is_profiling_only: boolean;

  /** Form schema (JSON) for data collection */
  form_schema?: Record<string, any>;

  /** Calculation schema (JSON) for auto-calculation */
  calculation_schema?: Record<string, any>;

  /** Remark schema (JSON) for status summaries */
  remark_schema?: Record<string, any>;

  /** Technical notes (plain text) */
  technical_notes_text?: string;

  /** MOV checklist configuration (array of MOV items) */
  mov_checklist_items?: Record<string, any>;

  /** Metadata for additional information (e.g., archived schemas) */
  metadata?: {
    /** Archived schemas when leaf transitions to parent */
    archived_schemas?: {
      form_schema?: Record<string, any>;
      calculation_schema?: Record<string, any>;
      remark_schema?: Record<string, any>;
      archived_at?: number;
    };
    [key: string]: any;
  };

  /** Real ID (set after server creation) */
  id?: number;
}

/**
 * Tree state representation
 * Uses flat Map for efficient lookups and updates
 */
export interface IndicatorTreeState {
  /** Map of temp_id → IndicatorNode */
  nodes: Map<string, IndicatorNode>;

  /** Array of root node temp_ids (top-level indicators) */
  rootIds: string[];

  /** Governance area ID for this indicator set */
  governanceAreaId: number | null;

  /** Creation mode: 'incremental' | 'bulk_import' | 'from_template' */
  creationMode: string;

  /** Current wizard step (1-based) */
  currentStep: number;

  /** Draft ID (set after saving to server) */
  draftId?: string;

  /** Draft version (for optimistic locking) */
  version?: number;
}

/**
 * Schema validation error
 */
export interface ValidationError {
  field: 'form' | 'calculation' | 'remark';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Schema completion and validation status for an indicator
 */
export interface SchemaStatus {
  /** Whether form schema is complete and valid */
  formComplete: boolean;

  /** Whether calculation schema is complete and valid */
  calculationComplete: boolean;

  /** Whether remark schema is complete and valid */
  remarkComplete: boolean;

  /** Overall completion status */
  isComplete: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Last edited timestamp */
  lastEdited: number | null;
}

/**
 * Auto-save state tracking
 */
export interface AutoSaveState {
  /** IDs of indicators with unsaved schemas */
  dirtySchemas: Set<string>;

  /** Currently saving indicator IDs */
  savingSchemas: Set<string>;

  /** Last save timestamps per indicator */
  lastSaved: Map<string, number>;

  /** Save errors per indicator */
  saveErrors: Map<string, Error>;
}

/**
 * Schema template for copying (Phase 3 feature)
 */
export interface SchemaTemplate {
  id: string;
  name: string;
  formSchema?: Record<string, any>;
  calculationSchema?: Record<string, any>;
  remarkSchema?: Record<string, any>;
  createdAt: number;
}

/**
 * Copy options for schema copying
 */
export interface CopyOptions {
  form?: boolean;
  calculation?: boolean;
  remark?: boolean;
}

/**
 * Copied schema for copy/paste functionality
 */
export interface CopiedSchema {
  /** Schema type */
  type: 'form' | 'calculation' | 'remark';

  /** Schema data */
  schema: any;

  /** Source indicator ID */
  sourceIndicatorId: string;

  /** Source indicator code (for display) */
  sourceIndicatorCode?: string;

  /** Timestamp when copied */
  copiedAt: number;
}

/**
 * Indicator Builder state interface
 * Manages hierarchical indicator creation with flat state model
 */
interface IndicatorBuilderState {
  /** Tree state */
  tree: IndicatorTreeState;

  /** Current mode: browse (view) or edit */
  mode: 'browse' | 'edit';

  /** ID of currently selected node */
  selectedNodeId: string | null;

  /** ID of node being edited in properties panel */
  editingNodeId: string | null;

  /** Whether there are unsaved changes */
  isDirty: boolean;

  // ============================================================================
  // NEW: Schema Configuration State (Phase 1)
  // ============================================================================

  /** Currently active indicator in schema editor (Step 3) */
  currentSchemaIndicatorId: string | null;

  /** Schema completion status per indicator */
  schemaStatus: Map<string, SchemaStatus>;

  /** Auto-save state tracking */
  autoSave: AutoSaveState;

  /** Copied schema for copy/paste (Phase 2) */
  copiedSchema: CopiedSchema | null;

  /** Saved schema templates (Phase 3) */
  templates: SchemaTemplate[];

  // Initialization Actions
  /** Initialize a new tree for a governance area */
  initializeTree: (governanceAreaId: number, creationMode: string) => void;

  /** Load existing tree from draft */
  loadTree: (tree: IndicatorTreeState) => void;

  /** Reset tree to empty state */
  resetTree: () => void;

  /** Update governance area ID and recalculate codes */
  setGovernanceAreaId: (governanceAreaId: number) => void;

  // Node CRUD Actions
  /** Add a new node to the tree */
  addNode: (node: Partial<IndicatorNode>, parentId?: string) => string;

  /** Update a node by temp_id */
  updateNode: (tempId: string, updates: Partial<IndicatorNode>) => void;

  /** Delete a node and its children */
  deleteNode: (tempId: string) => void;

  /** Duplicate a node (and optionally its children) */
  duplicateNode: (tempId: string, includeChildren?: boolean) => string;

  // Tree Manipulation Actions
  /** Move a node to a new parent */
  moveNode: (tempId: string, newParentId: string | null, newIndex?: number) => void;

  /** Reorder siblings within same parent */
  reorderNodes: (parentId: string | null, childIds: string[]) => void;

  /** Recalculate codes for entire tree */
  recalculateCodes: () => void;

  // UI State Actions
  /** Select a node (for highlighting in tree view) */
  selectNode: (tempId: string | null) => void;

  /** Set node being edited in properties panel */
  setEditingNode: (tempId: string | null) => void;

  /** Set current mode */
  setMode: (mode: 'browse' | 'edit') => void;

  /** Set current wizard step */
  setCurrentStep: (step: number) => void;

  /** Mark as saved */
  markAsSaved: () => void;

  /** Set draft metadata after server save */
  setDraftMetadata: (draftId: string, version: number) => void;

  // Selectors
  /** Get a node by temp_id */
  getNodeById: (tempId: string) => IndicatorNode | undefined;

  /** Get all children of a node (or roots if no tempId) */
  getChildrenOf: (tempId?: string | null) => IndicatorNode[];

  /** Get full tree as nested structure (for display) */
  getTreeView: () => IndicatorNode[];

  /** Get flat array of all nodes */
  getAllNodes: () => IndicatorNode[];

  /** Get parent of a node */
  getParentOf: (tempId: string) => IndicatorNode | null;

  /** Get siblings of a node */
  getSiblingsOf: (tempId: string) => IndicatorNode[];

  /** Check if tree has unsaved changes */
  hasUnsavedChanges: () => boolean;

  /** Get currently selected node */
  getSelectedNode: () => IndicatorNode | undefined;

  /** Get currently editing node */
  getEditingNode: () => IndicatorNode | undefined;

  /** Export tree for server submission */
  exportForSubmission: () => Omit<IndicatorNode, 'code' | 'id'>[];

  // ============================================================================
  // NEW: Schema Configuration Actions (Phase 1)
  // ============================================================================

  /** Navigate to indicator in schema editor (with smart parent navigation) */
  navigateToIndicator: (indicatorId: string, options?: { force?: boolean }) => void;

  /** Update schema status for an indicator */
  updateSchemaStatus: (indicatorId: string, status: Partial<SchemaStatus>) => void;

  /** Mark indicator schemas as dirty (unsaved) */
  markSchemaDirty: (indicatorId: string) => void;

  /** Mark indicator schemas as saved */
  markSchemaSaved: (indicatorId: string) => void;

  /** Get schema completion progress */
  getSchemaProgress: () => { complete: number; total: number; percentage: number };

  /** Copy schemas from one indicator to another */
  copySchemas: (sourceId: string, targetId: string, options?: CopyOptions) => void;

  /** Get next/previous indicator for navigation */
  getAdjacentIndicator: (currentId: string, direction: 'next' | 'previous') => string | null;

  /** Get currently editing schema indicator */
  getCurrentSchemaIndicator: () => IndicatorNode | undefined;

  // ============================================================================
  // NEW: Leaf Indicator Selectors & Navigation (Phase 6)
  // ============================================================================

  /** Check if an indicator is a leaf (has no children) */
  isLeafIndicator: (indicatorId: string) => boolean;

  /** Check if schemas can be configured for an indicator (leaf-only) */
  canConfigureSchemas: (indicatorId: string) => boolean;

  /** Get all leaf indicators in the tree */
  getLeafIndicators: () => IndicatorNode[];

  /** Get all descendant leaves of a parent indicator */
  getDescendantLeavesOf: (indicatorId: string) => IndicatorNode[];

  /** Get parent status info (aggregate from descendant leaves) */
  getParentStatusInfo: (indicatorId: string) => ParentStatusInfo;

  /** Navigate to next incomplete leaf indicator */
  navigateToNextIncomplete: () => void;

  /** Archive schemas for an indicator (when leaf becomes parent) */
  archiveSchemasForIndicator: (indicatorId: string) => void;

  /** Restore archived schemas for an indicator (when parent becomes leaf) */
  restoreArchivedSchemas: (indicatorId: string) => void;

  /** Check if indicator has archived schemas */
  hasArchivedSchemas: (indicatorId: string) => boolean;

  // ============================================================================
  // NEW: Validation Actions (Phase 2)
  // ============================================================================

  /** Validate and update schema status for an indicator */
  validateIndicatorSchemas: (indicatorId: string) => void;

  /** Clear validation errors for an indicator */
  clearValidationErrors: (indicatorId: string) => void;

  /** Get validation errors for an indicator */
  getValidationErrors: (indicatorId: string) => ValidationError[];

  // ============================================================================
  // NEW: Copy/Paste Actions (Phase 2)
  // ============================================================================

  /** Copy schema from an indicator */
  copySchema: (indicatorId: string, type: 'form' | 'calculation' | 'remark') => void;

  /** Paste copied schema to an indicator */
  pasteSchema: (indicatorId: string, type: 'form' | 'calculation' | 'remark') => boolean;

  /** Clear copied schema */
  clearCopiedSchema: () => void;

  /** Check if there's a copied schema of given type */
  hasCopiedSchema: (type: 'form' | 'calculation' | 'remark') => boolean;
}

/**
 * Helper: Calculate indicator code based on position in tree
 *
 * Root nodes are prefixed with governance area ID:
 * - Governance Area 1: "1.1", "1.2", "1.3"
 * - Governance Area 2: "2.1", "2.2", "2.3"
 * - Governance Area 3: "3.1", "3.2", "3.3"
 *
 * Child nodes follow hierarchy:
 * - "1.1.1", "1.1.2", "1.2.1", "3.1.1.1"
 */
function calculateNodeCode(
  nodes: Map<string, IndicatorNode>,
  node: IndicatorNode,
  parentCode?: string,
  governanceAreaId?: number | null
): string {
  const siblings = Array.from(nodes.values())
    .filter(n => n.parent_temp_id === node.parent_temp_id)
    .sort((a, b) => a.order - b.order);

  const position = siblings.findIndex(n => n.temp_id === node.temp_id) + 1;

  if (parentCode) {
    // Child node: append to parent code
    return `${parentCode}.${position}`;
  }

  // Root node: prefix with governance area ID (check for null/undefined, not falsy)
  if (governanceAreaId !== null && governanceAreaId !== undefined && governanceAreaId > 0) {
    return `${governanceAreaId}.${position}`;
  }

  // Fallback for no governance area (wizard mode or pre-selection)
  return `${position}`;
}

/**
 * Helper: Recursively calculate codes for node and descendants
 */
function recalculateNodeCodes(
  nodes: Map<string, IndicatorNode>,
  nodeId: string,
  parentCode?: string,
  governanceAreaId?: number | null
): void {
  const node = nodes.get(nodeId);
  if (!node) return;

  // Calculate this node's code (pass governanceAreaId for root nodes)
  const code = calculateNodeCode(nodes, node, parentCode, governanceAreaId);
  node.code = code;

  // Recalculate children codes (no need to pass governanceAreaId after root)
  const children = Array.from(nodes.values())
    .filter(n => n.parent_temp_id === nodeId)
    .sort((a, b) => a.order - b.order);

  children.forEach(child => {
    recalculateNodeCodes(nodes, child.temp_id, code);
  });
}

/**
 * Helper: Build nested tree structure for display
 */
function buildNestedTree(
  nodes: Map<string, IndicatorNode>,
  parentId: string | null
): IndicatorNode[] {
  return Array.from(nodes.values())
    .filter(node => node.parent_temp_id === parentId)
    .sort((a, b) => a.order - b.order)
    .map(node => ({
      ...node,
      children: buildNestedTree(nodes, node.temp_id),
    })) as IndicatorNode[];
}

/**
 * Zustand store for Indicator Builder
 *
 * Manages hierarchical indicator creation with:
 * - Flat Map state for efficient lookups and updates
 * - Automatic code recalculation (1.1, 1.1.1, etc.)
 * - Tree manipulation (add, move, reorder, delete)
 * - Draft integration for auto-save
 *
 * Note: Uses temp_id (UUID) for client-side identification
 * Real IDs are assigned after server creation
 */
export const useIndicatorBuilderStore = create<IndicatorBuilderState>((set, get) => ({
  // Initial state
  tree: {
    nodes: new Map(),
    rootIds: [],
    governanceAreaId: null,
    creationMode: 'incremental',
    currentStep: 1,
  },
  mode: 'edit',
  selectedNodeId: null,
  editingNodeId: null,
  isDirty: false,

  // NEW: Schema configuration state
  currentSchemaIndicatorId: null,
  schemaStatus: new Map(),
  autoSave: {
    dirtySchemas: new Set(),
    savingSchemas: new Set(),
    lastSaved: new Map(),
    saveErrors: new Map(),
  },
  copiedSchema: null,
  templates: [],

  // Initialization Actions
  initializeTree: (governanceAreaId, creationMode) => {
    set({
      tree: {
        nodes: new Map(),
        rootIds: [],
        governanceAreaId,
        creationMode,
        currentStep: 1,
      },
      isDirty: false,
      selectedNodeId: null,
      editingNodeId: null,
    });
  },

  loadTree: (tree) => {
    // Convert plain object nodes to Map if needed
    const nodesMap: Map<string, IndicatorNode> = tree.nodes instanceof Map
      ? tree.nodes
      : new Map(Object.entries(tree.nodes as any));

    // Initialize schema status for all loaded nodes
    const newSchemaStatus = new Map<string, SchemaStatus>();
    nodesMap.forEach((node, nodeId) => {
      const status = calculateSchemaStatus(node);
      newSchemaStatus.set(nodeId, status);
    });

    set({
      tree: {
        ...tree,
        nodes: nodesMap,
      },
      schemaStatus: newSchemaStatus,
      isDirty: false,
    });
  },

  resetTree: () => {
    const { tree } = get();
    set({
      tree: {
        ...tree,
        nodes: new Map(),
        rootIds: [],
      },
      isDirty: false,
      selectedNodeId: null,
      editingNodeId: null,
    });
  },

  setGovernanceAreaId: (governanceAreaId) => {
    const { tree, recalculateCodes } = get();
    set({
      tree: {
        ...tree,
        governanceAreaId,
      },
    });
    // Recalculate all codes with new governance area prefix
    recalculateCodes();
  },

  // Node CRUD Actions
  addNode: (nodeData, parentId) => {
    const { tree, schemaStatus } = get();
    const temp_id = uuidv4();

    // Determine order (last among siblings)
    const siblings = Array.from(tree.nodes.values())
      .filter(n => n.parent_temp_id === (parentId || null));
    const order = siblings.length + 1;

    // Create new node
    const newNode: IndicatorNode = {
      temp_id,
      parent_temp_id: parentId || null,
      order,
      name: nodeData.name || 'New Indicator',
      description: nodeData.description,
      is_active: nodeData.is_active ?? true,
      is_auto_calculable: nodeData.is_auto_calculable ?? false,
      is_profiling_only: nodeData.is_profiling_only ?? false,
      form_schema: nodeData.form_schema,
      calculation_schema: nodeData.calculation_schema,
      remark_schema: nodeData.remark_schema,
      technical_notes_text: nodeData.technical_notes_text,
    };

    // Add to nodes Map
    const newNodes = new Map(tree.nodes);
    newNodes.set(temp_id, newNode);

    // Update rootIds if this is a root node
    const newRootIds = parentId ? tree.rootIds : [...tree.rootIds, temp_id];

    // Initialize schema status for new node
    const status = calculateSchemaStatus(newNode);
    const newSchemaStatus = new Map(schemaStatus);
    newSchemaStatus.set(temp_id, status);

    set({
      tree: {
        ...tree,
        nodes: newNodes,
        rootIds: newRootIds,
      },
      schemaStatus: newSchemaStatus,
      isDirty: true,
    });

    // Recalculate codes
    get().recalculateCodes();

    return temp_id;
  },

  updateNode: (tempId, updates) => {
    const { tree, schemaStatus } = get();
    const node = tree.nodes.get(tempId);
    if (!node) return;

    const updatedNode = { ...node, ...updates };
    const newNodes = new Map(tree.nodes);
    newNodes.set(tempId, updatedNode);

    // Check if schema fields were updated
    const schemaFieldsUpdated =
      updates.form_schema !== undefined ||
      updates.calculation_schema !== undefined ||
      updates.remark_schema !== undefined;

    // Recalculate schema status if schemas were modified
    let newSchemaStatus = schemaStatus;
    if (schemaFieldsUpdated) {
      const status = calculateSchemaStatus(updatedNode);
      newSchemaStatus = new Map(schemaStatus);
      newSchemaStatus.set(tempId, status);
    }

    set({
      tree: {
        ...tree,
        nodes: newNodes,
      },
      schemaStatus: newSchemaStatus,
      isDirty: true,
    });

    // Recalculate codes if name changed (affects display)
    if (updates.name !== undefined) {
      get().recalculateCodes();
    }
  },

  deleteNode: (tempId) => {
    const { tree } = get();
    const node = tree.nodes.get(tempId);
    if (!node) return;

    // Get all descendants
    const toDelete = new Set<string>([tempId]);
    const findDescendants = (nodeId: string) => {
      Array.from(tree.nodes.values())
        .filter(n => n.parent_temp_id === nodeId)
        .forEach(child => {
          toDelete.add(child.temp_id);
          findDescendants(child.temp_id);
        });
    };
    findDescendants(tempId);

    // Remove all nodes
    const newNodes = new Map(tree.nodes);
    toDelete.forEach(id => newNodes.delete(id));

    // Update rootIds
    const newRootIds = tree.rootIds.filter(id => !toDelete.has(id));

    // Reorder siblings
    const siblings = Array.from(newNodes.values())
      .filter(n => n.parent_temp_id === node.parent_temp_id)
      .sort((a, b) => a.order - b.order);

    siblings.forEach((sibling, index) => {
      sibling.order = index + 1;
    });

    set({
      tree: {
        ...tree,
        nodes: newNodes,
        rootIds: newRootIds,
      },
      isDirty: true,
      selectedNodeId: get().selectedNodeId === tempId ? null : get().selectedNodeId,
      editingNodeId: get().editingNodeId === tempId ? null : get().editingNodeId,
    });

    get().recalculateCodes();
  },

  duplicateNode: (tempId, includeChildren = false) => {
    const { tree } = get();
    const node = tree.nodes.get(tempId);
    if (!node) return '';

    const newTempId = uuidv4();
    const newNode: IndicatorNode = {
      ...node,
      temp_id: newTempId,
      name: `${node.name} (Copy)`,
      order: node.order + 1,
      id: undefined, // Clear server ID
    };

    const newNodes = new Map(tree.nodes);
    newNodes.set(newTempId, newNode);

    // Shift siblings down
    const siblings = Array.from(tree.nodes.values())
      .filter(n => n.parent_temp_id === node.parent_temp_id && n.order > node.order);

    siblings.forEach(sibling => {
      const updated = newNodes.get(sibling.temp_id);
      if (updated) {
        updated.order += 1;
      }
    });

    // Duplicate children if requested
    if (includeChildren) {
      const duplicateChildren = (originalParentId: string, newParentId: string) => {
        const children = Array.from(tree.nodes.values())
          .filter(n => n.parent_temp_id === originalParentId)
          .sort((a, b) => a.order - b.order);

        children.forEach(child => {
          const childTempId = uuidv4();
          const newChild: IndicatorNode = {
            ...child,
            temp_id: childTempId,
            parent_temp_id: newParentId,
            id: undefined,
          };
          newNodes.set(childTempId, newChild);
          duplicateChildren(child.temp_id, childTempId);
        });
      };

      duplicateChildren(tempId, newTempId);
    }

    set({
      tree: {
        ...tree,
        nodes: newNodes,
      },
      isDirty: true,
    });

    get().recalculateCodes();
    return newTempId;
  },

  // Tree Manipulation Actions
  moveNode: (tempId, newParentId, newIndex) => {
    const { tree } = get();
    const node = tree.nodes.get(tempId);
    if (!node) return;

    // Prevent moving to own descendant
    const isDescendant = (ancestorId: string, descendantId: string): boolean => {
      const desc = tree.nodes.get(descendantId);
      if (!desc || !desc.parent_temp_id) return false;
      if (desc.parent_temp_id === ancestorId) return true;
      return isDescendant(ancestorId, desc.parent_temp_id);
    };

    if (newParentId && isDescendant(tempId, newParentId)) {
      console.error('Cannot move node to its own descendant');
      return;
    }

    const newNodes = new Map(tree.nodes);
    const updatedNode = newNodes.get(tempId)!;
    const oldParentId = updatedNode.parent_temp_id;

    // Update parent
    updatedNode.parent_temp_id = newParentId;

    // Reorder old siblings
    const oldSiblings = Array.from(newNodes.values())
      .filter(n => n.parent_temp_id === oldParentId && n.temp_id !== tempId)
      .sort((a, b) => a.order - b.order);

    oldSiblings.forEach((sibling, index) => {
      sibling.order = index + 1;
    });

    // Reorder new siblings
    const newSiblings = Array.from(newNodes.values())
      .filter(n => n.parent_temp_id === newParentId && n.temp_id !== tempId)
      .sort((a, b) => a.order - b.order);

    const insertIndex = newIndex !== undefined ? newIndex : newSiblings.length;
    newSiblings.splice(insertIndex, 0, updatedNode);

    newSiblings.forEach((sibling, index) => {
      sibling.order = index + 1;
    });

    // Update rootIds
    let newRootIds = tree.rootIds;
    if (!oldParentId) {
      newRootIds = newRootIds.filter(id => id !== tempId);
    }
    if (!newParentId) {
      newRootIds = [...newRootIds, tempId];
    }

    set({
      tree: {
        ...tree,
        nodes: newNodes,
        rootIds: newRootIds,
      },
      isDirty: true,
    });

    get().recalculateCodes();
  },

  reorderNodes: (parentId, childIds) => {
    const { tree } = get();
    const newNodes = new Map(tree.nodes);

    childIds.forEach((childId, index) => {
      const node = newNodes.get(childId);
      if (node && node.parent_temp_id === parentId) {
        node.order = index + 1;
      }
    });

    // Update rootIds order if reordering roots
    const newRootIds = parentId === null ? childIds : tree.rootIds;

    set({
      tree: {
        ...tree,
        nodes: newNodes,
        rootIds: newRootIds,
      },
      isDirty: true,
    });

    get().recalculateCodes();
  },

  recalculateCodes: () => {
    const { tree } = get();
    const newNodes = new Map(tree.nodes);

    // Recalculate codes for all root nodes with governance area prefix
    tree.rootIds.forEach(rootId => {
      recalculateNodeCodes(newNodes, rootId, undefined, tree.governanceAreaId);
    });

    set({
      tree: {
        ...tree,
        nodes: newNodes,
      },
    });
  },

  // UI State Actions
  selectNode: (tempId) => {
    set({ selectedNodeId: tempId });
  },

  setEditingNode: (tempId) => {
    set({ editingNodeId: tempId });
  },

  setMode: (mode) => {
    set({ mode });
  },

  setCurrentStep: (step) => {
    set(state => ({
      tree: {
        ...state.tree,
        currentStep: step,
      },
    }));
  },

  markAsSaved: () => {
    set({ isDirty: false });
  },

  setDraftMetadata: (draftId, version) => {
    set(state => ({
      tree: {
        ...state.tree,
        draftId,
        version,
      },
    }));
  },

  // Selectors
  getNodeById: (tempId) => {
    return get().tree.nodes.get(tempId);
  },

  getChildrenOf: (tempId) => {
    const { tree } = get();
    return Array.from(tree.nodes.values())
      .filter(node => node.parent_temp_id === (tempId || null))
      .sort((a, b) => a.order - b.order);
  },

  getTreeView: () => {
    const { tree } = get();
    return buildNestedTree(tree.nodes, null);
  },

  getAllNodes: () => {
    return Array.from(get().tree.nodes.values());
  },

  getParentOf: (tempId) => {
    const node = get().tree.nodes.get(tempId);
    if (!node || !node.parent_temp_id) return null;
    return get().tree.nodes.get(node.parent_temp_id) || null;
  },

  getSiblingsOf: (tempId) => {
    const node = get().tree.nodes.get(tempId);
    if (!node) return [];
    return get().getChildrenOf(node.parent_temp_id);
  },

  hasUnsavedChanges: () => {
    return get().isDirty;
  },

  getSelectedNode: () => {
    const { selectedNodeId } = get();
    return selectedNodeId ? get().getNodeById(selectedNodeId) : undefined;
  },

  getEditingNode: () => {
    const { editingNodeId } = get();
    return editingNodeId ? get().getNodeById(editingNodeId) : undefined;
  },

  exportForSubmission: () => {
    const nodes = get().getAllNodes();
    return nodes.map(node => ({
      temp_id: node.temp_id,
      parent_temp_id: node.parent_temp_id,
      order: node.order,
      name: node.name,
      description: node.description,
      is_active: node.is_active,
      is_auto_calculable: node.is_auto_calculable,
      is_profiling_only: node.is_profiling_only,
      form_schema: node.form_schema,
      calculation_schema: node.calculation_schema,
      remark_schema: node.remark_schema,
      technical_notes_text: node.technical_notes_text,
    }));
  },

  // ============================================================================
  // NEW: Schema Configuration Actions Implementation (Phase 1)
  // ============================================================================

  navigateToIndicator: (indicatorId, options?: { force?: boolean }) => {
    const { currentSchemaIndicatorId, autoSave, tree, schemaStatus, isLeafIndicator, getParentStatusInfo } = get();

    // Auto-save current indicator if dirty (handled by useAutoSave hook)
    if (currentSchemaIndicatorId && autoSave.dirtySchemas.has(currentSchemaIndicatorId)) {
      set(state => ({
        autoSave: {
          ...state.autoSave,
          savingSchemas: new Set([...state.autoSave.savingSchemas, currentSchemaIndicatorId]),
        },
      }));
    }

    // Smart navigation: if clicking a parent (not forced), navigate to first incomplete leaf
    const isLeaf = isLeafIndicator(indicatorId);
    if (!isLeaf && !options?.force) {
      const parentStatus = getParentStatusInfo(indicatorId);

      // If parent has incomplete leaves, navigate to first incomplete
      if (parentStatus.firstIncompleteLeaf) {
        console.log(
          `[Navigation] Parent clicked: auto-navigating to first incomplete leaf ${parentStatus.firstIncompleteLeaf.code}`
        );
        set({ currentSchemaIndicatorId: parentStatus.firstIncompleteLeaf.temp_id });
        return;
      }

      // If all complete, navigate to first leaf for review
      const allIndicators = Array.from(tree.nodes.values());
      const leaves = getAllDescendantLeaves(
        tree.nodes.get(indicatorId)!,
        allIndicators
      );
      if (leaves.length > 0) {
        console.log(
          `[Navigation] Parent clicked (all complete): navigating to first leaf ${leaves[0].code}`
        );
        set({ currentSchemaIndicatorId: leaves[0].temp_id });
        return;
      }
    }

    // Update current indicator (leaf or forced parent selection)
    set({ currentSchemaIndicatorId: indicatorId });
  },

  updateSchemaStatus: (indicatorId, statusUpdate) => {
    set(state => {
      const currentStatus = state.schemaStatus.get(indicatorId) || {
        formComplete: false,
        calculationComplete: false,
        remarkComplete: false,
        isComplete: false,
        errors: [],
        lastEdited: null,
      };

      const newStatus: SchemaStatus = {
        ...currentStatus,
        ...statusUpdate,
        lastEdited: Date.now()
      };

      // Calculate overall completion
      newStatus.isComplete =
        newStatus.formComplete &&
        newStatus.calculationComplete &&
        newStatus.remarkComplete &&
        newStatus.errors.length === 0;

      const newSchemaStatus = new Map(state.schemaStatus);
      newSchemaStatus.set(indicatorId, newStatus);

      return { schemaStatus: newSchemaStatus };
    });
  },

  markSchemaDirty: (indicatorId) => {
    set(state => ({
      autoSave: {
        ...state.autoSave,
        dirtySchemas: new Set([...state.autoSave.dirtySchemas, indicatorId]),
      },
      isDirty: true,
    }));
  },

  markSchemaSaved: (indicatorId) => {
    set(state => {
      const newDirtySchemas = new Set(state.autoSave.dirtySchemas);
      newDirtySchemas.delete(indicatorId);

      const newSavingSchemas = new Set(state.autoSave.savingSchemas);
      newSavingSchemas.delete(indicatorId);

      const newLastSaved = new Map(state.autoSave.lastSaved);
      newLastSaved.set(indicatorId, Date.now());

      return {
        autoSave: {
          ...state.autoSave,
          dirtySchemas: newDirtySchemas,
          savingSchemas: newSavingSchemas,
          lastSaved: newLastSaved,
        },
      };
    });
  },

  getSchemaProgress: () => {
    const { tree, schemaStatus } = get();

    // Use leaf-only progress counting (Phase 6: only leaves need schemas)
    const progress = getLeafSchemaProgress(tree.nodes, schemaStatus);

    return {
      complete: progress.complete,
      total: progress.total,
      percentage: progress.percentage,
    };
  },

  copySchemas: (sourceId, targetId, options = { form: true, calculation: true, remark: true }) => {
    const { getNodeById, updateNode } = get();
    const source = getNodeById(sourceId);
    const target = getNodeById(targetId);

    if (!source || !target) return;

    const updates: Partial<IndicatorNode> = {};

    if (options.form && source.form_schema) {
      updates.form_schema = structuredClone(source.form_schema);
    }
    if (options.calculation && source.calculation_schema) {
      updates.calculation_schema = structuredClone(source.calculation_schema);
    }
    if (options.remark && source.remark_schema) {
      updates.remark_schema = structuredClone(source.remark_schema);
    }

    updateNode(targetId, updates);
    get().markSchemaDirty(targetId);
  },

  getAdjacentIndicator: (currentId, direction) => {
    const { getAllNodes } = get();
    const allNodes = getAllNodes().sort((a, b) => {
      // Sort by code for natural order (1, 1.1, 1.1.1, 1.2, 2, etc.)
      const codeA = a.code || '';
      const codeB = b.code || '';
      return codeA.localeCompare(codeB, undefined, { numeric: true });
    });

    const currentIndex = allNodes.findIndex(n => n.temp_id === currentId);

    if (currentIndex === -1) return null;

    if (direction === 'next') {
      return currentIndex < allNodes.length - 1
        ? allNodes[currentIndex + 1].temp_id
        : null;
    } else {
      return currentIndex > 0
        ? allNodes[currentIndex - 1].temp_id
        : null;
    }
  },

  getCurrentSchemaIndicator: () => {
    const { currentSchemaIndicatorId, getNodeById } = get();
    return currentSchemaIndicatorId ? getNodeById(currentSchemaIndicatorId) : undefined;
  },

  // ============================================================================
  // Validation Actions (Phase 2)
  // ============================================================================

  validateIndicatorSchemas: (indicatorId) => {
    const { getNodeById, updateSchemaStatus } = get();
    const indicator = getNodeById(indicatorId);

    if (!indicator) {
      console.warn(`[Validation] Indicator ${indicatorId} not found`);
      return;
    }

    // Run validation
    const { formComplete, calculationComplete, remarkComplete, isComplete, errors } =
      getCompletionStatus(indicator);

    // Update schema status
    updateSchemaStatus(indicatorId, {
      formComplete,
      calculationComplete,
      remarkComplete,
      isComplete,
      errors,
      lastEdited: Date.now(),
    });

    console.log(
      `[Validation] Indicator ${indicator.code || indicatorId}: ${
        isComplete ? '✓ Complete' : `✗ ${errors.filter(e => e.severity === 'error').length} errors`
      }`
    );
  },

  clearValidationErrors: (indicatorId) => {
    const { updateSchemaStatus } = get();
    updateSchemaStatus(indicatorId, {
      errors: [],
    });
  },

  getValidationErrors: (indicatorId) => {
    const { schemaStatus } = get();
    const status = schemaStatus.get(indicatorId);
    return status?.errors || [];
  },

  // ============================================================================
  // Copy/Paste Actions (Phase 2)
  // ============================================================================

  copySchema: (indicatorId, type) => {
    const { getNodeById } = get();
    const indicator = getNodeById(indicatorId);

    if (!indicator) {
      console.warn(`[Copy Schema] Indicator ${indicatorId} not found`);
      return;
    }

    // Get schema based on type
    let schema: any = null;
    switch (type) {
      case 'form':
        schema = indicator.form_schema;
        break;
      case 'calculation':
        schema = indicator.calculation_schema;
        break;
      case 'remark':
        schema = indicator.remark_schema;
        break;
    }

    if (!schema) {
      console.warn(`[Copy Schema] No ${type} schema found for indicator ${indicatorId}`);
      return;
    }

    // Deep clone the schema to avoid reference issues
    const clonedSchema = structuredClone(schema);

    // Set copied schema state
    set({
      copiedSchema: {
        type,
        schema: clonedSchema,
        sourceIndicatorId: indicatorId,
        sourceIndicatorCode: indicator.code,
        copiedAt: Date.now(),
      },
    });

    console.log(
      `[Copy Schema] Copied ${type} schema from ${indicator.code || indicatorId}`
    );
  },

  pasteSchema: (indicatorId, type) => {
    const { copiedSchema, getNodeById, updateNode, markSchemaDirty } = get();

    // Check if there's a copied schema
    if (!copiedSchema) {
      console.warn('[Paste Schema] No schema copied');
      return false;
    }

    // Check if types match
    if (copiedSchema.type !== type) {
      console.warn(
        `[Paste Schema] Type mismatch: copied ${copiedSchema.type}, trying to paste as ${type}`
      );
      return false;
    }

    // Check if target indicator exists
    const indicator = getNodeById(indicatorId);
    if (!indicator) {
      console.warn(`[Paste Schema] Indicator ${indicatorId} not found`);
      return false;
    }

    // Deep clone to avoid reference issues
    const clonedSchema = structuredClone(copiedSchema.schema);

    // Update indicator with pasted schema
    const updates: Partial<IndicatorNode> = {};
    switch (type) {
      case 'form':
        updates.form_schema = clonedSchema;
        break;
      case 'calculation':
        updates.calculation_schema = clonedSchema;
        break;
      case 'remark':
        updates.remark_schema = clonedSchema;
        break;
    }

    updateNode(indicatorId, updates);
    markSchemaDirty(indicatorId);

    console.log(
      `[Paste Schema] Pasted ${type} schema from ${copiedSchema.sourceIndicatorCode || copiedSchema.sourceIndicatorId} to ${indicator.code || indicatorId}`
    );

    return true;
  },

  clearCopiedSchema: () => {
    set({ copiedSchema: null });
    console.log('[Copy Schema] Cleared copied schema');
  },

  hasCopiedSchema: (type) => {
    const { copiedSchema } = get();
    return copiedSchema !== null && copiedSchema.type === type;
  },

  // ============================================================================
  // Leaf Indicator Selectors & Navigation (Phase 6)
  // ============================================================================

  isLeafIndicator: (indicatorId) => {
    const { tree } = get();
    const indicator = tree.nodes.get(indicatorId);
    if (!indicator) return false;

    const allIndicators = Array.from(tree.nodes.values());
    return isLeafIndicatorUtil(indicator, allIndicators);
  },

  canConfigureSchemas: (indicatorId) => {
    const { tree } = get();
    const indicator = tree.nodes.get(indicatorId);
    if (!indicator) return false;

    const allIndicators = Array.from(tree.nodes.values());
    return canConfigureSchemasUtil(indicator, allIndicators);
  },

  getLeafIndicators: () => {
    const { tree } = get();
    return getAllLeafIndicators(tree.nodes);
  },

  getDescendantLeavesOf: (indicatorId) => {
    const { tree } = get();
    const indicator = tree.nodes.get(indicatorId);
    if (!indicator) return [];

    const allIndicators = Array.from(tree.nodes.values());
    return getAllDescendantLeaves(indicator, allIndicators);
  },

  getParentStatusInfo: (indicatorId) => {
    const { tree, schemaStatus } = get();
    const indicator = tree.nodes.get(indicatorId);

    if (!indicator) {
      return {
        status: 'empty' as const,
        totalLeaves: 0,
        completeLeaves: 0,
        percentage: 0,
        firstIncompleteLeaf: null,
      };
    }

    const allIndicators = Array.from(tree.nodes.values());
    return getParentStatusUtil(indicator, allIndicators, schemaStatus);
  },

  navigateToNextIncomplete: () => {
    const { tree, schemaStatus, navigateToIndicator } = get();
    const nextIncomplete = getFirstIncompleteLeaf(
      tree.nodes,
      tree.rootIds,
      schemaStatus
    );

    if (nextIncomplete) {
      navigateToIndicator(nextIncomplete.temp_id);
      console.log(
        `[Navigation] Navigated to next incomplete: ${nextIncomplete.code || nextIncomplete.temp_id}`
      );
    } else {
      console.log('[Navigation] All indicators complete!');
    }
  },

  archiveSchemasForIndicator: (indicatorId) => {
    const { tree, updateNode } = get();
    const indicator = tree.nodes.get(indicatorId);

    if (!indicator) {
      console.warn(`[Schema Archive] Indicator ${indicatorId} not found`);
      return;
    }

    // Archive current schemas if they exist
    if (indicator.form_schema || indicator.calculation_schema || indicator.remark_schema) {
      const archivedSchemas = {
        form_schema: indicator.form_schema,
        calculation_schema: indicator.calculation_schema,
        remark_schema: indicator.remark_schema,
        archived_at: Date.now(),
      };

      console.log(
        `[Schema Archive] Archiving schemas for ${indicator.code || indicatorId}`
      );

      // Update indicator: clear schemas and save to metadata
      updateNode(indicatorId, {
        form_schema: undefined,
        calculation_schema: undefined,
        remark_schema: undefined,
        metadata: {
          ...indicator.metadata,
          archived_schemas: archivedSchemas,
        },
      });
    }
  },

  restoreArchivedSchemas: (indicatorId) => {
    const { tree, updateNode } = get();
    const indicator = tree.nodes.get(indicatorId);

    if (!indicator) {
      console.warn(`[Schema Restore] Indicator ${indicatorId} not found`);
      return;
    }

    const archivedSchemas = indicator.metadata?.archived_schemas;

    if (!archivedSchemas) {
      console.warn(`[Schema Restore] No archived schemas found for ${indicatorId}`);
      return;
    }

    console.log(
      `[Schema Restore] Restoring schemas for ${indicator.code || indicatorId}`
    );

    // Restore schemas and clear archived metadata
    updateNode(indicatorId, {
      form_schema: archivedSchemas.form_schema,
      calculation_schema: archivedSchemas.calculation_schema,
      remark_schema: archivedSchemas.remark_schema,
      metadata: {
        ...indicator.metadata,
        archived_schemas: undefined,
      },
    });
  },

  hasArchivedSchemas: (indicatorId) => {
    const { tree } = get();
    const indicator = tree.nodes.get(indicatorId);
    return !!(indicator?.metadata?.archived_schemas);
  },
}));
