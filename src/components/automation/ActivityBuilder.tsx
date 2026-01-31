import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Plus,
  Mail,
  Phone,
  Bell,
  MessageCircle,
  ClipboardList,
  UserPlus,
  FileText,
  Edit,
  Tag,
  X,
  RefreshCw,
  Maximize2,
  ExternalLink,
  Globe,
  Zap,
  Hash,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Trash2,
  GitBranch,
  ArrowRightLeft,
  Loader2,
  Check,
  Settings,
  CreditCard,
  Receipt,
  FileCheck,
  RotateCcw,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { WorkflowNode, ActionItem, ActionCategory, ActivityRoute } from "./types";
import { ACTION_CATEGORIES, CONDITION_OPERATORS } from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AutomationFormBuilder, AutomationFormConfig } from "./AutomationFormBuilder";
import { ActionConditionBuilder } from "./ActionConditionBuilder";
import { VariablePreviewPanel } from "./VariablePreviewPanel";
import { EmailConfigPanel, EmailConfig } from "./EmailConfigPanel";
import { ShowModalConfigPanel, ShowModalConfig } from "./ShowModalConfigPanel";
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

interface ActivityBuilderProps {
  node: WorkflowNode;
  allNodes: WorkflowNode[]; // All nodes in the workflow for routing
  onBack: () => void;
  onUpdate: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onAutoSave?: (node: WorkflowNode) => Promise<void>;
}

const getActionIcon = (actionType: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    send_email: <Mail className="h-4 w-4" />,
    send_sms: <Phone className="h-4 w-4" />,
    push_notification: <Bell className="h-4 w-4" />,
    in_app_message: <MessageCircle className="h-4 w-4" />,
    create_task: <ClipboardList className="h-4 w-4" />,
    assign_task: <UserPlus className="h-4 w-4" />,
    add_note: <FileText className="h-4 w-4" />,
    notify_admin: <Bell className="h-4 w-4" />,
    update_field: <Edit className="h-4 w-4" />,
    add_tag: <Tag className="h-4 w-4" />,
    remove_tag: <X className="h-4 w-4" />,
    update_status: <RefreshCw className="h-4 w-4" />,
    show_form: <ClipboardList className="h-4 w-4" />,
    show_modal: <Maximize2 className="h-4 w-4" />,
    redirect: <ExternalLink className="h-4 w-4" />,
    webhook: <Globe className="h-4 w-4" />,
    api_call: <Zap className="h-4 w-4" />,
    slack_message: <Hash className="h-4 w-4" />,
    stripe_checkout: <CreditCard className="h-4 w-4" />,
    create_invoice: <Receipt className="h-4 w-4" />,
    send_receipt: <FileCheck className="h-4 w-4" />,
    refund: <RotateCcw className="h-4 w-4" />,
  };
  return iconMap[actionType] || <ClipboardList className="h-4 w-4" />;
};

const getCategoryIcon = (categoryId: ActionCategory) => {
  const iconMap: Record<ActionCategory, React.ReactNode> = {
    communication: <MessageCircle className="h-4 w-4" />,
    task_management: <ClipboardList className="h-4 w-4" />,
    data_management: <Edit className="h-4 w-4" />,
    forms: <FileText className="h-4 w-4" />,
    payments: <Zap className="h-4 w-4" />,
    integrations: <Globe className="h-4 w-4" />,
  };
  return iconMap[categoryId];
};

const getCategoryColor = (categoryId: ActionCategory) => {
  const colorMap: Record<ActionCategory, string> = {
    communication: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30',
    task_management: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30',
    data_management: 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30',
    forms: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    payments: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    integrations: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/30',
  };
  return colorMap[categoryId];
};

// Generate unique ID
const generateId = () => `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Sortable Action Item Component
interface SortableActionItemProps {
  action: ActionItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function SortableActionItem({ action, index, isSelected, onSelect, onRemove }: SortableActionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: action.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasConditions = action.conditionalLogic?.enabled && action.conditionalLogic.conditions.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md bg-background/50 cursor-pointer transition-colors border",
        isSelected && "ring-2 ring-primary",
        isDragging && "opacity-50 z-50",
        hasConditions ? "border-amber-500/30 bg-amber-500/5" : "border-transparent"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-medium">
        {index + 1}
      </span>
      {getActionIcon(action.type)}
      <span className="flex-1 text-sm truncate">{action.label}</span>
      {hasConditions && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <GitBranch className="h-2.5 w-2.5" />
          {action.conditionalLogic!.conditions.length}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-1 hover:bg-destructive/20 rounded transition-colors"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </button>
    </div>
  );
}

// localStorage keys for layout persistence
const STORAGE_KEYS = {
  paletteCollapsed: 'activity_builder_palette_collapsed',
  routesExpanded: 'activity_builder_routes_expanded',
  configPanelSize: 'activity_builder_config_panel_size',
};

export function ActivityBuilder({ node, allNodes, onBack, onUpdate, onAutoSave }: ActivityBuilderProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    ACTION_CATEGORIES.map(c => c.id)
  );
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [formBuilderActionId, setFormBuilderActionId] = useState<string | null>(null);
  
  // Persisted layout states
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.paletteCollapsed);
    return stored !== null ? stored === 'true' : true;
  });
  const [isRoutesExpanded, setIsRoutesExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.routesExpanded);
    return stored !== null ? stored === 'true' : false;
  });
  const [configPanelSize, setConfigPanelSize] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.configPanelSize);
    return stored ? parseInt(stored, 10) : 40;
  });
  
  // Auto-save debounce ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Persist layout changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.paletteCollapsed, String(isPaletteCollapsed));
  }, [isPaletteCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.routesExpanded, String(isRoutesExpanded));
  }, [isRoutesExpanded]);

  const handleConfigPanelResize = useCallback((size: number) => {
    setConfigPanelSize(size);
    localStorage.setItem(STORAGE_KEYS.configPanelSize, String(Math.round(size)));
  }, []);

  const actions = node.data.actions || [];
  const routes = node.data.routes || [];
  
  // Get other activity nodes for routing (exclude current node, start, end)
  const availableActivities = allNodes.filter(
    n => n.type === 'activity' && n.id !== node.id
  );
  
  // Auto-save effect - triggers when actions or routes change
  useEffect(() => {
    // Skip on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    
    // Skip if no activityId (not yet persisted) or no onAutoSave
    if (!node.data.activityId || !onAutoSave) return;
    
    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Debounce auto-save by 2 seconds
    autoSaveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveFailed(false);
      try {
        await onAutoSave(node);
        setSaveSuccess(true);
        setSaveFailed(false);
        // Hide success indicator after 2 seconds
        setTimeout(() => setSaveSuccess(false), 2000);
      } catch (error: any) {
        setSaveFailed(true);
        const isAuthError = error?.code === 'AUTH_REQUIRED' || 
          error?.message?.includes('Authentication required');
        
        toast({
          title: isAuthError ? "Session Expired" : "Auto-save Failed",
          description: isAuthError 
            ? "Please sign in again to continue editing."
            : "Failed to save activity changes. Use the Save button to retry.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 2000);
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [node.data.actions, node.data.routes, node.data.label, node.data.description, node.data.activityId, onAutoSave, node]);

  // Manual save handler
  const handleManualSave = useCallback(async () => {
    if (!onAutoSave || !node.data.activityId) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onAutoSave(node);
      setSaveSuccess(true);
      setSaveFailed(false);
      toast({
        title: "Saved",
        description: "Activity changes saved successfully.",
      });
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      setSaveFailed(true);
      const isAuthError = error?.code === 'AUTH_REQUIRED' || 
        error?.message?.includes('Authentication required');
      
      toast({
        title: isAuthError ? "Session Expired" : "Save Failed",
        description: isAuthError 
          ? "Please sign in again to continue editing."
          : "Failed to save activity changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [onAutoSave, node]);

  // Group actions by category
  const groupedActions = actions.reduce<Record<ActionCategory, ActionItem[]>>((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<ActionCategory, ActionItem[]>);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const addAction = useCallback((categoryId: ActionCategory, actionType: string, actionLabel: string) => {
    const newAction: ActionItem = {
      id: generateId(),
      type: actionType,
      label: actionLabel,
      category: categoryId,
      config: {},
    };
    
    onUpdate(node.id, {
      actions: [...actions, newAction],
    });
    setSelectedActionId(newAction.id);
  }, [actions, node.id, onUpdate]);

  const removeAction = useCallback((actionId: string) => {
    onUpdate(node.id, {
      actions: actions.filter(a => a.id !== actionId),
    });
    if (selectedActionId === actionId) {
      setSelectedActionId(null);
    }
  }, [actions, node.id, onUpdate, selectedActionId]);

  const updateAction = useCallback((actionId: string, updates: Partial<ActionItem>) => {
    onUpdate(node.id, {
      actions: actions.map(a => a.id === actionId ? { ...a, ...updates } : a),
    });
  }, [actions, node.id, onUpdate]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering actions
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = actions.findIndex(a => a.id === active.id);
      const newIndex = actions.findIndex(a => a.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newActions = arrayMove(actions, oldIndex, newIndex);
        onUpdate(node.id, { actions: newActions });
      }
    }
  }, [actions, node.id, onUpdate]);

  const selectedAction = actions.find(a => a.id === selectedActionId);

  // Route management functions
  const addRoute = useCallback(() => {
    const newRoute: ActivityRoute = {
      id: generateId(),
      targetActivityId: '',
      isDefault: routes.length === 0, // First route is default
    };
    onUpdate(node.id, {
      routes: [...routes, newRoute],
    });
  }, [routes, node.id, onUpdate]);

  const removeRoute = useCallback((routeId: string) => {
    const updatedRoutes = routes.filter(r => r.id !== routeId);
    // If we removed the default route, make the first one default
    if (updatedRoutes.length > 0 && !updatedRoutes.some(r => r.isDefault)) {
      updatedRoutes[0].isDefault = true;
    }
    onUpdate(node.id, { routes: updatedRoutes });
  }, [routes, node.id, onUpdate]);

  const updateRoute = useCallback((routeId: string, updates: Partial<ActivityRoute>) => {
    onUpdate(node.id, {
      routes: routes.map(r => {
        if (r.id === routeId) {
          // If setting this as default, unset others
          if (updates.isDefault) {
            return { ...r, ...updates, condition: undefined };
          }
          return { ...r, ...updates };
        }
        // If another route is being set as default, unset this one
        if (updates.isDefault && r.isDefault) {
          return { ...r, isDefault: false };
        }
        return r;
      }),
    });
  }, [routes, node.id, onUpdate]);

  // If form builder is open, show it instead
  if (showFormBuilder && formBuilderActionId) {
    const formAction = actions.find(a => a.id === formBuilderActionId);
    const currentFormConfig: AutomationFormConfig = formAction?.config?.formConfig || {
      title: '',
      description: '',
      submitButtonText: 'Submit',
      fields: [],
    };

    return (
      <AutomationFormBuilder
        config={currentFormConfig}
        onChange={(newConfig) => {
          updateAction(formBuilderActionId, {
            config: { ...formAction?.config, formConfig: newConfig }
          });
        }}
        onBack={() => {
          setShowFormBuilder(false);
          setFormBuilderActionId(null);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Compact */}
      <div className="flex items-center justify-between px-3 py-2 border-b gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={node.data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            placeholder="Activity name"
            className="h-8 text-sm font-medium max-w-[200px]"
          />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {actions.length} action{actions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isSaving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="hidden sm:inline">Saving...</span>
            </div>
          )}
          {saveSuccess && !isSaving && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </div>
          )}
          {saveFailed && !isSaving && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualSave}
              className="h-7 text-xs gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Retry</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Action Palette - Collapsible */}
        <TooltipProvider delayDuration={100}>
          <div className={cn(
            "border-r bg-muted/30 flex flex-col transition-all duration-200",
            isPaletteCollapsed ? "w-12" : "w-56"
          )}>
            {/* Collapse toggle */}
            <div className={cn(
              "p-2 flex border-b",
              isPaletteCollapsed ? "justify-center" : "justify-between items-center"
            )}>
              {!isPaletteCollapsed && (
                <span className="text-xs font-medium text-muted-foreground">Actions</span>
              )}
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
              <ScrollArea className="flex-1">
                <div className="flex flex-col items-center gap-1 p-1.5">
                  {ACTION_CATEGORIES.map((category) => (
                    <div key={category.id} className="w-full space-y-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "flex items-center justify-center p-1.5 rounded-md border text-xs",
                            getCategoryColor(category.id)
                          )}>
                            {getCategoryIcon(category.id)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium text-xs">{category.label}</p>
                        </TooltipContent>
                      </Tooltip>
                      {category.actions.map((action) => (
                        <Tooltip key={action.value}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => addAction(category.id, action.value, action.label)}
                              className="flex items-center justify-center w-full p-1 rounded hover:bg-accent transition-colors"
                            >
                              {getActionIcon(action.value)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-xs">{action.label}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              /* Expanded state */
              <ScrollArea className="flex-1">
                <div className="p-1.5 space-y-1">
                  {ACTION_CATEGORIES.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories.includes(category.id)}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <CollapsibleTrigger className={cn(
                        "flex items-center gap-1.5 w-full p-1.5 rounded-md border transition-colors text-xs",
                        getCategoryColor(category.id)
                      )}>
                        {getCategoryIcon(category.id)}
                        <span className="flex-1 text-left font-medium">{category.label}</span>
                        {expandedCategories.includes(category.id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-1.5 pt-0.5 space-y-0.5">
                        {category.actions.map((action) => (
                          <button
                            key={action.value}
                            onClick={() => addAction(category.id, action.value, action.label)}
                            className="flex items-center gap-1.5 w-full p-1 rounded text-xs hover:bg-accent transition-colors"
                          >
                            <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                            {getActionIcon(action.value)}
                            <span className="truncate">{action.label}</span>
                          </button>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </TooltipProvider>

        {/* Main content with resizable config panel */}
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={selectedAction ? 60 : 100} minSize={35}>
            {/* Action Tree */}
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Actions ({actions.length})</h4>
                    <p className="text-[10px] text-muted-foreground">Drag to reorder</p>
                  </div>
                  
                  {actions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <ClipboardList className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No actions yet</p>
                      <p className="text-[10px]">Add from palette on left</p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={actions.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1">
                          {actions.map((action, index) => (
                            <SortableActionItem
                              key={action.id}
                              action={action}
                              index={index}
                              isSelected={selectedActionId === action.id}
                              onSelect={() => setSelectedActionId(action.id)}
                              onRemove={() => removeAction(action.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </ScrollArea>
              
              {/* Routes Section - Collapsible at bottom */}
              <Collapsible open={isRoutesExpanded} onOpenChange={setIsRoutesExpanded} className="border-t bg-muted/20">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Routes</span>
                    {routes.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {routes.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        addRoute();
                      }}
                      disabled={availableActivities.length === 0}
                      className="h-6 text-xs px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-3 pt-0 space-y-2">
                    {availableActivities.length === 0 ? (
                      <div className="text-center py-3 text-muted-foreground border rounded bg-muted/20">
                        <GitBranch className="h-5 w-5 mx-auto mb-1 opacity-50" />
                        <p className="text-[10px]">No other activities</p>
                      </div>
                    ) : routes.length === 0 ? (
                      <div className="text-center py-3 text-muted-foreground border rounded bg-muted/20">
                        <GitBranch className="h-5 w-5 mx-auto mb-1 opacity-50" />
                        <p className="text-[10px]">No routes defined</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {routes.map((route, index) => {
                          const targetActivity = availableActivities.find(a => a.id === route.targetActivityId);
                          
                          return (
                            <div 
                              key={route.id} 
                              className={cn(
                                "rounded-lg border p-2 space-y-2",
                                route.isDefault 
                                  ? "border-primary/50 bg-primary/5" 
                                  : "border-secondary bg-secondary/20"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <GitBranch className={cn(
                                    "h-3.5 w-3.5",
                                    route.isDefault ? "text-primary" : "text-muted-foreground"
                                  )} />
                                  <span className="text-xs font-medium">
                                    {route.isDefault ? 'Default' : `Condition ${index}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!route.isDefault && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 text-[10px] px-1.5"
                                      onClick={() => updateRoute(route.id, { isDefault: true })}
                                    >
                                      Set Default
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => removeRoute(route.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>

                              {/* Target Activity */}
                              <Select
                                value={route.targetActivityId || '_none'}
                                onValueChange={(value) => updateRoute(route.id, { 
                                  targetActivityId: value === '_none' ? '' : value 
                                })}
                              >
                                <SelectTrigger className="bg-background h-7 text-xs">
                                  <SelectValue placeholder="Select activity..." />
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  <SelectItem value="_none">Select activity...</SelectItem>
                                  {availableActivities.map((activity) => (
                                    <SelectItem key={activity.id} value={activity.id}>
                                      {activity.data.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Condition (only for non-default routes) */}
                              {!route.isDefault && (
                                <div className="space-y-1.5 pt-1.5 border-t">
                                  <Label className="text-[10px] flex items-center gap-1">
                                    <GitBranch className="h-2.5 w-2.5" />
                                    When condition is met
                                  </Label>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <Input
                                      value={route.condition?.field || ''}
                                      onChange={(e) => updateRoute(route.id, {
                                        condition: { 
                                          ...route.condition, 
                                          field: e.target.value,
                                          operator: route.condition?.operator || 'equals',
                                          value: route.condition?.value || ''
                                        }
                                      })}
                                      placeholder="Field"
                                      className="h-7 text-xs"
                                    />
                                    <Select
                                      value={route.condition?.operator || 'equals'}
                                      onValueChange={(value) => updateRoute(route.id, {
                                        condition: { 
                                          ...route.condition,
                                          field: route.condition?.field || '',
                                          operator: value,
                                          value: route.condition?.value || ''
                                        }
                                      })}
                                    >
                                      <SelectTrigger className="h-7 text-xs bg-background">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-background z-50">
                                        {CONDITION_OPERATORS.map((op) => (
                                          <SelectItem key={op.value} value={op.value} className="text-xs">
                                            {op.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      value={route.condition?.value || ''}
                                      onChange={(e) => updateRoute(route.id, {
                                        condition: { 
                                          ...route.condition,
                                          field: route.condition?.field || '',
                                          operator: route.condition?.operator || 'equals',
                                          value: e.target.value
                                        }
                                      })}
                                      placeholder="Value"
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                </div>
                              )}

                              {targetActivity && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <ArrowRightLeft className="h-2.5 w-2.5" />
                                  <span>→ {targetActivity.data.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Variable Preview Panel */}
              <VariablePreviewPanel 
                actions={actions}
                onSimulate={(variables) => {
                  toast({
                    title: "Simulation Started",
                    description: `Testing workflow with ${Object.keys(variables).length} variables`,
                  });
                  console.log('Simulating with variables:', variables);
                }}
              />
            </div>
          </ResizablePanel>

          {/* Action Config Panel - Resizable */}
          {selectedAction && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel 
                defaultSize={configPanelSize} 
                minSize={25} 
                maxSize={55}
                onResize={handleConfigPanelResize}
              >
                <div className="h-full border-l bg-background flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between p-2 border-b shrink-0">
                    <h3 className="font-semibold text-xs">Configure Action</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setSelectedActionId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Action Label</Label>
                        <Input
                          value={selectedAction.label}
                          onChange={(e) => updateAction(selectedAction.id, { label: e.target.value })}
                          placeholder="Action label"
                          className="h-8 text-sm"
                        />
                      </div>

                      <Separator />

                      {/* Conditional Logic */}
                      <ActionConditionBuilder
                        conditionalLogic={selectedAction.conditionalLogic}
                        onChange={(logic) => updateAction(selectedAction.id, { conditionalLogic: logic })}
                        previousActions={actions.slice(0, actions.findIndex(a => a.id === selectedAction.id))}
                      />

                      <Separator />

                      {/* Email config */}
                      {selectedAction.type === 'send_email' && (
                        <EmailConfigPanel
                          config={{
                            from: selectedAction.config?.from || '',
                            to: selectedAction.config?.to || '',
                            subject: selectedAction.config?.subject || '',
                            htmlBody: selectedAction.config?.htmlBody || '',
                            tag: selectedAction.config?.tag,
                            metadata: selectedAction.config?.metadata,
                            itemsId: selectedAction.config?.itemsId,
                            campaignsId: selectedAction.config?.campaignsId,
                          }}
                          onChange={(emailConfig) => updateAction(selectedAction.id, { 
                            config: { 
                              ...selectedAction.config,
                              from: emailConfig.from,
                              to: emailConfig.to,
                              subject: emailConfig.subject,
                              htmlBody: emailConfig.htmlBody,
                              tag: emailConfig.tag,
                              metadata: emailConfig.metadata,
                              itemsId: emailConfig.itemsId,
                              campaignsId: emailConfig.campaignsId,
                            } 
                          })}
                        />
                      )}

                      {/* Webhook config */}
                      {selectedAction.type === 'webhook' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Webhook URL</Label>
                          <Input
                            value={selectedAction.config?.url || ''}
                            onChange={(e) => updateAction(selectedAction.id, { 
                              config: { ...selectedAction.config, url: e.target.value } 
                            })}
                            placeholder="https://..."
                            className="h-8 text-sm"
                          />
                        </div>
                      )}

                      {/* Note config */}
                      {selectedAction.type === 'add_note' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Note Content</Label>
                          <Textarea
                            value={selectedAction.config?.content || ''}
                            onChange={(e) => updateAction(selectedAction.id, { 
                              config: { ...selectedAction.config, content: e.target.value } 
                            })}
                            placeholder="Note content..."
                            rows={3}
                            className="text-sm"
                          />
                        </div>
                      )}

                      {/* Update field config */}
                      {selectedAction.type === 'update_field' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Field Name</Label>
                            <Input
                              value={selectedAction.config?.field || ''}
                              onChange={(e) => updateAction(selectedAction.id, { 
                                config: { ...selectedAction.config, field: e.target.value } 
                              })}
                              placeholder="e.g., status"
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">New Value</Label>
                            <Input
                              value={selectedAction.config?.value || ''}
                              onChange={(e) => updateAction(selectedAction.id, { 
                                config: { ...selectedAction.config, value: e.target.value } 
                              })}
                              placeholder="New value"
                              className="h-8 text-sm"
                            />
                          </div>
                        </>
                      )}

                      {/* Tag config */}
                      {(selectedAction.type === 'add_tag' || selectedAction.type === 'remove_tag') && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tag Name</Label>
                          <Input
                            value={selectedAction.config?.tag || ''}
                            onChange={(e) => updateAction(selectedAction.id, { 
                              config: { ...selectedAction.config, tag: e.target.value } 
                            })}
                            placeholder="Tag name"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}

                      {/* Show Form config */}
                      {selectedAction.type === 'show_form' && (
                        <div className="space-y-2">
                          <div className="p-2 bg-muted/50 rounded">
                            <p className="text-xs text-muted-foreground mb-2">
                              Configure a form to collect user data.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormBuilderActionId(selectedAction.id);
                                setShowFormBuilder(true);
                              }}
                              className="w-full gap-1.5 h-7 text-xs"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              Configure Form
                            </Button>
                          </div>
                          {selectedAction.config?.formConfig?.fields?.length > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              {selectedAction.config.formConfig.fields.length} field(s) configured
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show Modal config */}
                      {selectedAction.type === 'show_modal' && (
                        <ShowModalConfigPanel
                          config={{
                            message: selectedAction.config?.message || '',
                            buttons: selectedAction.config?.buttons || [],
                          }}
                          onChange={(modalConfig: ShowModalConfig) => updateAction(selectedAction.id, {
                            config: {
                              ...selectedAction.config,
                              message: modalConfig.message,
                              buttons: modalConfig.buttons,
                            }
                          })}
                        />
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
