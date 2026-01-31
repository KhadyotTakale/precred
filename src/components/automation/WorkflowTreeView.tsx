import { useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { DndContext, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Settings,
  ChevronRight,
  ChevronDown,
  Play,
  Square,
  GitBranch,
  Clock,
  Loader2,
  CheckCircle2,
  Code,
  TreePine,
  LayoutGrid,
  GripVertical,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { WorkflowTreeNode } from "./WorkflowTreeNode";
import { ActivityConfigPanel } from "./ActivityConfigPanel";
import { ActivityBuilder } from "./ActivityBuilder";
import { TriggerConfigDialog } from "./TriggerConfigDialog";
import { WorkflowJsonEditor } from "./WorkflowJsonEditor";
import { validateWorkflow, ValidationResult } from "./validation";
import { ValidationDialog } from "./ValidationDialog";
import type { WorkflowNode, NodeData, Connection, Workflow } from "./types";

interface WorkflowTreeViewProps {
  onBack: () => void;
  editingWorkflow?: Workflow | null;
  onSwitchToCanvas?: () => void;
}

// Generate unique ID
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function WorkflowTreeView({ onBack, editingWorkflow, onSwitchToCanvas }: WorkflowTreeViewProps) {
  const { user } = useUser();
  const { toast } = useToast();

  // Workflow state
  const [workflowId, setWorkflowId] = useState<string | null>(editingWorkflow?.id || null);
  const [workflowTitle, setWorkflowTitle] = useState("New Automation");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!editingWorkflow?.id);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Dialog states
  const [showTriggerDialog, setShowTriggerDialog] = useState(!editingWorkflow?.id);
  const [nodeToDelete, setNodeToDelete] = useState<WorkflowNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [showDeleteWorkflowDialog, setShowDeleteWorkflowDialog] = useState(false);
  const [isDeletingWorkflow, setIsDeletingWorkflow] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Refs
  const isInitialLoadRef = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const activeActivity = nodes.find(n => n.id === activeActivityId);
  const startNode = nodes.find(n => n.type === 'start');

  // Build tree structure from nodes and connections
  const buildTree = useCallback(() => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const childrenMap = new Map<string, string[]>();
    const parentMap = new Map<string, string>();

    // Build parent-child relationships from connections
    connections.forEach(conn => {
      const existing = childrenMap.get(conn.sourceId) || [];
      existing.push(conn.targetId);
      childrenMap.set(conn.sourceId, existing);
      parentMap.set(conn.targetId, conn.sourceId);
    });

    // Find root nodes - start node first, exclude end node from roots (it will be rendered last)
    const rootNodes = nodes
      .filter(n => (!parentMap.has(n.id) || n.type === 'start') && n.type !== 'end')
      .sort((a, b) => (a.type === 'start' ? -1 : b.type === 'start' ? 1 : 0));

    // Find the end node
    const endNode = nodes.find(n => n.type === 'end');

    return { nodeMap, childrenMap, parentMap, rootNodes, endNode };
  }, [nodes, connections]);

  // Fetch workflow details
  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      if (!editingWorkflow?.id || !user?.id) return;

      setIsLoading(true);
      try {
        const [response, activitiesResponse] = await Promise.all([
          adminAPI.getItem(user.id, parseInt(editingWorkflow.id)),
          adminAPI.getWorkflowActivities(user.id, parseInt(editingWorkflow.id)),
        ]);

        const itemInfo = response.item_info || {};

        setWorkflowTitle(response.title || "Untitled Workflow");
        setWorkflowDescription(response.description || "");
        setIsActive(!response.Is_disabled);

        // Build maps from backend activities
        const backendActivitiesList = activitiesResponse || [];
        const activityIdMap = new Map<string, number>();

        backendActivitiesList.forEach((activity: { id: number; name: string }) => {
          activityIdMap.set(activity.name, activity.id);
        });

        // Fetch full activity details
        const activityDetailPromises = backendActivitiesList.map(
          (activity: { id: number }) => adminAPI.getWorkflowActivity(user.id, activity.id)
        );
        const activityDetails = await Promise.all(activityDetailPromises);

        const activityByIdMap = new Map<number, any>();
        activityDetails.forEach((activity) => {
          if (activity?.id) {
            activityByIdMap.set(activity.id, activity);
          }
        });

        let syncedNodes: WorkflowNode[] = [];
        const matchedActivityIds = new Set<number>();

        if (itemInfo.nodes && itemInfo.nodes.length > 0) {
          syncedNodes = itemInfo.nodes.map((node: WorkflowNode) => {
            if (node.type === 'activity') {
              const existingActivityId = node.data.activityId;
              if (existingActivityId && activityByIdMap.has(existingActivityId)) {
                matchedActivityIds.add(existingActivityId);
                const backendActivity = activityByIdMap.get(existingActivityId)!;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    activityId: existingActivityId,
                    actions: backendActivity.activity_info?.actions || node.data.actions || [],
                    routes: backendActivity.activity_info?.routes || node.data.routes || [],
                  },
                };
              }
              const backendActivityId = activityIdMap.get(node.data.label);
              if (backendActivityId && activityByIdMap.has(backendActivityId)) {
                matchedActivityIds.add(backendActivityId);
                const backendActivity = activityByIdMap.get(backendActivityId)!;
                return {
                  ...node,
                  data: {
                    ...node.data,
                    activityId: backendActivityId,
                    actions: backendActivity.activity_info?.actions || node.data.actions || [],
                    routes: backendActivity.activity_info?.routes || node.data.routes || [],
                  },
                };
              }
            }
            return node;
          });
        } else {
          syncedNodes = [
            {
              id: generateId(),
              type: 'start' as const,
              position: { x: 0, y: 0 },
              data: { label: 'Start', itemType: '', triggerEvent: '' },
            },
            {
              id: generateId(),
              type: 'end' as const,
              position: { x: 0, y: 100 },
              data: { label: 'End' },
            },
          ];
        }

        // Add missing activities from backend
        const endNode = syncedNodes.find(n => n.type === 'end');
        let offsetIndex = 0;

        activityByIdMap.forEach((activity, activityId) => {
          if (!matchedActivityIds.has(activityId)) {
            const newNode: WorkflowNode = {
              id: activity.activity_info?.nodeId || generateId(),
              type: 'activity',
              position: activity.activity_info?.position || { x: 0, y: 0 },
              data: {
                label: activity.name || 'Activity',
                description: activity.description || '',
                activityId: activity.id,
                actions: activity.activity_info?.actions || [],
                routes: activity.activity_info?.routes || [],
              },
            };
            syncedNodes.push(newNode);
            offsetIndex++;
          }
        });

        setNodes(syncedNodes);
        setConnections(itemInfo.connections || []);

        // Expand all nodes by default
        setExpandedNodes(new Set(syncedNodes.map(n => n.id)));
      } catch (error) {
        console.error('Failed to fetch workflow details:', error);
        toast({
          title: "Error",
          description: "Failed to load workflow details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    };

    fetchWorkflowDetails();
  }, [editingWorkflow?.id, user?.id, toast]);

  // Register new activity
  const registerActivity = useCallback(async (node: WorkflowNode, itemsId: number): Promise<number | null> => {
    if (!user?.id || node.type !== 'activity') return null;

    try {
      const response = await adminAPI.createWorkflowActivity(user.id, {
        items_id: itemsId,
        name: node.data.label,
        description: node.data.description || '',
        activity_info: {
          nodeId: node.id,
          position: node.position,
          actions: node.data.actions || [],
          routes: node.data.routes || [],
        },
      });
      return response.id;
    } catch (err) {
      console.error('Failed to register activity:', err);
      return null;
    }
  }, [user?.id]);

  // Update existing activity
  const updateActivity = useCallback(async (node: WorkflowNode) => {
    if (!user?.id || node.type !== 'activity' || !node.data.activityId) return;

    try {
      await adminAPI.updateWorkflowActivity(user.id, node.data.activityId, {
        name: node.data.label,
        description: node.data.description || '',
        activity_info: {
          action_id: node.id,
          actions: node.data.actions || [],
          routes: node.data.routes || [],
        },
      });
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  }, [user?.id]);

  // Auto-save effect
  useEffect(() => {
    if (isInitialLoadRef.current || nodes.length === 0 || isLoading) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!user?.id) return;

      setIsAutoSaving(true);
      try {
        const strippedNodes = nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            actions: undefined,
            routes: undefined,
          },
        }));
        const itemInfo = { nodes: strippedNodes, connections };
        let savedId = workflowId ? parseInt(workflowId) : null;

        if (workflowId) {
          await adminAPI.updateWorkflow(user.id, parseInt(workflowId), {
            title: workflowTitle,
            description: workflowDescription,
            item_info: itemInfo,
            Is_disabled: !isActive,
          });
        } else {
          const response = await adminAPI.createWorkflow(user.id, {
            name: workflowTitle,
            description: workflowDescription,
            item_info: itemInfo,
            is_active: isActive,
          });
          savedId = response.id;
          setWorkflowId(String(savedId));
        }

        const activityNodes = nodes.filter(n => n.type === 'activity' && n.data.activityId);
        await Promise.all(activityNodes.map(node => updateActivity(node)));
      } catch (err) {
        console.error('Auto-save failed:', err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, connections, workflowTitle, workflowDescription, isActive, workflowId, user?.id, isLoading, updateActivity]);

  // Handle node update
  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId
        ? { ...n, data: { ...n.data, ...data } }
        : n
    ));
  }, []);

  // Add new activity after a node
  const handleAddActivity = useCallback(async (afterNodeId: string) => {
    const newNode: WorkflowNode = {
      id: generateId(),
      type: 'activity',
      position: { x: 0, y: 0 },
      data: {
        label: 'New Activity',
        actions: [],
      },
    };

    // Find the node we're inserting after
    const afterNode = nodes.find(n => n.id === afterNodeId);
    if (!afterNode) return;

    // Find children of afterNode
    const existingChildren = connections.filter(c => c.sourceId === afterNodeId);

    // Create connection from afterNode to new node
    const newConnections: Connection[] = [
      {
        id: generateId(),
        sourceId: afterNodeId,
        targetId: newNode.id,
      },
    ];

    // If afterNode had children, reconnect them to new node
    if (existingChildren.length > 0 && afterNode.type !== 'condition') {
      existingChildren.forEach(child => {
        newConnections.push({
          id: generateId(),
          sourceId: newNode.id,
          targetId: child.targetId,
        });
      });
      // Remove old connections
      setConnections(prev => [
        ...prev.filter(c => c.sourceId !== afterNodeId),
        ...newConnections,
      ]);
    } else {
      setConnections(prev => [...prev, ...newConnections]);
    }

    // Register activity to backend
    let targetWorkflowId = workflowId ? parseInt(workflowId) : null;

    if (!targetWorkflowId && user?.id) {
      try {
        const strippedNodes = nodes.map(n => ({
          ...n,
          data: { ...n.data, actions: undefined, routes: undefined },
        }));
        const response = await adminAPI.createWorkflow(user.id, {
          name: workflowTitle,
          description: workflowDescription,
          item_info: { nodes: strippedNodes, connections },
          is_active: isActive,
        });
        targetWorkflowId = response.id;
        setWorkflowId(String(targetWorkflowId));
      } catch (err) {
        console.error('Failed to create workflow:', err);
      }
    }

    if (targetWorkflowId) {
      const activityId = await registerActivity(newNode, targetWorkflowId);
      if (activityId) {
        newNode.data.activityId = activityId;
      }
    }

    setNodes(prev => [...prev, newNode]);
    setExpandedNodes(prev => new Set([...prev, newNode.id]));
    setSelectedNodeId(newNode.id);

    toast({
      title: "Activity Added",
      description: "New activity has been created",
    });
  }, [nodes, connections, workflowId, user?.id, workflowTitle, workflowDescription, isActive, registerActivity, toast]);

  // Delete node
  const handleDeleteNode = useCallback((node: WorkflowNode) => {
    if (node.type === 'start' || node.type === 'end') {
      toast({
        title: "Cannot Delete",
        description: `${node.type === 'start' ? 'Start' : 'End'} nodes cannot be deleted`,
        variant: "destructive",
      });
      return;
    }
    setNodeToDelete(node);
  }, [toast]);

  const handleConfirmDelete = useCallback(async () => {
    if (!nodeToDelete) return;

    setIsDeleting(true);

    // Delete activity from backend
    if (nodeToDelete.data.activityId && user?.id) {
      try {
        await adminAPI.deleteWorkflowActivity(user.id, nodeToDelete.data.activityId);
      } catch (err) {
        console.error('Failed to delete activity from backend:', err);
      }
    }

    // Reconnect parent to children
    const parentConn = connections.find(c => c.targetId === nodeToDelete.id);
    const childConns = connections.filter(c => c.sourceId === nodeToDelete.id);

    const newConnections: Connection[] = [];
    if (parentConn && childConns.length > 0) {
      childConns.forEach(child => {
        newConnections.push({
          id: generateId(),
          sourceId: parentConn.sourceId,
          targetId: child.targetId,
        });
      });
    }

    setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
    setConnections(prev => [
      ...prev.filter(c => c.sourceId !== nodeToDelete.id && c.targetId !== nodeToDelete.id),
      ...newConnections,
    ]);

    if (selectedNodeId === nodeToDelete.id) {
      setSelectedNodeId(null);
    }

    setIsDeleting(false);
    setNodeToDelete(null);

    toast({
      title: "Activity Deleted",
      description: "The activity has been removed",
    });
  }, [nodeToDelete, connections, selectedNodeId, user?.id, toast]);

  // Toggle node expansion
  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const node = nodes.find(n => n.id === active.id);
    if (node) {
      setDraggedNode(node);
      setIsDragging(true);
    }
  }, [nodes]);

  // Handle drag end - move node to new position
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setIsDragging(false);
    setDraggedNode(null);

    if (!over || active.id === over.id) return;

    const draggedNodeId = active.id as string;
    const dropData = over.data.current as { 
      targetNodeId: string; 
      position: 'before' | 'after' | 'child'; 
      branchType?: 'yes' | 'no';
    };

    if (!dropData?.targetNodeId) return;

    const draggedNodeData = active.data.current as { 
      node: WorkflowNode; 
      parentId?: string;
      branchType?: 'yes' | 'no';
    };

    if (!draggedNodeData?.node) return;

    // Prevent dropping onto itself or its descendants
    const isDescendant = (parentId: string, childId: string): boolean => {
      const children = connections.filter(c => c.sourceId === parentId).map(c => c.targetId);
      if (children.includes(childId)) return true;
      return children.some(child => isDescendant(child, childId));
    };

    if (isDescendant(draggedNodeId, dropData.targetNodeId)) {
      toast({
        title: "Invalid Move",
        description: "Cannot move a node into its own descendants",
        variant: "destructive",
      });
      return;
    }

    // Remove old connections to/from the dragged node
    const oldParentConn = connections.find(c => c.targetId === draggedNodeId);
    const oldChildConns = connections.filter(c => c.sourceId === draggedNodeId);

    let newConnections = connections.filter(
      c => c.targetId !== draggedNodeId && c.sourceId !== draggedNodeId
    );

    // Reconnect old parent to old children (maintain tree structure)
    if (oldParentConn && oldChildConns.length > 0) {
      oldChildConns.forEach(child => {
        newConnections.push({
          id: generateId(),
          sourceId: oldParentConn.sourceId,
          targetId: child.targetId,
          sourceHandle: oldParentConn.sourceHandle,
        });
      });
    }

    // Create new connection based on drop position
    const targetNode = nodes.find(n => n.id === dropData.targetNodeId);
    if (!targetNode) return;

    if (dropData.position === 'before') {
      // Insert before target: connect parent of target to dragged, then dragged to target
      const targetParentConn = newConnections.find(c => c.targetId === dropData.targetNodeId);
      
      if (targetParentConn) {
        // Remove connection from parent to target
        newConnections = newConnections.filter(c => c.id !== targetParentConn.id);
        
        // Add parent -> dragged
        newConnections.push({
          id: generateId(),
          sourceId: targetParentConn.sourceId,
          targetId: draggedNodeId,
          sourceHandle: targetParentConn.sourceHandle,
        });
      }
      
      // Add dragged -> target
      newConnections.push({
        id: generateId(),
        sourceId: draggedNodeId,
        targetId: dropData.targetNodeId,
      });
    } else if (dropData.position === 'after') {
      // Insert after target: connect target to dragged, then dragged to target's children
      const targetChildren = newConnections.filter(c => c.sourceId === dropData.targetNodeId);
      
      // Remove target's child connections
      newConnections = newConnections.filter(c => c.sourceId !== dropData.targetNodeId);
      
      // Add target -> dragged
      newConnections.push({
        id: generateId(),
        sourceId: dropData.targetNodeId,
        targetId: draggedNodeId,
      });
      
      // Reconnect dragged to target's old children
      targetChildren.forEach(child => {
        newConnections.push({
          id: generateId(),
          sourceId: draggedNodeId,
          targetId: child.targetId,
        });
      });
    } else if (dropData.position === 'child') {
      // Insert as child (for condition branches or end of list)
      newConnections.push({
        id: generateId(),
        sourceId: dropData.targetNodeId,
        targetId: draggedNodeId,
        sourceHandle: dropData.branchType,
      });
    }

    setConnections(newConnections);

    toast({
      title: "Node Moved",
      description: `"${draggedNodeData.node.data.label}" has been repositioned`,
    });
  }, [connections, nodes, toast]);

  // Drill down into activity
  const handleDrillDown = useCallback((nodeId: string) => {
    setActiveActivityId(nodeId);
    setSelectedNodeId(null);
  }, []);

  // Handle delete workflow
  const handleDeleteWorkflow = useCallback(async () => {
    if (!user?.id || !workflowId) return;

    setIsDeletingWorkflow(true);
    try {
      await adminAPI.deleteWorkflow(user.id, parseInt(workflowId));
      toast({
        title: "Workflow Deleted",
        description: "The workflow has been permanently deleted.",
      });
      onBack();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast({
        title: "Delete Failed",
        description: "Failed to delete the workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingWorkflow(false);
      setShowDeleteWorkflowDialog(false);
    }
  }, [user?.id, workflowId, toast, onBack]);

  // Save workflow
  const handleSave = useCallback(async () => {
    const result = validateWorkflow(nodes, connections);
    setValidationResult(result);

    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be signed in to save workflows.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const strippedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          actions: undefined,
          routes: undefined,
        },
      }));
      const itemInfo = { nodes: strippedNodes, connections };

      let savedItemId: number;

      if (workflowId) {
        await adminAPI.updateWorkflow(user.id, parseInt(workflowId), {
          title: workflowTitle,
          description: workflowDescription,
          item_info: itemInfo,
          Is_disabled: !isActive,
        });
        savedItemId = parseInt(workflowId);
      } else {
        const response = await adminAPI.createWorkflow(user.id, {
          name: workflowTitle,
          description: workflowDescription,
          item_info: itemInfo,
          is_active: isActive,
        });
        savedItemId = response.id;
        setWorkflowId(String(savedItemId));
      }

      const activityNodes = nodes.filter(n => n.type === 'activity');
      for (const node of activityNodes) {
        if (node.data.activityId) {
          await updateActivity(node);
        } else {
          const activityId = await registerActivity(node, savedItemId);
          if (activityId) {
            setNodes(prev => prev.map(n =>
              n.id === node.id
                ? { ...n, data: { ...n.data, activityId } }
                : n
            ));
          }
        }
      }

      toast({
        title: "Workflow Saved",
        description: "Your automation workflow has been saved successfully.",
      });

      if (!result.isValid || result.warnings.length > 0) {
        setShowValidationDialog(true);
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      toast({
        title: "Error",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [nodes, connections, workflowId, workflowTitle, workflowDescription, isActive, user?.id, toast, updateActivity, registerActivity]);

  // Handle trigger config complete
  const handleTriggerConfigComplete = useCallback((config: { itemType: string; triggerEvent: string }) => {
    const startNodeLocal = nodes.find(n => n.type === 'start');
    if (startNodeLocal) {
      handleNodeUpdate(startNodeLocal.id, {
        itemType: config.itemType,
        triggerEvent: config.triggerEvent,
      });
    }
    setShowTriggerDialog(false);
  }, [nodes, handleNodeUpdate]);

  // Build tree for rendering
  const { childrenMap, rootNodes, endNode } = buildTree();

  // If activity builder is active, show it
  if (activeActivity) {
    return (
      <ActivityBuilder
        node={activeActivity}
        allNodes={nodes}
        onBack={() => setActiveActivityId(null)}
        onUpdate={handleNodeUpdate}
        onAutoSave={async (node) => {
          if (node.data.activityId && user?.id) {
            await adminAPI.updateWorkflowActivity(user.id, node.data.activityId, {
              name: node.data.label,
              description: node.data.description || '',
              activity_info: {
                action_id: node.id,
                actions: node.data.actions || [],
                routes: node.data.routes || [],
              },
            });
          }
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex items-center gap-3">
          <Input
            value={workflowTitle}
            onChange={(e) => setWorkflowTitle(e.target.value)}
            className="font-medium text-lg h-9 max-w-[300px]"
            placeholder="Workflow Name"
          />

          <div className="flex items-center gap-2">
            <Switch
              id="active-toggle"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active-toggle" className="text-sm">
              {isActive ? "Active" : "Inactive"}
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAutoSaving && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}

          {onSwitchToCanvas && (
            <Button variant="outline" size="sm" onClick={onSwitchToCanvas}>
              <LayoutGrid className="h-4 w-4 mr-1" />
              Canvas
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowJsonEditor(true)}>
            <Code className="h-4 w-4 mr-1" />
            JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteWorkflowDialog(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main content */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Tree View */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-1">
              {/* Drag indicator */}
              {isDragging && (
                <div className="mb-4 p-2 bg-muted/50 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                  Drop on a highlighted zone to reposition
                </div>
              )}

              {/* Render tree starting from root nodes */}
              {rootNodes.map(rootNode => (
                <WorkflowTreeNode
                  key={rootNode.id}
                  node={rootNode}
                  childrenMap={childrenMap}
                  nodesMap={new Map(nodes.map(n => [n.id, n]))}
                  connections={connections}
                  expandedNodes={expandedNodes}
                  selectedNodeId={selectedNodeId}
                  level={0}
                  onToggleExpand={toggleNodeExpansion}
                  onSelect={setSelectedNodeId}
                  onAddActivity={handleAddActivity}
                  onDelete={handleDeleteNode}
                  onDrillDown={handleDrillDown}
                  onConfigure={(nodeId) => setSelectedNodeId(nodeId)}
                  isDraggingEnabled={isDragging}
                />
              ))}

              {/* Orphan nodes (not connected to tree, excluding end node) */}
              {nodes.filter(n => 
                !rootNodes.includes(n) && 
                !connections.some(c => c.targetId === n.id) &&
                n.type !== 'end'
              ).map(orphanNode => (
                <div key={orphanNode.id} className="ml-4 mt-4 border-l-2 border-dashed border-amber-500/50 pl-4">
                  <Badge variant="outline" className="mb-2 text-amber-600">
                    Disconnected
                  </Badge>
                  <WorkflowTreeNode
                    node={orphanNode}
                    childrenMap={childrenMap}
                    nodesMap={new Map(nodes.map(n => [n.id, n]))}
                    connections={connections}
                    expandedNodes={expandedNodes}
                    selectedNodeId={selectedNodeId}
                    level={0}
                    onToggleExpand={toggleNodeExpansion}
                    onSelect={setSelectedNodeId}
                    onAddActivity={handleAddActivity}
                    onDelete={handleDeleteNode}
                    onDrillDown={handleDrillDown}
                    onConfigure={(nodeId) => setSelectedNodeId(nodeId)}
                    isDraggingEnabled={isDragging}
                  />
                </div>
              ))}

              {/* End node - always at the bottom */}
              {endNode && (
                <div className="mt-4 pt-4 border-t border-dashed">
                  <WorkflowTreeNode
                    node={endNode}
                    childrenMap={childrenMap}
                    nodesMap={new Map(nodes.map(n => [n.id, n]))}
                    connections={connections}
                    expandedNodes={expandedNodes}
                    selectedNodeId={selectedNodeId}
                    level={0}
                    onToggleExpand={toggleNodeExpansion}
                    onSelect={setSelectedNodeId}
                    onAddActivity={handleAddActivity}
                    onDelete={handleDeleteNode}
                    onDrillDown={handleDrillDown}
                    onConfigure={(nodeId) => setSelectedNodeId(nodeId)}
                    isDraggingEnabled={isDragging}
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Config Panel */}
          {selectedNode && (
            <div className="w-[400px] border-l bg-card overflow-auto">
              <ActivityConfigPanel
                node={selectedNode}
                nodes={nodes}
                connections={connections}
                workflowId={workflowId || undefined}
                onUpdate={handleNodeUpdate}
                onConnect={(sourceId, targetId, sourceHandle) => {
                  const newConn: Connection = {
                    id: generateId(),
                    sourceId,
                    targetId,
                    sourceHandle,
                  };
                  setConnections(prev => [...prev, newConn]);
                }}
                onDisconnect={(sourceId, targetId) => {
                  setConnections(prev => prev.filter(c => 
                    !(c.sourceId === sourceId && c.targetId === targetId)
                  ));
                }}
                onClose={() => setSelectedNodeId(null)}
                onDrillDown={handleDrillDown}
              />
            </div>
          )}
        </div>

        {/* Drag overlay for visual feedback */}
        <DragOverlay>
          {draggedNode && (
            <div className="flex items-center gap-2 p-2 rounded-lg border bg-card shadow-lg opacity-90">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm">{draggedNode.data.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Dialogs */}
      <TriggerConfigDialog
        open={showTriggerDialog}
        onOpenChange={setShowTriggerDialog}
        onConfirm={(config) => {
          const startNodeLocal = nodes.find(n => n.type === 'start');
          if (startNodeLocal) {
            handleNodeUpdate(startNodeLocal.id, {
              itemType: config.itemType,
              triggerEvent: config.triggerEvent,
              triggerEvents: config.events,
            });
          }
          setShowTriggerDialog(false);
        }}
        workflowId={workflowId}
        existingEvents={startNode?.data?.triggerEvents}
      />

      <AlertDialog open={!!nodeToDelete} onOpenChange={() => setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.data.label}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteWorkflowDialog} onOpenChange={setShowDeleteWorkflowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this workflow? 
              This will remove all activities, triggers, and execution history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingWorkflow}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
              disabled={isDeletingWorkflow}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingWorkflow ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showJsonEditor && (
        <WorkflowJsonEditor
          open={showJsonEditor}
          onOpenChange={setShowJsonEditor}
          workflowId={workflowId}
          workflowTitle={workflowTitle}
          workflowDescription={workflowDescription}
          isActive={isActive}
          nodes={nodes}
          connections={connections}
          onUpdate={(updates) => {
            if (updates.nodes) setNodes(updates.nodes);
            if (updates.connections) setConnections(updates.connections);
            if (updates.title) setWorkflowTitle(updates.title);
            if (updates.description) setWorkflowDescription(updates.description);
            if (updates.isActive !== undefined) setIsActive(updates.isActive);
          }}
        />
      )}

      {validationResult && (
        <ValidationDialog
          open={showValidationDialog}
          onOpenChange={setShowValidationDialog}
          validationResult={validationResult}
          onSaveAnyway={() => setShowValidationDialog(false)}
          onCancel={() => setShowValidationDialog(false)}
          onFixAll={() => {}}
        />
      )}
    </div>
  );
}
