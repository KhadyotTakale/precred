import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Trash2, GripVertical, Plus, ChevronDown, ChevronUp, Eye, Pencil, ArrowLeft, 
  Variable, ArrowRight, Info, Layers, CreditCard, FileText, Mail, UserPlus,
  GitBranch, DollarSign, ArrowRightCircle, ArrowLeftCircle
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AutomationPricingConfigBuilder, AutomationPricingConfig, migrateAutomationPricingConfig } from './AutomationPricingConfigBuilder';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ================== TYPE DEFINITIONS ==================

export interface AutomationFormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'url' | 'readonly_text' | 'html_content';
  required: boolean;
  placeholder?: string;
  options?: string[];
  content?: string; // For readonly_text and html_content
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  stepId?: string;
  conditions?: StepCondition[];
  conditionLogic?: 'all' | 'any';
  mapToVariable?: string;
}

export interface StepCondition {
  id: string;
  fieldName: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'is_empty';
  value?: string;
}

export interface LeadConfig {
  emailField?: string;
  nameField?: string;
  payloadFields?: string[];
  status?: string;
}

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  messageStream: string;
}

export interface StripeConfig {
  productName?: string;
  productDescription?: string;
  priceAmount?: number;
  currency?: string;
  mode?: 'payment' | 'subscription';
  successMessage?: string;
}

export interface ConfirmationConfig {
  actionButtonText?: string;
  actionButtonUrl?: string;
}

export interface AutomationFormStep {
  id: string;
  title: string;
  description?: string;
  type: 'fields' | 'stripe_checkout' | 'confirmation' | 'lead_capture' | 'submission' | 'send_email';
  sequence: number;
  conditions?: StepCondition[];
  conditionLogic?: 'all' | 'any';
  showPriceSummary?: boolean;
  stripeConfig?: StripeConfig;
  leadConfig?: LeadConfig;
  emailConfig?: EmailConfig;
  confirmationConfig?: ConfirmationConfig;
}

export interface AutomationWizardConfig {
  enabled: boolean;
  steps: AutomationFormStep[];
  placeholderFallback?: string;
}

export interface AutomationFormConfig {
  title?: string;
  description?: string;
  submitButtonText?: string;
  fields: AutomationFormField[];
  wizardConfig?: AutomationWizardConfig;
  outputPrefix?: string;
  pricingConfig?: import('./AutomationPricingConfigBuilder').AutomationPricingConfig;
}

interface AutomationFormBuilderProps {
  config: AutomationFormConfig;
  onChange: (config: AutomationFormConfig) => void;
  onBack: () => void;
}

// ================== HELPER FUNCTIONS ==================

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ================== SORTABLE FIELD ITEM ==================

interface SortableFieldItemProps {
  field: AutomationFormField;
  onUpdate: (id: string, updates: Partial<AutomationFormField>) => void;
  onDelete: (id: string) => void;
  steps?: AutomationFormStep[];
  allFields?: AutomationFormField[];
  outputPrefix?: string;
}

function SortableFieldItem({ field, onUpdate, onDelete, steps, allFields, outputPrefix = 'form' }: SortableFieldItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [optionsText, setOptionsText] = useState(field.options?.join(', ') || '');
  
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handleOptionsChange = (text: string) => {
    setOptionsText(text);
    const options = text.split(',').map(o => o.trim()).filter(o => o);
    onUpdate(field.id, { options });
  };

  const conditionableFields = (allFields || []).filter(f => 
    f.id !== field.id && 
    f.name && f.name.trim() !== '' &&
    !['readonly_text', 'html_content'].includes(f.type)
  );

  const addFieldCondition = () => {
    const newCondition: StepCondition = {
      id: crypto.randomUUID(),
      fieldName: '',
      operator: 'equals',
      value: '',
    };
    onUpdate(field.id, { conditions: [...(field.conditions || []), newCondition] });
  };

  const updateFieldCondition = (conditionId: string, updates: Partial<StepCondition>) => {
    const updatedConditions = (field.conditions || []).map(c => 
      c.id === conditionId ? { ...c, ...updates } : c
    );
    onUpdate(field.id, { conditions: updatedConditions });
  };

  const deleteFieldCondition = (conditionId: string) => {
    onUpdate(field.id, { conditions: (field.conditions || []).filter(c => c.id !== conditionId) });
  };

  const getConditionFieldOptions = (fieldName: string): string[] => {
    const targetField = (allFields || []).find(f => f.name === fieldName);
    return targetField?.options || [];
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
                  const oldAutoName = field.label.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                  const shouldAutoGenerate = !field.name || field.name === oldAutoName;
                  const updates: Partial<AutomationFormField> = { label: newLabel };
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
              <Select value={field.type} onValueChange={(value: AutomationFormField['type']) => onUpdate(field.id, { type: value })}>
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

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Field</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{field.label || 'Untitled'}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(field.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                <Label className="text-xs">Field Name / Key</Label>
                <Input
                  value={field.name}
                  onChange={(e) => {
                    const sanitized = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                    onUpdate(field.id, { name: sanitized });
                  }}
                  placeholder="field_name"
                  className="h-8 font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
                  placeholder="Enter placeholder..."
                  className="h-8"
                />
              </div>
            </div>

            {steps && steps.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Assign to Step</Label>
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
              </div>
            )}

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

            {(field.type === 'readonly_text' || field.type === 'html_content') && (
              <div className="space-y-1">
                <Label className="text-xs">{field.type === 'readonly_text' ? 'Display Text' : 'HTML Content'}</Label>
                <Textarea
                  value={field.content || ''}
                  onChange={(e) => onUpdate(field.id, { content: e.target.value })}
                  placeholder={field.type === 'readonly_text' ? 'Enter text...' : '<p>HTML content...</p>'}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            )}

            {(field.type === 'text' || field.type === 'textarea') && (
              <div className="grid grid-cols-2 gap-3">
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
                    placeholder="No limit"
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {field.type === 'number' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Min Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.min ?? ''}
                    onChange={(e) => onUpdate(field.id, { 
                      validation: { ...field.validation, min: e.target.value ? parseFloat(e.target.value) : undefined } 
                    })}
                    placeholder="No min"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Value</Label>
                  <Input
                    type="number"
                    value={field.validation?.max ?? ''}
                    onChange={(e) => onUpdate(field.id, { 
                      validation: { ...field.validation, max: e.target.value ? parseFloat(e.target.value) : undefined } 
                    })}
                    placeholder="No max"
                    className="h-8"
                  />
                </div>
              </div>
            )}

            {/* Conditional Logic for Field */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-amber-900 dark:text-amber-300">Conditional Logic</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addFieldCondition}
                  disabled={conditionableFields.length === 0}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Condition
                </Button>
              </div>
              
              {conditionableFields.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No fields available. Add more fields first.
                </p>
              ) : (field.conditions || []).length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No conditions set. This field will always show.
                </p>
              ) : (
                <div className="space-y-2">
                  {(field.conditions || []).length > 1 && (
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200 dark:border-amber-800">
                      <Label className="text-xs text-amber-700 dark:text-amber-400">Show field when:</Label>
                      <Select 
                        value={field.conditionLogic || 'all'} 
                        onValueChange={(value: 'all' | 'any') => onUpdate(field.id, { conditionLogic: value })}
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
                  
                  {(field.conditions || []).map((condition, idx) => (
                    <div key={condition.id} className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-background rounded border border-amber-200 dark:border-amber-800">
                      {idx === 0 ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">If</span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">
                          {field.conditionLogic === 'any' ? 'OR' : 'AND'}
                        </span>
                      )}
                      
                      <Select 
                        value={condition.fieldName || ''} 
                        onValueChange={(value) => updateFieldCondition(condition.id, { fieldName: value, value: '' })}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {conditionableFields.map(f => (
                            <SelectItem key={f.id} value={f.name}>{f.label || f.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select 
                        value={condition.operator} 
                        onValueChange={(value: StepCondition['operator']) => updateFieldCondition(condition.id, { operator: value })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
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

                      {!['not_empty', 'is_empty'].includes(condition.operator) && (
                        getConditionFieldOptions(condition.fieldName).length > 0 ? (
                          <Select 
                            value={condition.value || ''} 
                            onValueChange={(value) => updateFieldCondition(condition.id, { value })}
                          >
                            <SelectTrigger className="h-7 flex-1 text-xs">
                              <SelectValue placeholder="Value" />
                            </SelectTrigger>
                            <SelectContent>
                              {getConditionFieldOptions(condition.fieldName).map((opt, i) => (
                                <SelectItem key={i} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={condition.value || ''}
                            onChange={(e) => updateFieldCondition(condition.id, { value: e.target.value })}
                            placeholder="Value"
                            className="h-7 flex-1 text-xs"
                          />
                        )
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteFieldCondition(condition.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variable Mapping */}
            <Separator className="my-2" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4 text-primary" />
                <Label className="text-xs font-medium">Map to Workflow Variable</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{outputPrefix}.</span>
                <Input
                  value={field.mapToVariable || field.name || ''}
                  onChange={(e) => {
                    const sanitized = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
                    onUpdate(field.id, { mapToVariable: sanitized });
                  }}
                  placeholder={field.name || 'variable_name'}
                  className="h-8 font-mono text-sm flex-1"
                />
              </div>
              {field.name && (
                <p className="text-xs text-muted-foreground">
                  Access as: <code className="bg-muted px-1 rounded text-primary">{`{{${outputPrefix}.${field.mapToVariable || field.name}}}`}</code>
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ================== SORTABLE STEP ITEM ==================

interface SortableStepItemProps {
  step: AutomationFormStep;
  fields: AutomationFormField[];
  allFields: AutomationFormField[];
  onUpdateStep: (id: string, updates: Partial<AutomationFormStep>) => void;
  onDeleteStep: (id: string) => void;
  onUpdateField: (id: string, updates: Partial<AutomationFormField>) => void;
  onDeleteField: (id: string) => void;
  onAddField: (stepId: string) => void;
  outputPrefix: string;
}

function SortableStepItem({ 
  step, fields, allFields, onUpdateStep, onDeleteStep, onUpdateField, onDeleteField, onAddField, outputPrefix 
}: SortableStepItemProps) {
  const [expanded, setExpanded] = useState(false);
  const stepFields = fields.filter(f => f.stepId === step.id);
  
  const conditionableFields = allFields.filter(f => 
    f.stepId !== step.id && 
    f.name && f.name.trim() !== '' &&
    !['readonly_text', 'html_content'].includes(f.type)
  );

  const addCondition = () => {
    const newCondition: StepCondition = {
      id: crypto.randomUUID(),
      fieldName: '',
      operator: 'equals',
      value: '',
    };
    onUpdateStep(step.id, { conditions: [...(step.conditions || []), newCondition] });
  };

  const updateCondition = (conditionId: string, updates: Partial<StepCondition>) => {
    const updatedConditions = (step.conditions || []).map(c => 
      c.id === conditionId ? { ...c, ...updates } : c
    );
    onUpdateStep(step.id, { conditions: updatedConditions });
  };

  const deleteCondition = (conditionId: string) => {
    onUpdateStep(step.id, { conditions: (step.conditions || []).filter(c => c.id !== conditionId) });
  };

  const getFieldOptions = (fieldName: string): string[] => {
    const field = allFields.find(f => f.name === fieldName);
    return field?.options || [];
  };
  
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const getStepIcon = () => {
    switch (step.type) {
      case 'stripe_checkout': return <CreditCard className="h-4 w-4" />;
      case 'confirmation': return <Eye className="h-4 w-4" />;
      case 'lead_capture': return <UserPlus className="h-4 w-4" />;
      case 'submission': return <FileText className="h-4 w-4" />;
      case 'send_email': return <Mail className="h-4 w-4" />;
      default: return <Layers className="h-4 w-4" />;
    }
  };

  const getStepBadge = () => {
    switch (step.type) {
      case 'stripe_checkout': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Stripe Checkout</Badge>;
      case 'confirmation': return <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Confirmation</Badge>;
      case 'lead_capture': return <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">Lead Capture</Badge>;
      case 'submission': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Submission</Badge>;
      case 'send_email': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Send Email</Badge>;
      default: return <Badge variant="secondary">Form Fields</Badge>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Card className="border-2 border-dashed">
        <CardHeader className="py-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
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
                  <DollarSign className="h-3 w-3" />Price
                </Badge>
              )}
              {(step.conditions || []).length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
                  <GitBranch className="h-3 w-3" />{step.conditions.length}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Step</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete step "{step.title}"?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDeleteStep(step.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                <p className="text-xs text-blue-700 dark:text-blue-400">Display the pricing summary when user is on this step</p>
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
                <Button type="button" variant="outline" size="sm" onClick={addCondition} disabled={conditionableFields.length === 0} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />Add Condition
                </Button>
              </div>
              
              {conditionableFields.length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">No fields available. Add fields to previous steps first.</p>
              ) : (step.conditions || []).length === 0 ? (
                <p className="text-xs text-amber-700 dark:text-amber-400">No conditions set. This step will always show.</p>
              ) : (
                <div className="space-y-2">
                  {(step.conditions || []).length > 1 && (
                    <div className="flex items-center gap-2 pb-2 border-b border-amber-200 dark:border-amber-800">
                      <Label className="text-xs text-amber-700 dark:text-amber-400">Show step when:</Label>
                      <Select value={step.conditionLogic || 'all'} onValueChange={(value: 'all' | 'any') => onUpdateStep(step.id, { conditionLogic: value })}>
                        <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All (AND)</SelectItem>
                          <SelectItem value="any">Any (OR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-amber-700 dark:text-amber-400">conditions match</span>
                    </div>
                  )}
                  
                  {(step.conditions || []).map((condition, idx) => (
                    <div key={condition.id} className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-background rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium w-8">
                        {idx === 0 ? 'If' : (step.conditionLogic === 'any' ? 'OR' : 'AND')}
                      </span>
                      
                      <Select value={condition.fieldName || ''} onValueChange={(value) => updateCondition(condition.id, { fieldName: value, value: '' })}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Field" /></SelectTrigger>
                        <SelectContent>
                          {conditionableFields.map(f => <SelectItem key={f.id} value={f.name}>{f.label || f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>

                      <Select value={condition.operator} onValueChange={(value: StepCondition['operator']) => updateCondition(condition.id, { operator: value })}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">equals</SelectItem>
                          <SelectItem value="not_equals">not equals</SelectItem>
                          <SelectItem value="contains">contains</SelectItem>
                          <SelectItem value="not_empty">is not empty</SelectItem>
                          <SelectItem value="is_empty">is empty</SelectItem>
                        </SelectContent>
                      </Select>

                      {!['not_empty', 'is_empty'].includes(condition.operator) && (
                        getFieldOptions(condition.fieldName).length > 0 ? (
                          <Select value={condition.value || ''} onValueChange={(value) => updateCondition(condition.id, { value })}>
                            <SelectTrigger className="h-7 flex-1 text-xs"><SelectValue placeholder="Value" /></SelectTrigger>
                            <SelectContent>
                              {getFieldOptions(condition.fieldName).map((opt, i) => <SelectItem key={i} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={condition.value || ''} onChange={(e) => updateCondition(condition.id, { value: e.target.value })} placeholder="Value" className="h-7 flex-1 text-xs" />
                        )
                      )}

                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCondition(condition.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step Type Specific Configurations */}
            {step.type === 'stripe_checkout' && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-purple-900 dark:text-purple-300">Stripe Configuration</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Product Name *</Label>
                    <Input value={step.stripeConfig?.productName || ''} onChange={(e) => onUpdateStep(step.id, { stripeConfig: { ...step.stripeConfig, productName: e.target.value } })} placeholder="e.g., Application Fee" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Price Amount *</Label>
                    <Input type="number" step="0.01" min="0" value={step.stripeConfig?.priceAmount || ''} onChange={(e) => onUpdateStep(step.id, { stripeConfig: { ...step.stripeConfig, priceAmount: parseFloat(e.target.value) || 0 } })} placeholder="50.00" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-purple-700 dark:text-purple-400">Currency</Label>
                    <Select value={step.stripeConfig?.currency || 'usd'} onValueChange={(value) => onUpdateStep(step.id, { stripeConfig: { ...step.stripeConfig, currency: value } })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD ($)</SelectItem>
                        <SelectItem value="eur">EUR (€)</SelectItem>
                        <SelectItem value="gbp">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step.type === 'lead_capture' && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-teal-900 dark:text-teal-300">Lead Capture Configuration</Label>
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Email Field *</Label>
                  <Select value={step.leadConfig?.emailField || ''} onValueChange={(value) => onUpdateStep(step.id, { leadConfig: { ...step.leadConfig, emailField: value } })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Select email field..." /></SelectTrigger>
                    <SelectContent>
                      {allFields.filter(f => f.type === 'email' && f.name).map(f => <SelectItem key={f.id} value={f.name}>{f.label || f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-teal-700 dark:text-teal-400">Lead Status</Label>
                  <Input value={step.leadConfig?.status || 'new'} onChange={(e) => onUpdateStep(step.id, { leadConfig: { ...step.leadConfig, status: e.target.value } })} placeholder="new" className="h-8" />
                </div>
              </div>
            )}

            {step.type === 'send_email' && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-orange-900 dark:text-orange-300">Email Configuration</Label>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700 dark:text-orange-400">From Email *</Label>
                  <Input value={step.emailConfig?.from || ''} onChange={(e) => onUpdateStep(step.id, { emailConfig: { ...step.emailConfig, from: e.target.value } as any })} placeholder="sender@domain.com" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700 dark:text-orange-400">To Email(s) *</Label>
                  <Input value={step.emailConfig?.to || ''} onChange={(e) => onUpdateStep(step.id, { emailConfig: { ...step.emailConfig, to: e.target.value } as any })} placeholder="recipient@email.com or {{email}}" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700 dark:text-orange-400">Subject *</Label>
                  <Input value={step.emailConfig?.subject || ''} onChange={(e) => onUpdateStep(step.id, { emailConfig: { ...step.emailConfig, subject: e.target.value } as any })} placeholder="New submission from {{name}}" className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-orange-700 dark:text-orange-400">HTML Body *</Label>
                  <Textarea value={step.emailConfig?.htmlBody || ''} onChange={(e) => onUpdateStep(step.id, { emailConfig: { ...step.emailConfig, htmlBody: e.target.value } as any })} placeholder="<p>Email content...</p>" rows={4} className="font-mono text-sm" />
                </div>
              </div>
            )}

            {step.type === 'confirmation' && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg space-y-3">
                <Label className="text-sm font-medium text-green-900 dark:text-green-300">Confirmation Action Button</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-green-700 dark:text-green-400">Button Text</Label>
                    <Input value={step.confirmationConfig?.actionButtonText || ''} onChange={(e) => onUpdateStep(step.id, { confirmationConfig: { ...step.confirmationConfig, actionButtonText: e.target.value } })} placeholder="e.g., Back to Home" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-green-700 dark:text-green-400">Button URL</Label>
                    <Input value={step.confirmationConfig?.actionButtonUrl || ''} onChange={(e) => onUpdateStep(step.id, { confirmationConfig: { ...step.confirmationConfig, actionButtonUrl: e.target.value } })} placeholder="e.g., /" className="h-8" />
                  </div>
                </div>
              </div>
            )}

            {step.type === 'fields' && (
              <>
                {stepFields.length === 0 ? (
                  <div className="text-center py-4 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground text-sm">No fields in this step.</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => onAddField(step.id)}>
                      <Plus className="h-4 w-4 mr-1" />Add Field
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
                        allFields={allFields}
                        outputPrefix={outputPrefix}
                      />
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => onAddField(step.id)}>
                      <Plus className="h-4 w-4 mr-1" />Add Field
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

// ================== WIZARD PREVIEW ==================

function WizardPreview({ steps, fields }: { steps: AutomationFormStep[]; fields: AutomationFormField[] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const sortedSteps = [...steps].sort((a, b) => a.sequence - b.sequence);
  const activeStep = sortedSteps[currentStep];

  const renderPreviewField = (field: AutomationFormField) => {
    if (field.type === 'readonly_text' || field.type === 'html_content') {
      return (
        <div key={field.id} className="p-3 bg-muted/50 rounded-lg">
          {field.type === 'html_content' ? (
            <div dangerouslySetInnerHTML={{ __html: field.content || '' }} className="prose prose-sm dark:prose-invert" />
          ) : (
            <p className="text-sm">{field.content}</p>
          )}
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
        <Label>{field.label || 'Untitled Field'}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
        {field.type === 'textarea' ? (
          <Textarea placeholder={field.placeholder} disabled />
        ) : field.type === 'select' ? (
          <Select disabled>
            <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
            <SelectContent>
              {field.options?.filter(opt => opt && opt.trim() !== '').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : field.type === 'checkbox' ? (
          <div className="flex items-center gap-2">
            <Checkbox disabled />
            <span className="text-sm">{field.label}</span>
          </div>
        ) : (
          <Input type={field.type === 'phone' ? 'tel' : field.type} placeholder={field.placeholder} disabled />
        )}
      </div>
    );
  };

  if (!activeStep) {
    return <div className="text-center py-8 text-muted-foreground">No steps to preview.</div>;
  }

  const stepFields = fields.filter(f => f.stepId === activeStep.id);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {sortedSteps.length}</p>
          <h3 className="text-lg font-semibold">{activeStep.title}</h3>
          {activeStep.description && <p className="text-sm text-muted-foreground">{activeStep.description}</p>}
        </div>
        {sortedSteps.length > 1 && (
          <div className="flex gap-1">
            {sortedSteps.map((_, idx) => (
              <div key={idx} className={cn("w-2 h-2 rounded-full", idx === currentStep ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        )}
      </div>
      
      {activeStep.type === 'fields' && (
        <div className="space-y-4">
          {stepFields.map(field => renderPreviewField(field))}
        </div>
      )}
      
      {activeStep.type === 'stripe_checkout' && (
        <div className="text-center py-8 border-2 border-dashed rounded-lg">
          <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-500" />
          <p className="text-sm font-medium">Stripe Checkout</p>
          <p className="text-xs text-muted-foreground">Payment form will appear here</p>
        </div>
      )}
      
      {activeStep.type === 'confirmation' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <Eye className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium">Submission Complete!</p>
          <p className="text-sm text-muted-foreground">Thank you for your submission.</p>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep(c => c - 1)}>
          <ArrowLeftCircle className="h-4 w-4 mr-2" />Previous
        </Button>
        <Button disabled={currentStep === sortedSteps.length - 1} onClick={() => setCurrentStep(c => c + 1)}>
          Next<ArrowRightCircle className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Card>
  );
}

// ================== FORM PREVIEW ==================

function FormPreview({ config }: { config: AutomationFormConfig }) {
  return (
    <Card className="p-6">
      {config.title && <h3 className="text-lg font-semibold mb-2">{config.title}</h3>}
      {config.description && <p className="text-sm text-muted-foreground mb-4">{config.description}</p>}
      
      <div className="space-y-4">
        {config.fields.map(field => (
          <div key={field.id} className="space-y-1">
            <Label>{field.label || 'Untitled Field'}{field.required && <span className="text-destructive ml-1">*</span>}</Label>
            {field.type === 'textarea' ? (
              <Textarea placeholder={field.placeholder} disabled />
            ) : field.type === 'select' ? (
              <Select disabled>
                <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
                <SelectContent>
                  {field.options?.filter(opt => opt && opt.trim() !== '').map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : field.type === 'checkbox' ? (
              <div className="flex items-center gap-2">
                <Checkbox disabled />
                <span className="text-sm">{field.label}</span>
              </div>
            ) : (
              <Input type={field.type === 'phone' ? 'tel' : field.type} placeholder={field.placeholder} disabled />
            )}
          </div>
        ))}
      </div>
      
      {config.fields.length > 0 && (
        <Button className="mt-6 w-full" disabled>{config.submitButtonText || 'Submit'}</Button>
      )}
    </Card>
  );
}

// ================== MAIN COMPONENT ==================

export function AutomationFormBuilder({ config, onChange, onBack }: AutomationFormBuilderProps) {
  const [viewMode, setViewMode] = useState<'builder' | 'preview'>('builder');
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const isWizardEnabled = config.wizardConfig?.enabled ?? false;
  const steps = config.wizardConfig?.steps ?? [];
  const outputPrefix = config.outputPrefix || 'form';

  const toggleWizardMode = () => {
    if (!isWizardEnabled) {
      onChange({
        ...config,
        wizardConfig: {
          enabled: true,
          steps: [{ id: generateId(), title: 'Step 1', type: 'fields', sequence: 1 }],
        },
      });
    } else {
      onChange({ ...config, wizardConfig: { enabled: false, steps: [] } });
    }
  };

  const addStep = (type: AutomationFormStep['type']) => {
    const getDefaultTitle = () => {
      switch (type) {
        case 'stripe_checkout': return 'Payment';
        case 'confirmation': return 'Confirmation';
        case 'lead_capture': return 'Lead Capture';
        case 'submission': return 'Submit';
        case 'send_email': return 'Send Email';
        default: return `Step ${steps.length + 1}`;
      }
    };
    const newStep: AutomationFormStep = {
      id: generateId(),
      title: getDefaultTitle(),
      type,
      sequence: steps.length + 1,
      ...(type === 'stripe_checkout' ? { stripeConfig: { mode: 'payment', currency: 'usd' } } : {}),
      ...(type === 'lead_capture' ? { leadConfig: { status: 'new' } } : {}),
      ...(type === 'send_email' ? { emailConfig: { from: '', to: '', subject: '', htmlBody: '', messageStream: 'broadcast' } } : {}),
    };
    onChange({
      ...config,
      wizardConfig: { ...config.wizardConfig!, steps: [...steps, newStep] },
    });
  };

  const updateStep = (id: string, updates: Partial<AutomationFormStep>) => {
    onChange({
      ...config,
      wizardConfig: { ...config.wizardConfig!, steps: steps.map(s => s.id === id ? { ...s, ...updates } : s) },
    });
  };

  const deleteStep = (id: string) => {
    const updatedSteps = steps.filter(s => s.id !== id).map((s, i) => ({ ...s, sequence: i + 1 }));
    onChange({
      ...config,
      fields: config.fields.map(f => f.stepId === id ? { ...f, stepId: undefined } : f),
      wizardConfig: { ...config.wizardConfig!, steps: updatedSteps },
    });
  };

  const addField = (stepId?: string) => {
    const newField: AutomationFormField = {
      id: generateId(),
      name: '',
      label: '',
      type: 'text',
      required: false,
      stepId,
    };
    onChange({ ...config, fields: [...config.fields, newField] });
  };

  const updateField = (id: string, updates: Partial<AutomationFormField>) => {
    onChange({ ...config, fields: config.fields.map(f => f.id === id ? { ...f, ...updates } : f) });
  };

  const deleteField = (id: string) => {
    onChange({ ...config, fields: config.fields.filter(f => f.id !== id) });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const isStep = steps.some(s => s.id === active.id);
      if (isStep) {
        const oldIndex = steps.findIndex(s => s.id === active.id);
        const newIndex = steps.findIndex(s => s.id === over.id);
        const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, sequence: i + 1 }));
        onChange({ ...config, wizardConfig: { ...config.wizardConfig!, steps: reordered } });
      } else {
        const oldIndex = config.fields.findIndex(f => f.id === active.id);
        const newIndex = config.fields.findIndex(f => f.id === over.id);
        onChange({ ...config, fields: arrayMove(config.fields, oldIndex, newIndex) });
      }
    }
  };

  const unassignedFields = config.fields.filter(f => !f.stepId || !steps.find(s => s.id === f.stepId));

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-semibold">Form Workflow Builder</h2>
            <p className="text-sm text-muted-foreground">Define the fields for this action</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Label className="text-base font-semibold">Form Fields</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Switch checked={isWizardEnabled} onCheckedChange={toggleWizardMode} id="wizard-mode" />
                <Label htmlFor="wizard-mode" className="text-sm cursor-pointer whitespace-nowrap">Wizard Mode</Label>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                <Label className="text-sm whitespace-nowrap">Empty Field Text:</Label>
                <Input
                  placeholder="N/A"
                  value={config.wizardConfig?.placeholderFallback || ''}
                  onChange={(e) => onChange({ ...config, wizardConfig: { ...config.wizardConfig!, placeholderFallback: e.target.value } })}
                  className="h-7 w-24 text-sm"
                />
              </div>
              <div className="flex items-center border rounded-lg p-1">
                <Button type="button" variant={viewMode === 'builder' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('builder')} className="h-7 px-3">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />Builder
                </Button>
                <Button type="button" variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('preview')} className="h-7 px-3">
                  <Eye className="h-3.5 w-3.5 mr-1.5" />Preview
                </Button>
              </div>
            </div>
          </div>

          {viewMode === 'preview' ? (
            isWizardEnabled && steps.length > 0 ? (
              <WizardPreview steps={steps} fields={config.fields} />
            ) : (
              <FormPreview config={config} />
            )
          ) : (
            <>
              {isWizardEnabled ? (
                <div className="space-y-4">
                  {/* Step Type Buttons */}
                  <div className="grid grid-cols-2 sm:flex gap-2 sm:flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('fields')} className="justify-start">
                      <Layers className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Form Step</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('lead_capture')} className="text-teal-600 border-teal-200 hover:bg-teal-50 justify-start">
                      <UserPlus className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Lead Capture</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('submission')} className="text-blue-600 border-blue-200 hover:bg-blue-50 justify-start">
                      <FileText className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Submission</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('stripe_checkout')} className="text-purple-600 border-purple-200 hover:bg-purple-50 justify-start">
                      <CreditCard className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Stripe</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('confirmation')} className="text-green-600 border-green-200 hover:bg-green-50 justify-start">
                      <Eye className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Confirmation</span>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => addStep('send_email')} className="text-orange-600 border-orange-200 hover:bg-orange-50 justify-start">
                      <Mail className="h-4 w-4 mr-1 shrink-0" /><span className="truncate">Send Email</span>
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
                            fields={config.fields}
                            allFields={config.fields}
                            onUpdateStep={updateStep}
                            onDeleteStep={deleteStep}
                            onUpdateField={updateField}
                            onDeleteField={deleteField}
                            onAddField={addField}
                            outputPrefix={outputPrefix}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Unassigned Fields */}
                  {unassignedFields.length > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <Label className="text-sm font-medium text-amber-900 dark:text-amber-300">Unassigned Fields</Label>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">These fields are not assigned to any step.</p>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={unassignedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                          {unassignedFields.map(field => (
                            <SortableFieldItem key={field.id} field={field} onUpdate={updateField} onDelete={deleteField} steps={steps} allFields={config.fields} outputPrefix={outputPrefix} />
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
                      <Plus className="h-4 w-4 mr-1" />Add Field
                    </Button>
                  </div>
                  
                  {config.fields.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <p className="text-muted-foreground text-sm">No form fields defined yet.</p>
                      <p className="text-muted-foreground text-xs mt-1">Click "Add Field" to create your first field.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={config.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        {config.fields.map(field => (
                          <SortableFieldItem key={field.id} field={field} onUpdate={updateField} onDelete={deleteField} allFields={config.fields} outputPrefix={outputPrefix} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </>
              )}

              {/* Field Mappings Summary */}
              {config.fields.filter(f => f.name).length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Variable className="h-4 w-4 text-primary" />
                    <h3 className="font-medium text-sm">Available Workflow Variables</h3>
                  </div>
                  <div className="space-y-2">
                    {config.fields.filter(f => f.name).map(field => {
                      const variableName = field.mapToVariable || field.name;
                      const fullVariable = `{{${outputPrefix}.${variableName}}}`;
                      return (
                        <div key={field.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">{field.type}</Badge>
                            <span className="text-sm">{field.label || 'Untitled'}</span>
                          </div>
                          <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">{fullVariable}</code>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Pricing Configuration */}
              <AutomationPricingConfigBuilder
                pricingConfig={config.pricingConfig || { enabled: false, basePrice: 0, items: [] }}
                onPricingConfigChange={(pricingConfig) => onChange({ ...config, pricingConfig })}
                formFields={config.fields}
              />

              {/* JSON Preview */}
              {config.fields.length > 0 && (
                <Collapsible defaultOpen={false}>
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
                      {JSON.stringify(config, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
