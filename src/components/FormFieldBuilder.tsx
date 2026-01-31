import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, GripVertical, Plus, ChevronDown, ChevronUp, Eye, Pencil, Layers, CreditCard, ArrowRight, ArrowLeft, RotateCcw, GitBranch, UserPlus, FileText, Send, DollarSign, Mail, Sparkles } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Canvas as FabricCanvas } from 'fabric';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SignaturePad } from './SignaturePad';
import { AIFormBuilder } from './AIFormBuilder';

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'url' | 'readonly_text' | 'html_content' | 'terms_agreement' | 'signature' | 'file_upload';
  checkboxLabel?: string; // For terms_agreement type
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select type
  content?: string; // For readonly_text and html_content types
  acceptedFileTypes?: string; // For file_upload type (e.g., ".pdf,.doc,.docx,image/*")
  maxFileSize?: number; // For file_upload type in MB
  fileConfig?: {
    acceptedTypes?: string;
    maxSize?: number; // in MB
  };
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number; // For number type - minimum value
    max?: number; // For number type - maximum value
  };
  stepId?: string; // Reference to the step this field belongs to
  conditions?: StepCondition[]; // Conditions that must be met to show this field
  conditionLogic?: 'all' | 'any'; // all = AND, any = OR (default: all)
}

export interface StepCondition {
  id: string;
  fieldName: string; // The field to check
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value?: string; // The value to compare against (not needed for not_empty/is_empty)
}

export interface LeadConfig {
  emailField?: string; // Field name to use as email
  nameField?: string; // Field name to use as name
  payloadFields?: string[]; // Field names to include in lead_payload
  status?: string; // Lead status (default: 'new')
}

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  messageStream: string;
}

export interface ConfirmationConfig {
  actionButtonText?: string;
  actionButtonUrl?: string;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  type: 'fields' | 'stripe_checkout' | 'confirmation' | 'lead_capture' | 'submission' | 'send_email';
  sequence: number;
  conditions?: StepCondition[]; // Conditions that must be met to show this step
  conditionLogic?: 'all' | 'any'; // all = AND, any = OR (default: all)
  showPriceSummary?: boolean; // Show price summary when on this step
  stripeConfig?: {
    productId?: string;
    priceId?: string;
    productName?: string;
    productDescription?: string;
    priceAmount?: number;
    currency?: string;
    mode?: 'payment' | 'subscription';
    successMessage?: string;
  };
  leadConfig?: LeadConfig;
  emailConfig?: EmailConfig;
  confirmationConfig?: ConfirmationConfig;
}

export interface WizardConfig {
  enabled: boolean;
  steps: FormStep[];
  placeholderFallback?: string; // Custom text for missing field values (defaults to 'N/A')
  pdfFilenameTemplate?: string; // Template for PDF download filename with placeholders
}

interface FormFieldBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  wizardConfig?: WizardConfig;
  onWizardConfigChange?: (config: WizardConfig) => void;
}

interface SortableFieldItemProps {
  field: FormField;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  onDelete: (id: string) => void;
  steps?: FormStep[];
  allFields?: FormField[];
}

interface SortableStepItemProps {
  step: FormStep;
  fields: FormField[];
  allFields: FormField[]; // All fields for conditions
  onUpdateStep: (id: string, updates: Partial<FormStep>) => void;
  onDeleteStep: (id: string) => void;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  onDeleteField: (id: string) => void;
  onAddField: (stepId: string) => void;
}

function SortableFieldItem({ field, onUpdate, onDelete, steps, allFields }: SortableFieldItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState(field.options?.join(', ') || '');
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text.split(',').map(o => o.trim()).filter(o => o);
    onUpdate(field.id, { options });
  };

  // Get fields that can be used as placeholders (exclude current field, static types, and fields with empty names)
  const availablePlaceholderFields = (allFields || []).filter(f =>
    f.id !== field.id &&
    f.name && f.name.trim() !== '' &&
    !['readonly_text', 'html_content', 'terms_agreement'].includes(f.type)
  );

  // Get fields available for conditions (exclude current field and static types)
  const conditionableFields = (allFields || []).filter(f =>
    f.id !== field.id &&
    f.name && f.name.trim() !== '' &&
    !['readonly_text', 'html_content', 'terms_agreement', 'signature', 'file_upload'].includes(f.type)
  );

  // System placeholders for date/time
  const systemPlaceholders = [
    { name: 'current_date', label: 'Current Date', description: 'e.g., January 7, 2026' },
    { name: 'current_time', label: 'Current Time', description: 'e.g., 2:30 PM' },
    { name: 'current_day', label: 'Current Day', description: 'e.g., Tuesday' },
    { name: 'current_datetime', label: 'Current Date & Time', description: 'e.g., January 7, 2026 2:30 PM' },
  ];

  // Condition management
  const addFieldCondition = () => {
    const newCondition: StepCondition = {
      id: crypto.randomUUID(),
      fieldName: '',
      operator: 'equals',
      value: '',
    };
    const currentConditions = field.conditions || [];
    onUpdate(field.id, { conditions: [...currentConditions, newCondition] });
  };

  const updateFieldCondition = (conditionId: string, updates: Partial<StepCondition>) => {
    const updatedConditions = (field.conditions || []).map(c =>
      c.id === conditionId ? { ...c, ...updates } : c
    );
    onUpdate(field.id, { conditions: updatedConditions });
  };

  const deleteFieldCondition = (conditionId: string) => {
    const updatedConditions = (field.conditions || []).filter(c => c.id !== conditionId);
    onUpdate(field.id, { conditions: updatedConditions });
  };

  const getConditionFieldOptions = (fieldName: string): string[] => {
    const targetField = (allFields || []).find(f => f.name === fieldName);
    return targetField?.options || [];
  };

  const insertPlaceholder = (fieldName: string) => {
    const placeholder = `{{${fieldName}}}`;
    const textarea = contentTextareaRef.current;
    const currentContent = field.content || '';

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.substring(0, start) + placeholder + currentContent.substring(end);
      onUpdate(field.id, { content: newContent });
      // Set cursor position after placeholder
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      onUpdate(field.id, { content: currentContent + placeholder });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Display Label</Label>
              <Input
                value={field.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  // Only auto-generate name if it's empty or matches the auto-generated pattern from old label
                  const oldAutoName = field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                  const shouldAutoGenerate = !field.name || field.name === oldAutoName;
                  const updates: Partial<FormField> = { label: newLabel };
                  if (shouldAutoGenerate) {
                    updates.name = newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                  }
                  onUpdate(field.id, updates);
                }}
                placeholder="Field Label"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Field Type</Label>
              <Select value={field.type} onValueChange={(value: FormField['type']) => onUpdate(field.id, { type: value })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="readonly_text">Read-only Text</SelectItem>
                  <SelectItem value="html_content">HTML Content</SelectItem>
                  <SelectItem value="terms_agreement">Terms Agreement</SelectItem>
                  <SelectItem value="signature">Signature</SelectItem>
                  <SelectItem value="file_upload">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Required</span>
              <div className="flex items-center gap-1">
                <Switch
                  checked={field.required}
                  onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
                />
                {(field.conditions || []).length > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                    <GitBranch className="h-3 w-3" />
                    {field.conditions.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Field</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the field "{field.label || 'Untitled'}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(field.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Field Name / Key (for data mapping)</Label>
                <Input
                  value={field.name}
                  onChange={(e) => {
                    // Sanitize: lowercase, replace spaces with underscores, remove special chars
                    const sanitized = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                    onUpdate(field.id, { name: sanitized });
                  }}
                  placeholder="field_name"
                  className="h-8 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This key is used for API mappings and won't change when label is edited.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                  placeholder="Enter placeholder text..."
                  className="h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Assign to Step</Label>
              {steps && steps.length > 0 ? (
                <Select
                  value={field.stepId || 'none'}
                  onValueChange={(value) => onUpdate(field.id, { stepId: value === 'none' ? undefined : value })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select a step..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No step assigned</SelectItem>
                    {steps.filter(s => s.type === 'fields').map(step => (
                      <SelectItem key={step.id} value={step.id}>
                        Step {step.sequence}: {step.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground italic">Enable Wizard Mode above to assign fields to steps</p>
              )}
            </div>

            {field.type === 'select' && (
              <div className="space-y-1">
                <Label className="text-xs">Options (comma-separated)</Label>
                <Input
                  value={optionsText}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  placeholder="Option 1, Option 2, Option 3"
                  className="h-8"
                />
              </div>
            )}

            {(field.type === 'readonly_text' || field.type === 'html_content' || field.type === 'terms_agreement') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">
                    {field.type === 'readonly_text' ? 'Display Text' : field.type === 'terms_agreement' ? 'Terms Content (HTML)' : 'HTML Content'}
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Insert:</span>
                    <Select onValueChange={(value) => insertPlaceholder(value)}>
                      <SelectTrigger className="h-7 w-[160px] text-xs">
                        <SelectValue placeholder="Select placeholder..." />
                      </SelectTrigger>
                      <SelectContent>
                        {systemPlaceholders.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              — Date & Time —
                            </div>
                            {systemPlaceholders.map(p => (
                              <SelectItem key={p.name} value={p.name} className="text-xs">
                                {p.label}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {availablePlaceholderFields.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              — Form Fields —
                            </div>
                            {availablePlaceholderFields.map(f => (
                              <SelectItem key={f.id} value={f.name} className="text-xs">
                                {f.label}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  ref={contentTextareaRef}
                  value={field.content || ''}
                  onChange={(e) => onUpdate(field.id, { content: e.target.value })}
                  placeholder={field.type === 'readonly_text'
                    ? 'Enter the text to display (e.g., contract terms, instructions)...'
                    : 'Enter HTML content (e.g., <p>Contract terms...</p>)...'}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {(field.type === 'html_content' || field.type === 'terms_agreement') && (
                    <>Supports HTML tags like &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;h3&gt;, etc. </>
                  )}
                  Use <code className="bg-muted px-1 rounded">{'{{field_name}}'}</code> to insert dynamic values.
                </p>
              </div>
            )}

            {field.type === 'terms_agreement' && (
              <div className="space-y-1">
                <Label className="text-xs">Checkbox Label</Label>
                <Input
                  value={field.checkboxLabel || ''}
                  onChange={(e) => onUpdate(field.id, { checkboxLabel: e.target.value })}
                  placeholder="I agree to the terms and conditions"
                  className="h-8"
                />
              </div>
            )}

            {field.type === 'file_upload' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Accepted File Types</Label>
                  <Input
                    value={field.acceptedFileTypes || ''}
                    onChange={(e) => onUpdate(field.id, { acceptedFileTypes: e.target.value })}
                    placeholder=".pdf,.doc,.docx,image/*"
                    className="h-8"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated (e.g., .pdf, image/*)
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max File Size (MB)</Label>
                  <Input
                    type="number"
                    value={field.maxFileSize || ''}
                    onChange={(e) => onUpdate(field.id, { maxFileSize: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="10"
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {(field.type === 'text' || field.type === 'textarea') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Min Length</Label>
                  <Input
                    type="number"
                    value={field.validation?.minLength || ''}
                    onChange={(e) => onUpdate(field.id, {
                      validation: { ...field.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                    })}
                    placeholder="0"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Length</Label>
                  <Input
                    type="number"
                    value={field.validation?.maxLength || ''}
                    onChange={(e) => onUpdate(field.id, {
                      validation: { ...field.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                    })}
                    placeholder="255"
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {field.type === 'number' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Minimum Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.min ?? ''}
                    onChange={(e) => onUpdate(field.id, {
                      validation: { ...field.validation, min: e.target.value !== '' ? parseFloat(e.target.value) : undefined }
                    })}
                    placeholder="0"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Maximum Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.max ?? ''}
                    onChange={(e) => onUpdate(field.id, {
                      validation: { ...field.validation, max: e.target.value !== '' ? parseFloat(e.target.value) : undefined }
                    })}
                    placeholder="100"
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {/* Conditional Logic for Field Visibility */}
            <div className="space-y-2 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  Conditional Visibility
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={addFieldCondition}
                  disabled={conditionableFields.length === 0}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>

              {conditionableFields.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  Add other fields first to create visibility conditions
                </p>
              )}

              {(field.conditions || []).length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Match</Label>
                    <Select
                      value={field.conditionLogic || 'all'}
                      onValueChange={(value: 'all' | 'any') => onUpdate(field.id, { conditionLogic: value })}
                    >
                      <SelectTrigger className="h-6 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">conditions</span>
                  </div>

                  {(field.conditions || []).map((condition) => (
                    <div key={condition.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-muted/50 p-2 rounded">
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <Select
                          value={condition.fieldName}
                          onValueChange={(value) => updateFieldCondition(condition.id, { fieldName: value, value: '' })}
                        >
                          <SelectTrigger className="h-7 w-full sm:w-[140px] text-xs">
                            <SelectValue placeholder="Select field..." />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionableFields.map(f => (
                              <SelectItem key={f.id} value={f.name} className="text-xs">
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(value: StepCondition['operator']) => updateFieldCondition(condition.id, { operator: value })}
                        >
                          <SelectTrigger className="h-7 w-full sm:w-[100px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals" className="text-xs">equals</SelectItem>
                            <SelectItem value="not_equals" className="text-xs">not equals</SelectItem>
                            <SelectItem value="contains" className="text-xs">contains</SelectItem>
                            <SelectItem value="not_empty" className="text-xs">is not empty</SelectItem>
                            <SelectItem value="is_empty" className="text-xs">is empty</SelectItem>
                          </SelectContent>
                        </Select>

                        {!['not_empty', 'is_empty'].includes(condition.operator) && (
                          condition.fieldName && getConditionFieldOptions(condition.fieldName).length > 0 ? (
                            <Select
                              value={condition.value || ''}
                              onValueChange={(value) => updateFieldCondition(condition.id, { value })}
                            >
                              <SelectTrigger className="h-7 w-full sm:flex-1 text-xs">
                                <SelectValue placeholder="Select value..." />
                              </SelectTrigger>
                              <SelectContent>
                                {getConditionFieldOptions(condition.fieldName).map(opt => (
                                  <SelectItem key={opt} value={opt} className="text-xs">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={condition.value || ''}
                              onChange={(e) => updateFieldCondition(condition.id, { value: e.target.value })}
                              placeholder="Value"
                              className="h-7 w-full sm:flex-1 text-xs"
                            />
                          )
                        )}
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive shrink-0 self-end sm:self-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Condition</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this condition? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteFieldCondition(condition.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SortableStepItem({ step, fields, allFields, onUpdateStep, onDeleteStep, onUpdateField, onDeleteField, onAddField }: SortableStepItemProps) {
  const [expanded, setExpanded] = useState(false);
  const stepFields = fields.filter(f => f.stepId === step.id);

  // Get fields available for conditions (exclude current step's fields and static types)
  const conditionableFields = allFields.filter(f =>
    f.stepId !== step.id &&
    f.name && f.name.trim() !== '' &&
    !['readonly_text', 'html_content', 'terms_agreement', 'signature', 'file_upload'].includes(f.type)
  );

  const addCondition = () => {
    const newCondition: StepCondition = {
      id: crypto.randomUUID(),
      fieldName: '',
      operator: 'equals',
      value: '',
    };
    const currentConditions = step.conditions || [];
    onUpdateStep(step.id, { conditions: [...currentConditions, newCondition] });
  };

  const updateCondition = (conditionId: string, updates: Partial<StepCondition>) => {
    const updatedConditions = (step.conditions || []).map(c =>
      c.id === conditionId ? { ...c, ...updates } : c
    );
    onUpdateStep(step.id, { conditions: updatedConditions });
  };

  const deleteCondition = (conditionId: string) => {
    const updatedConditions = (step.conditions || []).filter(c => c.id !== conditionId);
    onUpdateStep(step.id, { conditions: updatedConditions });
  };

  const getFieldOptions = (fieldName: string): string[] => {
    const field = allFields.find(f => f.name === fieldName);
    return field?.options || [];
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getStepIcon = () => {
    switch (step.type) {
      case 'stripe_checkout':
        return <CreditCard className="h-4 w-4" />;
      case 'confirmation':
        return <Eye className="h-4 w-4" />;
      case 'lead_capture':
        return <UserPlus className="h-4 w-4" />;
      case 'submission':
        return <FileText className="h-4 w-4" />;
      case 'send_email':
        return <Mail className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const getStepBadge = () => {
    switch (step.type) {
      case 'stripe_checkout':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Stripe Checkout</Badge>;
      case 'confirmation':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Confirmation</Badge>;
      case 'lead_capture':
        return <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">Lead Capture</Badge>;
      case 'submission':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Submission</Badge>;
      case 'send_email':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Send Email</Badge>;
      default:
        return <Badge variant="secondary">Form Fields</Badge>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card className="border-2 border-dashed">
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              {getStepIcon()}
              <Input
                value={step.title}
                onChange={(e) => onUpdateStep(step.id, { title: e.target.value })}
                placeholder="Step Title"
                className="h-8 flex-1 sm:max-w-[200px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap flex-1">
              <Badge variant="outline">Step {step.sequence}</Badge>
              {getStepBadge()}
              {step.showPriceSummary && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1">
                  <DollarSign className="h-3 w-3" />
                  Price
                </Badge>
              )}
              {(step.conditions || []).length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                  <GitBranch className="h-3 w-3" />
                  {step.conditions.length}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Step</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete step "{step.title || 'Untitled'}"? All fields assigned to this step will be unassigned. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteStep(step.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Step Description</Label>
              <Input
                value={step.description || ''}
                onChange={(e) => onUpdateStep(step.id, { description: e.target.value })}
                placeholder="Describe what this step is about..."
                className="h-8"
              />
            </div>

            {/* Show Price Summary Toggle */}
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium text-blue-900 dark:text-blue-300">Show Price Summary</Label>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Display the pricing summary when user is on this step
                </p>
              </div>
              <Switch
                checked={step.showPriceSummary || false}
                onCheckedChange={(checked) => onUpdateStep(step.id, { showPriceSummary: checked })}
              />
            </div>

            {/* Conditional Logic Section */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-amber-900 dark:text-amber-300">Conditional Logic</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  disabled={conditionableFields.length === 0}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>

              {conditionableFields.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No fields available. Add fields to previous steps first.
                </p>
              ) : (step.conditions || []).length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No conditions set. This step will always show.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Logic toggle - show only if multiple conditions */}
                  {(step.conditions || []).length > 1 && (
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200 dark:border-amber-800">
                      <Label className="text-xs text-amber-700 dark:text-amber-400">Show step when:</Label>
                      <Select
                        value={step.conditionLogic || 'all'}
                        onValueChange={(value: 'all' | 'any') => onUpdateStep(step.id, { conditionLogic: value })}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All (AND)</SelectItem>
                          <SelectItem value="any">Any (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-amber-700 dark:text-amber-400">conditions match</span>
                    </div>
                  )}

                  {(step.conditions || []).map((condition, idx) => (
                    <div key={condition.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 bg-white dark:bg-background rounded border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        {idx > 0 && (step.conditions || []).length > 1 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">
                            {step.conditionLogic === 'any' ? 'OR' : 'AND'}
                          </span>
                        )}
                        {idx === 0 && (step.conditions || []).length > 1 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">If</span>
                        )}
                        {(step.conditions || []).length === 1 && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">If</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Field selector */}
                        <Select
                          value={condition.fieldName || ''}
                          onValueChange={(value) => updateCondition(condition.id, { fieldName: value, value: '' })}
                        >
                          <SelectTrigger className="h-7 w-full sm:w-32 text-xs">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {conditionableFields.map(f => (
                              <SelectItem key={f.id} value={f.name}>
                                {f.label || f.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator selector */}
                        <Select
                          value={condition.operator}
                          onValueChange={(value: StepCondition['operator']) => updateCondition(condition.id, { operator: value })}
                        >
                          <SelectTrigger className="h-7 w-full sm:w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">equals</SelectItem>
                            <SelectItem value="not_equals">not equals</SelectItem>
                            <SelectItem value="contains">contains</SelectItem>
                            <SelectItem value="not_empty">is not empty</SelectItem>
                            <SelectItem value="is_empty">is empty</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Value input - only for operators that need it */}
                        {!['not_empty', 'is_empty'].includes(condition.operator) && (
                          <>
                            {getFieldOptions(condition.fieldName).length > 0 ? (
                              <Select
                                value={condition.value || ''}
                                onValueChange={(value) => updateCondition(condition.id, { value })}
                              >
                                <SelectTrigger className="h-7 w-full sm:flex-1 text-xs">
                                  <SelectValue placeholder="Select value" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFieldOptions(condition.fieldName).map((opt, i) => (
                                    <SelectItem key={i} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={condition.value || ''}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                placeholder="Value"
                                className="h-7 w-full sm:flex-1 text-xs"
                              />
                            )}
                          </>
                        )}
                      </div>

                      {/* Delete condition */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0 self-end sm:self-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Condition</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this condition? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCondition(condition.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {step.type === 'stripe_checkout' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-purple-900 dark:text-purple-300">Stripe Configuration</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Product Name *</Label>
                    <Input
                      value={step.stripeConfig?.productName || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, productName: e.target.value }
                      })}
                      placeholder="e.g., Vendor Application Fee"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Product Description</Label>
                    <Input
                      value={step.stripeConfig?.productDescription || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, productDescription: e.target.value }
                      })}
                      placeholder="Application processing fee for vendor booth"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Price Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={step.stripeConfig?.priceAmount || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, priceAmount: parseFloat(e.target.value) || 0 }
                      })}
                      placeholder="50.00"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Currency</Label>
                    <Select
                      value={step.stripeConfig?.currency || 'usd'}
                      onValueChange={(value) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, currency: value }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                        <SelectItem value="cad">CAD ($)</SelectItem>
                        <SelectItem value="aud">AUD ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Product ID (optional)</Label>
                    <Input
                      value={step.stripeConfig?.productId || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, productId: e.target.value }
                      })}
                      placeholder="prod_..."
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Price ID (optional)</Label>
                    <Input
                      value={step.stripeConfig?.priceId || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, priceId: e.target.value }
                      })}
                      placeholder="price_..."
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Payment Mode</Label>
                    <Select
                      value={step.stripeConfig?.mode || 'payment'}
                      onValueChange={(value: 'payment' | 'subscription') => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, mode: value }
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment">One-time Payment</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Success Message</Label>
                    <Input
                      value={step.stripeConfig?.successMessage || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        stripeConfig: { ...step.stripeConfig, successMessage: e.target.value }
                      })}
                      placeholder="Payment successful!"
                      className="h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {step.type === 'lead_capture' && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-teal-900 dark:text-teal-300">Lead Capture Configuration</Label>
                <p className="text-xs text-teal-700 dark:text-teal-400">
                  Configure which form fields to use for creating a lead before application submission.
                </p>

                {/* Email Field Selection */}
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Email Field *</Label>
                  <Select
                    value={step.leadConfig?.emailField || ''}
                    onValueChange={(value) => onUpdateStep(step.id, {
                      leadConfig: { ...step.leadConfig, emailField: value }
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select email field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields
                        .filter(f => f.type === 'email' && f.name)
                        .map(f => (
                          <SelectItem key={f.id} value={f.name}>
                            {f.label || f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {allFields.filter(f => f.type === 'email' && f.name).length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No email fields found. Add an email field to a previous step first.
                    </p>
                  )}
                </div>

                {/* Name Field Selection */}
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Name Field</Label>
                  <Select
                    value={step.leadConfig?.nameField || ''}
                    onValueChange={(value) => onUpdateStep(step.id, {
                      leadConfig: { ...step.leadConfig, nameField: value === '_none' ? undefined : value }
                    })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select name field (optional)..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">None</SelectItem>
                      {allFields
                        .filter(f => f.type === 'text' && f.name)
                        .map(f => (
                          <SelectItem key={f.id} value={f.name}>
                            {f.label || f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-teal-600 dark:text-teal-500">
                    Optional: Select a text field to use as the lead's name.
                  </p>
                </div>

                {/* Payload Fields Selection */}
                <div className="space-y-2">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Include in Lead Payload</Label>
                  <p className="text-xs text-teal-600 dark:text-teal-500">
                    Select fields to include in the lead's payload JSON.
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-white dark:bg-background rounded border border-teal-200 dark:border-teal-800">
                    {allFields
                      .filter(f => f.name && !['readonly_text', 'html_content', 'signature', 'file_upload'].includes(f.type))
                      .map(f => {
                        const isSelected = step.leadConfig?.payloadFields?.includes(f.name) || false;
                        return (
                          <div key={f.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`lead-field-${f.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const currentFields = step.leadConfig?.payloadFields || [];
                                const newFields = checked
                                  ? [...currentFields, f.name]
                                  : currentFields.filter(name => name !== f.name);
                                onUpdateStep(step.id, {
                                  leadConfig: { ...step.leadConfig, payloadFields: newFields }
                                });
                              }}
                            />
                            <Label htmlFor={`lead-field-${f.id}`} className="text-xs cursor-pointer">
                              {f.label || f.name} <span className="text-muted-foreground">({f.name})</span>
                            </Label>
                          </div>
                        );
                      })}
                    {allFields.filter(f => f.name && !['readonly_text', 'html_content', 'signature', 'file_upload'].includes(f.type)).length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No fields available. Add fields to previous steps first.</p>
                    )}
                  </div>
                </div>

                {/* Status Field */}
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Lead Status</Label>
                  <Input
                    value={step.leadConfig?.status || 'new'}
                    onChange={(e) => onUpdateStep(step.id, {
                      leadConfig: { ...step.leadConfig, status: e.target.value }
                    })}
                    placeholder="new"
                    className="h-8"
                  />
                  <p className="text-xs text-teal-600 dark:text-teal-500">
                    Status to assign to the created lead (default: "new").
                  </p>
                </div>
              </div>
            )}

            {step.type === 'send_email' && (() => {
              // Get all form fields that can be used as placeholders
              const placeholderFields = allFields.filter(f =>
                f.name && f.name.trim() !== '' &&
                !['readonly_text', 'html_content'].includes(f.type)
              );

              const copyPlaceholder = (fieldName: string) => {
                navigator.clipboard.writeText(`{{${fieldName}}}`);
              };

              return (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg space-y-3">
                  <Label className="text-sm font-medium text-orange-900 dark:text-orange-300">Email Configuration</Label>
                  <p className="text-xs text-orange-700 dark:text-orange-400">
                    Configure the email to be sent to the application processor when this step is reached.
                  </p>

                  {/* Available Placeholders */}
                  {placeholderFields.length > 0 && (
                    <div className="p-2 bg-white dark:bg-background rounded border border-orange-200 dark:border-orange-800 space-y-2">
                      <Label className="text-xs font-medium text-orange-800 dark:text-orange-300">
                        Available Placeholders (click to copy)
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {placeholderFields.map((field) => (
                          <Badge
                            key={field.id}
                            variant="outline"
                            className="cursor-pointer text-xs font-mono bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200 transition-colors"
                            onClick={() => copyPlaceholder(field.name)}
                            title={`Click to copy {{${field.name}}}`}
                          >
                            {`{{${field.name}}}`}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-orange-600 dark:text-orange-500">
                        Use these in Subject, To, or Body fields. They will be replaced with form values at runtime.
                      </p>
                    </div>
                  )}

                  {/* From Email */}
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-700 dark:text-orange-400">From Email *</Label>
                    <Input
                      value={step.emailConfig?.from || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        emailConfig: { ...step.emailConfig, from: e.target.value } as any
                      })}
                      placeholder="sender@yourdomain.com"
                      className="h-8"
                    />
                  </div>

                  {/* To Emails */}
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-700 dark:text-orange-400">To Email(s) *</Label>
                    <Input
                      value={step.emailConfig?.to || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        emailConfig: { ...step.emailConfig, to: e.target.value } as any
                      })}
                      placeholder="recipient1@email.com,recipient2@email.com or {{email_field}}"
                      className="h-8"
                    />
                    <p className="text-xs text-orange-600 dark:text-orange-500">
                      Separate multiple emails with commas. Supports placeholders like {'{{email}}'}.
                    </p>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-700 dark:text-orange-400">Subject *</Label>
                    <Input
                      value={step.emailConfig?.subject || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        emailConfig: { ...step.emailConfig, subject: e.target.value } as any
                      })}
                      placeholder="New Application from {{name}}"
                      className="h-8"
                    />
                    <p className="text-xs text-orange-600 dark:text-orange-500">
                      Supports placeholders like {'{{field_name}}'}.
                    </p>
                  </div>

                  {/* HTML Body */}
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-700 dark:text-orange-400">HTML Body *</Label>
                    <Textarea
                      value={step.emailConfig?.htmlBody || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        emailConfig: { ...step.emailConfig, htmlBody: e.target.value } as any
                      })}
                      placeholder="<p>A new application has been submitted by {{name}}.</p><p>Email: {{email}}</p>"
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-orange-600 dark:text-orange-500">
                      Supports HTML tags and placeholders like {'{{field_name}}'}.
                    </p>
                  </div>

                  {/* Message Stream */}
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-700 dark:text-orange-400">Message Stream</Label>
                    <Select
                      value={step.emailConfig?.messageStream || 'broadcast'}
                      onValueChange={(value) => onUpdateStep(step.id, {
                        emailConfig: { ...step.emailConfig, messageStream: value } as any
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="broadcast">Broadcast</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-orange-600 dark:text-orange-500">
                      Postmark message stream to use for delivery.
                    </p>
                  </div>
                </div>
              );
            })()}

            {step.type === 'confirmation' && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-green-900 dark:text-green-300">Confirmation Action Button</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-green-700 dark:text-green-400">Button Text</Label>
                    <Input
                      value={step.confirmationConfig?.actionButtonText || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        confirmationConfig: { ...step.confirmationConfig, actionButtonText: e.target.value }
                      })}
                      placeholder="e.g., Back to Home, View My Applications"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-700 dark:text-green-400">Button URL</Label>
                    <Input
                      value={step.confirmationConfig?.actionButtonUrl || ''}
                      onChange={(e) => onUpdateStep(step.id, {
                        confirmationConfig: { ...step.confirmationConfig, actionButtonUrl: e.target.value }
                      })}
                      placeholder="e.g., /, /vendors, /member-portal"
                      className="h-8"
                    />
                    <p className="text-xs text-green-600 dark:text-green-500">
                      Leave empty to hide the action button
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step.type === 'fields' && (
              <>
                {stepFields.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground text-sm">No fields in this step.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => onAddField(step.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stepFields.map(field => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        onUpdate={onUpdateField}
                        onDelete={onDeleteField}
                        allFields={fields}
                      />
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddField(step.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function WizardPreview({ steps, fields }: { steps: FormStep[]; fields: FormField[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const sortedSteps = [...steps].sort((a, b) => a.sequence - b.sequence);
  const activeStep = sortedSteps[currentStep];

  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={`preview-${field.name}`}
              type={field.type === 'phone' ? 'tel' : field.type}
              placeholder={field.placeholder}
              disabled
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={`preview-${field.name}`}
              type="date"
              disabled
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={`preview-${field.name}`}
              placeholder={field.placeholder}
              rows={4}
              disabled
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label || 'option'}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(opt => opt && opt.trim() !== '').map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox id={`preview-${field.name}`} disabled />
            <Label htmlFor={`preview-${field.name}`} className="cursor-pointer">
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      case 'readonly_text':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div className="p-4 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
              {field.content || 'No content provided'}
            </div>
          </div>
        );

      case 'html_content':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div
              className="p-4 bg-muted/50 rounded-lg border text-sm prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: field.content || '<p>No content provided</p>' }}
            />
          </div>
        );

      case 'terms_agreement':
        return (
          <div key={field.id} className="space-y-3">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div
              className="p-4 bg-muted/50 rounded-lg border text-sm prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: field.content || '<p>No terms provided</p>' }}
            />
            <div className="flex items-center gap-2">
              <Checkbox id={`terms-${field.id}`} required />
              <Label htmlFor={`terms-${field.id}`} className="text-sm font-normal cursor-pointer">
                {field.checkboxLabel || 'I agree to the terms and conditions'}
                <span className="text-destructive ml-1">*</span>
              </Label>
            </div>
          </div>
        );

      case 'signature':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">
              {field.label || 'Signature'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <SignaturePad id={`signature-wizard-${field.id}`} />
          </div>
        );

      case 'file_upload':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">
              {field.label || 'File Upload'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Input
                type="file"
                accept={field.acceptedFileTypes || '*'}
                className="hidden"
                id={`file-wizard-${field.id}`}
              />
              <label htmlFor={`file-wizard-${field.id}`} className="cursor-pointer">
                <div className="text-muted-foreground text-sm">
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1">
                    {field.acceptedFileTypes || 'All file types'}
                    {field.maxFileSize && ` (max ${field.maxFileSize}MB)`}
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (sortedSteps.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground text-sm">No wizard steps to preview.</p>
        <p className="text-muted-foreground text-xs mt-1">Add steps in the Builder tab to see the preview.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2">
        {sortedSteps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index === currentStep
                ? 'bg-primary text-primary-foreground'
                : index < currentStep
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
                }`}
            >
              {index + 1}
            </div>
            {index < sortedSteps.length - 1 && (
              <div className={`w-8 h-0.5 ${index < currentStep ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{activeStep?.title || 'Step'}</CardTitle>
          {activeStep?.description && (
            <CardDescription>{activeStep.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {activeStep?.type === 'fields' && (
            <>
              {fields.filter(f => f.stepId === activeStep.id).map(field => renderPreviewField(field))}
              {fields.filter(f => f.stepId === activeStep.id).length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">No fields assigned to this step.</p>
              )}
            </>
          )}

          {activeStep?.type === 'stripe_checkout' && (
            <div className="p-6 bg-purple-50 rounded-lg text-center space-y-3">
              <CreditCard className="h-12 w-12 mx-auto text-purple-600" />
              <h3 className="font-semibold text-purple-900">Stripe Checkout</h3>
              <p className="text-sm text-purple-700">
                User will be redirected to Stripe to complete payment.
              </p>
              {activeStep.stripeConfig?.priceId && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Price ID: {activeStep.stripeConfig.priceId}
                </Badge>
              )}
            </div>
          )}

          {activeStep?.type === 'confirmation' && (
            <div className="p-6 bg-green-50 rounded-lg text-center space-y-3">
              <div className="h-12 w-12 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-green-900">Confirmation</h3>
              <p className="text-sm text-green-700">
                Application submitted successfully!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={() => setCurrentStep(prev => Math.min(sortedSteps.length - 1, prev + 1))}
          disabled={currentStep === sortedSteps.length - 1}
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function FormPreview({ fields }: { fields: FormField[] }) {
  const renderPreviewField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={`preview-${field.name}`}
              type={field.type === 'phone' ? 'tel' : field.type}
              placeholder={field.placeholder}
              disabled
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={`preview-${field.name}`}
              type="date"
              disabled
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={`preview-${field.name}`}
              placeholder={field.placeholder}
              rows={4}
              disabled
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`preview-${field.name}`}>
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label || 'option'}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(opt => opt && opt.trim() !== '').map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox id={`preview-${field.name}`} disabled />
            <Label htmlFor={`preview-${field.name}`} className="cursor-pointer">
              {field.label || 'Untitled Field'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        );

      case 'readonly_text':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div className="p-4 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
              {field.content || 'No content provided'}
            </div>
          </div>
        );

      case 'html_content':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div
              className="p-4 bg-muted/50 rounded-lg border text-sm prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: field.content || '<p>No content provided</p>' }}
            />
          </div>
        );

      case 'terms_agreement':
        return (
          <div key={field.id} className="space-y-3">
            {field.label && (
              <Label className="font-medium">{field.label}</Label>
            )}
            <div
              className="p-4 bg-muted/50 rounded-lg border text-sm prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap max-h-48 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: field.content || '<p>No terms provided</p>' }}
            />
            <div className="flex items-center gap-2">
              <Checkbox id={`terms-preview-${field.id}`} required />
              <Label htmlFor={`terms-preview-${field.id}`} className="text-sm font-normal cursor-pointer">
                {field.checkboxLabel || 'I agree to the terms and conditions'}
                <span className="text-destructive ml-1">*</span>
              </Label>
            </div>
          </div>
        );

      case 'signature':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">
              {field.label || 'Signature'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <SignaturePad id={`signature-preview-${field.id}`} />
          </div>
        );

      case 'file_upload':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="font-medium">
              {field.label || 'File Upload'}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Input
                type="file"
                accept={field.acceptedFileTypes || '*'}
                className="hidden"
                id={`file-preview-${field.id}`}
              />
              <label htmlFor={`file-preview-${field.id}`} className="cursor-pointer">
                <div className="text-muted-foreground text-sm">
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1">
                    {field.acceptedFileTypes || 'All file types'}
                    {field.maxFileSize && ` (max ${field.maxFileSize}MB)`}
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground text-sm">No form fields to preview.</p>
        <p className="text-muted-foreground text-xs mt-1">Add fields in the Builder tab to see the preview.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Details</CardTitle>
        <CardDescription>
          Please fill out all required fields below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => renderPreviewField(field))}
      </CardContent>
    </Card>
  );
}

export function FormFieldBuilder({ fields, onChange, wizardConfig, onWizardConfigChange }: FormFieldBuilderProps) {
  const [viewMode, setViewMode] = useState<'builder' | 'preview' | 'ai'>('builder');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isWizardEnabled = wizardConfig?.enabled ?? false;
  const steps = wizardConfig?.steps ?? [];

  const handleAIFormGenerated = (generatedFields: FormField[], generatedWizard?: WizardConfig) => {
    onChange(generatedFields);
    if (generatedWizard && onWizardConfigChange) {
      onWizardConfigChange(generatedWizard);
    }
    setViewMode('builder'); // Return to builder view to see the result
  };

  const toggleWizardMode = () => {
    if (onWizardConfigChange) {
      if (!isWizardEnabled) {
        // Enable wizard with a default step
        onWizardConfigChange({
          enabled: true,
          steps: [{
            id: `step_${Date.now()}`,
            title: 'Step 1',
            type: 'fields',
            sequence: 1,
          }],
        });
      } else {
        onWizardConfigChange({ enabled: false, steps: [] });
      }
    }
  };

  const addStep = (type: FormStep['type']) => {
    if (!onWizardConfigChange) return;
    const getDefaultTitle = () => {
      switch (type) {
        case 'stripe_checkout': return 'Payment';
        case 'confirmation': return 'Confirmation';
        case 'lead_capture': return 'Lead Capture';
        case 'submission': return 'Submit Application';
        case 'send_email': return 'Send Email';
        default: return `Step ${steps.length + 1}`;
      }
    };
    const newStep: FormStep = {
      id: `step_${Date.now()}`,
      title: getDefaultTitle(),
      type,
      sequence: steps.length + 1,
      ...(type === 'stripe_checkout' ? { stripeConfig: { mode: 'payment' } } : {}),
      ...(type === 'lead_capture' ? { leadConfig: { status: 'new', payloadFields: [] } } : {}),
      ...(type === 'send_email' ? { emailConfig: { from: '', to: '', subject: '', htmlBody: '', messageStream: 'broadcast' } } : {}),
    };
    onWizardConfigChange({
      ...wizardConfig!,
      steps: [...steps, newStep],
    });
  };

  const updateStep = (id: string, updates: Partial<FormStep>) => {
    if (!onWizardConfigChange) return;
    onWizardConfigChange({
      ...wizardConfig!,
      steps: steps.map(s => s.id === id ? { ...s, ...updates } : s),
    });
  };

  const deleteStep = (id: string) => {
    if (!onWizardConfigChange) return;
    // Remove step and reassign field stepIds
    const updatedSteps = steps.filter(s => s.id !== id).map((s, i) => ({ ...s, sequence: i + 1 }));
    onChange(fields.map(f => f.stepId === id ? { ...f, stepId: undefined } : f));
    onWizardConfigChange({
      ...wizardConfig!,
      steps: updatedSteps,
    });
  };

  const addField = (stepId?: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      stepId,
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Check if we're dragging steps or fields
      const isStep = steps.some(s => s.id === active.id);
      if (isStep && onWizardConfigChange) {
        const oldIndex = steps.findIndex(s => s.id === active.id);
        const newIndex = steps.findIndex(s => s.id === over.id);
        const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, sequence: i + 1 }));
        onWizardConfigChange({ ...wizardConfig!, steps: reordered });
      } else {
        const oldIndex = fields.findIndex(f => f.id === active.id);
        const newIndex = fields.findIndex(f => f.id === over.id);
        onChange(arrayMove(fields, oldIndex, newIndex));
      }
    }
  };

  // Fields not assigned to any step
  const unassignedFields = fields.filter(f => !f.stepId || !steps.find(s => s.id === f.stepId));

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Label className="text-base font-semibold">Form Fields</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {onWizardConfigChange && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Switch
                  checked={isWizardEnabled}
                  onCheckedChange={toggleWizardMode}
                  id="wizard-mode"
                />
                <Label htmlFor="wizard-mode" className="text-sm cursor-pointer whitespace-nowrap">
                  Wizard Mode
                </Label>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Label htmlFor="placeholder-fallback" className="text-sm cursor-pointer whitespace-nowrap">
                  Empty Field Text:
                </Label>
                <Input
                  id="placeholder-fallback"
                  type="text"
                  placeholder="N/A"
                  value={wizardConfig?.placeholderFallback || ''}
                  onChange={(e) => onWizardConfigChange({
                    ...wizardConfig!,
                    placeholderFallback: e.target.value
                  })}
                  className="h-7 w-24 text-sm"
                />
              </div>
            </>
          )}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              type="button"
              variant={viewMode === 'ai' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('ai')}
              className="h-7 px-2 sm:px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground data-[state=inactive]:hover:bg-accent"
              data-state={viewMode === 'ai' ? 'active' : 'inactive'}
            >
              <Sparkles className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">AI Builder</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'builder' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('builder')}
              className="h-7 px-2 sm:px-3"
            >
              <Pencil className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Builder</span>
            </Button>
            <Button
              type="button"
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className="h-7 px-2 sm:px-3"
            >
              <Eye className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'ai' ? (
        <AIFormBuilder
          onBack={() => setViewMode('builder')}
          onFormGenerated={handleAIFormGenerated}
        />
      ) : viewMode === 'preview' ? (
        isWizardEnabled && steps.length > 0 ? (
          <WizardPreview steps={steps} fields={fields} />
        ) : (
          <FormPreview fields={fields} />
        )
      ) : (
        <>
          {isWizardEnabled ? (
            <div className="space-y-4">
              {/* Step Type Buttons */}
              <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('fields')} className="justify-start">
                  <Layers className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Form Step</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('lead_capture')} className="text-teal-600 border-teal-200 hover:bg-teal-50 justify-start">
                  <UserPlus className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Lead Capture</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('submission')} className="text-blue-600 border-blue-200 hover:bg-blue-50 justify-start">
                  <FileText className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Submission</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('stripe_checkout')} className="text-purple-600 border-purple-200 hover:bg-purple-50 justify-start">
                  <CreditCard className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Stripe</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('confirmation')} className="text-green-600 border-green-200 hover:bg-green-50 justify-start">
                  <Eye className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Confirmation</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addStep('send_email')} className="text-orange-600 border-orange-200 hover:bg-orange-50 justify-start">
                  <Mail className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">Send Email</span>
                </Button>
              </div>

              {/* Steps List */}
              {steps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Layers className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">No wizard steps defined yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Add steps using the buttons above.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {[...steps].sort((a, b) => a.sequence - b.sequence).map(step => (
                      <SortableStepItem
                        key={step.id}
                        step={step}
                        fields={fields}
                        allFields={fields}
                        onUpdateStep={updateStep}
                        onDeleteStep={deleteStep}
                        onUpdateField={updateField}
                        onDeleteField={deleteField}
                        onAddField={addField}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* Unassigned Fields */}
              {unassignedFields.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                  <Label className="text-sm font-medium text-amber-900">Unassigned Fields</Label>
                  <p className="text-xs text-amber-700 mb-3">These fields are not assigned to any step and won't appear in the wizard.</p>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={unassignedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                      {unassignedFields.map(field => (
                        <SortableFieldItem
                          key={field.id}
                          field={field}
                          onUpdate={updateField}
                          onDelete={deleteField}
                          steps={steps}
                          allFields={fields}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => addField()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground text-sm">No form fields defined yet.</p>
                  <p className="text-muted-foreground text-xs mt-1">Click "Add Field" to create your first field.</p>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                    {fields.map(field => (
                      <SortableFieldItem
                        key={field.id}
                        field={field}
                        onUpdate={updateField}
                        onDelete={deleteField}
                        allFields={fields}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </>
          )}

          {fields.length > 0 && (
            <Collapsible defaultOpen={false} className="mt-4">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors text-left"
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  <Label className="text-xs font-medium text-muted-foreground cursor-pointer">JSON Preview</Label>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3 bg-muted/50 rounded-b-lg -mt-2">
                <pre className="mt-1 text-xs overflow-auto max-h-32 p-2 bg-background rounded border">
                  {JSON.stringify({ fields, wizardConfig }, null, 2)}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}
