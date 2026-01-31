import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  Zap,
  Clock,
  MoreVertical,
  RefreshCw,
  AlertCircle,
  Timer,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import type { Workflow, WorkflowNode, TriggerEventConfig } from "./types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AutomationListProps {
  onCreateNew: (workflow: Workflow) => void;
  onEdit: (workflow: Workflow) => void;
  onCreateWithAI?: () => void;
}

// Get throttle info from workflow nodes
function getWorkflowThrottleInfo(nodes: WorkflowNode[]): { count: number; triggers: string[] } {
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode?.data?.triggerEvents) return { count: 0, triggers: [] };

  const throttledEvents = startNode.data.triggerEvents.filter(
    (e: TriggerEventConfig) => e.throttle?.enabled
  );

  return {
    count: throttledEvents.length,
    triggers: throttledEvents.map((e: TriggerEventConfig) => {
      const scope = e.throttle?.scope || 'none';
      const max = e.throttle?.maxExecutions || 1;
      return `${e.triggerEvent}: ${max}x/${scope}`;
    }),
  };
}

// Transform API response to Workflow type
function transformApiWorkflow(item: any): Workflow {
  const itemInfo = item.item_info || {};
  return {
    id: String(item.id),
    name: item.title || 'Untitled Workflow',
    description: item.description || '',
    nodes: itemInfo.nodes || [],
    connections: itemInfo.connections || [],
    isActive: item.isActive ?? false,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
}

export function AutomationList({ onCreateNew, onEdit, onCreateWithAI }: AutomationListProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchWorkflows = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await adminAPI.getWorkflows(user.id);
      const transformedWorkflows = response.map(transformApiWorkflow);
      setWorkflows(transformedWorkflows);
    } catch (err) {
      console.error('Failed to fetch workflows:', err);
      setError('Failed to load automations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [user?.id]);

  const handleToggleActive = async (id: string) => {
    if (!user?.id) return;

    const workflow = workflows.find(w => w.id === id);
    if (!workflow) return;

    setTogglingId(id);

    try {
      // Is_disabled: true means inactive/paused, false means active
      // Backend requires title on every PATCH request
      await adminAPI.updateWorkflow(user.id, parseInt(id), {
        title: workflow.name,
        Is_disabled: workflow.isActive, // If currently active, disable it (pause)
      });

      setWorkflows(prev => prev.map(w =>
        w.id === id ? { ...w, isActive: !w.isActive } : w
      ));

      toast({
        title: workflow.isActive ? "Automation Paused" : "Automation Activated",
        description: `"${workflow.name}" is now ${workflow.isActive ? 'paused' : 'active'}.`,
      });
    } catch (err) {
      console.error('Failed to toggle workflow:', err);
      toast({
        title: "Error",
        description: "Failed to update automation status.",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setWorkflowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!user?.id || !workflowToDelete) return;

    setIsDeleting(true);

    try {
      await adminAPI.deleteWorkflow(user.id, parseInt(workflowToDelete));

      const deletedWorkflow = workflows.find(w => w.id === workflowToDelete);
      setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete));

      toast({
        title: "Automation Deleted",
        description: `"${deletedWorkflow?.name}" has been deleted.`,
      });
    } catch (err) {
      console.error('Failed to delete workflow:', err);
      toast({
        title: "Error",
        description: "Failed to delete automation.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!user?.id || !newWorkflowName.trim()) return;

    setIsCreating(true);

    try {
      const response = await adminAPI.createWorkflow(user.id, {
        name: newWorkflowName.trim(),
        description: newWorkflowDescription.trim(),
        item_info: {
          nodes: [],
          connections: [],
        },
        is_active: false,
      });

      const newWorkflow = transformApiWorkflow(response);

      toast({
        title: "Automation Created",
        description: `"${newWorkflow.name}" has been created.`,
      });

      setCreateDialogOpen(false);
      setNewWorkflowName("");
      setNewWorkflowDescription("");

      // Navigate to canvas with the new workflow
      onCreateNew(newWorkflow);
    } catch (err) {
      console.error('Failed to create workflow:', err);
      toast({
        title: "Error",
        description: "Failed to create automation.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-72 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header - Compact */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Automations</h2>
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="font-normal gap-1">
              <span className="font-medium">{workflows.length}</span> total
            </Badge>
            <Badge variant="outline" className="font-normal gap-1 text-primary border-primary/30">
              <span className="font-medium">{workflows.filter(w => w.isActive).length}</span> active
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchWorkflows} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onCreateWithAI && (
            <Button
              onClick={onCreateWithAI}
              size="sm"
              className="h-8 gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI Builder</span>
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="h-8" variant="outline">
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Automation</DialogTitle>
            <DialogDescription>
              Enter a name and description for your new automation workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., New Member Welcome"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this automation does..."
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setNewWorkflowName("");
                setNewWorkflowDescription("");
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkflow}
              disabled={!newWorkflowName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
          <Zap className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No automations yet
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Automation
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {workflows.map((workflow) => {
            const throttleInfo = getWorkflowThrottleInfo(workflow.nodes);
            const triggerCount = workflow.nodes.find(n => n.type === 'start')?.data?.triggerEvents?.length || 0;
            const activityCount = workflow.nodes.filter(n => n.type === 'activity').length;
            const hasName = workflow.name && workflow.name !== 'Untitled Workflow';

            return (
              <div
                key={workflow.id}
                onClick={() => onEdit(workflow)}
                className="group flex items-center gap-3 py-2 px-3 rounded-md border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              >
                {/* Status indicator */}
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${workflow.isActive ? 'bg-primary' : 'bg-muted-foreground/40'}`} />

                {/* Main content */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={`text-sm font-medium truncate ${!hasName ? 'text-muted-foreground italic' : ''}`}>
                    {hasName ? workflow.name : 'Unnamed Workflow'}
                  </span>
                  <Badge variant={workflow.isActive ? 'default' : 'secondary'} className="text-[10px] h-5 shrink-0">
                    {workflow.isActive ? 'Active' : 'Paused'}
                  </Badge>
                  {throttleInfo.count > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="gap-0.5 text-[10px] h-5 text-amber-600 border-amber-500/50 dark:text-amber-400 shrink-0">
                            <Timer className="h-2.5 w-2.5" />
                            {throttleInfo.count}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px]">
                          <p className="font-medium text-xs mb-1">Throttled Triggers</p>
                          <ul className="text-xs space-y-0.5">
                            {throttleInfo.triggers.map((t, i) => (
                              <li key={i} className="opacity-80">{t}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Stats - Inline */}
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-0.5" title={`${triggerCount} trigger${triggerCount !== 1 ? 's' : ''}`}>
                    <Zap className="h-3 w-3" />
                    {triggerCount}
                  </span>
                  <span className="flex items-center gap-0.5" title={`${activityCount} activit${activityCount !== 1 ? 'ies' : 'y'}`}>
                    <Play className="h-3 w-3" />
                    {activityCount}
                  </span>
                  <span className="hidden md:flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDate(workflow.updatedAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={workflow.isActive}
                    onCheckedChange={() => handleToggleActive(workflow.id)}
                    disabled={togglingId === workflow.id}
                    className="scale-75"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(workflow)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteClick(workflow.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}