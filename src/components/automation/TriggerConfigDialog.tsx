import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ITEM_TYPES, TRIGGER_EVENTS, TriggerThrottleConfig } from "./types";
import { Zap, X, Plus, Loader2, Pencil, Check, ChevronDown, Clock } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import type { TriggerEventConfig } from "./types";
import { TriggerThrottleConfig as ThrottleConfigPanel } from "./TriggerThrottleConfig";

interface TriggerEvent extends TriggerEventConfig {
  isModified?: boolean; // Track if existing event was modified
}

const DEFAULT_THROTTLE: TriggerThrottleConfig = {
  enabled: false,
  scope: 'session',
  target: 'browser',
};

interface TriggerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { itemType: string; triggerEvent: string; events: TriggerEvent[] }) => void;
  workflowId?: string | null;
  existingEvents?: TriggerEventConfig[];
}

export function TriggerConfigDialog({ 
  open, 
  onOpenChange, 
  onConfirm,
  workflowId,
  existingEvents = []
}: TriggerConfigDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [itemType, setItemType] = useState<string>("");
  const [triggerEvent, setTriggerEvent] = useState<string>("");
  const [throttleConfig, setThrottleConfig] = useState<TriggerThrottleConfig>({ ...DEFAULT_THROTTLE });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Load existing events when dialog opens - merge from props and API
  useEffect(() => {
    const loadExistingEvents = async () => {
      if (!open) return;
      
      // Start with events from props (from Start node)
      const propsEvents: TriggerEvent[] = (existingEvents || []).map(e => ({
        ...e,
        isModified: false,
      }));
      
      // If we have a workflowId, fetch from API and merge
      if (workflowId && user?.id) {
        setIsLoading(true);
        try {
          const response = await adminAPI.getWorkflowActivityEvents(user.id, parseInt(workflowId));
          if (Array.isArray(response) && response.length > 0) {
            const apiEvents: TriggerEvent[] = response
              .sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0))
              .map((evt: any, index: number) => ({
                id: `event_${evt.id}`,
                itemType: evt.items_type || '',
                triggerEvent: evt.event_name || evt.trigger_event || 'view',
                seq: evt.seq ?? index,
                backendId: evt.id,
                isModified: false,
                throttle: evt.event_info?.throttle || { ...DEFAULT_THROTTLE },
              }));
            
            // Merge: prefer API events (they have backendId), add any from props that aren't in API
            const mergedEvents = [...apiEvents];
            for (const propEvent of propsEvents) {
              const existsInApi = apiEvents.some(
                ae => ae.itemType === propEvent.itemType && ae.triggerEvent === propEvent.triggerEvent
              );
              if (!existsInApi && !propEvent.backendId) {
                mergedEvents.push(propEvent);
              }
            }
            setEvents(mergedEvents);
          } else {
            setEvents(propsEvents);
          }
        } catch (error) {
          console.error('Failed to load workflow events:', error);
          setEvents(propsEvents);
        } finally {
          setIsLoading(false);
        }
      } else {
        setEvents(propsEvents);
      }
    };

    loadExistingEvents();
  }, [open, workflowId, user?.id, existingEvents]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setItemType("");
      setTriggerEvent("");
      setThrottleConfig({ ...DEFAULT_THROTTLE });
      setEditingEventId(null);
      setExpandedEventId(null);
    }
  }, [open]);

  const handleStartEdit = (event: TriggerEvent) => {
    setEditingEventId(event.id);
    setItemType(event.itemType);
    setTriggerEvent(event.triggerEvent);
    setThrottleConfig(event.throttle || { ...DEFAULT_THROTTLE });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setItemType("");
    setTriggerEvent("");
    setThrottleConfig({ ...DEFAULT_THROTTLE });
  };

  const handleSaveEdit = () => {
    if (!editingEventId || !itemType || !triggerEvent) return;
    
    // Check for duplicates (excluding the event being edited)
    const isDuplicate = events.some(
      e => e.id !== editingEventId && e.itemType === itemType && e.triggerEvent === triggerEvent
    );
    
    if (isDuplicate) {
      toast({
        title: "Duplicate Event",
        description: "This trigger combination already exists.",
        variant: "destructive",
      });
      return;
    }

    setEvents(prev => prev.map(e => {
      if (e.id === editingEventId) {
        return {
          ...e,
          itemType,
          triggerEvent,
          throttle: throttleConfig,
          isModified: true, // Always mark as modified when editing
        };
      }
      return e;
    }));
    
    setEditingEventId(null);
    setItemType("");
    setTriggerEvent("");
    setThrottleConfig({ ...DEFAULT_THROTTLE });
  };

  const handleAddEvent = () => {
    if (!itemType || !triggerEvent) return;
    
    // Check for duplicates
    const isDuplicate = events.some(
      e => e.itemType === itemType && e.triggerEvent === triggerEvent
    );
    
    if (isDuplicate) {
      toast({
        title: "Duplicate Event",
        description: "This trigger combination already exists.",
        variant: "destructive",
      });
      return;
    }

    const newSeq = events.length > 0 ? Math.max(...events.map(e => e.seq)) + 1 : 0;
    
    const newEvent: TriggerEvent = {
      id: `event_${Date.now()}`,
      itemType,
      triggerEvent,
      seq: newSeq,
      // Only include throttle if enabled
      ...(throttleConfig.enabled ? { throttle: throttleConfig } : {}),
    };
    
    setEvents(prev => [...prev, newEvent]);
    setItemType("");
    setTriggerEvent("");
    setThrottleConfig({ ...DEFAULT_THROTTLE });
  };

  // Update throttle config for an existing event
  const handleThrottleChange = (eventId: string, newThrottle: TriggerThrottleConfig) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        return {
          ...e,
          throttle: newThrottle,
          isModified: true,
        };
      }
      return e;
    }));
  };

  const handleRemoveEvent = async (eventId: string) => {
    const eventToRemove = events.find(e => e.id === eventId);
    
    // If this event has a backend ID, delete it from the API
    if (eventToRemove?.backendId && user?.id) {
      try {
        await adminAPI.deleteWorkflowActivityEvent(user.id, eventToRemove.backendId);
      } catch (error) {
        console.error('Failed to delete event from backend:', error);
        toast({
          title: "Error",
          description: "Failed to remove event. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // If we're editing this event, cancel the edit
    if (editingEventId === eventId) {
      handleCancelEdit();
    }
    
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleConfirm = async () => {
    if (events.length === 0) return;
    
    setIsSaving(true);
    
    try {
      if (workflowId && user?.id) {
        // Build event_info object with throttle configuration
        const buildEventInfo = (event: TriggerEvent) => {
          const eventInfo: Record<string, any> = {};
          if (event.throttle && event.throttle.enabled) {
            eventInfo.throttle = {
              enabled: event.throttle.enabled,
              scope: event.throttle.scope,
              target: event.throttle.target,
              ...(event.throttle.maxExecutions && { maxExecutions: event.throttle.maxExecutions }),
              ...(event.throttle.cooldownMinutes && { cooldownMinutes: event.throttle.cooldownMinutes }),
            };
          }
          return Object.keys(eventInfo).length > 0 ? eventInfo : undefined;
        };

        // Handle new events (those without backendId)
        const newEvents = events.filter(e => !e.backendId);
        for (const event of newEvents) {
          await adminAPI.createWorkflowActivityEvent(user.id, {
            workflow_items_id: parseInt(workflowId),
            items_type: event.itemType,
            trigger_event: event.triggerEvent,
            event_info: buildEventInfo(event),
          });
        }
        
        // Handle modified events - use PATCH to update instead of delete+create
        const modifiedEvents = events.filter(e => e.backendId && e.isModified);
        for (const event of modifiedEvents) {
          await adminAPI.updateWorkflowActivityEvent(
            user.id,
            event.backendId!,
            parseInt(workflowId),
            {
              items_type: event.itemType,
              trigger_event: event.triggerEvent,
              event_info: buildEventInfo(event),
            }
          );
        }
      }
      
      // Use the first event as the primary trigger for backward compatibility
      const primaryEvent = events[0];
      onConfirm({ 
        itemType: primaryEvent.itemType, 
        triggerEvent: primaryEvent.triggerEvent,
        events 
      });
      
      toast({
        title: "Trigger Configured",
        description: `${events.length} trigger event${events.length > 1 ? 's' : ''} configured.`,
      });
    } catch (error) {
      console.error('Failed to save trigger events:', error);
      toast({
        title: "Error",
        description: "Failed to save trigger configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = events.length > 0;
  const canAddOrSave = itemType && triggerEvent;
  const isEditing = editingEventId !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Configure Trigger</DialogTitle>
              <DialogDescription>
                Define what initiates this automation workflow
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          {/* Existing events list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : events.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase">Configured Triggers</Label>
              <div className="space-y-2">
                {events.map(event => (
                  <Collapsible
                    key={event.id}
                    open={expandedEventId === event.id}
                    onOpenChange={(open) => setExpandedEventId(open ? event.id : null)}
                  >
                    <div className={`rounded-lg border ${event.isModified ? 'border-amber-500/50' : 'border-border'} bg-muted/30`}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Badge variant={editingEventId === event.id ? "default" : "secondary"}>
                            {ITEM_TYPES.find(t => t.value === event.itemType)?.label}
                          </Badge>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm">
                            {TRIGGER_EVENTS.find(e => e.value === event.triggerEvent)?.label}
                          </span>
                          {event.throttle?.enabled && (
                            <Badge variant="outline" className="ml-2 text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              {event.throttle.scope}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedEventId === event.id ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleStartEdit(event)}
                            title="Edit trigger"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:text-destructive"
                            onClick={() => handleRemoveEvent(event.id)}
                            title="Remove trigger"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t">
                          <div className="pt-3">
                            <ThrottleConfigPanel 
                              config={event.throttle || { ...DEFAULT_THROTTLE }}
                              onChange={(newThrottle) => handleThrottleChange(event.id, newThrottle)}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit event form */}
          <div className={`space-y-3 p-3 rounded-lg border ${isEditing ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}>
            <Label className="text-xs text-muted-foreground uppercase">
              {isEditing ? 'Edit Trigger Event' : 'Add Trigger Event'}
            </Label>
            
            <div className="space-y-2">
              <Label htmlFor="item-type">When a</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger id="item-type">
                  <SelectValue placeholder="Select item type..." />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-event">is</Label>
              <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                <SelectTrigger id="trigger-event">
                  <SelectValue placeholder="Select trigger event..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Throttle configuration for new/editing event */}
            <Collapsible defaultOpen={throttleConfig.enabled}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Throttling Options
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ThrottleConfigPanel config={throttleConfig} onChange={setThrottleConfig} />
              </CollapsibleContent>
            </Collapsible>

            {isEditing ? (
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!canAddOrSave}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Update
                </Button>
              </div>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddEvent}
                disabled={!canAddOrSave}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Trigger
              </Button>
            )}
          </div>

          {events.length > 0 && (
            <div className="p-3 rounded-md bg-muted">
              <p className="text-sm text-muted-foreground">
                This automation will run when any of the <strong className="text-foreground">{events.length}</strong> configured trigger{events.length > 1 ? 's' : ''} occur{events.length === 1 ? 's' : ''}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || isSaving || isEditing}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {workflowId ? 'Save Triggers' : 'Create Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
