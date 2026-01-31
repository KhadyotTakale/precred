import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Bug,
  ChevronDown,
  ChevronRight,
  Play,
  RotateCcw,
  Zap,
  Database,
  User,
  CreditCard,
  FileText,
  ClipboardList,
  Variable,
  Search,
  Edit2,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionItem } from "./types";

interface VariableValue {
  value: string;
  label: string;
  category: string;
  testValue: string;
  isEditing?: boolean;
}

interface VariableCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  variables: VariableValue[];
}

interface VariablePreviewPanelProps {
  actions: ActionItem[];
  onSimulate?: (variables: Record<string, string>) => void;
}

// System variables
const SYSTEM_VARIABLES = [
  { value: 'trigger.item_type', label: 'Trigger Item Type', category: 'trigger', testValue: 'event' },
  { value: 'trigger.event', label: 'Trigger Event', category: 'trigger', testValue: 'submit' },
  { value: 'trigger.timestamp', label: 'Trigger Timestamp', category: 'trigger', testValue: new Date().toISOString() },
];

const ITEM_VARIABLES = [
  { value: 'item.id', label: 'Item ID', category: 'item', testValue: '12345' },
  { value: 'item.title', label: 'Item Title', category: 'item', testValue: 'Sample Item' },
  { value: 'item.status', label: 'Item Status', category: 'item', testValue: 'active' },
  { value: 'item.price', label: 'Item Price', category: 'item', testValue: '99.99' },
  { value: 'item.quantity', label: 'Item Quantity', category: 'item', testValue: '1' },
  { value: 'item.type', label: 'Item Type', category: 'item', testValue: 'product' },
];

const USER_VARIABLES = [
  { value: 'user.id', label: 'User ID', category: 'user', testValue: 'user_abc123' },
  { value: 'user.email', label: 'User Email', category: 'user', testValue: 'test@example.com' },
  { value: 'user.name', label: 'User Name', category: 'user', testValue: 'John Doe' },
  { value: 'user.role', label: 'User Role', category: 'user', testValue: 'member' },
  { value: 'user.is_member', label: 'Is Member', category: 'user', testValue: 'true' },
];

const PAYMENT_VARIABLES = [
  { value: 'payment.status', label: 'Payment Status', category: 'payment', testValue: 'completed' },
  { value: 'payment.amount', label: 'Payment Amount', category: 'payment', testValue: '150.00' },
  { value: 'payment.method', label: 'Payment Method', category: 'payment', testValue: 'card' },
  { value: 'payment.transaction_id', label: 'Transaction ID', category: 'payment', testValue: 'txn_xyz789' },
];

// Extract variables from actions
function extractActionVariables(actions: ActionItem[]): VariableValue[] {
  const variables: VariableValue[] = [];
  
  actions.forEach((action, index) => {
    const actionPrefix = `action_${index + 1}`;
    
    variables.push({
      value: `${actionPrefix}.result`,
      label: `${action.label} - Result`,
      category: 'actions',
      testValue: 'success',
    });
    variables.push({
      value: `${actionPrefix}.success`,
      label: `${action.label} - Success`,
      category: 'actions',
      testValue: 'true',
    });

    // Extract form fields
    if (action.type === 'show_form' && action.config?.formConfig) {
      const formConfig = action.config.formConfig;
      
      // Check direct fields
      if (formConfig.fields) {
        formConfig.fields.forEach((field: any) => {
          if (field.name) {
            variables.push({
              value: `form.${field.name}`,
              label: `Form: ${field.label || field.name}`,
              category: 'form_fields',
              testValue: getDefaultTestValue(field.type),
            });
          }
        });
      }
      
      // Check wizard steps
      if (formConfig.steps) {
        formConfig.steps.forEach((step: any) => {
          step.fields?.forEach((field: any) => {
            if (field.name) {
              variables.push({
                value: `form.${field.name}`,
                label: `Form: ${field.label || field.name}`,
                category: 'form_fields',
                testValue: getDefaultTestValue(field.type),
              });
            }
          });
        });
      }
    }

    // Email action variables
    if (action.type === 'send_email') {
      variables.push({
        value: `${actionPrefix}.email_sent`,
        label: `${action.label} - Email Sent`,
        category: 'actions',
        testValue: 'true',
      });
    }

    // Payment action variables
    if (action.type === 'stripe_checkout') {
      variables.push({
        value: `${actionPrefix}.checkout_completed`,
        label: `${action.label} - Checkout Completed`,
        category: 'actions',
        testValue: 'true',
      });
      variables.push({
        value: `${actionPrefix}.payment_id`,
        label: `${action.label} - Payment ID`,
        category: 'actions',
        testValue: 'pi_test123',
      });
    }
  });

  return variables;
}

function getDefaultTestValue(fieldType: string): string {
  switch (fieldType) {
    case 'email': return 'user@example.com';
    case 'phone': return '555-123-4567';
    case 'number': return '42';
    case 'checkbox': return 'true';
    case 'date': return new Date().toISOString().split('T')[0];
    case 'select': return 'option1';
    default: return 'Sample text';
  }
}

const categoryIcons: Record<string, React.ReactNode> = {
  trigger: <Zap className="h-3.5 w-3.5" />,
  item: <Database className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  payment: <CreditCard className="h-3.5 w-3.5" />,
  form_fields: <FileText className="h-3.5 w-3.5" />,
  actions: <ClipboardList className="h-3.5 w-3.5" />,
  custom: <Variable className="h-3.5 w-3.5" />,
};

const categoryLabels: Record<string, string> = {
  trigger: 'Trigger',
  item: 'Item Data',
  user: 'User',
  payment: 'Payment',
  form_fields: 'Form Fields',
  actions: 'Action Results',
  custom: 'Custom',
};

const STORAGE_KEY_EXPANDED = 'variable_preview_panel_expanded';

export function VariablePreviewPanel({ actions, onSimulate }: VariablePreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY_EXPANDED);
    return stored !== null ? stored === 'true' : false;
  });
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['trigger', 'item', 'form_fields']);
  const [searchQuery, setSearchQuery] = useState('');
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  const [showOnlyUsed, setShowOnlyUsed] = useState(false);
  const [editingVariable, setEditingVariable] = useState<string | null>(null);

  // Persist expanded state
  const handleExpandedChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    localStorage.setItem(STORAGE_KEY_EXPANDED, String(expanded));
  };

  // Build all variables
  const allVariables = useMemo(() => {
    const actionVars = extractActionVariables(actions);
    return [
      ...SYSTEM_VARIABLES,
      ...ITEM_VARIABLES,
      ...USER_VARIABLES,
      ...PAYMENT_VARIABLES,
      ...actionVars,
    ];
  }, [actions]);

  // Get variables used in action conditions
  const usedVariables = useMemo(() => {
    const used = new Set<string>();
    actions.forEach(action => {
      if (action.conditionalLogic?.enabled) {
        action.conditionalLogic.conditions.forEach(c => {
          if (c.field) used.add(c.field);
        });
      }
    });
    return used;
  }, [actions]);

  // Group by category
  const categories = useMemo((): VariableCategory[] => {
    const grouped: Record<string, VariableValue[]> = {};
    
    allVariables.forEach(v => {
      if (!grouped[v.category]) {
        grouped[v.category] = [];
      }
      grouped[v.category].push({
        ...v,
        testValue: testValues[v.value] ?? v.testValue,
      });
    });

    // Filter if showOnlyUsed
    if (showOnlyUsed) {
      Object.keys(grouped).forEach(key => {
        grouped[key] = grouped[key].filter(v => usedVariables.has(v.value));
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      Object.keys(grouped).forEach(key => {
        grouped[key] = grouped[key].filter(
          v => v.label.toLowerCase().includes(query) || v.value.toLowerCase().includes(query)
        );
      });
    }

    return Object.entries(grouped)
      .filter(([_, vars]) => vars.length > 0)
      .map(([id, variables]) => ({
        id,
        label: categoryLabels[id] || id,
        icon: categoryIcons[id] || <Variable className="h-3.5 w-3.5" />,
        variables,
      }));
  }, [allVariables, testValues, showOnlyUsed, usedVariables, searchQuery]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const updateTestValue = (variableKey: string, value: string) => {
    setTestValues(prev => ({ ...prev, [variableKey]: value }));
  };

  const resetTestValues = () => {
    setTestValues({});
  };

  const handleSimulate = () => {
    const currentValues: Record<string, string> = {};
    allVariables.forEach(v => {
      currentValues[v.value] = testValues[v.value] ?? v.testValue;
    });
    onSimulate?.(currentValues);
  };

  const totalUsed = usedVariables.size;

  return (
    <div className="border-t bg-muted/20">
      <Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Variable Preview</span>
            {totalUsed > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {totalUsed} used
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search variables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-7 text-xs pl-7"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  id="show-used"
                  checked={showOnlyUsed}
                  onCheckedChange={setShowOnlyUsed}
                  className="scale-75"
                />
                <Label htmlFor="show-used" className="text-xs text-muted-foreground cursor-pointer">
                  {showOnlyUsed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Label>
              </div>
            </div>

            {/* Variable list */}
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {categories.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    {showOnlyUsed ? 'No variables used in conditions' : 'No variables found'}
                  </div>
                ) : (
                  categories.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories.includes(category.id)}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors">
                        {expandedCategories.includes(category.id) ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        {category.icon}
                        <span className="font-medium">{category.label}</span>
                        <span className="text-muted-foreground">({category.variables.length})</span>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="pl-4 space-y-0.5 py-1">
                        {category.variables.map((variable) => {
                          const isUsed = usedVariables.has(variable.value);
                          const isEditing = editingVariable === variable.value;
                          
                          return (
                            <div
                              key={variable.value}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 rounded text-xs",
                                isUsed && "bg-primary/5 border-l-2 border-primary"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-muted-foreground truncate">
                                    {variable.value}
                                  </span>
                                  {isUsed && (
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">
                                      used
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {isEditing ? (
                                  <Input
                                    value={variable.testValue}
                                    onChange={(e) => updateTestValue(variable.value, e.target.value)}
                                    onBlur={() => setEditingVariable(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') setEditingVariable(null);
                                    }}
                                    className="h-5 w-24 text-[10px] px-1.5"
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted truncate max-w-[80px]">
                                      {variable.testValue}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={() => setEditingVariable(variable.value)}
                                    >
                                      <Edit2 className="h-2.5 w-2.5 text-muted-foreground" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={resetTestValues}
                className="h-7 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSimulate}
                className="flex-1 h-7 text-xs gap-1"
                disabled={!onSimulate}
              >
                <Play className="h-3 w-3" />
                Simulate with Test Values
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
