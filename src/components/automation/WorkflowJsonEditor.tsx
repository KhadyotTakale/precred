import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Code, Save, Loader2, AlertCircle, RotateCcw, Download, Upload, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { adminAPI } from "@/lib/admin-api";
import type { WorkflowNode, Connection, TriggerEventConfig } from "./types";

const AUTO_SAVE_DELAY = 1500;

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

// Zod schemas for workflow validation
const throttleConfigSchema = z.object({
  enabled: z.boolean(),
  scope: z.enum(['session', 'day', 'week', 'lifetime', 'none']).optional(),
  target: z.enum(['browser', 'user', 'both']).optional(),
  maxExecutions: z.number().positive().optional(),
  cooldownMinutes: z.number().nonnegative().optional(),
}).optional();

const triggerEventSchema = z.object({
  id: z.string().min(1, "Trigger ID is required"),
  itemType: z.string().min(1, "Item type is required"),
  triggerEvent: z.string().min(1, "Trigger event is required"),
  seq: z.number().int().nonnegative(),
  backendId: z.number().optional(),
  throttle: throttleConfigSchema,
});

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const actionConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});

const conditionalLogicSchema = z.object({
  enabled: z.boolean(),
  logic: z.enum(['all', 'any']),
  conditions: z.array(actionConditionSchema),
}).optional();

const actionItemSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string().min(1, "Action ID is required"),
  type: z.string().min(1, "Action type is required"),
  label: z.string().min(1, "Action label is required"),
  category: z.enum(['communication', 'task_management', 'data_management', 'forms', 'integrations', 'payments']),
  config: z.record(z.any()).optional(),
  children: z.array(actionItemSchema).optional(),
  conditionalLogic: conditionalLogicSchema,
}));

const activityRouteSchema = z.object({
  id: z.string().min(1, "Route ID is required"),
  targetActivityId: z.string().min(1, "Target activity ID is required"),
  condition: z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string(),
  }).optional(),
  isDefault: z.boolean().optional(),
});

const activitySchema = z.object({
  id: z.string().min(1, "Activity ID is required"),
  label: z.string().min(1, "Activity label is required"),
  description: z.string().optional(),
  position: positionSchema,
  actions: z.array(actionItemSchema),
  routes: z.array(activityRouteSchema),
  activityId: z.number().optional(),
});

const connectionSchema = z.object({
  id: z.string().min(1, "Connection ID is required"),
  sourceId: z.string().min(1, "Source ID is required"),
  targetId: z.string().min(1, "Target ID is required"),
});

const startNodeSchema = z.object({
  id: z.string().min(1, "Start node ID is required"),
  triggerEvents: z.array(triggerEventSchema),
}).nullable();

const workflowJsonSchema = z.object({
  title: z.string().min(1, "Workflow title is required").max(100, "Title must be under 100 characters"),
  description: z.string().max(500, "Description must be under 500 characters"),
  isActive: z.boolean(),
  startNode: startNodeSchema,
  activities: z.array(activitySchema),
  connections: z.array(connectionSchema),
});

type WorkflowJsonFormat = z.infer<typeof workflowJsonSchema>;

interface ValidationError {
  path: string;
  message: string;
}

interface WorkflowJsonEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string | null;
  workflowTitle: string;
  workflowDescription: string;
  isActive: boolean;
  nodes: WorkflowNode[];
  connections: Connection[];
  onUpdate: (data: {
    title?: string;
    description?: string;
    isActive?: boolean;
    nodes?: WorkflowNode[];
    connections?: Connection[];
  }) => void;
}

export function WorkflowJsonEditor({
  open,
  onOpenChange,
  workflowId,
  workflowTitle,
  workflowDescription,
  isActive,
  nodes,
  connections,
  onUpdate,
}: WorkflowJsonEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [jsonValue, setJsonValue] = useState("");
  const [originalJson, setOriginalJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestJsonRef = useRef<string>("");

  // Build JSON from current workflow state when dialog opens
  useEffect(() => {
    if (open) {
      const workflowJson = buildWorkflowJson();
      const formatted = JSON.stringify(workflowJson, null, 2);
      setJsonValue(formatted);
      setOriginalJson(formatted);
      latestJsonRef.current = formatted;
      setParseError(null);
      setSaveStatus('idle');
    }
  }, [open, nodes, connections, workflowTitle, workflowDescription, isActive]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const buildWorkflowJson = (): WorkflowJsonFormat => {
    const startNode = nodes.find(n => n.type === 'start');
    const activityNodes = nodes.filter(n => n.type === 'activity');

    return {
      title: workflowTitle,
      description: workflowDescription,
      isActive,
      startNode: startNode ? {
        id: startNode.id,
        triggerEvents: startNode.data.triggerEvents || [],
      } : null,
      activities: activityNodes.map(node => ({
        id: node.id,
        label: node.data.label,
        description: node.data.description,
        position: node.position,
        actions: node.data.actions || [],
        routes: node.data.routes || [],
        activityId: node.data.activityId,
      })),
      connections: connections.map(conn => ({
        id: conn.id,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
      })),
    };
  };

  const validateJson = (value: string): { parsed: any; errors: ValidationError[] } | null => {
    try {
      const parsed = JSON.parse(value);
      const result = workflowJsonSchema.safeParse(parsed);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.issues.map(issue => ({
          path: issue.path.join('.') || 'root',
          message: issue.message,
        }));
        return { parsed, errors };
      }
      
      return { parsed: result.data, errors: [] };
    } catch (e) {
      return null; // JSON parse error
    }
  };

  // Perform auto-save to backend
  const performAutoSave = useCallback(async (jsonString: string) => {
    if (!user?.id || !workflowId) {
      setSaveStatus('idle');
      return;
    }

    // Validate JSON before saving
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(jsonString);
    } catch (e) {
      setSaveStatus('error');
      return;
    }

    // Validate schema
    const schemaResult = workflowJsonSchema.safeParse(rawParsed);
    if (!schemaResult.success) {
      setSaveStatus('error');
      return;
    }

    setSaveStatus('saving');
    try {
      // Build item_info structure for the workflow
      const itemInfo = {
        title: rawParsed.title,
        description: rawParsed.description,
        isActive: rawParsed.isActive,
        startNode: rawParsed.startNode,
        activities: rawParsed.activities,
        connections: rawParsed.connections,
      };

      // PATCH to /items/{workflowId}
      await adminAPI.patch(
        `/items/${workflowId}`,
        {
          item_info: itemInfo,
          title: rawParsed.title,
          description: rawParsed.description,
        },
        user.id
      );

      // Also update local state with properly typed data
      const typedData = {
        title: rawParsed.title as string,
        description: rawParsed.description as string,
        isActive: rawParsed.isActive as boolean,
        startNode: rawParsed.startNode as { id: string; triggerEvents: TriggerEventConfig[] } | null,
        activities: rawParsed.activities as Array<{
          id: string;
          label: string;
          description?: string;
          position: { x: number; y: number };
          actions: any[];
          routes: any[];
          activityId?: number;
        }>,
        connections: rawParsed.connections as Connection[],
      };
      applyJsonToCanvas(typedData);

      setOriginalJson(jsonString);
      setSaveStatus('saved');
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  }, [user?.id, workflowId]);

  // Apply parsed JSON to canvas state
  const applyJsonToCanvas = useCallback((parsedData: {
    title: string;
    description: string;
    isActive: boolean;
    startNode: {
      id: string;
      triggerEvents: TriggerEventConfig[];
    } | null;
    activities: Array<{
      id: string;
      label: string;
      description?: string;
      position: { x: number; y: number };
      actions: any[];
      routes: any[];
      activityId?: number;
    }>;
    connections: Connection[];
  }) => {
    // Rebuild nodes from JSON
    const updatedNodes: WorkflowNode[] = [];
    
    // Preserve start node structure, update trigger events
    const existingStartNode = nodes.find(n => n.type === 'start');
    if (existingStartNode && parsedData.startNode) {
      updatedNodes.push({
        ...existingStartNode,
        data: {
          ...existingStartNode.data,
          triggerEvents: parsedData.startNode.triggerEvents,
        },
      });
    } else if (existingStartNode) {
      updatedNodes.push(existingStartNode);
    }

    // Preserve end node
    const existingEndNode = nodes.find(n => n.type === 'end');
    if (existingEndNode) {
      updatedNodes.push(existingEndNode);
    }

    // Update activity nodes
    for (const activity of parsedData.activities) {
      const existingNode = nodes.find(n => n.id === activity.id);
      if (existingNode) {
        updatedNodes.push({
          ...existingNode,
          position: activity.position,
          data: {
            ...existingNode.data,
            label: activity.label,
            description: activity.description,
            actions: activity.actions,
            routes: activity.routes,
          },
        });
      } else {
        // New activity from JSON
        updatedNodes.push({
          id: activity.id,
          type: 'activity',
          position: activity.position,
          data: {
            label: activity.label,
            description: activity.description,
            actions: activity.actions,
            routes: activity.routes,
            activityId: activity.activityId,
          },
        });
      }
    }

    // Update workflow state
    onUpdate({
      title: parsedData.title,
      description: parsedData.description,
      isActive: parsedData.isActive,
      nodes: updatedNodes,
      connections: parsedData.connections,
    });
  }, [nodes, onUpdate]);

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    latestJsonRef.current = value;
    
    // First check if it's valid JSON
    try {
      JSON.parse(value);
      setParseError(null);
      
      // Then validate schema
      const validation = validateJson(value);
      if (validation) {
        setValidationErrors(validation.errors);
        
        // Only trigger auto-save if valid and changed
        if (validation.errors.length === 0 && value !== originalJson && workflowId) {
          setSaveStatus('pending');
          
          // Clear existing timer
          if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
          }
          
          // Set new timer
          autoSaveTimerRef.current = setTimeout(() => {
            performAutoSave(latestJsonRef.current);
          }, AUTO_SAVE_DELAY);
        }
      }
    } catch (e) {
      setParseError((e as Error).message);
      setValidationErrors([]);
    }
  };

  const handleReset = () => {
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setJsonValue(originalJson);
    latestJsonRef.current = originalJson;
    setParseError(null);
    setValidationErrors([]);
    setSaveStatus('idle');
  };

  const handleExport = () => {
    const blob = new Blob([jsonValue], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Exported",
      description: "Workflow JSON downloaded successfully",
    });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          JSON.parse(text); // Validate JSON
          setJsonValue(text);
          setParseError(null);
          toast({
            title: "Imported",
            description: "JSON loaded. Review and save to apply changes.",
          });
        } catch (err) {
          toast({
            title: "Invalid JSON",
            description: "The selected file contains invalid JSON",
            variant: "destructive",
          });
        }
      }
    };
    input.click();
  };

  const handleSave = async () => {
    // First validate JSON syntax
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(jsonValue);
    } catch (e) {
      setParseError((e as Error).message);
      return;
    }

    // Then validate schema
    const schemaResult = workflowJsonSchema.safeParse(rawParsed);
    if (!schemaResult.success) {
      const errors: ValidationError[] = schemaResult.error.issues.map(issue => ({
        path: issue.path.join('.') || 'root',
        message: issue.message,
      }));
      setValidationErrors(errors);
      toast({
        title: "Validation failed",
        description: `${errors.length} validation error(s) found. Please fix them before saving.`,
        variant: "destructive",
      });
      return;
    }

    // Use the raw parsed data with type assertions for flexibility
    const parsedData = rawParsed as {
      title: string;
      description: string;
      isActive: boolean;
      startNode: {
        id: string;
        triggerEvents: TriggerEventConfig[];
      } | null;
      activities: Array<{
        id: string;
        label: string;
        description?: string;
        position: { x: number; y: number };
        actions: any[];
        routes: any[];
        activityId?: number;
      }>;
      connections: Connection[];
    };

    setIsSaving(true);
    try {
      // Rebuild nodes from JSON
      const updatedNodes: WorkflowNode[] = [];
      
      // Preserve start node structure, update trigger events
      const existingStartNode = nodes.find(n => n.type === 'start');
      if (existingStartNode && parsedData.startNode) {
        updatedNodes.push({
          ...existingStartNode,
          data: {
            ...existingStartNode.data,
            triggerEvents: parsedData.startNode.triggerEvents,
          },
        });
      } else if (existingStartNode) {
        updatedNodes.push(existingStartNode);
      }

      // Preserve end node
      const existingEndNode = nodes.find(n => n.type === 'end');
      if (existingEndNode) {
        updatedNodes.push(existingEndNode);
      }

      // Update activity nodes
      for (const activity of parsedData.activities) {
        const existingNode = nodes.find(n => n.id === activity.id);
        if (existingNode) {
          updatedNodes.push({
            ...existingNode,
            position: activity.position,
            data: {
              ...existingNode.data,
              label: activity.label,
              description: activity.description,
              actions: activity.actions,
              routes: activity.routes,
            },
          });
        } else {
          // New activity from JSON
          updatedNodes.push({
            id: activity.id,
            type: 'activity',
            position: activity.position,
            data: {
              label: activity.label,
              description: activity.description,
              actions: activity.actions,
              routes: activity.routes,
              activityId: activity.activityId,
            },
          });
        }
      }

      // Update workflow state
      onUpdate({
        title: parsedData.title,
        description: parsedData.description,
        isActive: parsedData.isActive,
        nodes: updatedNodes,
        connections: parsedData.connections,
      });

      toast({
        title: "Workflow updated",
        description: "JSON changes have been applied to the canvas",
      });
      
      setOriginalJson(jsonValue);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to apply workflow JSON:', error);
      toast({
        title: "Failed to apply changes",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = jsonValue !== originalJson;
  const hasValidationErrors = validationErrors.length > 0;
  const canSave = !parseError && hasChanges && !isSaving && !hasValidationErrors;

  // Render save status badge
  const renderSaveStatusBadge = () => {
    switch (saveStatus) {
      case 'pending':
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending...
          </Badge>
        );
      case 'saving':
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Auto-saving...
          </Badge>
        );
      case 'saved':
        return (
          <Badge variant="default" className="text-xs bg-primary/20 text-primary border-primary/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Saved
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Save failed
          </Badge>
        );
      default:
        if (workflowId) {
          return (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Auto-save enabled
            </Badge>
          );
        }
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Edit Workflow JSON
            {renderSaveStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            View and modify the complete workflow configuration including triggers, activities, and connections.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Workflow Configuration</Label>
              {!parseError && !hasValidationErrors && jsonValue && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  Valid
                </span>
              )}
              {hasValidationErrors && (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {workflowId && (
                <span className="text-xs text-muted-foreground">
                  ID: {workflowId}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="h-3 w-3 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </div>
          </div>

          <div className="h-[350px] overflow-auto rounded-md border bg-muted/30">
            <CodeEditor
              value={jsonValue}
              language="json"
              placeholder="Loading..."
              onChange={(e) => handleJsonChange(e.target.value)}
              padding={12}
              style={{
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                backgroundColor: 'transparent',
                minHeight: '100%',
              }}
              data-color-mode="dark"
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                JSON Parse Error: {parseError}
              </AlertDescription>
            </Alert>
          )}

          {hasValidationErrors && !parseError && (
            <Alert variant="destructive" className="max-h-[120px] overflow-hidden">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <AlertDescription className="text-xs">
                <div className="font-medium mb-1">Schema Validation Errors:</div>
                <ScrollArea className="h-[70px]">
                  <ul className="space-y-1">
                    {validationErrors.map((error, idx) => (
                      <li key={idx} className="flex gap-2">
                        <code className="text-[10px] bg-destructive/20 px-1 rounded shrink-0">
                          {error.path}
                        </code>
                        <span>{error.message}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {hasChanges && !parseError && !hasValidationErrors && saveStatus === 'idle' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-muted-foreground">
                JSON is valid. Changes will auto-save or click "Save & Close" to apply immediately.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges || isSaving || saveStatus === 'saving'}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave || saveStatus === 'saving'}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {isSaving ? "Applying..." : "Save & Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
