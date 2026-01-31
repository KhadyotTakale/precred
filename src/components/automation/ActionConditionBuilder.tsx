import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  GitBranch, 
  AlertCircle, 
  ChevronDown, 
  Search,
  Zap,
  FileText,
  Database,
  User,
  CreditCard,
  ClipboardList,
  Variable
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionConditionalLogic, ActionCondition, ActionItem } from "./types";
import { CONDITION_OPERATORS } from "./types";

interface WorkflowVariable {
  value: string;
  label: string;
  category: string;
  icon?: React.ReactNode;
}

interface VariableCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  variables: WorkflowVariable[];
}

interface ActionConditionBuilderProps {
  conditionalLogic?: ActionConditionalLogic;
  onChange: (logic: ActionConditionalLogic) => void;
  previousActions?: ActionItem[]; // Actions that come before this one in the workflow
  workflowVariables?: WorkflowVariable[]; // Custom variables passed from parent
}

const generateConditionId = () => `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// System variables available in all workflows
const SYSTEM_VARIABLES: WorkflowVariable[] = [
  { value: 'trigger.item_type', label: 'Trigger Item Type', category: 'trigger' },
  { value: 'trigger.event', label: 'Trigger Event', category: 'trigger' },
  { value: 'trigger.timestamp', label: 'Trigger Timestamp', category: 'trigger' },
];

// Item variables
const ITEM_VARIABLES: WorkflowVariable[] = [
  { value: 'item.id', label: 'Item ID', category: 'item' },
  { value: 'item.title', label: 'Item Title', category: 'item' },
  { value: 'item.status', label: 'Item Status', category: 'item' },
  { value: 'item.price', label: 'Item Price', category: 'item' },
  { value: 'item.quantity', label: 'Item Quantity', category: 'item' },
  { value: 'item.type', label: 'Item Type', category: 'item' },
  { value: 'item.created_at', label: 'Item Created At', category: 'item' },
];

// User variables
const USER_VARIABLES: WorkflowVariable[] = [
  { value: 'user.id', label: 'User ID', category: 'user' },
  { value: 'user.email', label: 'User Email', category: 'user' },
  { value: 'user.name', label: 'User Name', category: 'user' },
  { value: 'user.role', label: 'User Role', category: 'user' },
  { value: 'user.is_member', label: 'Is Member', category: 'user' },
  { value: 'user.membership_type', label: 'Membership Type', category: 'user' },
];

// Payment variables
const PAYMENT_VARIABLES: WorkflowVariable[] = [
  { value: 'payment.status', label: 'Payment Status', category: 'payment' },
  { value: 'payment.amount', label: 'Payment Amount', category: 'payment' },
  { value: 'payment.method', label: 'Payment Method', category: 'payment' },
  { value: 'payment.transaction_id', label: 'Transaction ID', category: 'payment' },
];

// Extract variables from previous actions
function extractActionVariables(actions: ActionItem[]): WorkflowVariable[] {
  const variables: WorkflowVariable[] = [];
  
  actions.forEach((action, index) => {
    const actionPrefix = `action_${index + 1}`;
    
    // Add generic action result
    variables.push({
      value: `${actionPrefix}.result`,
      label: `${action.label} - Result`,
      category: 'actions',
    });
    variables.push({
      value: `${actionPrefix}.success`,
      label: `${action.label} - Success`,
      category: 'actions',
    });

    // Extract form fields if this is a show_form action
    if (action.type === 'show_form' && action.config?.formConfig?.fields) {
      const formFields = action.config.formConfig.fields;
      formFields.forEach((field: any) => {
        if (field.name) {
          variables.push({
            value: `form.${field.name}`,
            label: `Form: ${field.label || field.name}`,
            category: 'form_fields',
          });
        }
      });
      
      // Also add step-based variables if wizard mode
      if (action.config.formConfig.steps) {
        action.config.formConfig.steps.forEach((step: any) => {
          step.fields?.forEach((field: any) => {
            if (field.name) {
              variables.push({
                value: `form.${field.name}`,
                label: `Form: ${field.label || field.name}`,
                category: 'form_fields',
              });
            }
          });
        });
      }
    }

    // Add email-specific variables
    if (action.type === 'send_email') {
      variables.push({
        value: `${actionPrefix}.email_sent`,
        label: `${action.label} - Email Sent`,
        category: 'actions',
      });
      variables.push({
        value: `${actionPrefix}.email_opened`,
        label: `${action.label} - Email Opened`,
        category: 'actions',
      });
    }

    // Add payment-specific variables
    if (action.type === 'stripe_checkout') {
      variables.push({
        value: `${actionPrefix}.checkout_completed`,
        label: `${action.label} - Checkout Completed`,
        category: 'actions',
      });
      variables.push({
        value: `${actionPrefix}.payment_id`,
        label: `${action.label} - Payment ID`,
        category: 'actions',
      });
    }

    // Add task-specific variables
    if (action.type === 'create_task') {
      variables.push({
        value: `${actionPrefix}.task_id`,
        label: `${action.label} - Task ID`,
        category: 'actions',
      });
    }
  });

  return variables;
}

export function ActionConditionBuilder({
  conditionalLogic,
  onChange,
  previousActions = [],
  workflowVariables = [],
}: ActionConditionBuilderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openPopoverIndex, setOpenPopoverIndex] = useState<number | null>(null);

  const logic: ActionConditionalLogic = conditionalLogic || {
    enabled: false,
    logic: 'all',
    conditions: [],
  };

  // Build categorized variables
  const variableCategories = useMemo((): VariableCategory[] => {
    const actionVariables = extractActionVariables(previousActions);
    
    // Group form fields separately
    const formFieldVars = actionVariables.filter(v => v.category === 'form_fields');
    const actionResultVars = actionVariables.filter(v => v.category === 'actions');

    const categories: VariableCategory[] = [
      {
        id: 'trigger',
        label: 'Trigger',
        icon: <Zap className="h-3.5 w-3.5" />,
        variables: SYSTEM_VARIABLES,
      },
      {
        id: 'item',
        label: 'Item Data',
        icon: <Database className="h-3.5 w-3.5" />,
        variables: ITEM_VARIABLES,
      },
      {
        id: 'user',
        label: 'User',
        icon: <User className="h-3.5 w-3.5" />,
        variables: USER_VARIABLES,
      },
      {
        id: 'payment',
        label: 'Payment',
        icon: <CreditCard className="h-3.5 w-3.5" />,
        variables: PAYMENT_VARIABLES,
      },
    ];

    // Add form fields category if there are any
    if (formFieldVars.length > 0) {
      categories.push({
        id: 'form_fields',
        label: 'Form Fields',
        icon: <FileText className="h-3.5 w-3.5" />,
        variables: formFieldVars,
      });
    }

    // Add previous action results if there are any
    if (actionResultVars.length > 0) {
      categories.push({
        id: 'actions',
        label: 'Previous Actions',
        icon: <ClipboardList className="h-3.5 w-3.5" />,
        variables: actionResultVars,
      });
    }

    // Add custom workflow variables if provided
    if (workflowVariables.length > 0) {
      categories.push({
        id: 'custom',
        label: 'Custom Variables',
        icon: <Variable className="h-3.5 w-3.5" />,
        variables: workflowVariables,
      });
    }

    return categories;
  }, [previousActions, workflowVariables]);

  // Filter variables based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return variableCategories;
    
    const query = searchQuery.toLowerCase();
    return variableCategories
      .map(cat => ({
        ...cat,
        variables: cat.variables.filter(
          v => v.label.toLowerCase().includes(query) || v.value.toLowerCase().includes(query)
        ),
      }))
      .filter(cat => cat.variables.length > 0);
  }, [variableCategories, searchQuery]);

  // Flatten all variables for lookup
  const allVariables = useMemo(() => 
    variableCategories.flatMap(cat => cat.variables),
    [variableCategories]
  );

  const handleToggle = (enabled: boolean) => {
    onChange({
      ...logic,
      enabled,
      conditions: enabled && logic.conditions.length === 0 
        ? [{ id: generateConditionId(), field: '', operator: 'equals', value: '' }]
        : logic.conditions,
    });
  };

  const handleLogicChange = (logicType: 'all' | 'any') => {
    onChange({ ...logic, logic: logicType });
  };

  const addCondition = () => {
    onChange({
      ...logic,
      conditions: [
        ...logic.conditions,
        { id: generateConditionId(), field: '', operator: 'equals', value: '' },
      ],
    });
  };

  const removeCondition = (conditionId: string) => {
    const newConditions = logic.conditions.filter(c => c.id !== conditionId);
    onChange({
      ...logic,
      conditions: newConditions,
      enabled: newConditions.length > 0 ? logic.enabled : false,
    });
  };

  const updateCondition = (conditionId: string, updates: Partial<ActionCondition>) => {
    onChange({
      ...logic,
      conditions: logic.conditions.map(c =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  // Check if operator requires a value input
  const operatorNeedsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  // Get a summary of conditions for display
  const getConditionSummary = () => {
    if (!logic.enabled || logic.conditions.length === 0) return null;
    
    const validConditions = logic.conditions.filter(c => c.field);
    if (validConditions.length === 0) return null;

    const connector = logic.logic === 'all' ? ' AND ' : ' OR ';
    return validConditions.map(c => {
      const fieldLabel = allVariables.find(f => f.value === c.field)?.label || c.field;
      const opLabel = CONDITION_OPERATORS.find(o => o.value === c.operator)?.label || c.operator;
      if (!operatorNeedsValue(c.operator)) {
        return `${fieldLabel} ${opLabel}`;
      }
      return `${fieldLabel} ${opLabel} "${c.value}"`;
    }).join(connector);
  };

  const selectVariable = (conditionId: string, variable: WorkflowVariable, index: number) => {
    updateCondition(conditionId, { field: variable.value });
    setOpenPopoverIndex(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="h-4 w-4 text-amber-500" />
          Conditional Execution
        </Label>
        <Switch
          checked={logic.enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {logic.enabled && (
        <div className="space-y-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
          {/* Logic selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Execute when</span>
            <Select
              value={logic.logic}
              onValueChange={(value) => handleLogicChange(value as 'all' | 'any')}
            >
              <SelectTrigger className="w-24 h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all" className="text-xs">ALL</SelectItem>
                <SelectItem value="any" className="text-xs">ANY</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {logic.logic === 'all' ? 'conditions are met (AND)' : 'condition is met (OR)'}
            </span>
          </div>

          {/* Conditions list */}
          <div className="space-y-2">
            {logic.conditions.map((condition, index) => (
              <div 
                key={condition.id} 
                className="flex items-start gap-2 p-2 rounded-md bg-background/50"
              >
                <div className="flex-1 space-y-2">
                  {/* Row 1: Field selector with variable picker */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                    <Popover 
                      open={openPopoverIndex === index} 
                      onOpenChange={(open) => {
                        setOpenPopoverIndex(open ? index : null);
                        if (!open) setSearchQuery('');
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "flex-1 h-7 justify-between text-xs bg-background font-normal",
                            !condition.field && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {condition.field 
                              ? (allVariables.find(v => v.value === condition.field)?.label || condition.field)
                              : "Select variable..."}
                          </span>
                          <ChevronDown className="h-3 w-3 ml-2 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 bg-background z-50" align="start">
                        {/* Search input */}
                        <div className="flex items-center border-b px-3 py-2">
                          <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                          <input
                            placeholder="Search variables..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        
                        <ScrollArea className="h-64">
                          <div className="p-1">
                            {filteredCategories.length === 0 ? (
                              <div className="py-6 text-center text-xs text-muted-foreground">
                                No variables found
                              </div>
                            ) : (
                              filteredCategories.map((category) => (
                                <div key={category.id} className="mb-2">
                                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {category.icon}
                                    {category.label}
                                  </div>
                                  {category.variables.map((variable) => (
                                    <button
                                      key={variable.value}
                                      onClick={() => selectVariable(condition.id, variable, index)}
                                      className={cn(
                                        "flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded-sm hover:bg-accent transition-colors",
                                        condition.field === variable.value && "bg-accent"
                                      )}
                                    >
                                      <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                                        {variable.value}
                                      </span>
                                      <span className="truncate flex-1 text-left">
                                        {variable.label}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                        
                        {/* Custom variable input */}
                        <div className="border-t p-2">
                          <p className="text-[10px] text-muted-foreground mb-1.5">Or enter custom variable:</p>
                          <div className="flex gap-1.5">
                            <Input
                              placeholder="e.g., custom.field_name"
                              value={condition.field?.startsWith('custom.') ? '' : ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateCondition(condition.id, { field: e.target.value });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value) {
                                  updateCondition(condition.id, { field: e.currentTarget.value });
                                  setOpenPopoverIndex(null);
                                }
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Row 2: Operator and value */}
                  <div className="flex items-center gap-2 pl-6">
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      <SelectTrigger className="w-32 h-7 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value} className="text-xs">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {operatorNeedsValue(condition.operator) && (
                      <Input
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 h-7 text-xs"
                      />
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => removeCondition(condition.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add condition button */}
          <Button
            variant="outline"
            size="sm"
            onClick={addCondition}
            className="w-full h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Condition
          </Button>

          {/* Validation warning */}
          {logic.conditions.some(c => !c.field) && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">Please select a field for all conditions</span>
            </div>
          )}

          {/* Summary preview */}
          {getConditionSummary() && (
            <div className="p-2 rounded-md bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <p className="text-xs font-mono">
                IF {getConditionSummary()}
              </p>
            </div>
          )}
        </div>
      )}

      {!logic.enabled && (
        <p className="text-xs text-muted-foreground">
          Enable to run this action only when specific conditions are met
        </p>
      )}
    </div>
  );
}
