import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { 
  Play, 
  Square, 
  GitBranch,
  Clock,
  Layers,
  X,
  ChevronRight,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionPort, PortHandle } from "./ConnectionPort";
import type { WorkflowNode as WorkflowNodeType, NodeType, TriggerEventConfig } from "./types";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Check if any trigger events have throttling enabled
const hasThrottledTriggers = (triggerEvents?: TriggerEventConfig[]): boolean => {
  if (!triggerEvents || triggerEvents.length === 0) return false;
  return triggerEvents.some(event => event.throttle?.enabled);
};

// Get throttle summary for tooltip
const getThrottleSummary = (triggerEvents?: TriggerEventConfig[]): string[] => {
  if (!triggerEvents) return [];
  return triggerEvents
    .filter(event => event.throttle?.enabled)
    .map(event => {
      const scope = event.throttle?.scope || 'none';
      const target = event.throttle?.target || 'browser';
      const max = event.throttle?.maxExecutions || 1;
      return `${event.triggerEvent}: ${max}x per ${scope} (${target})`;
    });
};

// Throttle indicator component
function ThrottleIndicator({ triggerEvents }: { triggerEvents?: TriggerEventConfig[] }) {
  const throttledCount = triggerEvents?.filter(e => e.throttle?.enabled).length || 0;
  const summaries = getThrottleSummary(triggerEvents);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Timer className="h-3 w-3" />
            <span className="text-[10px] font-medium">{throttledCount}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="font-medium text-xs mb-1">Throttled Triggers</p>
          <ul className="text-xs space-y-0.5">
            {summaries.map((summary, i) => (
              <li key={i} className="opacity-80">{summary}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ActivityNodeProps {
  node: WorkflowNodeType;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrillDown?: (id: string) => void;
  onOpenConfig?: (id: string) => void;
  isDragging?: boolean;
  isConnecting?: boolean;
  isValidTarget?: boolean;
  onStartConnect?: (nodeId: string, portType: 'output', handle: PortHandle) => void;
  onEndConnect?: (nodeId: string, portType: 'input') => void;
  onPortHover?: (nodeId: string | null, portType: 'input' | 'output' | null, handle?: PortHandle) => void;
}

const getNodeIcon = (type: NodeType) => {
  switch (type) {
    case 'start':
      return <Play className="h-5 w-5" />;
    case 'end':
      return <Square className="h-5 w-5" />;
    case 'condition':
      return <GitBranch className="h-5 w-5" />;
    case 'delay':
      return <Clock className="h-5 w-5" />;
    case 'activity':
      return <Layers className="h-5 w-5" />;
    default:
      return <Layers className="h-5 w-5" />;
  }
};

const getNodeStyles = (type: NodeType) => {
  switch (type) {
    case 'start':
      return 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
    case 'end':
      return 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300';
    case 'condition':
      return 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300';
    case 'delay':
      return 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300';
    case 'activity':
      return 'bg-primary/20 border-primary text-primary';
    default:
      return 'bg-muted border-border';
  }
};

export function ActivityNode({ 
  node, 
  isSelected, 
  onSelect, 
  onDelete,
  onDrillDown,
  onOpenConfig,
  isDragging,
  isConnecting,
  isValidTarget,
  onStartConnect,
  onEndConnect,
  onPortHover
}: ActivityNodeProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: node.id,
    data: { type: 'workflow-node', node },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    left: node.position.x,
    top: node.position.y,
  };

  const actionCount = node.data.actions?.length || 0;

  return (
    <div
      id={`node-${node.id}`}
      ref={setNodeRef}
      style={style}
      className={cn(
        "absolute cursor-grab active:cursor-grabbing",
        "min-w-[200px] rounded-lg border-2 shadow-md transition-all",
        "hover:shadow-lg",
        getNodeStyles(node.type),
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-50",
        isValidTarget && "ring-2 ring-primary ring-offset-2 scale-105"
      )}
      onClick={(e) => {
        e.stopPropagation();
        // For activity nodes, clicking opens the Edit Actions screen directly
        if (node.type === 'activity' && onDrillDown) {
          onDrillDown(node.id);
        } else {
          onSelect(node.id);
        }
      }}
      {...listeners}
      {...attributes}
    >
      {/* Delete button */}
      {node.type !== 'start' && node.type !== 'end' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors z-20"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Output connection ports */}
      {node.type !== 'end' && node.type !== 'condition' && (
        <ConnectionPort
          type="output"
          nodeId={node.id}
          isConnecting={isConnecting}
          onStartConnect={onStartConnect}
          onPortHover={onPortHover}
        />
      )}
      
      {/* Condition node branching ports (Yes/No) */}
      {node.type === 'condition' && (
        <>
          <ConnectionPort
            type="output"
            nodeId={node.id}
            handle="yes"
            label="Yes"
            position="left"
            isConnecting={isConnecting}
            onStartConnect={onStartConnect}
            onPortHover={onPortHover}
          />
          <ConnectionPort
            type="output"
            nodeId={node.id}
            handle="no"
            label="No"
            position="right"
            isConnecting={isConnecting}
            onStartConnect={onStartConnect}
            onPortHover={onPortHover}
          />
        </>
      )}
      
      {/* Input connection port (top) */}
      {node.type !== 'start' && (
        <ConnectionPort
          type="input"
          nodeId={node.id}
          isConnecting={isConnecting}
          isValidTarget={isValidTarget}
          onEndConnect={onEndConnect}
          onPortHover={onPortHover}
        />
      )}

      {/* Node content */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getNodeIcon(node.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{node.data.label}</p>
              {/* Throttle indicator for start node */}
              {node.type === 'start' && hasThrottledTriggers(node.data.triggerEvents) && (
                <ThrottleIndicator triggerEvents={node.data.triggerEvents} />
              )}
            </div>
            {node.type === 'start' && node.data.itemType && (
              <p className="text-xs opacity-70 truncate">
                {node.data.itemType} → {node.data.triggerEvent}
              </p>
            )}
            {node.type === 'delay' && node.data.delayAmount && (
              <p className="text-xs opacity-70 truncate">
                Wait {node.data.delayAmount} {node.data.delayUnit}
              </p>
            )}
            {node.type === 'condition' && node.data.conditionField && (
              <p className="text-xs opacity-70 truncate">
                {node.data.conditionField} {node.data.conditionOperator}
              </p>
            )}
          </div>
        </div>

        {/* Activity-specific: Show action count and drill-down */}
        {node.type === 'activity' && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                {actionCount} action{actionCount !== 1 ? 's' : ''}
              </Badge>
              {onOpenConfig && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenConfig(node.id);
                  }}
                  className="flex items-center gap-1 text-xs opacity-70 hover:opacity-100 transition-opacity"
                >
                  Edit
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
            {node.data.description && (
              <p className="text-xs opacity-60 mt-1 truncate">{node.data.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Draggable palette item for adding new nodes
interface PaletteItemProps {
  type: NodeType;
  label: string;
  description?: string;
  compact?: boolean;
}

export function ActivityPaletteItem({ type, label, description, compact }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'palette-item', nodeType: type },
  });

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center justify-center p-2 rounded-md border cursor-grab active:cursor-grabbing",
          "hover:bg-accent transition-colors h-9 w-9",
          getNodeStyles(type),
          isDragging && "opacity-50"
        )}
        {...listeners}
        {...attributes}
      >
        {getNodeIcon(type)}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-3 p-3 rounded-md border cursor-grab active:cursor-grabbing",
        "hover:bg-accent transition-colors",
        getNodeStyles(type),
        isDragging && "opacity-50"
      )}
      {...listeners}
      {...attributes}
    >
      {getNodeIcon(type)}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        {description && (
          <span className="text-xs opacity-70 block truncate">{description}</span>
        )}
      </div>
    </div>
  );
}
