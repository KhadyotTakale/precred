import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mail, Send, ArrowLeft, User, FileText, AlertTriangle, Check } from 'lucide-react';

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSend: () => void;
  templateAlias: string;
  recipientEmail: string;
  recipientName: string;
  templateModel: Record<string, any>;
  totalRecipients: number;
  isSending?: boolean;
}

export function EmailPreviewDialog({
  isOpen,
  onClose,
  onConfirmSend,
  templateAlias,
  recipientEmail,
  recipientName,
  templateModel,
  totalRecipients,
  isSending = false,
}: EmailPreviewDialogProps) {
  // Get non-empty fields for display
  const resolvedFields = Object.entries(templateModel)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));

  const emptyFields = Object.entries(templateModel)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent className="max-w-2xl z-[100]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Email Preview
          </DialogTitle>
          <DialogDescription>
            Review the first email before sending to all {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template & Recipient Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Template</p>
              <Badge variant="secondary" className="font-mono text-xs">
                {templateAlias}
              </Badge>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">First Recipient</p>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{recipientName || 'Unknown'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{recipientEmail}</p>
            </div>
          </div>

          <Separator />

          {/* Resolved Template Fields */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Resolved Template Fields ({resolvedFields.length})
              </h4>
            </div>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-3 space-y-2">
                {resolvedFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No fields resolved</p>
                ) : (
                  resolvedFields.map(([key, value]) => (
                    <div key={key} className="flex gap-3 py-2 border-b last:border-0">
                      <div className="flex-shrink-0 min-w-[140px]">
                        <Badge variant="outline" className="font-mono text-xs">
                          {`{{${key}}}`}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm break-words">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Empty/Unresolved Fields Warning */}
          {emptyFields.length > 0 && (
            <div className="p-3 border rounded-lg bg-amber-500/10 border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {emptyFields.length} field{emptyFields.length !== 1 ? 's' : ''} not resolved
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    These fields may appear empty in the email: {emptyFields.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Confirmation Info */}
          <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Ready to send to {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Emails will be sent with random delays (15-60s) between each. You can pause or cancel at any time.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isSending}
            className="sm:flex-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign Selection
          </Button>
          <Button 
            onClick={onConfirmSend}
            disabled={isSending}
            className="sm:flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Starting...' : `Send to All ${totalRecipients} Recipient${totalRecipients !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
