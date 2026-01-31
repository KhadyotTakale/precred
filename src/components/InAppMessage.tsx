import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, CheckCircle2, AlertTriangle, XCircle, X, Loader2, Workflow, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExecutionStatus, WorkflowFormAction } from '@/hooks/useWorkflowExecution';
import { WorkflowFormModal } from '@/components/WorkflowFormModal';

export interface ModalButton {
  id: string;
  text: string;
  value: string;
  fontColor: string;
  backgroundColor: string;
}

export interface InAppMessageProps {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, 0 = manual close only
  onDismiss: () => void;
  variant?: 'dialog' | 'toast';
  isModal?: boolean;
  buttons?: ModalButton[];
  onButtonClick?: (button: ModalButton) => void;
  isForm?: boolean;
  formAction?: WorkflowFormAction;
  onFormSubmit?: (formData: Record<string, string | boolean>) => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  info: 'text-blue-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-destructive',
};

const bgMap = {
  info: 'bg-blue-500/10 border-blue-500/20',
  success: 'bg-green-500/10 border-green-500/20',
  warning: 'bg-yellow-500/10 border-yellow-500/20',
  error: 'bg-destructive/10 border-destructive/20',
};

export function InAppMessage({
  title,
  message,
  type = 'info',
  duration = 5000,
  onDismiss,
  variant = 'dialog',
  isModal = false,
  buttons = [],
  onButtonClick,
  isForm = false,
  formAction,
  onFormSubmit,
}: InAppMessageProps) {
  const Icon = iconMap[type];

  // Auto-dismiss after duration
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const handleButtonClick = (button: ModalButton) => {
    onButtonClick?.(button);
    onDismiss();
  };

  // Handle form submission
  const handleFormSubmit = (formData: Record<string, string | boolean>, bookingId?: number) => {
    onFormSubmit?.(formData);
    // Note: bookingId is available for logging or further processing
    console.log('[InAppMessage] Form submitted, booking ID:', bookingId);
  };

  // Show form modal for show_form action
  if (isForm && formAction) {
    return (
      <WorkflowFormModal
        isOpen={true}
        onClose={onDismiss}
        formConfig={formAction.formConfig}
        triggerData={formAction.triggerData}
        onSubmit={handleFormSubmit}
        title={formAction.title}
        workflowItemsId={formAction.workflowItemsId}
        itemId={formAction.itemId}
        itemSlug={formAction.itemSlug}
        itemType={formAction.itemType}
        activityId={formAction.activityId}
      />
    );
  }

  if (variant === 'toast') {
    return (
      <div 
        className={cn(
          "fixed bottom-4 right-4 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300",
          "rounded-lg border p-4 shadow-lg",
          bgMap[type]
        )}
      >
        <div className="flex items-start gap-3">
          <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", colorMap[type])} />
          <div className="flex-1 space-y-1">
            {title && (
              <p className="font-semibold text-foreground">{title}</p>
            )}
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Modal with custom buttons
  if (isModal && buttons.length > 0) {
    return (
      <Dialog open onOpenChange={(open) => !open && onDismiss()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {title && (
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", bgMap[type])}>
                  <Icon className={cn("h-5 w-5", colorMap[type])} />
                </div>
                <DialogTitle>{title}</DialogTitle>
              </div>
            )}
          </DialogHeader>
          
          <DialogDescription className="text-base whitespace-pre-wrap">
            {message}
          </DialogDescription>

          <DialogFooter className="flex-wrap gap-2 sm:justify-end">
            {buttons.map((button) => (
              <button
                key={button.id}
                onClick={() => handleButtonClick(button)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors hover:opacity-90"
                style={{
                  color: button.fontColor || '#ffffff',
                  backgroundColor: button.backgroundColor || 'hsl(var(--primary))',
                }}
              >
                {button.text || 'Button'}
              </button>
            ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              bgMap[type]
            )}>
              <Icon className={cn("h-5 w-5", colorMap[type])} />
            </div>
            <DialogTitle>{title || 'Notification'}</DialogTitle>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-base whitespace-pre-wrap">
          {message}
        </DialogDescription>

        <DialogFooter>
          <Button onClick={onDismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Loading indicator for workflow execution with activity details
function WorkflowLoadingIndicator({ status }: { status: ExecutionStatus }) {
  const getStatusMessage = () => {
    switch (status.phase) {
      case 'fetching_workflow':
        return 'Loading workflow...';
      case 'fetching_activities':
        return 'Fetching activities...';
      case 'executing_activity':
        if (status.currentActivity) {
          return (
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{status.currentActivity}</span>
              {status.totalActivities && status.currentActivityIndex && (
                <span className="text-xs opacity-70">
                  ({status.currentActivityIndex}/{status.totalActivities})
                </span>
              )}
            </span>
          );
        }
        return 'Executing...';
      case 'logging':
        return 'Saving log...';
      case 'complete':
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };

  const isComplete = status.phase === 'complete';

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-[100] flex items-center gap-3 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-bottom-5 fade-in duration-300",
      isComplete ? "bg-green-500/10 border-green-500/20" : "bg-muted/90"
    )}>
      <div className={cn(
        "p-1.5 rounded-full",
        isComplete ? "bg-green-500/20" : "bg-primary/10"
      )}>
        {isComplete ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <Workflow className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Workflow
          </span>
        </div>
        <span className="text-sm text-foreground">
          {getStatusMessage()}
        </span>
      </div>
    </div>
  );
}

// Error indicator for workflow execution
function WorkflowErrorIndicator({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={cn("rounded-lg border p-4 shadow-lg", bgMap.error)}>
        <div className="flex items-start gap-3">
          <XCircle className={cn("h-5 w-5 mt-0.5 shrink-0", colorMap.error)} />
          <div className="flex-1 space-y-1">
            <p className="font-semibold text-foreground">Workflow Error</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface InAppMessageContainerProps {
  messages: Array<{
    title?: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    duration?: number;
    isModal?: boolean;
    buttons?: ModalButton[];
    isForm?: boolean;
    formAction?: WorkflowFormAction;
  }>;
  onDismiss: (index: number) => void;
  onButtonClick?: (button: ModalButton) => void;
  onFormSubmit?: (formData: Record<string, string | boolean>) => void;
  isLoading?: boolean;
  executionStatus?: ExecutionStatus;
  error?: string | null;
  onErrorDismiss?: () => void;
}

export function InAppMessageContainer({ 
  messages, 
  onDismiss,
  onButtonClick, 
  onFormSubmit,
  isLoading = false,
  executionStatus,
  error = null,
  onErrorDismiss 
}: InAppMessageContainerProps) {
  // Show loading indicator with activity details
  if (isLoading && messages.length === 0 && executionStatus && executionStatus.phase !== 'idle') {
    return <WorkflowLoadingIndicator status={executionStatus} />;
  }

  // Show error indicator
  if (error && onErrorDismiss) {
    return <WorkflowErrorIndicator message={error} onDismiss={onErrorDismiss} />;
  }

  if (messages.length === 0) return null;

  // Show first message as dialog, queue the rest
  const [currentMessage, ...queuedMessages] = messages;

  return (
    <>
      <InAppMessage
        {...currentMessage}
        onDismiss={() => onDismiss(0)}
        onButtonClick={onButtonClick}
        onFormSubmit={onFormSubmit}
        variant="dialog"
      />
      
      {/* Show queued message count */}
      {queuedMessages.length > 0 && (
        <div className="fixed bottom-4 left-4 z-[99] bg-muted px-3 py-1.5 rounded-full text-sm text-muted-foreground">
          +{queuedMessages.length} more notification{queuedMessages.length > 1 ? 's' : ''}
        </div>
      )}
    </>
  );
}
