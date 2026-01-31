import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Code, Save, Loader2, AlertCircle, RotateCcw, Check } from "lucide-react";
import { adminAPI } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import type { WorkflowNode, NodeData } from "./types";

interface ActivityJsonEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: WorkflowNode;
  workflowId?: string;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const AUTO_SAVE_DELAY = 1500; // 1.5 seconds debounce

export function ActivityJsonEditor({
  open,
  onOpenChange,
  node,
  workflowId,
  onUpdate,
}: ActivityJsonEditorProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [jsonValue, setJsonValue] = useState("");
  const [originalJson, setOriginalJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // Refs for auto-save
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestJsonRef = useRef<string>("");
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Load activity data from backend when dialog opens
  useEffect(() => {
    if (open && node.data.activityId && user?.id) {
      loadActivityFromBackend();
    } else if (open) {
      // No backend ID, use local node data
      const localData = {
        label: node.data.label,
        description: node.data.description,
        actions: node.data.actions || [],
        routes: node.data.routes || [],
      };
      const formatted = JSON.stringify(localData, null, 2);
      setJsonValue(formatted);
      setOriginalJson(formatted);
      latestJsonRef.current = formatted;
      setParseError(null);
      setSaveStatus('idle');
    }
  }, [open, node.data.activityId, user?.id]);

  const loadActivityFromBackend = async () => {
    if (!node.data.activityId || !user?.id) return;
    
    setIsLoading(true);
    setSaveStatus('idle');
    try {
      const activityDetails = await adminAPI.getWorkflowActivity(user.id, node.data.activityId);
      
      const activityData = {
        id: activityDetails.id,
        label: activityDetails.title || node.data.label,
        description: activityDetails.description || node.data.description,
        actions: activityDetails.activity_info?.actions || node.data.actions || [],
        routes: activityDetails.activity_info?.routes || node.data.routes || [],
        activity_info: activityDetails.activity_info,
        seq: activityDetails.seq,
        items_id: activityDetails.items_id,
      };
      
      const formatted = JSON.stringify(activityData, null, 2);
      setJsonValue(formatted);
      setOriginalJson(formatted);
      latestJsonRef.current = formatted;
      setParseError(null);
    } catch (error) {
      console.error('Failed to load activity from backend:', error);
      toast({
        title: "Failed to load activity",
        description: "Using local data instead",
        variant: "destructive",
      });
      // Fallback to local data
      const localData = {
        label: node.data.label,
        description: node.data.description,
        actions: node.data.actions || [],
        routes: node.data.routes || [],
        activityId: node.data.activityId,
      };
      const formatted = JSON.stringify(localData, null, 2);
      setJsonValue(formatted);
      setOriginalJson(formatted);
      latestJsonRef.current = formatted;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save function
  const performAutoSave = useCallback(async (jsonToSave: string) => {
    if (!isMountedRef.current) return;
    
    // Validate JSON first
    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonToSave);
    } catch (e) {
      return; // Don't auto-save invalid JSON
    }

    setSaveStatus('saving');
    try {
      // Update local node state
      const nodeUpdate: Partial<NodeData> = {};
      if (parsedData.label !== undefined) nodeUpdate.label = parsedData.label;
      if (parsedData.description !== undefined) nodeUpdate.description = parsedData.description;
      if (parsedData.actions !== undefined) nodeUpdate.actions = parsedData.actions;
      if (parsedData.routes !== undefined) nodeUpdate.routes = parsedData.routes;

      onUpdate(node.id, nodeUpdate);

      // If there's a backend activity ID, update the backend
      if (node.data.activityId && user?.id && workflowId) {
        await adminAPI.updateWorkflowActivity(
          user.id,
          node.data.activityId,
          {
            name: parsedData.label || node.data.label,
            description: parsedData.description || node.data.description,
            activity_info: {
              actions: parsedData.actions || [],
              routes: parsedData.routes || [],
            },
          }
        );
      }

      if (isMountedRef.current) {
        setSaveStatus('saved');
        setOriginalJson(jsonToSave);
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      if (isMountedRef.current) {
        setSaveStatus('error');
      }
    }
  }, [node.id, node.data.activityId, node.data.label, node.data.description, user?.id, workflowId, onUpdate]);

  const handleJsonChange = (value: string) => {
    setJsonValue(value);
    latestJsonRef.current = value;
    
    // Validate JSON on change
    let isValid = false;
    try {
      JSON.parse(value);
      setParseError(null);
      isValid = true;
    } catch (e) {
      setParseError((e as Error).message);
    }

    // Trigger debounced auto-save if valid and has changes
    if (isValid && value !== originalJson) {
      setSaveStatus('pending');
      
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer for auto-save
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave(latestJsonRef.current);
      }, AUTO_SAVE_DELAY);
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
    setSaveStatus('idle');
  };

  // Render save status badge
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-xs gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-saving...
          </Badge>
        );
      case 'saving':
        return (
          <Badge variant="outline" className="text-xs gap-1 text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </Badge>
        );
      case 'saved':
        return (
          <Badge variant="outline" className="text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-400">
            <Check className="h-3 w-3" />
            Saved
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Save failed
          </Badge>
        );
      default:
        return node.data.activityId ? (
          <Badge variant="secondary" className="text-xs">
            Auto-save enabled
          </Badge>
        ) : null;
    }
  };

  const handleSave = async () => {
    // Validate JSON first
    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonValue);
    } catch (e) {
      setParseError((e as Error).message);
      return;
    }

    setIsSaving(true);
    try {
      // Update local node state
      const nodeUpdate: Partial<NodeData> = {};
      if (parsedData.label !== undefined) nodeUpdate.label = parsedData.label;
      if (parsedData.description !== undefined) nodeUpdate.description = parsedData.description;
      if (parsedData.actions !== undefined) nodeUpdate.actions = parsedData.actions;
      if (parsedData.routes !== undefined) nodeUpdate.routes = parsedData.routes;

      onUpdate(node.id, nodeUpdate);

      // If there's a backend activity ID, update the backend
      if (node.data.activityId && user?.id && workflowId) {
        await adminAPI.updateWorkflowActivity(
          user.id,
          node.data.activityId,
          {
            name: parsedData.label || node.data.label,
            description: parsedData.description || node.data.description,
            activity_info: {
              actions: parsedData.actions || [],
              routes: parsedData.routes || [],
            },
          }
        );
      }

      toast({
        title: "Activity saved",
        description: "JSON changes have been applied",
      });
      
      setOriginalJson(jsonValue);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save activity:', error);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = jsonValue !== originalJson;
  const canSave = !parseError && hasChanges && !isSaving && !isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Edit Activity JSON
            {renderSaveStatus()}
          </DialogTitle>
          <DialogDescription>
            Modify the raw JSON configuration for this activity. Changes auto-save after {AUTO_SAVE_DELAY / 1000}s.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label>Activity Configuration</Label>
            {node.data.activityId && (
              <span className="text-xs text-muted-foreground">
                Backend ID: {node.data.activityId}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64 border rounded-md bg-muted/30">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Textarea
              value={jsonValue}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="font-mono text-xs h-[400px] resize-none"
              placeholder="Loading..."
            />
          )}

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                JSON Parse Error: {parseError}
              </AlertDescription>
            </Alert>
          )}

          {hasChanges && !parseError && saveStatus !== 'saved' && saveStatus !== 'saving' && (
            <Alert>
              <AlertDescription className="text-xs text-muted-foreground">
                {saveStatus === 'pending' ? 'Changes will be auto-saved...' : 'You have unsaved changes'}
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
            {isSaving ? "Saving..." : "Save & Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
