// Automation workflow types

export type NodeType = 'start' | 'end' | 'activity' | 'condition' | 'delay';

export interface Position {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: Position;
  data: NodeData;
}

export interface NodeData {
  label: string;
  description?: string;
  // Start node specific
  triggerType?: string;
  triggerEvent?: string;
  itemType?: string;
  triggerEvents?: TriggerEventConfig[]; // Multiple trigger events for start node
  // Activity node specific - contains actions
  actions?: ActionItem[];
  routes?: ActivityRoute[]; // Conditional routes to other activities
  activityId?: number; // Backend workflow_activities ID for persistence
  // Condition node specific
  conditionField?: string;
  conditionOperator?: string;
  conditionValue?: string;
  // Delay node specific
  delayAmount?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
}

// Throttle scope options for trigger events
export type ThrottleScope = 'session' | 'day' | 'week' | 'lifetime' | 'none';
export type ThrottleTarget = 'browser' | 'user' | 'both';

// Throttling configuration for trigger events
export interface TriggerThrottleConfig {
  enabled: boolean;
  scope: ThrottleScope;
  target: ThrottleTarget;
  maxExecutions?: number; // Max times to execute within scope (default 1)
  cooldownMinutes?: number; // Minutes between executions (optional)
  version?: number; // Bump to invalidate all browser caches for this trigger
  resetAt?: number; // Unix timestamp - invalidate browser caches older than this
}

// Trigger event configuration for start node
export interface TriggerEventConfig {
  id: string;
  itemType: string;
  triggerEvent: string;
  seq: number;
  backendId?: number;
  throttle?: TriggerThrottleConfig;
}

// Throttle scope options for UI
export const THROTTLE_SCOPES = [
  { value: 'none', label: 'No Throttling', description: 'Execute every time' },
  { value: 'session', label: 'Per Session', description: 'Once per browser session' },
  { value: 'day', label: 'Per Day', description: 'Once per 24 hours' },
  { value: 'week', label: 'Per Week', description: 'Once per 7 days' },
  { value: 'lifetime', label: 'Lifetime', description: 'Only once ever' },
] as const;

export const THROTTLE_TARGETS = [
  { value: 'browser', label: 'Browser', description: 'Track per browser/device' },
  { value: 'user', label: 'User', description: 'Track per logged-in user' },
  { value: 'both', label: 'Both', description: 'Track per user AND browser' },
] as const;

// Individual condition for an action
export interface ActionCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

// Conditional logic configuration for an action
export interface ActionConditionalLogic {
  enabled: boolean;
  logic: 'all' | 'any'; // AND or OR
  conditions: ActionCondition[];
}

// Action item within an activity
export interface ActionItem {
  id: string;
  type: string;
  label: string;
  category: ActionCategory;
  config?: Record<string, any>;
  children?: ActionItem[]; // For nested tree structure
  conditionalLogic?: ActionConditionalLogic;
}

// Route to another activity based on conditions
export interface ActivityRoute {
  id: string;
  targetActivityId: string;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
  isDefault?: boolean; // If no conditions match, use this route
}

// Action categories for grouping
export type ActionCategory = 
  | 'communication'
  | 'task_management' 
  | 'data_management'
  | 'forms'
  | 'integrations'
  | 'payments';

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Trigger events by item type
export const ITEM_TYPES = [
  { value: 'event', label: 'Event' },
  { value: 'class', label: 'Class' },
  { value: 'application', label: 'Application' },
  { value: 'membership', label: 'Membership' },
  { value: 'raffle', label: 'Raffle' },
  { value: 'donation', label: 'Donation' },
  { value: 'product', label: 'Product' },
  { value: 'vendor', label: 'Vendor' },
] as const;

export const TRIGGER_EVENTS = [
  { value: 'view', label: 'Item Viewed' },
  { value: 'add_to_cart', label: 'Added to Cart' },
  { value: 'purchase', label: 'Purchased' },
  { value: 'submit', label: 'Form Submitted' },
  { value: 'approve', label: 'Approved' },
  { value: 'reject', label: 'Rejected' },
  { value: 'register', label: 'Registered' },
  { value: 'cancel', label: 'Cancelled' },
  { value: 'review', label: 'Review Added' },
  { value: 'share', label: 'Shared' },
] as const;

// Grouped action types by category
export const ACTION_CATEGORIES = [
  {
    id: 'communication' as ActionCategory,
    label: 'Communication',
    icon: 'MessageSquare',
    description: 'Send messages to users',
    actions: [
      { value: 'send_email', label: 'Send Email', icon: 'Mail' },
      { value: 'send_sms', label: 'Send SMS', icon: 'Phone' },
      { value: 'push_notification', label: 'Push Notification', icon: 'Bell' },
      { value: 'in_app_message', label: 'In-App Message', icon: 'MessageCircle' },
    ],
  },
  {
    id: 'task_management' as ActionCategory,
    label: 'Task Management',
    icon: 'ClipboardList',
    description: 'Create and manage tasks',
    actions: [
      { value: 'create_task', label: 'Create Task', icon: 'Plus' },
      { value: 'assign_task', label: 'Assign Task', icon: 'UserPlus' },
      { value: 'add_note', label: 'Add Note', icon: 'FileText' },
      { value: 'notify_admin', label: 'Notify Admin', icon: 'Bell' },
    ],
  },
  {
    id: 'data_management' as ActionCategory,
    label: 'Data Management',
    icon: 'Database',
    description: 'Update records and fields',
    actions: [
      { value: 'update_field', label: 'Update Field', icon: 'Edit' },
      { value: 'add_tag', label: 'Add Tag', icon: 'Tag' },
      { value: 'remove_tag', label: 'Remove Tag', icon: 'X' },
      { value: 'update_status', label: 'Update Status', icon: 'RefreshCw' },
    ],
  },
  {
    id: 'forms' as ActionCategory,
    label: 'Forms & UI',
    icon: 'FormInput',
    description: 'Show forms and collect data',
    actions: [
      { value: 'show_form', label: 'Show Form', icon: 'ClipboardList' },
      { value: 'show_modal', label: 'Show Modal', icon: 'Maximize2' },
      { value: 'redirect', label: 'Redirect', icon: 'ExternalLink' },
    ],
  },
  {
    id: 'payments' as ActionCategory,
    label: 'Payments',
    icon: 'CreditCard',
    description: 'Process payments and transactions',
    actions: [
      { value: 'stripe_checkout', label: 'Stripe Checkout', icon: 'CreditCard' },
      { value: 'create_invoice', label: 'Create Invoice', icon: 'Receipt' },
      { value: 'send_receipt', label: 'Send Receipt', icon: 'FileCheck' },
      { value: 'refund', label: 'Process Refund', icon: 'RotateCcw' },
    ],
  },
  {
    id: 'integrations' as ActionCategory,
    label: 'Integrations',
    icon: 'Globe',
    description: 'Connect with external services',
    actions: [
      { value: 'webhook', label: 'Call Webhook', icon: 'Globe' },
      { value: 'api_call', label: 'API Call', icon: 'Zap' },
      { value: 'slack_message', label: 'Send to Slack', icon: 'Hash' },
    ],
  },
] as const;

// Flat list of all actions for backwards compatibility
export const ACTION_TYPES = ACTION_CATEGORIES.flatMap(cat => 
  cat.actions.map(action => ({ ...action, category: cat.id }))
);

export const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
] as const;
