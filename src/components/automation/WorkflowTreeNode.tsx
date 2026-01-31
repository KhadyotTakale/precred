import { memo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  Play,
  Square,
  Clock,
  GitBranch,
  Plus,
  Trash2,
  Settings,
  MoreHorizontal,
  Zap,
  Timer,
  CheckCircle,
  XCircle,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNode, Connection } from "./types";

interface WorkflowTreeNodeProps {
  node: WorkflowNode;
  childrenMap: Map<string, string[]>;
  nodesMap: Map<string, WorkflowNode>;
  connections: Connection[];
  expandedNodes: Set<string>;
  selectedNodeId: string | null;
  level: number;
  branchLabel?: string;
  parentId?: string;
  branchType?: 'yes' | 'no';
  onToggleExpand: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onAddActivity: (afterNodeId: string) => void;
  onDelete: (node: WorkflowNode) => void;
  onDrillDown: (nodeId: string) => void;
  onConfigure: (nodeId: string) => void;
  isDraggingEnabled?: boolean;
}

const getNodeIcon = (type: WorkflowNode['type']) => {
  switch (type) {
    case 'start':
      return <Play className="h-4 w-4 text-emerald-600" />;
    case 'end':
      return <Square className="h-4 w-4 text-rose-600" />;
    case 'activity':
      return <Zap className="h-4 w-4 text-blue-600" />;
    case 'condition':
      return <GitBranch className="h-4 w-4 text-amber-600" />;
    case 'delay':
      return <Timer className="h-4 w-4 text-purple-600" />;
    default:
      return <Zap className="h-4 w-4" />;
  }
};

const getNodeTypeColor = (type: WorkflowNode['type']) => {
  switch (type) {
    case 'start':
      return 'border-emerald-500/30 bg-emerald-500/5';
    case 'end':
      return 'border-rose-500/30 bg-rose-500/5';
    case 'activity':
      return 'border-blue-500/30 bg-blue-500/5';
    case 'condition':
      return 'border-amber-500/30 bg-amber-500/5';
    case 'delay':
      return 'border-purple-500/30 bg-purple-500/5';
    default:
      return 'border-border';
  }
};

// Drop zone component for inserting nodes between positions
interface DropZoneProps {
  targetNodeId: string;
  position: 'before' | 'after' | 'child';
  branchType?: 'yes' | 'no';
  isActive: boolean;
}

function DropZone({ targetNodeId, position, branchType, isActive }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop-${position}-${targetNodeId}${branchType ? `-${branchType}` : ''}`,
    data: {
      targetNodeId,
      position,
      branchType,
    },
  });

  if (!isActive) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-2 rounded-full transition-all duration-200 mx-8 my-1",
        isOver
          ? "bg-primary h-3 scale-105"
          : "bg-muted-foreground/20 hover:bg-muted-foreground/40"
      )}
    />
  );
}

export const WorkflowTreeNode = memo(function WorkflowTreeNode({
  node,
  childrenMap,
  nodesMap,
  connections,
  expandedNodes,
  selectedNodeId,
  level,
  branchLabel,
  parentId,
  branchType,
  onToggleExpand,
  onSelect,
  onAddActivity,
  onDelete,
  onDrillDown,
  onConfigure,
  isDraggingEnabled = false,
}: WorkflowTreeNodeProps) {
  const childIds = childrenMap.get(node.id) || [];
  const hasChildren = childIds.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedNodeId === node.id;

  // Draggable setup - only for activity, condition, delay nodes
  const canDrag = node.type === 'activity' || node.type === 'condition' || node.type === 'delay';
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: node.id,
    data: {
      node,
      parentId,
      branchType,
    },
    disabled: !canDrag,
  });

  // For condition nodes, separate children by connection handle (yes/no)
  const getConditionChildren = () => {
    if (node.type !== 'condition') return { yes: childIds, no: [] };

    const yesChildren: string[] = [];
    const noChildren: string[] = [];

    connections
      .filter(c => c.sourceId === node.id)
      .forEach(conn => {
        if (conn.sourceHandle === 'yes') {
          yesChildren.push(conn.targetId);
        } else if (conn.sourceHandle === 'no') {
          noChildren.push(conn.targetId);
        } else {
          yesChildren.push(conn.targetId);
        }
      });

    return { yes: yesChildren, no: noChildren };
  };

  const { yes: yesChildren, no: noChildren } = getConditionChildren();

  // Count actions for activity nodes
  const actionCount = node.data.actions?.length || 0;
  const triggerCount = node.data.triggerEvents?.length || 0;
  const hasThrottle = node.data.triggerEvents?.some(te => te.throttle?.enabled);

  const dragStyle = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div className={cn("relative", level > 0 && "ml-6")}>
      {/* Connection line to parent */}
      {level > 0 && (
        <div className="absolute -left-6 top-0 h-6 w-6 border-l-2 border-b-2 border-border rounded-bl-lg" />
      )}

      {/* Branch label */}
      {branchLabel && (
        <div className="absolute -left-6 top-0 -translate-y-1/2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0",
              branchLabel === 'Yes'
                ? "text-emerald-600 border-emerald-500/50 bg-emerald-500/10"
                : "text-rose-600 border-rose-500/50 bg-rose-500/10"
            )}
          >
            {branchLabel}
          </Badge>
        </div>
      )}

      {/* Drop zone before this node */}
      {level > 0 && node.type !== 'end' && (
        <DropZone 
          targetNodeId={node.id} 
          position="before" 
          branchType={branchType}
          isActive={isDraggingEnabled && !isDragging}
        />
      )}

      <Collapsible open={isExpanded} onOpenChange={() => hasChildren && onToggleExpand(node.id)}>
        {/* Node Item */}
        <div
          ref={setDragRef}
          style={dragStyle}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors group",
            getNodeTypeColor(node.type),
            isSelected && "ring-2 ring-primary",
            isDragging && "opacity-50 z-50 shadow-lg"
          )}
          onClick={() => {
            if (node.type === 'activity') {
              onDrillDown(node.id);
            } else {
              onSelect(node.id);
            }
          }}
        >
          {/* Drag Handle */}
          {canDrag && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {/* Expand/Collapse Toggle */}
          {hasChildren ? (
            <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            !canDrag && <div className="w-6" />
          )}

          {/* Node Icon */}
          {getNodeIcon(node.type)}

          {/* Node Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{node.data.label}</span>
              {node.type === 'start' && triggerCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {triggerCount} trigger{triggerCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {node.type === 'activity' && actionCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {actionCount} action{actionCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {hasThrottle && (
                <Clock className="h-3 w-3 text-amber-500" />
              )}
            </div>
            {node.data.description && (
              <p className="text-xs text-muted-foreground truncate">{node.data.description}</p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {node.type !== 'end' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddActivity(node.id);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onConfigure(node.id)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </DropdownMenuItem>
                {node.type === 'activity' && (
                  <DropdownMenuItem onClick={() => onDrillDown(node.id)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Edit Actions
                  </DropdownMenuItem>
                )}
                {node.type !== 'start' && node.type !== 'end' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(node)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children */}
        <CollapsibleContent>
          <div className="mt-1 space-y-1">
            {node.type === 'condition' ? (
              <>
                {/* Yes Branch */}
                <div className="relative">
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-emerald-500/30" />
                  <div className="ml-2">
                    <div className="flex items-center gap-2 py-1">
                      <CheckCircle className="h-3 w-3 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-600">Yes Branch</span>
                    </div>
                    {/* Drop zone for empty yes branch */}
                    {yesChildren.length === 0 && (
                      <DropZone 
                        targetNodeId={node.id} 
                        position="child" 
                        branchType="yes"
                        isActive={isDraggingEnabled}
                      />
                    )}
                    <div className="space-y-1">
                      {yesChildren.map(childId => {
                        const childNode = nodesMap.get(childId);
                        if (!childNode) return null;
                        return (
                          <WorkflowTreeNode
                            key={childId}
                            node={childNode}
                            childrenMap={childrenMap}
                            nodesMap={nodesMap}
                            connections={connections}
                            expandedNodes={expandedNodes}
                            selectedNodeId={selectedNodeId}
                            level={level + 1}
                            branchLabel="Yes"
                            parentId={node.id}
                            branchType="yes"
                            onToggleExpand={onToggleExpand}
                            onSelect={onSelect}
                            onAddActivity={onAddActivity}
                            onDelete={onDelete}
                            onDrillDown={onDrillDown}
                            onConfigure={onConfigure}
                            isDraggingEnabled={isDraggingEnabled}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* No Branch */}
                <div className="relative">
                  <div className="absolute left-0 top-0 h-full w-0.5 bg-rose-500/30" />
                  <div className="ml-2">
                    <div className="flex items-center gap-2 py-1">
                      <XCircle className="h-3 w-3 text-rose-600" />
                      <span className="text-xs font-medium text-rose-600">No Branch</span>
                    </div>
                    {/* Drop zone for empty no branch */}
                    {noChildren.length === 0 && (
                      <DropZone 
                        targetNodeId={node.id} 
                        position="child" 
                        branchType="no"
                        isActive={isDraggingEnabled}
                      />
                    )}
                    <div className="space-y-1">
                      {noChildren.map(childId => {
                        const childNode = nodesMap.get(childId);
                        if (!childNode) return null;
                        return (
                          <WorkflowTreeNode
                            key={childId}
                            node={childNode}
                            childrenMap={childrenMap}
                            nodesMap={nodesMap}
                            connections={connections}
                            expandedNodes={expandedNodes}
                            selectedNodeId={selectedNodeId}
                            level={level + 1}
                            branchLabel="No"
                            parentId={node.id}
                            branchType="no"
                            onToggleExpand={onToggleExpand}
                            onSelect={onSelect}
                            onAddActivity={onAddActivity}
                            onDelete={onDelete}
                            onDrillDown={onDrillDown}
                            onConfigure={onConfigure}
                            isDraggingEnabled={isDraggingEnabled}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Regular children for non-condition nodes
              <>
                {childIds.map(childId => {
                  const childNode = nodesMap.get(childId);
                  if (!childNode) return null;
                  return (
                    <WorkflowTreeNode
                      key={childId}
                      node={childNode}
                      childrenMap={childrenMap}
                      nodesMap={nodesMap}
                      connections={connections}
                      expandedNodes={expandedNodes}
                      selectedNodeId={selectedNodeId}
                      level={level + 1}
                      parentId={node.id}
                      onToggleExpand={onToggleExpand}
                      onSelect={onSelect}
                      onAddActivity={onAddActivity}
                      onDelete={onDelete}
                      onDrillDown={onDrillDown}
                      onConfigure={onConfigure}
                      isDraggingEnabled={isDraggingEnabled}
                    />
                  );
                })}
                {/* Drop zone after children */}
                {node.type !== 'end' && (
                  <DropZone 
                    targetNodeId={node.id} 
                    position="child" 
                    isActive={isDraggingEnabled && !isDragging}
                  />
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Drop zone after this node (for nodes without children or when collapsed) */}
      {!hasChildren && node.type !== 'end' && (
        <DropZone 
          targetNodeId={node.id} 
          position="after" 
          isActive={isDraggingEnabled && !isDragging}
        />
      )}
    </div>
  );
});
