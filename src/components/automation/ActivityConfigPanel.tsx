import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Link2, Layers, Plus, Loader2, GripVertical, Clock, ChevronDown, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/admin-api";
import type { WorkflowNode, NodeData, Connection, TriggerEventConfig, TriggerThrottleConfig } from "./types";
import { ITEM_TYPES, TRIGGER_EVENTS, CONDITION_OPERATORS } from "./types";
import { TriggerThrottleConfig as ThrottleConfigPanel } from "./TriggerThrottleConfig";
import { ActivityJsonEditor } from "./ActivityJsonEditor";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ActivityConfigPanelProps {
  node: WorkflowNode;
  nodes: WorkflowNode[];
  connections: Connection[];
  workflowId?: string;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
  onConnect: (sourceId: string, targetId: string, sourceHandle?: string) => void;
  onDisconnect: (sourceId: string, targetId: string) => void;
  onClose: () => void;
  onDrillDown?: (nodeId: string) => void;
}

export function ActivityConfigPanel({ 
  node, 
  nodes, 
  connections, 
  workflowId,
  onUpdate, 
  onConnect,
  onDisconnect,
  onClose,
  onDrillDown
}: ActivityConfigPanelProps) {
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);

  const handleChange = (field: keyof NodeData, value: any) => {
    onUpdate(node.id, { [field]: value });
  };

  // Get all parent connections (nodes that connect TO this node)
  const parentConnections = connections.filter(c => c.targetId === node.id);

  // Get available parent nodes
  const availableParentNodes = nodes.filter(n => 
    n.id !== node.id && 
    n.type !== 'end' &&
    !connections.some(c => c.sourceId === node.id && c.targetId === n.id)
  );

  // Build parent options - for condition nodes, split into Yes/No options
  const parentOptions: { id: string; label: string; sourceHandle?: string }[] = [];
  availableParentNodes.forEach(n => {
    if (n.type === 'condition') {
      parentOptions.push({
        id: `${n.id}__yes`,
        label: `${n.data.label} → Yes`,
        sourceHandle: 'yes',
      });
      parentOptions.push({
        id: `${n.id}__no`,
        label: `${n.data.label} → No`,
        sourceHandle: 'no',
      });
    } else {
      parentOptions.push({
        id: n.id,
        label: `${n.data.label} (${n.type})`,
      });
    }
  });

  // Filter out already connected parents
  const availableParentOptions = parentOptions.filter(opt => {
    const [nodeId, handle] = opt.id.includes('__') ? opt.id.split('__') : [opt.id, undefined];
    return !parentConnections.some(c => 
      c.sourceId === nodeId && 
      (handle ? c.sourceHandle === handle : !c.sourceHandle)
    );
  });

  const handleAddParent = (optionId: string) => {
    if (!optionId || optionId === '_none') return;
    const [nodeId, handle] = optionId.includes('__') ? optionId.split('__') : [optionId, undefined];
    onConnect(nodeId, node.id, handle);
  };

  const handleRemoveParent = (sourceId: string, sourceHandle?: string) => {
    const conn = parentConnections.find(c => 
      c.sourceId === sourceId && 
      (sourceHandle ? c.sourceHandle === sourceHandle : !c.sourceHandle)
    );
    if (conn) {
      onDisconnect(conn.sourceId, node.id);
    }
  };

  // For condition nodes, get child connections
  const yesConnection = connections.find(c => c.sourceId === node.id && c.sourceHandle === 'yes');
  const noConnection = connections.find(c => c.sourceId === node.id && c.sourceHandle === 'no');

  // Get available child nodes for condition branches
  const availableChildNodes = nodes.filter(n =>
    n.id !== node.id &&
    n.type !== 'start' &&
    !connections.some(c => c.sourceId === n.id && c.targetId === node.id)
  );

  const handleYesBranchChange = (targetId: string) => {
    if (yesConnection) onDisconnect(node.id, yesConnection.targetId);
    if (targetId && targetId !== '_none') onConnect(node.id, targetId, 'yes');
  };

  const handleNoBranchChange = (targetId: string) => {
    if (noConnection) onDisconnect(node.id, noConnection.targetId);
    if (targetId && targetId !== '_none') onConnect(node.id, targetId, 'no');
  };

  const getParentDisplayInfo = (conn: typeof parentConnections[0]) => {
    const parentNode = nodes.find(n => n.id === conn.sourceId);
    if (!parentNode) return null;
    
    if (parentNode.type === 'condition' && conn.sourceHandle) {
      return {
        label: `${parentNode.data.label} → ${conn.sourceHandle === 'yes' ? 'Yes' : 'No'}`,
        isYes: conn.sourceHandle === 'yes',
        isNo: conn.sourceHandle === 'no',
      };
    }
    return {
      label: `${parentNode.data.label} (${parentNode.type})`,
      isYes: false,
      isNo: false,
    };
  };

  const actionCount = node.data.actions?.length || 0;

  return (
    <div className="h-full border-l bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b shrink-0">
        <h3 className="font-semibold text-sm">Configure Node</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">

      <div className="space-y-4">
        {/* Common: Label */}
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={node.data.label}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Node label"
          />
        </div>

        {/* Activity: Drill-down button */}
        {node.type === 'activity' && onDrillDown && (
          <>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={node.data.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="What does this activity do?"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onDrillDown(node.id)}
              >
                <Layers className="h-4 w-4 mr-2" />
                Edit Actions ({actionCount})
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setJsonEditorOpen(true)}
                title="Edit JSON"
              >
                <Code className="h-4 w-4" />
              </Button>
            </div>

            <ActivityJsonEditor
              open={jsonEditorOpen}
              onOpenChange={setJsonEditorOpen}
              node={node}
              workflowId={workflowId}
              onUpdate={onUpdate}
            />
          </>
        )}

        {/* Parent Node Connections */}
        {node.type !== 'start' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Connected From (Parents)
              </Label>
              
              {parentConnections.length > 0 && (
                <div className="space-y-2">
                  {parentConnections.map((conn) => {
                    const info = getParentDisplayInfo(conn);
                    if (!info) return null;
                    return (
                      <div 
                        key={`${conn.sourceId}-${conn.sourceHandle || 'default'}`}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md border text-sm",
                          info.isYes && "border-green-500/50 bg-green-500/10",
                          info.isNo && "border-red-500/50 bg-red-500/10",
                          !info.isYes && !info.isNo && "bg-muted/50"
                        )}
                      >
                        <span className={cn(
                          info.isYes && "text-green-600 dark:text-green-400",
                          info.isNo && "text-red-600 dark:text-red-400"
                        )}>
                          {info.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveParent(conn.sourceId, conn.sourceHandle)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {availableParentOptions.length > 0 && (
                <Select value="_none" onValueChange={handleAddParent}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="+ Add parent connection" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="_none" disabled>Select a parent...</SelectItem>
                    {availableParentOptions.map((opt) => (
                      <SelectItem 
                        key={opt.id} 
                        value={opt.id}
                        className={cn(
                          opt.sourceHandle === 'yes' && "text-green-600 dark:text-green-400",
                          opt.sourceHandle === 'no' && "text-red-600 dark:text-red-400"
                        )}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <p className="text-xs text-muted-foreground">
                Multiple nodes can connect to this one
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Start node config - multiple trigger events */}
        {node.type === 'start' && (
          <StartNodeTriggerConfig 
            node={node} 
            workflowId={workflowId}
            onUpdate={onUpdate}
          />
        )}

        {/* Condition node config */}
        {node.type === 'condition' && (
          <>
            <div className="space-y-2">
              <Label>Field</Label>
              <Input
                value={node.data.conditionField || ''}
                onChange={(e) => handleChange('conditionField', e.target.value)}
                placeholder="e.g., customer.email"
              />
            </div>

            <div className="space-y-2">
              <Label>Operator</Label>
              <Select
                value={node.data.conditionOperator || ''}
                onValueChange={(value) => handleChange('conditionOperator', value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {CONDITION_OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={node.data.conditionValue || ''}
                onChange={(e) => handleChange('conditionValue', e.target.value)}
                placeholder="Value to compare"
              />
            </div>

            <Separator />

            {/* Yes Branch */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Link2 className="h-4 w-4" />
                Yes Branch → Connect To
              </Label>
              <Select
                value={yesConnection?.targetId || '_none'}
                onValueChange={handleYesBranchChange}
              >
                <SelectTrigger className="bg-background border-green-500/50">
                  <SelectValue placeholder="Select target node" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="_none">No connection</SelectItem>
                  {availableChildNodes
                    .filter(n => n.id !== noConnection?.targetId)
                    .map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.data.label} ({n.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* No Branch */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Link2 className="h-4 w-4" />
                No Branch → Connect To
              </Label>
              <Select
                value={noConnection?.targetId || '_none'}
                onValueChange={handleNoBranchChange}
              >
                <SelectTrigger className="bg-background border-red-500/50">
                  <SelectValue placeholder="Select target node" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="_none">No connection</SelectItem>
                  {availableChildNodes
                    .filter(n => n.id !== yesConnection?.targetId)
                    .map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.data.label} ({n.type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Delay node config */}
        {node.type === 'delay' && (
          <>
            <div className="space-y-2">
              <Label>Delay Amount</Label>
              <Input
                type="number"
                min={1}
                value={node.data.delayAmount || ''}
                onChange={(e) => handleChange('delayAmount', parseInt(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={node.data.delayUnit || 'minutes'}
                onValueChange={(value) => handleChange('delayUnit', value as 'minutes' | 'hours' | 'days')}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

// Default throttle configuration
const DEFAULT_THROTTLE: TriggerThrottleConfig = {
  enabled: false,
  scope: 'session',
  target: 'browser',
};

// Sortable trigger item component with throttle config
function SortableTriggerItem({ 
  event, 
  index, 
  onRemove,
  onThrottleChange,
}: { 
  event: TriggerEventConfig; 
  index: number; 
  onRemove: (eventId: string) => void;
  onThrottleChange: (eventId: string, throttle: TriggerThrottleConfig) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: event.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "rounded-lg border bg-background",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <div className="flex items-center gap-2 p-2">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Badge variant="outline" className="text-xs font-mono">
            {index + 1}
          </Badge>
          <span className="font-medium text-sm">
            {ITEM_TYPES.find(t => t.value === event.itemType)?.label || event.itemType}
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm">
            {TRIGGER_EVENTS.find(e => e.value === event.triggerEvent)?.label || event.triggerEvent}
          </span>
          {event.throttle?.enabled && (
            <Badge variant="outline" className="ml-1 text-xs gap-1 text-amber-600 border-amber-500/50 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              {event.throttle.scope}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="hover:text-foreground transition-colors p-1"
                title="Configure throttling"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <button
              type="button"
              onClick={() => onRemove(event.id)}
              className="hover:text-destructive transition-colors p-1"
              title="Remove trigger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t">
            <div className="pt-3">
              <ThrottleConfigPanel 
                config={event.throttle || { ...DEFAULT_THROTTLE }}
                onChange={(newThrottle) => onThrottleChange(event.id, newThrottle)}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Separate component for Start node trigger configuration with multiple events
function StartNodeTriggerConfig({ 
  node, 
  workflowId,
  onUpdate 
}: { 
  node: WorkflowNode; 
  workflowId?: string;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
}) {
  const { user } = useUser();
  const [itemType, setItemType] = useState<string>("");
  const [triggerEvent, setTriggerEvent] = useState<string>("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasSyncedFromBackend, setHasSyncedFromBackend] = useState(false);

  const triggerEvents: TriggerEventConfig[] = node.data.triggerEvents || [];
  
  // If no triggerEvents but has legacy single trigger, convert it
  // Check triggerEvents first - if it exists (even empty), use it to allow "start over"
  const effectiveEvents: TriggerEventConfig[] = node.data.triggerEvents !== undefined
    ? triggerEvents 
    : (node.data.itemType && node.data.triggerEvent 
      ? [{ id: 'legacy_1', itemType: node.data.itemType, triggerEvent: node.data.triggerEvent, seq: 0 }]
      : []);

  // Sync trigger events from backend to populate backendIds
  useEffect(() => {
    const syncFromBackend = async () => {
      if (!workflowId || !user?.id || hasSyncedFromBackend) return;
      
      try {
        const backendEvents = await adminAPI.getWorkflowActivityEvents(user.id, parseInt(workflowId));
        
        if (backendEvents && backendEvents.length > 0) {
          // Map backend events to local format with backendIds, sorted by seq
          const syncedEvents: TriggerEventConfig[] = backendEvents
            .sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0))
            .map((be: any, index: number) => ({
              id: `synced_${be.id || index}`,
              itemType: be.items_type || '',
              triggerEvent: be.event_name || be.trigger_event || '',
              seq: be.seq ?? index,
              backendId: be.id,
              throttle: be.event_info?.throttle,
            }));
          
          // Update node with synced events
          const primary = syncedEvents[0];
          onUpdate(node.id, {
            triggerEvents: syncedEvents,
            itemType: primary?.itemType || '',
            triggerEvent: primary?.triggerEvent || '',
          });
        }
        
        setHasSyncedFromBackend(true);
      } catch (error) {
        console.error('Failed to sync trigger events from backend:', error);
        setHasSyncedFromBackend(true); // Mark as synced to prevent retry loop
      }
    };
    
    syncFromBackend();
  }, [workflowId, user?.id, hasSyncedFromBackend, node.id, onUpdate]);

  const handleAddEvent = async () => {
    if (!itemType || !triggerEvent || !user?.id) return;
    
    // Check for duplicates
    const isDuplicate = effectiveEvents.some(
      e => e.itemType === itemType && e.triggerEvent === triggerEvent
    );
    
    if (isDuplicate) return;

    setIsSaving(true);
    
    try {
      let backendId: number | undefined;
      
      // Calculate new seq as max + 1
      const newSeq = effectiveEvents.length > 0 
        ? Math.max(...effectiveEvents.map(e => e.seq)) + 1 
        : 0;

      // If we have a workflowId, persist to backend
      if (workflowId) {
        const response = await adminAPI.createWorkflowActivityEvent(user.id, {
          workflow_items_id: parseInt(workflowId),
          items_type: itemType,
          trigger_event: triggerEvent,
          seq: newSeq,
        });
        backendId = response?.id;
      }

      const newSeqValue = effectiveEvents.length > 0 
        ? Math.max(...effectiveEvents.map(e => e.seq)) + 1 
        : 0;

      const newEvent: TriggerEventConfig = {
        id: `event_${Date.now()}`,
        itemType,
        triggerEvent,
        seq: newSeqValue,
        backendId,
        // No throttle by default - executes every time
      };
      
      const updatedEvents = [...effectiveEvents, newEvent];
      updateNodeWithEvents(updatedEvents);
      setItemType("");
      setTriggerEvent("");
    } catch (error) {
      console.error('Failed to create trigger event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEvent = async (eventId: string) => {
    if (!user?.id) return;
    
    const eventToRemove = effectiveEvents.find(e => e.id === eventId);
    
    // If the event has a backendId, delete it from the backend
    if (eventToRemove?.backendId) {
      try {
        await adminAPI.deleteWorkflowActivityEvent(user.id, eventToRemove.backendId);
      } catch (error) {
        console.error('Failed to delete trigger event:', error);
        return; // Don't remove from UI if backend delete fails
      }
    }
    
    const updatedEvents = effectiveEvents.filter(e => e.id !== eventId);
    updateNodeWithEvents(updatedEvents);
    
  };

  const updateNodeWithEvents = useCallback((events: TriggerEventConfig[]) => {
    const primary = events[0];
    onUpdate(node.id, {
      triggerEvents: events,
      // Keep first event for backward compatibility
      itemType: primary?.itemType || '',
      triggerEvent: primary?.triggerEvent || '',
    });
  }, [node.id, onUpdate]);

  // Handle throttle configuration change for a trigger event
  const handleThrottleChange = useCallback(async (eventId: string, newThrottle: TriggerThrottleConfig) => {
    const eventToUpdate = effectiveEvents.find(e => e.id === eventId);
    if (!eventToUpdate) return;
    
    const updatedEvents = effectiveEvents.map(e => 
      e.id === eventId ? { ...e, throttle: newThrottle } : e
    );
    updateNodeWithEvents(updatedEvents);
    
    // Persist to backend if event has a backendId
    if (eventToUpdate.backendId && user?.id && workflowId) {
      try {
        // Always include throttle in event_info - set to null/disabled when turned off
        const eventInfo: Record<string, any> = {
          throttle: newThrottle.enabled 
            ? {
                enabled: true,
                scope: newThrottle.scope,
                target: newThrottle.target,
                ...(newThrottle.maxExecutions && { maxExecutions: newThrottle.maxExecutions }),
                ...(newThrottle.cooldownMinutes && { cooldownMinutes: newThrottle.cooldownMinutes }),
              }
            : { enabled: false }, // Explicitly disable throttle
        };
        
        await adminAPI.updateWorkflowActivityEvent(
          user.id,
          eventToUpdate.backendId,
          parseInt(workflowId),
          {
            items_type: eventToUpdate.itemType,
            trigger_event: eventToUpdate.triggerEvent,
            event_info: eventInfo,
          }
        );
      } catch (error) {
        console.error('Failed to update throttle config:', error);
      }
    }
  }, [effectiveEvents, user?.id, workflowId, updateNodeWithEvents]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Handle drag end for reordering
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !user?.id) return;

    const oldIndex = effectiveEvents.findIndex(e => e.id === active.id);
    const newIndex = effectiveEvents.findIndex(e => e.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Build a map of old sequences for comparison
    const oldSeqMap = new Map(effectiveEvents.map(e => [e.id, e.seq]));

    // Reorder locally and assign new sequences
    const reorderedEvents = arrayMove(effectiveEvents, oldIndex, newIndex).map((e, idx) => ({
      ...e,
      seq: idx,
    }));

    // Update UI immediately
    updateNodeWithEvents(reorderedEvents);

    // Only patch events whose seq actually changed
    const eventsToUpdate = reorderedEvents.filter(e => 
      e.backendId && oldSeqMap.get(e.id) !== e.seq
    );

    if (eventsToUpdate.length > 0) {
      try {
        await Promise.all(
          eventsToUpdate.map(e => 
            adminAPI.updateWorkflowActivityEvent(user.id, e.backendId!, parseInt(workflowId!), { 
              items_type: e.itemType,
              trigger_event: e.triggerEvent,
              seq: e.seq 
            })
          )
        );
      } catch (error) {
        console.error('Failed to update trigger event sequences:', error);
      }
    }
  }, [effectiveEvents, user?.id, updateNodeWithEvents, workflowId]);

  const canAddOrSave = itemType && triggerEvent;

  return (
    <>
      {/* Existing trigger events list with drag-and-drop */}
      {effectiveEvents.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase">Configured Triggers (drag to reorder)</Label>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={effectiveEvents.map(e => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {effectiveEvents
                  .sort((a, b) => a.seq - b.seq)
                  .map((event, index) => (
                    <SortableTriggerItem
                      key={event.id}
                      event={event}
                      index={index}
                      onRemove={handleRemoveEvent}
                      onThrottleChange={handleThrottleChange}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add event form */}
      <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
        <Label className="text-xs text-muted-foreground uppercase">
          Add Trigger Event
        </Label>
        
        <div className="space-y-2">
          <Label>Item Type</Label>
          <Select value={itemType} onValueChange={setItemType}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select item type..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {ITEM_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Trigger Event</Label>
          <Select value={triggerEvent} onValueChange={setTriggerEvent}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select event..." />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {TRIGGER_EVENTS.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={handleAddEvent}
          disabled={!canAddOrSave || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          {isSaving ? 'Adding...' : 'Add Trigger'}
        </Button>
      </div>

      {effectiveEvents.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Workflow runs when any of the {effectiveEvents.length} trigger{effectiveEvents.length > 1 ? 's' : ''} occur{effectiveEvents.length === 1 ? 's' : ''}.
        </p>
      )}
    </>
  );
}
