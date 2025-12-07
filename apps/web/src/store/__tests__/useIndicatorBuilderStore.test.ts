import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIndicatorBuilderStore, IndicatorNode, IndicatorTreeState } from '../useIndicatorBuilderStore';

// Mock uuid to have predictable IDs in tests
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(7)),
}));

describe('useIndicatorBuilderStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useIndicatorBuilderStore.getState();
    store.resetTree();
    useIndicatorBuilderStore.setState({
      mode: 'edit',
      selectedNodeId: null,
      editingNodeId: null,
      isDirty: false,
    });
  });

  describe('Initialization', () => {
    it('should have initial state', () => {
      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(0);
      expect(state.tree.rootIds).toEqual([]);
      expect(state.tree.governanceAreaId).toBeNull();
      expect(state.tree.creationMode).toBe('incremental');
      expect(state.tree.currentStep).toBe(1);
      expect(state.mode).toBe('edit');
      expect(state.selectedNodeId).toBeNull();
      expect(state.editingNodeId).toBeNull();
      expect(state.isDirty).toBe(false);
    });

    it('should initialize tree with governance area', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(5, 'bulk_import');

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.governanceAreaId).toBe(5);
      expect(state.tree.creationMode).toBe('bulk_import');
      expect(state.tree.currentStep).toBe(1);
      expect(state.tree.nodes.size).toBe(0);
      expect(state.isDirty).toBe(false);
    });

    it('should load existing tree from draft', () => {
      const mockTree: IndicatorTreeState = {
        nodes: new Map([
          ['node1', {
            temp_id: 'node1',
            parent_temp_id: null,
            order: 1,
            name: 'Root Node',
            is_active: true,
            is_auto_calculable: false,
            is_profiling_only: false,
          }],
        ]),
        rootIds: ['node1'],
        governanceAreaId: 3,
        creationMode: 'incremental',
        currentStep: 2,
        draftId: 'draft-123',
        version: 5,
      };

      const store = useIndicatorBuilderStore.getState();
      store.loadTree(mockTree);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(1);
      expect(state.tree.governanceAreaId).toBe(3);
      expect(state.tree.draftId).toBe('draft-123');
      expect(state.tree.version).toBe(5);
      expect(state.isDirty).toBe(false);
    });

    it('should convert plain object nodes to Map when loading', () => {
      const mockTree: any = {
        nodes: {
          'node1': {
            temp_id: 'node1',
            parent_temp_id: null,
            order: 1,
            name: 'Root',
            is_active: true,
            is_auto_calculable: false,
            is_profiling_only: false,
          },
        },
        rootIds: ['node1'],
        governanceAreaId: 1,
        creationMode: 'incremental',
        currentStep: 1,
      };

      const store = useIndicatorBuilderStore.getState();
      store.loadTree(mockTree);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes).toBeInstanceOf(Map);
      expect(state.tree.nodes.size).toBe(1);
      expect(state.tree.nodes.get('node1')?.name).toBe('Root');
    });

    it('should reset tree to empty state', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(5, 'incremental');
      store.addNode({ name: 'Test' });
      useIndicatorBuilderStore.setState({ selectedNodeId: 'test-id', isDirty: true });

      store.resetTree();

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(0);
      expect(state.tree.rootIds).toEqual([]);
      expect(state.isDirty).toBe(false);
      expect(state.selectedNodeId).toBeNull();
      expect(state.editingNodeId).toBeNull();
    });
  });

  describe('addNode', () => {
    beforeEach(() => {
      useIndicatorBuilderStore.getState().initializeTree(1, 'incremental');
    });

    it('should add a root node', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({ name: 'Root Node' });

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(1);
      expect(state.tree.rootIds).toContain(nodeId);
      expect(state.isDirty).toBe(true);

      const node = state.tree.nodes.get(nodeId);
      expect(node?.name).toBe('Root Node');
      expect(node?.parent_temp_id).toBeNull();
      expect(node?.order).toBe(1); // 1-based ordering
      expect(node?.code).toBe('1.1'); // governanceAreaId.position
    });

    it('should add multiple root nodes with correct codes', () => {
      const store = useIndicatorBuilderStore.getState();
      const node1 = store.addNode({ name: 'Root 1' });
      const node2 = store.addNode({ name: 'Root 2' });

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(node1)?.code).toBe('1.1'); // First root: governanceAreaId.1
      expect(state.tree.nodes.get(node2)?.code).toBe('1.2'); // Second root: governanceAreaId.2
    });

    it('should add a child node', () => {
      const store = useIndicatorBuilderStore.getState();
      const rootId = store.addNode({ name: 'Root' });
      const childId = store.addNode({ name: 'Child' }, rootId);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(2);
      expect(state.tree.rootIds).toEqual([rootId]);

      const child = state.tree.nodes.get(childId);
      expect(child?.parent_temp_id).toBe(rootId);
      expect(child?.code).toBe('1.1.1'); // root is 1.1, child is 1.1.1
    });

    it('should add nested children with correct codes', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const grandchild = store.addNode({ name: 'Grandchild' }, child1);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(root)?.code).toBe('1.1'); // governanceAreaId.1
      expect(state.tree.nodes.get(child1)?.code).toBe('1.1.1');
      expect(state.tree.nodes.get(child2)?.code).toBe('1.1.2');
      expect(state.tree.nodes.get(grandchild)?.code).toBe('1.1.1.1');
    });

    it('should use default values for optional fields', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({});

      const node = useIndicatorBuilderStore.getState().tree.nodes.get(nodeId);
      expect(node?.name).toBe('New Indicator');
      expect(node?.is_active).toBe(true);
      expect(node?.is_auto_calculable).toBe(false);
      expect(node?.is_profiling_only).toBe(false);
    });

    it('should respect provided field values', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({
        name: 'Custom Name',
        is_active: false,
        is_auto_calculable: true,
        is_profiling_only: true,
        description: 'Test description',
      });

      const node = useIndicatorBuilderStore.getState().tree.nodes.get(nodeId);
      expect(node?.name).toBe('Custom Name');
      expect(node?.is_active).toBe(false);
      expect(node?.is_auto_calculable).toBe(true);
      expect(node?.is_profiling_only).toBe(true);
      expect(node?.description).toBe('Test description');
    });
  });

  describe('updateNode', () => {
    it('should update node properties', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const nodeId = store.addNode({ name: 'Original' });

      store.updateNode(nodeId, { name: 'Updated', description: 'New description' });

      const node = useIndicatorBuilderStore.getState().tree.nodes.get(nodeId);
      expect(node?.name).toBe('Updated');
      expect(node?.description).toBe('New description');
      expect(useIndicatorBuilderStore.getState().isDirty).toBe(true);
    });

    it('should recalculate codes when name changes', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const rootId = store.addNode({ name: 'Root' });

      // Clear isDirty to verify code recalculation sets it
      useIndicatorBuilderStore.setState({ isDirty: false });

      store.updateNode(rootId, { name: 'Updated Root' });

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(rootId)?.name).toBe('Updated Root');
      expect(state.tree.nodes.get(rootId)?.code).toBe('1.1'); // With governanceAreaId=1
    });

    it('should handle updating non-existent node gracefully', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');

      // Should not throw
      store.updateNode('non-existent-id', { name: 'Test' });

      // State should remain unchanged
      expect(useIndicatorBuilderStore.getState().tree.nodes.size).toBe(0);
    });
  });

  describe('deleteNode', () => {
    it('should delete a single node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const nodeId = store.addNode({ name: 'To Delete' });

      expect(useIndicatorBuilderStore.getState().tree.nodes.size).toBe(1);

      store.deleteNode(nodeId);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(0);
      expect(state.tree.rootIds).toEqual([]);
      expect(state.isDirty).toBe(true);
    });

    it('should delete node and all descendants', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const grandchild = store.addNode({ name: 'Grandchild' }, child1);

      expect(useIndicatorBuilderStore.getState().tree.nodes.size).toBe(4);

      store.deleteNode(child1); // Should delete child1 and grandchild

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(2);
      expect(state.tree.nodes.has(root)).toBe(true);
      expect(state.tree.nodes.has(child2)).toBe(true);
      expect(state.tree.nodes.has(child1)).toBe(false);
      expect(state.tree.nodes.has(grandchild)).toBe(false);
    });

    it('should reorder siblings after deletion', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const child3 = store.addNode({ name: 'Child 3' }, root);

      store.deleteNode(child2);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(child1)?.order).toBe(1);
      expect(state.tree.nodes.get(child3)?.order).toBe(2);
    });

    it('should clear selectedNodeId if deleting selected node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const nodeId = store.addNode({ name: 'Node' });
      store.selectNode(nodeId);

      expect(useIndicatorBuilderStore.getState().selectedNodeId).toBe(nodeId);

      store.deleteNode(nodeId);

      expect(useIndicatorBuilderStore.getState().selectedNodeId).toBeNull();
    });

    it('should clear editingNodeId if deleting editing node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const nodeId = store.addNode({ name: 'Node' });
      store.setEditingNode(nodeId);

      expect(useIndicatorBuilderStore.getState().editingNodeId).toBe(nodeId);

      store.deleteNode(nodeId);

      expect(useIndicatorBuilderStore.getState().editingNodeId).toBeNull();
    });

    it('should handle deleting non-existent node gracefully', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');

      // Should not throw
      store.deleteNode('non-existent-id');

      expect(useIndicatorBuilderStore.getState().tree.nodes.size).toBe(0);
    });
  });

  describe('duplicateNode', () => {
    it('should duplicate a single node without children', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const originalId = store.addNode({ name: 'Original' });

      const duplicateId = store.duplicateNode(originalId, false);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(2);
      expect(duplicateId).not.toBe(originalId);

      const duplicate = state.tree.nodes.get(duplicateId);
      expect(duplicate?.name).toBe('Original (Copy)');
      expect(duplicate?.parent_temp_id).toBeNull();
      expect(duplicate?.id).toBeUndefined();
    });

    it('should duplicate node with all children', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);
      const grandchild = store.addNode({ name: 'Grandchild' }, child);

      const duplicateId = store.duplicateNode(root, true);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.size).toBe(6); // 3 original + 3 duplicates

      const duplicate = state.tree.nodes.get(duplicateId);
      expect(duplicate?.name).toBe('Root (Copy)');

      // Find duplicated children
      const duplicateChildren = Array.from(state.tree.nodes.values())
        .filter(n => n.parent_temp_id === duplicateId);
      expect(duplicateChildren.length).toBe(1);
    });

    it('should shift siblings down after duplication', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root1 = store.addNode({ name: 'Root 1' });
      const root2 = store.addNode({ name: 'Root 2' });

      expect(useIndicatorBuilderStore.getState().tree.nodes.get(root1)?.order).toBe(1);
      expect(useIndicatorBuilderStore.getState().tree.nodes.get(root2)?.order).toBe(2);

      store.duplicateNode(root1, false);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(root2)?.order).toBe(3); // Shifted down
    });

    it('should return empty string for non-existent node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');

      const result = store.duplicateNode('non-existent-id', false);

      expect(result).toBe('');
    });
  });

  describe('moveNode', () => {
    it('should move node to new parent', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root1 = store.addNode({ name: 'Root 1' });
      const root2 = store.addNode({ name: 'Root 2' });
      const child = store.addNode({ name: 'Child' }, root1);

      store.moveNode(child, root2);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(child)?.parent_temp_id).toBe(root2);
      expect(state.tree.nodes.get(child)?.code).toBe('1.2.1'); // root2 is 1.2, child is 1.2.1
      expect(state.isDirty).toBe(true);
    });

    it('should move root node to become a child', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root1 = store.addNode({ name: 'Root 1' });
      const root2 = store.addNode({ name: 'Root 2' });

      expect(useIndicatorBuilderStore.getState().tree.rootIds).toEqual([root1, root2]);

      store.moveNode(root2, root1);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.rootIds).toEqual([root1]);
      expect(state.tree.nodes.get(root2)?.parent_temp_id).toBe(root1);
      expect(state.tree.nodes.get(root2)?.code).toBe('1.1.1'); // root1 is 1.1, root2 becomes child 1.1.1
    });

    it('should move child to become root', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);

      store.moveNode(child, null);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.rootIds).toContain(child);
      expect(state.tree.nodes.get(child)?.parent_temp_id).toBeNull();
      expect(state.tree.nodes.get(child)?.code).toBe('1.2'); // becomes second root: 1.2
    });

    it('should prevent moving node to its own descendant', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);
      const grandchild = store.addNode({ name: 'Grandchild' }, child);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      store.moveNode(root, grandchild); // Try to move root under its grandchild

      expect(consoleErrorSpy).toHaveBeenCalledWith('Cannot move node to its own descendant');
      expect(useIndicatorBuilderStore.getState().tree.nodes.get(root)?.parent_temp_id).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should reorder siblings correctly after move', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const child3 = store.addNode({ name: 'Child 3' }, root);

      store.moveNode(child1, null); // Move child1 to root

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(child2)?.order).toBe(1);
      expect(state.tree.nodes.get(child3)?.order).toBe(2);
    });

    it('should insert at specific index when provided', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const child3 = store.addNode({ name: 'Child 3' }, root);

      store.moveNode(child3, root, 0); // Move child3 to first position

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(child3)?.order).toBe(1);
      expect(state.tree.nodes.get(child1)?.order).toBe(2);
      expect(state.tree.nodes.get(child2)?.order).toBe(3);
    });
  });

  describe('reorderNodes', () => {
    it('should reorder root nodes', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root1 = store.addNode({ name: 'Root 1' });
      const root2 = store.addNode({ name: 'Root 2' });
      const root3 = store.addNode({ name: 'Root 3' });

      store.reorderNodes(null, [root3, root1, root2]);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.rootIds).toEqual([root3, root1, root2]);
      expect(state.tree.nodes.get(root3)?.order).toBe(1); // 1-based ordering
      expect(state.tree.nodes.get(root1)?.order).toBe(2);
      expect(state.tree.nodes.get(root2)?.order).toBe(3);
      expect(state.tree.nodes.get(root3)?.code).toBe('1.1'); // First root with governanceAreaId=1
      expect(state.tree.nodes.get(root1)?.code).toBe('1.2'); // Second root
      expect(state.tree.nodes.get(root2)?.code).toBe('1.3'); // Third root
    });

    it('should reorder child nodes', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const child3 = store.addNode({ name: 'Child 3' }, root);

      store.reorderNodes(root, [child3, child2, child1]);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(child3)?.order).toBe(1); // 1-based ordering
      expect(state.tree.nodes.get(child2)?.order).toBe(2);
      expect(state.tree.nodes.get(child1)?.order).toBe(3);
      expect(state.tree.nodes.get(child3)?.code).toBe('1.1.1'); // root is 1.1, first child is 1.1.1
      expect(state.tree.nodes.get(child2)?.code).toBe('1.1.2');
      expect(state.tree.nodes.get(child1)?.code).toBe('1.1.3');
    });
  });

  describe('UI State Actions', () => {
    it('should select node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.selectNode('test-id');

      expect(useIndicatorBuilderStore.getState().selectedNodeId).toBe('test-id');
    });

    it('should clear selection', () => {
      const store = useIndicatorBuilderStore.getState();
      store.selectNode('test-id');
      store.selectNode(null);

      expect(useIndicatorBuilderStore.getState().selectedNodeId).toBeNull();
    });

    it('should set editing node', () => {
      const store = useIndicatorBuilderStore.getState();
      store.setEditingNode('edit-id');

      expect(useIndicatorBuilderStore.getState().editingNodeId).toBe('edit-id');
    });

    it('should set mode', () => {
      const store = useIndicatorBuilderStore.getState();
      store.setMode('browse');

      expect(useIndicatorBuilderStore.getState().mode).toBe('browse');
    });

    it('should set current step', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      store.setCurrentStep(3);

      expect(useIndicatorBuilderStore.getState().tree.currentStep).toBe(3);
    });

    it('should mark as saved', () => {
      const store = useIndicatorBuilderStore.getState();
      useIndicatorBuilderStore.setState({ isDirty: true });
      store.markAsSaved();

      expect(useIndicatorBuilderStore.getState().isDirty).toBe(false);
    });

    it('should set draft metadata', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      store.setDraftMetadata('draft-123', 5);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.draftId).toBe('draft-123');
      expect(state.tree.version).toBe(5);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
    });

    it('should get node by id', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({ name: 'Test Node' });

      const node = store.getNodeById(nodeId);

      expect(node).toBeDefined();
      expect(node?.name).toBe('Test Node');
    });

    it('should return undefined for non-existent node', () => {
      const store = useIndicatorBuilderStore.getState();
      const node = store.getNodeById('non-existent');

      expect(node).toBeUndefined();
    });

    it('should get children of root (no parent)', () => {
      const store = useIndicatorBuilderStore.getState();
      const root1 = store.addNode({ name: 'Root 1' });
      const root2 = store.addNode({ name: 'Root 2' });

      const children = store.getChildrenOf(null);

      expect(children.length).toBe(2);
      expect(children[0].temp_id).toBe(root1);
      expect(children[1].temp_id).toBe(root2);
    });

    it('should get children of specific node', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);

      const children = store.getChildrenOf(root);

      expect(children.length).toBe(2);
      expect(children[0].temp_id).toBe(child1);
      expect(children[1].temp_id).toBe(child2);
    });

    it('should return empty array for leaf node', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);

      const children = store.getChildrenOf(child);

      expect(children).toEqual([]);
    });

    it('should get tree view as nested structure', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);

      const treeView = store.getTreeView();

      expect(treeView.length).toBe(1);
      expect(treeView[0].temp_id).toBe(root);
      expect((treeView[0] as any).children.length).toBe(1);
      expect((treeView[0] as any).children[0].temp_id).toBe(child);
    });

    it('should get all nodes as flat array', () => {
      const store = useIndicatorBuilderStore.getState();
      store.addNode({ name: 'Root 1' });
      store.addNode({ name: 'Root 2' });

      const allNodes = store.getAllNodes();

      expect(allNodes.length).toBe(2);
    });

    it('should get parent of node', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);

      const parent = store.getParentOf(child);

      expect(parent).toBeDefined();
      expect(parent?.temp_id).toBe(root);
    });

    it('should return null for root node parent', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });

      const parent = store.getParentOf(root);

      expect(parent).toBeNull();
    });

    it('should get siblings of node', () => {
      const store = useIndicatorBuilderStore.getState();
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);
      const child3 = store.addNode({ name: 'Child 3' }, root);

      const siblings = store.getSiblingsOf(child2);

      expect(siblings.length).toBe(3);
      expect(siblings.map(s => s.temp_id)).toEqual([child1, child2, child3]);
    });

    it('should check for unsaved changes', () => {
      const store = useIndicatorBuilderStore.getState();

      expect(store.hasUnsavedChanges()).toBe(false);

      store.addNode({ name: 'Test' });

      expect(store.hasUnsavedChanges()).toBe(true);

      store.markAsSaved();

      expect(store.hasUnsavedChanges()).toBe(false);
    });

    it('should get selected node', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({ name: 'Test' });
      store.selectNode(nodeId);

      const selectedNode = store.getSelectedNode();

      expect(selectedNode).toBeDefined();
      expect(selectedNode?.temp_id).toBe(nodeId);
    });

    it('should return undefined when no node selected', () => {
      const store = useIndicatorBuilderStore.getState();

      const selectedNode = store.getSelectedNode();

      expect(selectedNode).toBeUndefined();
    });

    it('should get editing node', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({ name: 'Test' });
      store.setEditingNode(nodeId);

      const editingNode = store.getEditingNode();

      expect(editingNode).toBeDefined();
      expect(editingNode?.temp_id).toBe(nodeId);
    });

    it('should export for submission without code and id', () => {
      const store = useIndicatorBuilderStore.getState();
      const nodeId = store.addNode({
        name: 'Test',
        description: 'Description',
      });

      // Manually set id to test it's excluded
      const node = store.getNodeById(nodeId);
      if (node) {
        (node as any).id = 123;
      }

      const exported = store.exportForSubmission();

      expect(exported.length).toBe(1);
      expect(exported[0]).not.toHaveProperty('id');
      expect(exported[0]).not.toHaveProperty('code');
      expect(exported[0]).toHaveProperty('name');
      expect(exported[0]).toHaveProperty('temp_id');
      expect(exported[0]).toHaveProperty('description');
    });
  });

  describe('Code Recalculation', () => {
    it('should recalculate codes for entire tree', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child1 = store.addNode({ name: 'Child 1' }, root);
      const child2 = store.addNode({ name: 'Child 2' }, root);

      // Manually corrupt codes
      const nodes = useIndicatorBuilderStore.getState().tree.nodes;
      nodes.get(root)!.code = 'wrong';
      nodes.get(child1)!.code = 'wrong';
      nodes.get(child2)!.code = 'wrong';

      store.recalculateCodes();

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(root)?.code).toBe('1.1'); // With governanceAreaId=1
      expect(state.tree.nodes.get(child1)?.code).toBe('1.1.1');
      expect(state.tree.nodes.get(child2)?.code).toBe('1.1.2');
    });

    it('should recalculate codes after adding nodes', () => {
      const store = useIndicatorBuilderStore.getState();
      store.initializeTree(1, 'incremental');
      const root = store.addNode({ name: 'Root' });
      const child = store.addNode({ name: 'Child' }, root);

      const state = useIndicatorBuilderStore.getState();
      expect(state.tree.nodes.get(root)?.code).toBe('1.1'); // With governanceAreaId=1
      expect(state.tree.nodes.get(child)?.code).toBe('1.1.1');
    });
  });
});
