import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Calendar,
  X,
  RotateCcw,
  Ban,
  Minimize2,
  Maximize2,
  Pause,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailSendStatus {
  email: string;
  status: 'pending' | 'sending' | 'success' | 'failed' | 'skipped' | 'rate_limited' | 'reset';
  error?: string;
  skipReason?: string;
  campaignsId?: string;
  isResetting?: boolean;
}

export interface EmailProgressState {
  isOpen: boolean;
  total: number;
  current: number;
  currentEmail: string;
  delayRemaining: number;
  emailStatuses: EmailSendStatus[];
  isComplete: boolean;
  isCancelled: boolean;
  isPaused: boolean;
}

interface EmailProgressDialogProps {
  state: EmailProgressState;
  onClose: () => void;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onResetLead?: (campaignsId: string, email: string) => Promise<boolean>;
  onResendEmail?: (campaignsId: string, email: string) => Promise<boolean>;
}

export function EmailProgressDialog({ state, onClose, onCancel, onPause, onResume, onResetLead, onResendEmail }: EmailProgressDialogProps) {
  const [resettingIds, setResettingIds] = useState<Set<string>>(new Set());
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { 
    isOpen, 
    total, 
    current, 
    currentEmail, 
    delayRemaining, 
    emailStatuses, 
    isComplete,
    isCancelled,
    isPaused
  } = state;

  if (!isOpen) return null;

  const successCount = emailStatuses.filter(s => s.status === 'success').length;
  const failedCount = emailStatuses.filter(s => s.status === 'failed').length;
  const skippedCount = emailStatuses.filter(s => s.status === 'skipped').length;
  const rateLimitedCount = emailStatuses.filter(s => s.status === 'rate_limited').length;
  const resetCount = emailStatuses.filter(s => s.status === 'reset').length;
  const pendingCount = emailStatuses.filter(s => s.status === 'pending' || s.status === 'sending').length;

  const progressPercentage = total > 0 ? ((current) / total) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleResetLead = async (campaignsId: string, email: string) => {
    if (!onResetLead || resettingIds.has(campaignsId)) return;
    
    setResettingIds(prev => new Set(prev).add(campaignsId));
    try {
      await onResetLead(campaignsId, email);
    } finally {
      setResettingIds(prev => {
        const next = new Set(prev);
        next.delete(campaignsId);
        return next;
      });
    }
  };

  const handleResendEmail = async (campaignsId: string, email: string) => {
    if (!onResendEmail || resendingIds.has(campaignsId)) return;
    
    setResendingIds(prev => new Set(prev).add(campaignsId));
    try {
      await onResendEmail(campaignsId, email);
    } finally {
      setResendingIds(prev => {
        const next = new Set(prev);
        next.delete(campaignsId);
        return next;
      });
    }
  };

  const getStatusIcon = (status: EmailSendStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'rate_limited':
        return <Ban className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      case 'sending':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'reset':
        return <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Collapsed mini view - sticky at bottom right
  if (isCollapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-3 min-w-[280px] max-w-[320px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {!isComplete && !isCancelled ? (
              isPaused ? (
                <Pause className="h-4 w-4 text-amber-500 flex-shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
              )
            ) : (
              <Mail className="h-4 w-4 text-primary flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {isComplete || isCancelled 
                  ? 'Emails Complete' 
                  : isPaused 
                    ? 'Paused' 
                    : 'Sending Emails...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {successCount}/{total} sent
                {failedCount > 0 && ` • ${failedCount} failed`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Progress value={progressPercentage} className="w-12 h-2" />
            {!isComplete && !isCancelled && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={isPaused ? onResume : onPause}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsCollapsed(false)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {(isComplete || isCancelled) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Expanded view - sticky at bottom right
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-xl w-[400px] max-w-[calc(100vw-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          {isPaused ? (
            <Pause className="h-5 w-5 text-amber-500" />
          ) : (
            <Mail className="h-5 w-5 text-primary" />
          )}
          <div>
            <p className="font-medium text-sm">
              {isComplete || isCancelled 
                ? 'Email Sending Complete' 
                : isPaused 
                  ? 'Paused'
                  : 'Sending Emails...'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isComplete 
                ? `Finished sending ${successCount} of ${total} emails`
                : isCancelled
                ? 'Email sending was cancelled'
                : isPaused
                ? `Paused at ${current} of ${total}`
                : `Sending email ${current} of ${total}`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsCollapsed(true)}
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          {(isComplete || isCancelled) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            {successCount} Sent
          </Badge>
          {failedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <XCircle className="h-3 w-3 text-destructive" />
              {failedCount} Failed
            </Badge>
          )}
          {skippedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              {skippedCount} Skipped
            </Badge>
          )}
          {rateLimitedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-orange-500/50">
              <Ban className="h-3 w-3 text-orange-600 dark:text-orange-400" />
              {rateLimitedCount} Rate Limited
            </Badge>
          )}
          {resetCount > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-blue-500/50">
              <RotateCcw className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              {resetCount} Reset
            </Badge>
          )}
          {pendingCount > 0 && !isComplete && !isCancelled && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        {/* Delay countdown */}
        {delayRemaining > 0 && !isComplete && !isCancelled && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              Next email in <span className="font-medium">{formatTime(delayRemaining)}</span>
            </span>
          </div>
        )}

        {/* Current email being sent */}
        {currentEmail && !isComplete && !isCancelled && delayRemaining === 0 && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg text-sm">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="truncate">
              Sending to <span className="font-medium">{currentEmail}</span>
            </span>
          </div>
        )}

        {/* Email list with statuses */}
        <ScrollArea className="h-[160px] rounded-md border">
          <div className="p-2 space-y-1">
            {emailStatuses.map((emailStatus, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-2 rounded text-xs",
                  emailStatus.status === 'sending' && "bg-primary/10",
                  emailStatus.status === 'success' && "bg-emerald-500/10",
                  emailStatus.status === 'failed' && "bg-destructive/10",
                  emailStatus.status === 'skipped' && "bg-yellow-500/10",
                  emailStatus.status === 'rate_limited' && "bg-orange-500/10",
                  emailStatus.status === 'reset' && "bg-blue-500/10"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {getStatusIcon(emailStatus.status)}
                  <span className="truncate">{emailStatus.email}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {emailStatus.status === 'skipped' && emailStatus.skipReason && (
                    <>
                      <span className="text-xs text-yellow-600 dark:text-yellow-400" title={emailStatus.skipReason}>
                        <Calendar className="h-3 w-3 inline mr-1" />
                        Recent
                      </span>
                      {emailStatus.campaignsId && onResetLead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                          onClick={() => handleResetLead(emailStatus.campaignsId!, emailStatus.email)}
                          disabled={resettingIds.has(emailStatus.campaignsId)}
                        >
                          {resettingIds.has(emailStatus.campaignsId) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {emailStatus.status === 'failed' && emailStatus.error && (
                    <>
                      <span className="text-xs text-destructive" title={emailStatus.error}>
                        Error
                      </span>
                      {emailStatus.campaignsId && onResetLead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleResetLead(emailStatus.campaignsId!, emailStatus.email)}
                          disabled={resettingIds.has(emailStatus.campaignsId)}
                        >
                          {resettingIds.has(emailStatus.campaignsId) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </>
                  )}
                  {emailStatus.status === 'rate_limited' && emailStatus.campaignsId && onResetLead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900/20"
                      onClick={() => handleResetLead(emailStatus.campaignsId!, emailStatus.email)}
                      disabled={resettingIds.has(emailStatus.campaignsId)}
                    >
                      {resettingIds.has(emailStatus.campaignsId) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                  {emailStatus.status === 'reset' && emailStatus.campaignsId && (
                    <>
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Ready
                      </span>
                      {onResendEmail && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 px-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          onClick={() => handleResendEmail(emailStatus.campaignsId!, emailStatus.email)}
                          disabled={resendingIds.has(emailStatus.campaignsId)}
                        >
                          {resendingIds.has(emailStatus.campaignsId) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="flex justify-end gap-2">
          {!isComplete && !isCancelled ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={isPaused ? onResume : onPause}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button variant="destructive" size="sm" onClick={onCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Initial state helper
export function createInitialEmailProgressState(): EmailProgressState {
  return {
    isOpen: false,
    total: 0,
    current: 0,
    currentEmail: '',
    delayRemaining: 0,
    emailStatuses: [],
    isComplete: false,
    isCancelled: false,
    isPaused: false,
  };
}
