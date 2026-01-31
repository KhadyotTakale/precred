import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, CheckCircle2, ExternalLink, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValidationResult, ValidationError } from "./validation";
import { countFixableIssues } from "./validation";

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: ValidationResult;
  onSaveAnyway: () => void;
  onCancel: () => void;
  onNavigateToError?: (error: ValidationError) => void;
  onFixAll?: () => void;
}

export function ValidationDialog({
  open,
  onOpenChange,
  validationResult,
  onSaveAnyway,
  onCancel,
  onNavigateToError,
  onFixAll,
}: ValidationDialogProps) {
  const { isValid, errors, warnings } = validationResult;
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const fixableCount = countFixableIssues(validationResult);

  const handleItemClick = (item: ValidationError) => {
    if (item.nodeId && onNavigateToError) {
      onNavigateToError(item);
      onOpenChange(false);
    }
  };

  const isClickable = (item: ValidationError) => !!item.nodeId && !!onNavigateToError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                Validation Failed
              </>
            ) : hasWarnings ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Validation Warnings
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Validation Passed
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {hasErrors
              ? "Please fix the following errors before saving:"
              : hasWarnings
              ? "The workflow can be saved, but there are some warnings:"
              : "The workflow is valid and ready to save."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-64">
          <div className="space-y-3">
            {errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({errors.length})
                </h4>
                <ul className="space-y-1">
                  {errors.map((error, index) => (
                    <li
                      key={index}
                      onClick={() => handleItemClick(error)}
                      className={cn(
                        "text-sm p-2 rounded-md flex items-center justify-between gap-2",
                        "bg-destructive/10 text-destructive border border-destructive/20",
                        isClickable(error) && "cursor-pointer hover:bg-destructive/20 transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {error.fixable && (
                          <Wrench className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                        )}
                        <span>{error.message}</span>
                      </div>
                      {isClickable(error) && (
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Warnings ({warnings.length})
                </h4>
                <ul className="space-y-1">
                  {warnings.map((warning, index) => (
                    <li
                      key={index}
                      onClick={() => handleItemClick(warning)}
                      className={cn(
                        "text-sm p-2 rounded-md flex items-center justify-between gap-2",
                        "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20",
                        isClickable(warning) && "cursor-pointer hover:bg-amber-500/20 transition-colors"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {warning.fixable && (
                          <Wrench className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                        )}
                        <span>{warning.message}</span>
                      </div>
                      {isClickable(warning) && (
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {fixableCount > 0 && onFixAll && (
            <Button variant="secondary" onClick={onFixAll} className="gap-1.5">
              <Wrench className="h-4 w-4" />
              Fix All ({fixableCount})
            </Button>
          )}
          {!hasErrors && (
            <Button onClick={onSaveAnyway}>
              {hasWarnings ? "Save Anyway" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}