import { useState, useCallback, useRef, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
  ZoomIn, 
  ZoomOut,
  Trash2,
  CheckCircle2,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Blocks,
  GitBranch,
  Timer,
  Code,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityNode, ActivityPaletteItem } from "./ActivityNode";
import { ConnectionLine } from "./ConnectionLine";
import { ActivityConfigPanel } from "./ActivityConfigPanel";
import { ActivityBuilder } from "./ActivityBuilder";
import { TriggerConfigDialog } from "./TriggerConfigDialog";
import { ValidationDialog } from "./ValidationDialog";
import { validateWorkflow, ValidationResult, ValidationError, applyAutoFixes } from "./validation";
import { WorkflowJsonEditor } from "./WorkflowJsonEditor";
import { adminAPI } from "@/lib/admin-api";
import type { PortHandle } from "./ConnectionPort";
import type { WorkflowNode as WorkflowNodeType, NodeData, Connection, Workflow } from "./types";
import { useToast } from "@/hooks/use-toast";

interface AutomationCanvasProps {
  onBack: () => void;
  editingWorkflow?: Workflow | null;
  onSwitchToTree?: () => void;
}

// Generate unique ID
const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Node dimensions for connection calculations
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

// localStorage keys for layout persistence
const CANVAS_STORAGE_KEYS = {
  paletteCollapsed: 'automation_canvas_palette_collapsed',
  configPanelSize: 'automation_canvas_config_panel_size',
};

export function AutomationCanvas({ onBack, editingWorkflow, onSwitchToTree }: AutomationCanvasProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Workflow state
  const [workflowId, setWorkflowId] = useState<string | null>(editingWorkflow?.id || null);
  const [workflowTitle, setWorkflowTitle] = useState("New Automation");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [nodes, setNodes] = useState<WorkflowNodeType[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!editingWorkflow?.id);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  
  // Track if initial load is complete to prevent auto-save on mount
  const isInitialLoadRef = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // View state - top level canvas or activity builder
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  
  // Persisted sidebar collapsed state
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(() => {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEYS.paletteCollapsed);
    return stored !== null ? stored === 'true' : true;
  });
  const [configPanelSize, setConfigPanelSize] = useState(() => {
    const stored = localStorage.getItem(CANVAS_STORAGE_KEYS.configPanelSize);
    return stored ? parseInt(stored, 10) : 30;
  });

  // Dialog states - skip trigger dialog if editing existing workflow
  const [showTriggerDialog, setShowTriggerDialog] = useState(!editingWorkflow?.id);
  const [nodeToDelete, setNodeToDelete] = useState<WorkflowNodeType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [isResettingThrottles, setIsResettingThrottles] = useState(false);
  const [showDeleteWorkflowDialog, setShowDeleteWorkflowDialog] = useState(false);
  const [isDeletingWorkflow, setIsDeletingWorkflow] = useState(false);

  // Persist layout changes to localStorage
  useEffect(() => {
    localStorage.setItem(CANVAS_STORAGE_KEYS.paletteCollapsed, String(isPaletteCollapsed));
  }, [isPaletteCollapsed]);

  const handleConfigPanelResize = useCallback((size: number) => {
    setConfigPanelSize(size);
    localStorage.setItem(CANVAS_STORAGE_KEYS.configPanelSize, String(Math.round(size)));
  }, []);

  // Fetch workflow details when editing
  useEffect(() => {
    const fetchWorkflowDetails = async () => {
      if (!editingWorkflow?.id || !user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch workflow item and activities in parallel
        const [response, activitiesResponse] = await Promise.all([
          adminAPI.getItem(user.id, parseInt(editingWorkflow.id)),
          adminAPI.getWorkflowActivities(user.id, parseInt(editingWorkflow.id)),
        ]);
        
        const itemInfo = response.item_info || {};
        
        setWorkflowTitle(response.title || "Untitled Workflow");
        setWorkflowDescription(response.description || "");
        setIsActive(!response.Is_disabled);
        
        // Build maps from backend activities (list endpoint)
        const backendActivitiesList = activitiesResponse || [];
        const activityIdMap = new Map<string, number>();
        
        backendActivitiesList.forEach((activity: { id: number; name: string }) => {
          activityIdMap.set(activity.name, activity.id);
        });
        
        // Fetch full activity details for each activity in parallel
        const activityDetailPromises = backendActivitiesList.map(
          (activity: { id: number }) => adminAPI.getWorkflowActivity(user.id, activity.id)
        );
        const activityDetails = await Promise.all(activityDetailPromises);
        
        // Build map with full activity details
        const activityByIdMap = new Map<number, { 
          id: number; 
          name: string; 
          description?: string; 
          activity_info?: { 
            nodeId?: string; 
            position?: { x: number; y: number }; 
            actions?: any[]; 
            routes?: any[]; 
          } 
        }>();
        
        activityDetails.forEach((activity) => {
          if (activity?.id) {
            activityByIdMap.set(activity.id, activity);
          }
        });
        
        let syncedNodes: WorkflowNodeType[] = [];
        const matchedActivityIds = new Set<number>();
        
        if (itemInfo.nodes && itemInfo.nodes.length > 0) {
          // Sync activityId and activity_info from backend to existing nodes
          syncedNodes = itemInfo.nodes.map((node: WorkflowNodeType) => {
            if (node.type === 'activity') {
              // Try to match by existing activityId first, then by name
              const existingActivityId = node.data.activityId;
              if (existingActivityId && activityByIdMap.has(existingActivityId)) {
                matchedActivityIds.add(existingActivityId);
                const backendActivity = activityByIdMap.get(existingActivityId)!;
                // Merge backend activity_info into node data
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
              // Fall back to matching by name
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
          // Create default start/end nodes if none exist
          syncedNodes = [
            {
              id: generateId(),
              type: 'start' as const,
              position: { x: 400, y: 50 },
              data: { label: 'Start', itemType: '', triggerEvent: '' },
            },
            {
              id: generateId(),
              type: 'end' as const,
              position: { x: 400, y: 400 },
              data: { label: 'End' },
            },
          ];
        }
        
        // Add missing activities from backend that aren't in item_info
        const endNode = syncedNodes.find(n => n.type === 'end');
        const baseY = endNode ? endNode.position.y : 400;
        let offsetIndex = 0;
        
        activityByIdMap.forEach((activity, activityId) => {
          if (!matchedActivityIds.has(activityId)) {
            // This activity exists in backend but not in item_info - add it
            const newNode: WorkflowNodeType = {
              id: activity.activity_info?.nodeId || generateId(),
              type: 'activity',
              position: activity.activity_info?.position || { 
                x: 200 + (offsetIndex * 50), 
                y: baseY + 100 + (offsetIndex * 80) 
              },
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
      } catch (error) {
        console.error('Failed to fetch workflow details:', error);
        toast({
          title: "Error",
          description: "Failed to load workflow details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        // Mark initial load complete after a short delay to prevent immediate auto-save
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 500);
      }
    };

    fetchWorkflowDetails();
  }, [editingWorkflow?.id, user?.id, toast]);

  // Register activity via POST /workflow_activities when created
  const registerActivity = useCallback(async (node: WorkflowNodeType, itemsId: number): Promise<number | null> => {
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

  // Update existing activity via PATCH /workflow_activities/{id}
  const updateActivity = useCallback(async (node: WorkflowNodeType) => {
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

  // Fetch activity details when selected
  const fetchActivityDetails = useCallback(async (activityId: number) => {
    if (!user?.id) return null;
    
    try {
      setIsLoadingActivity(true);
      const response = await adminAPI.getWorkflowActivity(user.id, activityId);
      return response;
    } catch (err) {
      console.error('Failed to fetch activity details:', err);
      return null;
    } finally {
      setIsLoadingActivity(false);
    }
  }, [user?.id]);

  // Auto-save effect - triggers on workflow changes
  useEffect(() => {
    // Skip auto-save during initial load or if no nodes
    if (isInitialLoadRef.current || nodes.length === 0 || isLoading) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!user?.id) return;
      
      setIsAutoSaving(true);
      try {
        // Strip actions/routes from nodes - these are saved via /workflow_activities
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
          // Create new workflow on first auto-save
          const response = await adminAPI.createWorkflow(user.id, {
            name: workflowTitle,
            description: workflowDescription,
            item_info: itemInfo,
            is_active: isActive,
          });
          savedId = response.id;
          setWorkflowId(String(savedId));
        }

        // Update existing activities only (new ones are registered when dropped)
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
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Connection drawing state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; handle: PortHandle } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string; type: 'input' | 'output'; handle?: PortHandle } | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const activeActivity = nodes.find(n => n.id === activeActivityId);

  // Get start node for trigger info
  const startNode = nodes.find(n => n.type === 'start');

  // Get port position for a node
  const getPortPosition = useCallback((nodeId: string, portType: 'input' | 'output', handle?: PortHandle) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    if (node.type === 'condition' && portType === 'output') {
      const y = node.position.y + NODE_HEIGHT;
      if (handle === 'yes') {
        return { x: node.position.x + 16, y };
      } else if (handle === 'no') {
        return { x: node.position.x + NODE_WIDTH - 16, y };
      }
    }
    
    const x = node.position.x + NODE_WIDTH / 2;
    const y = portType === 'output' 
      ? node.position.y + NODE_HEIGHT 
      : node.position.y;
    
    return { x, y };
  }, [nodes]);

  // Handle mouse move for drawing temp connection
  useEffect(() => {
    if (!isConnecting) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePosition({
        x: (e.clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
        y: (e.clientY - rect.top + canvasRef.current.scrollTop) / zoom,
      });
    };

    const handleMouseUp = () => {
      setIsConnecting(false);
      setConnectingFrom(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isConnecting, zoom]);

  // Start connection from output port
  const handleStartConnect = useCallback((nodeId: string, _portType: 'output', handle: PortHandle) => {
    setIsConnecting(true);
    setConnectingFrom({ nodeId, handle });
    setSelectedConnectionId(null);
  }, []);

  // End connection at input port
  const handleEndConnect = useCallback((targetNodeId: string) => {
    if (!connectingFrom || connectingFrom.nodeId === targetNodeId) {
      setIsConnecting(false);
      setConnectingFrom(null);
      return;
    }

    const exists = connections.some(
      c => c.sourceId === connectingFrom.nodeId && 
           c.targetId === targetNodeId &&
           c.sourceHandle === connectingFrom.handle
    );

    if (!exists) {
      const newConnection: Connection = {
        id: generateId(),
        sourceId: connectingFrom.nodeId,
        targetId: targetNodeId,
        sourceHandle: connectingFrom.handle !== 'default' ? connectingFrom.handle : undefined,
      };
      setConnections(prev => [...prev, newConnection]);
    }

    setIsConnecting(false);
    setConnectingFrom(null);
  }, [connectingFrom, connections]);

  // Handle port hover
  const handlePortHover = useCallback((nodeId: string | null, type: 'input' | 'output' | null, handle?: PortHandle) => {
    if (nodeId && type) {
      setHoveredPort({ nodeId, type, handle });
    } else {
      setHoveredPort(null);
    }
  }, []);

  // Delete selected connection
  const handleDeleteConnection = useCallback(() => {
    if (selectedConnectionId) {
      setConnections(prev => prev.filter(c => c.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    }
  }, [selectedConnectionId]);

  // Connect two nodes
  const handleConnectNodes = useCallback((sourceId: string, targetId: string, sourceHandle?: string) => {
    const exists = connections.some(
      c => c.sourceId === sourceId && c.targetId === targetId && c.sourceHandle === sourceHandle
    );
    if (!exists) {
      const newConnection: Connection = {
        id: generateId(),
        sourceId,
        targetId,
        sourceHandle,
      };
      setConnections(prev => [...prev, newConnection]);
    }
  }, [connections]);

  // Disconnect two nodes
  const handleDisconnectNodes = useCallback((sourceId: string, targetId: string) => {
    setConnections(prev => prev.filter(c => !(c.sourceId === sourceId && c.targetId === targetId)));
  }, []);

  // Handle keyboard for deleting connections
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnectionId) {
        handleDeleteConnection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnectionId, handleDeleteConnection]);

  // Handle trigger configuration
  const handleTriggerConfirm = useCallback((config: { itemType: string; triggerEvent: string; events?: any[] }) => {
    const triggerEvents = config.events?.map((e, index) => ({
      id: e.id,
      itemType: e.itemType,
      triggerEvent: e.triggerEvent,
      seq: e.seq ?? index,
      backendId: e.backendId,
    })) || [{
      id: `event_${Date.now()}`,
      itemType: config.itemType,
      triggerEvent: config.triggerEvent,
      seq: 0,
    }];

    // If we already have nodes (editing), just update the start node
    if (nodes.length > 0) {
      setNodes(prev => prev.map(node => {
        if (node.type === 'start') {
          return {
            ...node,
            data: {
              ...node.data,
              // Keep first event for backward compatibility
              itemType: config.itemType,
              triggerEvent: config.triggerEvent,
              // Store all events
              triggerEvents,
            },
          };
        }
        return node;
      }));
      setShowTriggerDialog(false);
      return;
    }

    // Creating new workflow
    const startNode: WorkflowNodeType = {
      id: generateId(),
      type: 'start',
      position: { x: 400, y: 50 },
      data: {
        label: 'Start',
        itemType: config.itemType,
        triggerEvent: config.triggerEvent,
        triggerEvents,
      },
    };

    const endNode: WorkflowNodeType = {
      id: generateId(),
      type: 'end',
      position: { x: 400, y: 400 },
      data: { label: 'End' },
    };

    setNodes([startNode, endNode]);
    setShowTriggerDialog(false);
    
    toast({
      title: "Workflow Created",
      description: "Drag activities from the palette to build your automation.",
    });
  }, [toast, nodes.length]);

  // Find closest node for auto-connect
  const findClosestNode = useCallback((
    newNodePos: { x: number; y: number },
    existingNodes: WorkflowNodeType[],
    direction: 'above' | 'below'
  ): WorkflowNodeType | null => {
    const AUTO_CONNECT_THRESHOLD = 200;
    
    let closest: WorkflowNodeType | null = null;
    let closestDistance = AUTO_CONNECT_THRESHOLD;

    for (const node of existingNodes) {
      if (direction === 'above' && node.type === 'end') continue;
      if (direction === 'below' && node.type === 'start') continue;

      const nodeCenter = {
        x: node.position.x + NODE_WIDTH / 2,
        y: node.position.y + NODE_HEIGHT / 2,
      };
      const newCenter = {
        x: newNodePos.x + NODE_WIDTH / 2,
        y: newNodePos.y + NODE_HEIGHT / 2,
      };

      if (direction === 'above' && nodeCenter.y >= newCenter.y) continue;
      if (direction === 'below' && nodeCenter.y <= newCenter.y) continue;

      const dx = Math.abs(nodeCenter.x - newCenter.x);
      const dy = Math.abs(nodeCenter.y - newCenter.y);
      const distance = Math.sqrt(dx * dx * 0.5 + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closest = node;
      }
    }

    return closest;
  }, []);

  // Calculate center position of visible canvas
  const getCanvasCenterPosition = useCallback(() => {
    if (!canvasRef.current) return { x: 400, y: 200 };
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scrollLeft = canvasRef.current.scrollLeft;
    const scrollTop = canvasRef.current.scrollTop;
    
    // Calculate center of visible area, accounting for zoom
    const centerX = (scrollLeft + rect.width / 2) / zoom - NODE_WIDTH / 2;
    const centerY = (scrollTop + rect.height / 2) / zoom - NODE_HEIGHT / 2;
    
    return { x: centerX, y: centerY };
  }, [zoom]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active } = event;

    if (!canvasRef.current) return;

    const activeData = active.data.current;
    
    if (activeData?.type === 'palette-item') {
      const rect = canvasRef.current.getBoundingClientRect();
      const scrollLeft = canvasRef.current.scrollLeft;
      const scrollTop = canvasRef.current.scrollTop;
      
      // Get drop position from cursor
      const dropX = ((event.activatorEvent as PointerEvent).clientX - rect.left + scrollLeft) / zoom;
      const dropY = ((event.activatorEvent as PointerEvent).clientY - rect.top + scrollTop) / zoom;
      
      // Check if dropped inside the canvas area (not on sidebar/palette)
      const isDroppedInCanvas = (event.activatorEvent as PointerEvent).clientX > rect.left;
      
      // Use center position if dropped outside canvas, otherwise use cursor position
      const canvasCenter = getCanvasCenterPosition();
      const x = isDroppedInCanvas ? dropX : canvasCenter.x;
      const y = isDroppedInCanvas ? dropY : canvasCenter.y;

      const nodeType = activeData.nodeType;
      const newNode: WorkflowNodeType = {
        id: generateId(),
        type: nodeType,
        position: { x, y },
        data: {
          label: nodeType === 'activity' 
            ? 'New Activity'
            : nodeType === 'condition'
            ? 'Condition'
            : nodeType === 'delay'
            ? 'Delay'
            : 'Node',
          actions: nodeType === 'activity' ? [] : undefined,
        },
      };

      const nodeAbove = findClosestNode(newNode.position, nodes, 'above');
      const nodeBelow = findClosestNode(newNode.position, nodes, 'below');

      const newConnections: Connection[] = [];

      if (nodeAbove && nodeAbove.type !== 'end') {
        const hasOutgoing = connections.some(c => c.sourceId === nodeAbove.id);
        if (!hasOutgoing) {
          newConnections.push({
            id: generateId(),
            sourceId: nodeAbove.id,
            targetId: newNode.id,
          });
        }
      }

      if (nodeBelow && nodeBelow.type !== 'start' && nodeType !== 'end') {
        const hasIncoming = connections.some(c => c.targetId === nodeBelow.id);
        if (!hasIncoming) {
          newConnections.push({
            id: generateId(),
            sourceId: newNode.id,
            targetId: nodeBelow.id,
          });
        }
      }

      // Register activity node to backend IMMEDIATELY via POST
      if (nodeType === 'activity') {
        // If workflow doesn't exist yet, create it first
        let targetWorkflowId = workflowId ? parseInt(workflowId) : null;
        
        if (!targetWorkflowId && user?.id) {
          try {
            // Create workflow first if it doesn't exist
            const strippedNodes = nodes.map(node => ({
              ...node,
              data: { ...node.data, actions: undefined, routes: undefined },
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
            console.error('Failed to create workflow for activity:', err);
            toast({
              title: "Error",
              description: "Failed to save workflow. Activity was not created.",
              variant: "destructive",
            });
          }
        }
        
        if (targetWorkflowId) {
          const activityId = await registerActivity(newNode, targetWorkflowId);
          if (activityId) {
            newNode.data.activityId = activityId;
            toast({
              title: "Activity Created",
              description: "Activity saved to server.",
            });
          }
        }
      }

      setNodes(prev => [...prev, newNode]);
      if (newConnections.length > 0) {
        setConnections(prev => [...prev, ...newConnections]);
        toast({
          title: "Auto-connected",
          description: `Created ${newConnections.length} connection${newConnections.length > 1 ? 's' : ''} automatically.`,
        });
      }
      setSelectedNodeId(newNode.id);
    }
    else if (activeData?.type === 'workflow-node') {
      const node = activeData.node as WorkflowNodeType;
      const delta = event.delta;
      
      setNodes(prev => prev.map(n => 
        n.id === node.id 
          ? { ...n, position: { x: n.position.x + delta.x / zoom, y: n.position.y + delta.y / zoom } }
          : n
      ));
    }
  }, [zoom, nodes, connections, findClosestNode, toast, workflowId, registerActivity, getCanvasCenterPosition, user?.id, workflowTitle, workflowDescription, isActive]);

  // Handle node selection - fetch activity details if it's an activity with a backend ID
  const handleNodeSelect = useCallback(async (id: string) => {
    setSelectedNodeId(id);
    
    // Fetch fresh activity data from backend if this is an activity with an activityId
    const node = nodes.find(n => n.id === id);
    if (node?.type === 'activity' && node.data.activityId) {
      const activityDetails = await fetchActivityDetails(node.data.activityId);
      if (activityDetails) {
        // Update node with fresh data from backend
        setNodes(prev => prev.map(n => 
          n.id === id 
            ? {
                ...n,
                data: {
                  ...n.data,
                  label: activityDetails.name || n.data.label,
                  description: activityDetails.description || n.data.description,
                  actions: activityDetails.activity_info?.actions || n.data.actions,
                  routes: activityDetails.activity_info?.routes || n.data.routes,
                },
              }
            : n
        ));
      }
    }
  }, [nodes, fetchActivityDetails]);

  // Request node deletion - show confirmation for activity nodes
  const handleNodeDeleteRequest = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    
    // Show confirmation dialog for activity nodes
    if (node.type === 'activity') {
      setNodeToDelete(node);
    } else {
      // Immediately delete non-activity nodes
      setNodes(prev => prev.filter(n => n.id !== id));
      setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
      if (selectedNodeId === id) {
        setSelectedNodeId(null);
      }
    }
  }, [nodes, selectedNodeId]);

  // Confirm and execute node deletion
  const handleConfirmDelete = useCallback(async () => {
    if (!nodeToDelete) return;
    
    setIsDeleting(true);
    
    // Delete activity from backend if it has an activityId
    if (nodeToDelete.data.activityId && user?.id) {
      try {
        await adminAPI.deleteWorkflowActivity(user.id, nodeToDelete.data.activityId);
      } catch (err) {
        console.error('Failed to delete activity from backend:', err);
      }
    }
    
    setNodes(prev => prev.filter(n => n.id !== nodeToDelete.id));
    setConnections(prev => prev.filter(c => c.sourceId !== nodeToDelete.id && c.targetId !== nodeToDelete.id));
    if (selectedNodeId === nodeToDelete.id) {
      setSelectedNodeId(null);
    }
    
    setIsDeleting(false);
    setNodeToDelete(null);
  }, [nodeToDelete, selectedNodeId, user?.id]);

  // Handle node update
  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<NodeData>) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId 
        ? { ...n, data: { ...n.data, ...data } }
        : n
    ));
  }, []);

  // Handle drill down into activity
  const handleDrillDown = useCallback((nodeId: string) => {
    setActiveActivityId(nodeId);
    setSelectedNodeId(null);
  }, []);

  // Handle back from activity builder
  const handleBackFromActivity = useCallback(() => {
    setActiveActivityId(null);
  }, []);

  // Handle save - always save but show validation errors
  const handleSave = useCallback(async () => {
    const result = validateWorkflow(nodes, connections);
    setValidationResult(result);
    
    // Always perform the save
    await performSave();
    
    // Show validation dialog if there are errors or warnings
    if (!result.isValid || result.warnings.length > 0) {
      setShowValidationDialog(true);
    }
  }, [nodes, connections]);

  // Handle Fix All - apply auto-fixes to nodes
  const handleFixAll = useCallback(() => {
    if (!validationResult) return;
    
    const { nodes: fixedNodes, fixedCount } = applyAutoFixes(nodes, connections, validationResult);
    
    if (fixedCount > 0) {
      setNodes(fixedNodes);
      setShowValidationDialog(false);
      
      toast({
        title: "Issues Fixed",
        description: `Auto-fixed ${fixedCount} issue${fixedCount > 1 ? 's' : ''}. Review the changes and save again.`,
      });
      
      // Re-validate after fixes
      setTimeout(() => {
        const newResult = validateWorkflow(fixedNodes, connections);
        setValidationResult(newResult);
        if (!newResult.isValid || newResult.warnings.length > 0) {
          setShowValidationDialog(true);
        }
      }, 500);
    }
  }, [nodes, connections, validationResult, toast]);

  // Actual save operation
  const performSave = useCallback(async () => {
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
      // Strip actions/routes from nodes - these are saved via /workflow_activities
      const strippedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          actions: undefined,
          routes: undefined,
        },
      }));
      const itemInfo = {
        nodes: strippedNodes,
        connections,
      };

      let savedItemId: number;

      if (workflowId) {
        // Update existing workflow
        await adminAPI.updateWorkflow(user.id, parseInt(workflowId), {
          title: workflowTitle,
          description: workflowDescription,
          item_info: itemInfo,
          Is_disabled: !isActive,
        });
        savedItemId = parseInt(workflowId);
      } else {
        // Create new workflow
        const response = await adminAPI.createWorkflow(user.id, {
          name: workflowTitle,
          description: workflowDescription,
          item_info: itemInfo,
          is_active: isActive,
        });
        savedItemId = response.id;
        setWorkflowId(String(savedItemId));
      }

      // Update existing activities (new ones are registered when dropped)
      const activityNodes = nodes.filter(n => n.type === 'activity' && n.data.activityId);
      await Promise.all(activityNodes.map(node => updateActivity(node)));

      toast({
        title: "Workflow Saved",
        description: `"${workflowTitle}" has been saved successfully.`,
      });
      setShowValidationDialog(false);
    } catch (err) {
      console.error('Failed to save workflow:', err);
      toast({
        title: "Save Failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, workflowId, workflowTitle, workflowDescription, nodes, connections, isActive, toast]);

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Reset all throttles for all triggers
  const handleResetAllThrottles = useCallback(async () => {
    if (!user?.id || !workflowId) {
      toast({
        title: "Cannot Reset",
        description: "Save the workflow first before resetting throttles.",
        variant: "destructive",
      });
      return;
    }

    setIsResettingThrottles(true);
    try {
      // 1. Bump version for all triggers on the start node to invalidate browser caches
      const startNode = nodes.find(n => n.type === 'start');
      if (startNode?.data.triggerEvents?.length) {
        const updatedTriggerEvents = startNode.data.triggerEvents.map(trigger => ({
          ...trigger,
          throttle: trigger.throttle ? {
            ...trigger.throttle,
            version: (trigger.throttle.version || 1) + 1,
            resetAt: Date.now(),
          } : undefined,
        }));

        // Update the start node
        setNodes(prev => prev.map(node => 
          node.type === 'start' 
            ? { ...node, data: { ...node.data, triggerEvents: updatedTriggerEvents } }
            : node
        ));

        // Persist throttle updates to backend for each trigger
        for (const trigger of updatedTriggerEvents) {
          if (trigger.backendId && trigger.throttle) {
            try {
              await adminAPI.updateWorkflowActivityEvent(
                user.id, 
                trigger.backendId, 
                parseInt(workflowId),
                { event_info: { throttle: trigger.throttle } }
              );
            } catch (err) {
              console.error('Failed to update trigger throttle:', err);
            }
          }
        }
      }

      // 2. Clear all server-side throttle records
      await adminAPI.resetWorkflowThrottles(user.id, parseInt(workflowId));

      // 3. Clear local browser throttle cache for this workflow
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`wf_throttle_${workflowId}_`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast({
        title: "Throttles Reset",
        description: `All throttle limits have been cleared. The workflow will execute again for all users.`,
      });
    } catch (err) {
      console.error('Failed to reset throttles:', err);
      toast({
        title: "Reset Failed",
        description: "Failed to reset throttles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResettingThrottles(false);
    }
  }, [user?.id, workflowId, nodes, toast]);

  // Delete entire workflow
  const handleDeleteWorkflow = useCallback(async () => {
    if (!user?.id || !workflowId) return;
    
    setIsDeletingWorkflow(true);
    try {
      await adminAPI.deleteWorkflow(user.id, parseInt(workflowId));
      
      toast({
        title: "Workflow Deleted",
        description: "The workflow has been permanently deleted.",
      });
      
      // Navigate back to the workflow list
      onBack();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast({
        title: "Delete Failed",
        description: "Failed to delete workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingWorkflow(false);
      setShowDeleteWorkflowDialog(false);
    }
  }, [user?.id, workflowId, toast, onBack]);

  // If we're in activity builder mode, show that instead
  if (activeActivity) {
    return (
      <ActivityBuilder
        node={activeActivity}
        allNodes={nodes}
        onBack={handleBackFromActivity}
        onUpdate={handleNodeUpdate}
        onAutoSave={updateActivity}
      />
    );
  }

  // Show loading state while fetching workflow details
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <TriggerConfigDialog
        open={showTriggerDialog}
        onOpenChange={setShowTriggerDialog}
        onConfirm={handleTriggerConfirm}
        workflowId={workflowId}
        existingEvents={startNode?.data.triggerEvents}
      />

      {validationResult && (
        <ValidationDialog
          open={showValidationDialog}
          onOpenChange={setShowValidationDialog}
          validationResult={validationResult}
          onSaveAnyway={performSave}
          onCancel={() => setShowValidationDialog(false)}
          onNavigateToError={(error: ValidationError) => {
            if (error.nodeId) {
              setSelectedNodeId(error.nodeId);
              // Scroll node into view
              const nodeElement = document.getElementById(`node-${error.nodeId}`);
              if (nodeElement) {
                nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }}
          onFixAll={handleFixAll}
        />
      )}

      {/* Workflow JSON Editor */}
      <WorkflowJsonEditor
        open={showJsonEditor}
        onOpenChange={setShowJsonEditor}
        workflowId={workflowId}
        workflowTitle={workflowTitle}
        workflowDescription={workflowDescription}
        isActive={isActive}
        nodes={nodes}
        connections={connections}
        onUpdate={(data) => {
          if (data.title !== undefined) setWorkflowTitle(data.title);
          if (data.description !== undefined) setWorkflowDescription(data.description);
          if (data.isActive !== undefined) setIsActive(data.isActive);
          if (data.nodes !== undefined) setNodes(data.nodes);
          if (data.connections !== undefined) setConnections(data.connections);
        }}
      />

      {/* Delete Activity Confirmation Dialog */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{nodeToDelete?.data.label}"? 
              {nodeToDelete?.data.actions && nodeToDelete.data.actions.length > 0 && (
                <span className="block mt-2 text-destructive">
                  This activity has {nodeToDelete.data.actions.length} configured action(s) that will be lost.
                </span>
              )}
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Workflow Confirmation Dialog */}
      <AlertDialog open={showDeleteWorkflowDialog} onOpenChange={setShowDeleteWorkflowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{workflowTitle}"? This action cannot be undone.
              <span className="block mt-2 text-destructive font-medium">
                All activities, triggers, and automation history will be permanently deleted.
              </span>
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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Workflow
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-2 sm:p-4 border-b bg-background gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Input
                value={workflowTitle}
                onChange={(e) => setWorkflowTitle(e.target.value)}
                className="w-32 sm:w-64 font-semibold"
                placeholder="Workflow title"
              />
              <Input
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="hidden md:block w-48 lg:w-80 text-sm"
                placeholder="Description (optional)"
              />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <Switch
                  id="workflow-active"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
                <Label htmlFor="workflow-active" className="text-sm">
                  {isActive ? 'Active' : 'Inactive'}
                </Label>
              </div>
              
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              
              <div className="hidden lg:flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomReset} className="w-16">
                  {Math.round(zoom * 100)}%
                </Button>
                <Button variant="outline" size="icon" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-6 hidden lg:block" />

              {onSwitchToTree && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={onSwitchToTree}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Switch to Tree View</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowJsonEditor(true)}
                    >
                      <Code className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Workflow JSON</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleResetAllThrottles}
                      disabled={isResettingThrottles || !workflowId}
                    >
                      {isResettingThrottles ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset All Throttles</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowDeleteWorkflowDialog(true)}
                      disabled={!workflowId || isDeletingWorkflow}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Workflow</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button 
                variant="outline" 
                size="icon"
                className="lg:hidden"
                onClick={() => {
                  const result = validateWorkflow(nodes, connections);
                  setValidationResult(result);
                  setShowValidationDialog(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="hidden lg:flex"
                onClick={() => {
                  const result = validateWorkflow(nodes, connections);
                  setValidationResult(result);
                  setShowValidationDialog(true);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validate
              </Button>
              
              {isAutoSaving && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="hidden md:inline">Auto-saving...</span>
                </div>
              )}
              
              <Button onClick={handleSave} disabled={isSaving || isAutoSaving} size="icon" className="sm:hidden">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isAutoSaving} className="hidden sm:flex">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Collapsible Palette sidebar */}
            <TooltipProvider delayDuration={100}>
              <div className={cn(
                "border-r bg-muted/30 flex flex-col transition-all duration-200",
                isPaletteCollapsed ? "w-12" : "w-64"
              )}>
                {/* Collapse toggle */}
                <div className={cn(
                  "p-2 flex border-b",
                  isPaletteCollapsed ? "justify-center" : "justify-end"
                )}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
                  >
                    {isPaletteCollapsed ? (
                      <PanelLeft className="h-4 w-4" />
                    ) : (
                      <PanelLeftClose className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {isPaletteCollapsed ? (
                  /* Collapsed state - icon only */
                  <div className="flex flex-col items-center gap-2 p-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ActivityPaletteItem 
                            type="activity" 
                            label="Activity" 
                            description="Group of actions"
                            compact
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">Activity</p>
                        <p className="text-xs text-muted-foreground">Group of actions</p>
                      </TooltipContent>
                    </Tooltip>

                    <Separator className="w-6" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ActivityPaletteItem 
                            type="condition" 
                            label="Condition" 
                            description="Branch based on rules"
                            compact
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">Condition</p>
                        <p className="text-xs text-muted-foreground">Branch based on rules</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <ActivityPaletteItem 
                            type="delay" 
                            label="Delay" 
                            description="Wait before continuing"
                            compact
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="font-medium">Delay</p>
                        <p className="text-xs text-muted-foreground">Wait before continuing</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : (
                  /* Expanded state */
                  <>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-1">Activities</h3>
                      <p className="text-xs text-muted-foreground mb-3">High-level workflow steps</p>
                      <div className="space-y-2">
                        <ActivityPaletteItem 
                          type="activity" 
                          label="Activity" 
                          description="Group of actions"
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-1">Flow Control</h3>
                      <p className="text-xs text-muted-foreground mb-3">Route and delay flows</p>
                      <div className="space-y-2">
                        <ActivityPaletteItem 
                          type="condition" 
                          label="Condition" 
                          description="Branch based on rules"
                        />
                        <ActivityPaletteItem 
                          type="delay" 
                          label="Delay" 
                          description="Wait before continuing"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TooltipProvider>

            {/* Canvas and Config Panel with Resizable */}
            <ResizablePanelGroup direction="horizontal" className="flex-1">
              <ResizablePanel defaultSize={selectedNode ? 70 : 100} minSize={40}>
                {/* Canvas */}
                <div 
                  ref={canvasRef}
                  className="h-full relative overflow-auto bg-muted/20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23888' fill-opacity='0.1'%3E%3Cpath d='M0 0h1v1H0zM20 0h1v1h-1zM0 20h1v1H0zM20 20h1v1h-1z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedConnectionId(null);
                  }}
                >
                  <div 
                    className="relative min-w-[2000px] min-h-[1500px]"
                    style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}
                  >
                    {/* Connection lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                      {connections.map((conn) => {
                        const sourcePos = getPortPosition(conn.sourceId, 'output', conn.sourceHandle as PortHandle);
                        const targetPos = getPortPosition(conn.targetId, 'input');
                        
                        return (
                          <ConnectionLine
                            key={conn.id}
                            startX={sourcePos.x}
                            startY={sourcePos.y}
                            endX={targetPos.x}
                            endY={targetPos.y}
                            branchType={conn.sourceHandle as 'yes' | 'no' | undefined}
                            isSelected={selectedConnectionId === conn.id}
                            onClick={() => setSelectedConnectionId(conn.id)}
                          />
                        );
                      })}
                      
                      {/* Temp connection line while drawing */}
                      {isConnecting && connectingFrom && (
                        <ConnectionLine
                          startX={getPortPosition(connectingFrom.nodeId, 'output', connectingFrom.handle).x}
                          startY={getPortPosition(connectingFrom.nodeId, 'output', connectingFrom.handle).y}
                          endX={mousePosition.x}
                          endY={mousePosition.y}
                          isTemp
                          branchType={connectingFrom.handle !== 'default' ? connectingFrom.handle as 'yes' | 'no' : undefined}
                        />
                      )}
                    </svg>

                    {/* Nodes */}
                    {nodes.map((node) => (
                      <ActivityNode
                        key={node.id}
                        node={node}
                        isSelected={selectedNodeId === node.id}
                        onSelect={handleNodeSelect}
                        onDelete={handleNodeDeleteRequest}
                        onDrillDown={node.type === 'activity' ? handleDrillDown : undefined}
                        onOpenConfig={node.type === 'activity' ? handleNodeSelect : undefined}
                        isConnecting={isConnecting}
                        isValidTarget={isConnecting && connectingFrom?.nodeId !== node.id && node.type !== 'start'}
                        onStartConnect={handleStartConnect}
                        onEndConnect={handleEndConnect}
                        onPortHover={handlePortHover}
                      />
                    ))}

                    {/* Delete connection hint */}
                    {selectedConnectionId && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg p-2 shadow-lg flex items-center gap-2 z-50">
                        <span className="text-sm text-muted-foreground">Connection selected</span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteConnection}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>

              {/* Config Panel - Resizable */}
              {selectedNode && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel 
                    defaultSize={configPanelSize} 
                    minSize={20} 
                    maxSize={50}
                    onResize={handleConfigPanelResize}
                  >
                    <div className="relative h-full">
                      {isLoadingActivity && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      <ActivityConfigPanel
                        node={selectedNode}
                        nodes={nodes}
                        connections={connections}
                        workflowId={workflowId || undefined}
                        onUpdate={handleNodeUpdate}
                        onConnect={handleConnectNodes}
                        onDisconnect={handleDisconnectNodes}
                        onClose={() => setSelectedNodeId(null)}
                        onDrillDown={selectedNode.type === 'activity' ? handleDrillDown : undefined}
                      />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </DndContext>
    </>
  );
}