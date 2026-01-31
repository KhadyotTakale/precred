import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Mail, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  X, 
  Variable,
  Send,
  Tag,
  Database,
  TestTube,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminAPI } from "@/lib/admin-api";
import { toast } from "@/hooks/use-toast";

// Email config structure matching the API request
export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  tag?: string;
  metadata?: Record<string, string>;
  itemsId?: string;
  campaignsId?: string;
}

interface EmailConfigPanelProps {
  config: EmailConfig;
  onChange: (config: EmailConfig) => void;
}

// Available workflow variables for email fields
const VARIABLE_SUGGESTIONS = [
  { category: 'User', variables: ['{{user.email}}', '{{user.name}}', '{{user.first_name}}', '{{user.last_name}}'] },
  { category: 'Item', variables: ['{{item.name}}', '{{item.id}}', '{{item.price}}', '{{item.description}}'] },
  { category: 'Trigger', variables: ['{{trigger.event}}', '{{trigger.timestamp}}', '{{trigger.item_type}}'] },
  { category: 'Form', variables: ['{{form.email}}', '{{form.name}}', '{{form.message}}'] },
];

export function EmailConfigPanel({ config, onChange }: EmailConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [metadataKey, setMetadataKey] = useState('');
  const [metadataValue, setMetadataValue] = useState('');
  
  // Test email state
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (field: keyof EmailConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  const addMetadata = () => {
    if (!metadataKey.trim()) return;
    const newMetadata = { ...(config.metadata || {}), [metadataKey]: metadataValue };
    handleChange('metadata', newMetadata);
    setMetadataKey('');
    setMetadataValue('');
  };

  const removeMetadata = (key: string) => {
    const newMetadata = { ...(config.metadata || {}) };
    delete newMetadata[key];
    handleChange('metadata', Object.keys(newMetadata).length > 0 ? newMetadata : undefined);
  };

  const insertVariable = (variable: string, field: 'to' | 'subject' | 'htmlBody') => {
    const currentValue = config[field] || '';
    handleChange(field, currentValue + variable);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address.",
        variant: "destructive",
      });
      return;
    }

    if (!config.from) {
      toast({
        title: "From Email Required",
        description: "Please configure a sender email address first.",
        variant: "destructive",
      });
      return;
    }

    if (!config.subject) {
      toast({
        title: "Subject Required",
        description: "Please enter an email subject first.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      // Replace variables with test placeholders for the test email
      const testSubject = `[TEST] ${config.subject.replace(/\{\{[^}]+\}\}/g, '[VARIABLE]')}`;
      const testBody = `
        <div style="background: #f0f0f0; padding: 12px; margin-bottom: 16px; border-radius: 4px; font-size: 12px; color: #666;">
          <strong>⚠️ TEST EMAIL</strong><br/>
          This is a test email from your workflow automation. Variables are shown as placeholders.
        </div>
        ${config.htmlBody.replace(/\{\{([^}]+)\}\}/g, '<code style="background: #e0e0e0; padding: 2px 6px; border-radius: 3px; font-size: 12px;">{{$1}}</code>')}
      `;

      const result = await adminAPI.sendSimpleEmail({
        From: config.from,
        To: testEmail,
        Subject: testSubject,
        HtmlBody: testBody,
        MessageStream: 'outbound',
      });

      setTestResult({ success: true, message: 'Test email sent successfully!' });
      toast({
        title: "Test Email Sent",
        description: `Email sent to ${testEmail}`,
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      setTestResult({ 
        success: false, 
        message: error.message || 'Failed to send test email' 
      });
      toast({
        title: "Test Email Failed",
        description: error.message || 'Failed to send test email',
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const openTestDialog = () => {
    setTestResult(null);
    setShowTestDialog(true);
  };

  const metadataEntries = Object.entries(config.metadata || {});

  const isConfigValid = config.from && config.subject && config.htmlBody;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Mail className="h-4 w-4" />
          Email Configuration
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={openTestDialog}
          disabled={!isConfigValid}
        >
          <TestTube className="h-3 w-3" />
          Test Email
        </Button>
      </div>

      {/* From Email */}
      <div className="space-y-2">
        <Label className="text-xs">From Email</Label>
        <Input
          value={config.from || ''}
          onChange={(e) => handleChange('from', e.target.value)}
          placeholder="noreply@yourdomain.com"
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Sender email address (must be verified in Postmark)
        </p>
      </div>

      {/* To Email */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">To Email</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setShowVariables(!showVariables)}
          >
            <Variable className="h-3 w-3" />
            Variables
          </Button>
        </div>
        <Input
          value={config.to || ''}
          onChange={(e) => handleChange('to', e.target.value)}
          placeholder="{{user.email}} or recipient@example.com"
          className="text-sm"
        />
        {showVariables && (
          <div className="grid grid-cols-2 gap-1 p-2 bg-muted/50 rounded-md">
            {['{{user.email}}', '{{form.email}}', '{{item.contact_email}}'].map((v) => (
              <Button
                key={v}
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs justify-start font-mono"
                onClick={() => handleChange('to', v)}
              >
                {v}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label className="text-xs">Subject</Label>
        <Input
          value={config.subject || ''}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="Your email subject"
          className="text-sm"
        />
      </div>

      {/* HTML Body */}
      <div className="space-y-2">
        <Label className="text-xs">Email Body (HTML)</Label>
        <Textarea
          value={config.htmlBody || ''}
          onChange={(e) => handleChange('htmlBody', e.target.value)}
          placeholder="<p>Hello {{user.name}},</p><p>Thank you for your purchase!</p>"
          rows={6}
          className="text-sm font-mono"
        />
        <p className="text-xs text-muted-foreground">
          Supports HTML and workflow variables like {"{{user.name}}"}
        </p>
      </div>

      {/* Variable Helper */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Variable className="h-3 w-3" />
          <span>Available Variables</span>
          <ChevronDown className="h-3 w-3" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-2 p-2 bg-muted/30 rounded-md">
            {VARIABLE_SUGGESTIONS.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-medium mb-1">{group.category}</p>
                <div className="flex flex-wrap gap-1">
                  {group.variables.map((v) => (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="text-[10px] font-mono cursor-pointer hover:bg-primary/20"
                      onClick={() => insertVariable(v, 'htmlBody')}
                    >
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors">
          {showAdvanced ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">Advanced Options</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          {/* Tag */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Tag
            </Label>
            <Input
              value={config.tag || ''}
              onChange={(e) => handleChange('tag', e.target.value || undefined)}
              placeholder="e.g., workflow-notification"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Tag for tracking in Postmark
            </p>
          </div>

          {/* Items ID */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Database className="h-3 w-3" />
              Items ID
            </Label>
            <Input
              value={config.itemsId || ''}
              onChange={(e) => handleChange('itemsId', e.target.value || undefined)}
              placeholder="{{item.id}} or specific ID"
              className="text-sm"
            />
          </div>

          {/* Campaigns ID */}
          <div className="space-y-2">
            <Label className="text-xs">Campaigns ID</Label>
            <Input
              value={config.campaignsId || ''}
              onChange={(e) => handleChange('campaignsId', e.target.value || undefined)}
              placeholder="Optional campaign reference"
              className="text-sm"
            />
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label className="text-xs">Metadata</Label>
            {metadataEntries.length > 0 && (
              <div className="space-y-1">
                {metadataEntries.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-xs">
                    <span className="font-medium">{key}:</span>
                    <span className="flex-1 truncate text-muted-foreground">{value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => removeMetadata(key)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={metadataKey}
                onChange={(e) => setMetadataKey(e.target.value)}
                placeholder="Key"
                className="text-sm"
              />
              <Input
                value={metadataValue}
                onChange={(e) => setMetadataValue(e.target.value)}
                placeholder="Value"
                className="text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addMetadata}
                disabled={!metadataKey.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Preview */}
      <div className="p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-xs font-medium mb-2">
          <Send className="h-3 w-3" />
          API Request Preview
        </div>
        <pre className="text-[10px] text-muted-foreground overflow-x-auto">
{JSON.stringify({
  From: config.from || '',
  To: config.to || '',
  Subject: config.subject || '',
  HtmlBody: config.htmlBody?.substring(0, 50) + (config.htmlBody?.length > 50 ? '...' : '') || '',
  tag: config.tag || null,
  metadata: config.metadata || {},
  items_id: config.itemsId || null,
  campaigns_id: config.campaignsId || null,
}, null, 2)}
        </pre>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-primary" />
              Send Test Email
            </DialogTitle>
            <DialogDescription>
              Send a test email to verify your configuration. Variables will be shown as placeholders.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Test Recipient Email</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">From:</span>
                <span className="font-medium">{config.from || '(not set)'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">[TEST] {config.subject || '(not set)'}</span>
              </div>
            </div>

            {testResult && (
              <div className={cn(
                "flex items-center gap-2 p-3 rounded-lg text-sm",
                testResult.success 
                  ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                  : "bg-destructive/10 text-destructive"
              )}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowTestDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !testEmail.trim()}
              className="gap-2"
            >
              {isSendingTest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
