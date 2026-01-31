import { useState, useCallback } from 'react';
import { elegantAPI, WorkflowTriggerResponse, WorkflowTriggerThrottle, WorkflowActivityDetailsResponse, ThrottleExecuteRequest } from '@/lib/elegant-api';

// Throttle storage key prefix for browser-side tracking
const THROTTLE_STORAGE_PREFIX = 'wf_throttle_';

export interface WorkflowTriggerEvent {
  itemSlug: string;
  itemId?: number;
  itemType: 'event' | 'class' | 'application' | 'membership' | 'raffle' | 'donation' | 'product' | 'vendor' | 'blog' | 'newsletter' | 'page';
  triggerEvent: 'view' | 'add_to_cart' | 'purchase' | 'submit' | 'approve' | 'reject' | 'register' | 'cancel' | 'review' | 'share';
  itemData?: Record<string, any>;
}

// Throttle execution record for localStorage
interface ThrottleRecord {
  count: number;
  firstExecution: number;
  lastExecution: number;
  version?: number; // Track throttle version for invalidation
}

// Check browser-side throttle (localStorage)
function checkBrowserThrottle(
  triggerId: number,
  throttle: WorkflowTriggerThrottle
): { isThrottled: boolean; reason?: string } {
  const storageKey = `${THROTTLE_STORAGE_PREFIX}${triggerId}`;
  
  try {
    const recordJson = localStorage.getItem(storageKey);
    if (!recordJson) {
      return { isThrottled: false };
    }
    
    const record: ThrottleRecord = JSON.parse(recordJson);
    const now = Date.now();
    
    // Version-based invalidation: if server version is higher, invalidate cache
    const serverVersion = throttle.version || 1;
    const recordVersion = record.version || 1;
    if (serverVersion > recordVersion) {
      console.log(`[Throttle] Browser: Version mismatch (server: ${serverVersion}, local: ${recordVersion}), invalidating cache`);
      localStorage.removeItem(storageKey);
      return { isThrottled: false };
    }
    
    // Reset timestamp invalidation: if cache is older than resetAt, invalidate
    if (throttle.resetAt && record.firstExecution < throttle.resetAt) {
      console.log(`[Throttle] Browser: Cache older than resetAt (${new Date(throttle.resetAt).toISOString()}), invalidating`);
      localStorage.removeItem(storageKey);
      return { isThrottled: false };
    }
    
    // Check cooldown first (if specified)
    if (throttle.cooldownMinutes !== undefined && throttle.cooldownMinutes > 0) {
      const cooldownMs = throttle.cooldownMinutes * 60 * 1000;
      if (now - record.lastExecution < cooldownMs) {
        console.log(`[Throttle] Browser: Trigger ${triggerId} in cooldown (${throttle.cooldownMinutes}min)`);
        return { isThrottled: true, reason: 'cooldown_active' };
      }
    }
    
    // Check max executions (if specified)
    const maxExecutions = throttle.maxExecutions;
    if (maxExecutions === undefined || maxExecutions === null) {
      return { isThrottled: false };
    }
    
    // Determine scope start time
    let scopeStart: number;
    switch (throttle.scope) {
      case 'session':
        if (record.count >= maxExecutions) {
          console.log(`[Throttle] Browser: Trigger ${triggerId} hit session limit`);
          return { isThrottled: true, reason: 'max_executions_reached' };
        }
        return { isThrottled: false };
      case 'day':
        scopeStart = new Date().setHours(0, 0, 0, 0);
        break;
      case 'week':
        const dayOfWeek = new Date().getDay();
        scopeStart = new Date().setHours(0, 0, 0, 0) - dayOfWeek * 24 * 60 * 60 * 1000;
        break;
      case 'lifetime':
        scopeStart = 0;
        break;
      default:
        return { isThrottled: false };
    }
    
    // If first execution is within scope and count exceeds max, throttle
    if (record.firstExecution >= scopeStart && record.count >= maxExecutions) {
      console.log(`[Throttle] Browser: Trigger ${triggerId} hit ${throttle.scope} limit`);
      return { isThrottled: true, reason: 'max_executions_reached' };
    }
    
    // If first execution is outside scope, the record is stale
    if (record.firstExecution < scopeStart) {
      localStorage.removeItem(storageKey);
    }
    
    return { isThrottled: false };
  } catch (error) {
    console.error('[Throttle] Browser check error:', error);
    return { isThrottled: false };
  }
}

// Record browser-side execution with version tracking
function recordBrowserExecution(triggerId: number, throttle?: WorkflowTriggerThrottle): void {
  const storageKey = `${THROTTLE_STORAGE_PREFIX}${triggerId}`;
  const now = Date.now();
  const version = throttle?.version || 1;
  
  try {
    const recordJson = localStorage.getItem(storageKey);
    let record: ThrottleRecord;
    
    if (recordJson) {
      record = JSON.parse(recordJson);
      // If version changed, start fresh
      if ((record.version || 1) !== version) {
        record = { count: 1, firstExecution: now, lastExecution: now, version };
      } else {
        record.count += 1;
        record.lastExecution = now;
      }
    } else {
      record = { count: 1, firstExecution: now, lastExecution: now, version };
    }
    
    localStorage.setItem(storageKey, JSON.stringify(record));
    console.log(`[Throttle] Browser: Recorded execution for trigger ${triggerId} (count: ${record.count}, version: ${version})`);
  } catch (error) {
    console.error('[Throttle] Browser record error:', error);
  }
}
async function checkThrottle(
  trigger: WorkflowTriggerResponse,
  itemSlug: string,
  itemType: string,
  eventName: string,
  clerkUserId: string | null
): Promise<{ allowed: boolean; reason?: string; workflowEventLogId?: number }> {
  const throttle = trigger.event_info?.throttle;
  
  // No throttle config or not enabled = allow
  if (!throttle || !throttle.enabled) {
    return { allowed: true };
  }
  
  // No scope or 'none' = allow
  if (!throttle.scope || throttle.scope === 'none') {
    return { allowed: true };
  }
  
  const target = throttle.target || 'browser';
  
  // Handle based on target
  if (target === 'browser') {
    // Browser-only: use localStorage
    const browserCheck = checkBrowserThrottle(trigger.id, throttle);
    if (browserCheck.isThrottled) {
      return { allowed: false, reason: browserCheck.reason };
    }
    // Record and allow (pass throttle for version tracking)
    recordBrowserExecution(trigger.id, throttle);
    return { allowed: true };
  }
  
  if (target === 'user') {
    // User-only: use server if logged in, fallback to browser if anonymous
    if (clerkUserId) {
      // Server-side check
      const request: ThrottleExecuteRequest = {
        trigger_id: trigger.id,
        workflow_items_id: trigger.workflow_items_id,
        user_id: clerkUserId,
        items_slug: itemSlug,
        items_type: itemType,
        event_name: eventName,
        throttle: {
          enabled: throttle.enabled,
          scope: throttle.scope,
          target: throttle.target,
          max_executions: throttle.maxExecutions,
          cooldown_minutes: throttle.cooldownMinutes,
        },
      };
      
      console.log('[Throttle] User: Calling server POST /workflows_throttle/execute', request);
      const response = await elegantAPI.checkAndRecordThrottle(request);
      console.log('[Throttle] User: Server response', response);
      
      // Return with workflowEventLogId for future status queries
      return { allowed: response.allowed, reason: response.reason, workflowEventLogId: response.id };
    } else {
      // Anonymous user: fallback to browser
      console.log('[Throttle] User: Anonymous, falling back to browser throttle');
      const browserCheck = checkBrowserThrottle(trigger.id, throttle);
      if (browserCheck.isThrottled) {
        return { allowed: false, reason: browserCheck.reason };
      }
      recordBrowserExecution(trigger.id, throttle);
      return { allowed: true };
    }
  }
  
  if (target === 'both') {
    // Both: check browser first, then server for logged-in users
    const browserCheck = checkBrowserThrottle(trigger.id, throttle);
    if (browserCheck.isThrottled) {
      console.log('[Throttle] Both: Browser throttled');
      return { allowed: false, reason: browserCheck.reason };
    }
    
    if (clerkUserId) {
      // Also check server
      const request: ThrottleExecuteRequest = {
        trigger_id: trigger.id,
        workflow_items_id: trigger.workflow_items_id,
        user_id: clerkUserId,
        items_slug: itemSlug,
        items_type: itemType,
        event_name: eventName,
        throttle: {
          enabled: throttle.enabled,
          scope: throttle.scope,
          target: throttle.target,
          max_executions: throttle.maxExecutions,
          cooldown_minutes: throttle.cooldownMinutes,
        },
      };
      
      console.log('[Throttle] Both: Calling server POST /workflows_throttle/execute', request);
      const response = await elegantAPI.checkAndRecordThrottle(request);
      console.log('[Throttle] Both: Server response', response);
      
      if (!response.allowed) {
        return { allowed: false, reason: response.reason, workflowEventLogId: response.id };
      }
      
      // Return with workflowEventLogId for future status queries
      // Record browser execution with version tracking
      recordBrowserExecution(trigger.id, throttle);
      return { allowed: true, workflowEventLogId: response.id };
    }
  }
  // Unknown target, allow by default
  return { allowed: true };
}

// Record an execution for throttling based on API response throttle config
function recordExecution(
  triggerId: number,
  throttle: WorkflowTriggerThrottle | undefined
): void {
  // Only record if throttle is enabled and has a valid scope
  if (!throttle || !throttle.enabled) {
    return;
  }
  
  if (!throttle.scope || throttle.scope === 'none') {
    return;
  }

  const storageKey = `${THROTTLE_STORAGE_PREFIX}${triggerId}`;
  // Use localStorage for all client-side targets (browser, user, both)
  // 'user' target would ideally require server-side tracking
  const storage = localStorage;
  const now = Date.now();
  
  try {
    const recordJson = storage.getItem(storageKey);
    let record: ThrottleRecord;
    
    if (recordJson) {
      record = JSON.parse(recordJson);
      record.count += 1;
      record.lastExecution = now;
    } else {
      record = {
        count: 1,
        firstExecution: now,
        lastExecution: now,
      };
    }
    
    storage.setItem(storageKey, JSON.stringify(record));
    console.log(`[Throttle] Recorded execution for trigger ${triggerId} (count: ${record.count})`);
  } catch (error) {
    console.error('[Throttle] Error recording execution:', error);
  }
}

export interface ModalButton {
  id: string;
  text: string;
  value: string;
  fontColor: string;
  backgroundColor: string;
}

// Form config for show_form action
export interface WorkflowFormAction {
  formConfig: any; // AutomationFormConfig
  triggerData?: Record<string, any>;
  title?: string;
  // Workflow context for booking creation
  workflowItemsId?: number;
  itemId?: number;
  itemSlug?: string;
  itemType?: string;
  activityId?: number;
}

export interface InAppMessageAction {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // ms, 0 = manual close
  isModal?: boolean; // true for show_modal action
  buttons?: ModalButton[]; // buttons for modal
  isForm?: boolean; // true for show_form action
  formAction?: WorkflowFormAction; // form configuration
}

export interface WorkflowExecutionResult {
  inAppMessages: InAppMessageAction[];
  executedActions: string[];
}

export interface ExecutionStatus {
  phase: 'idle' | 'fetching_workflow' | 'fetching_activities' | 'executing_activity' | 'logging' | 'complete';
  currentActivity?: string;
  totalActivities?: number;
  currentActivityIndex?: number;
}

export function useWorkflowExecution() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<InAppMessageAction[]>([]);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>({ phase: 'idle' });

// Workflow context for form actions
interface WorkflowContext {
  workflowItemsId?: number;
  activityId?: number;
}

  // Execute actions from activity details
  const executeActions = useCallback((
    actions: any[],
    trigger: WorkflowTriggerEvent,
    workflowContext?: WorkflowContext
  ): InAppMessageAction[] => {
    const messages: InAppMessageAction[] = [];

    for (const action of actions) {
      const actionType = typeof action === 'object' ? action.type : null;

      // Handle in_app_message action
      if (actionType === 'in_app_message') {
        const config = action.config || {};
        
        // Replace variables in message
        let message = config.message || 'Hello!';
        let title = config.title || '';
        
        // Simple variable replacement
        if (trigger.itemData) {
          Object.entries(trigger.itemData).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{item\\.${key}\\}\\}`, 'g');
            message = message.replace(regex, String(value));
            title = title.replace(regex, String(value));
          });
        }

        messages.push({
          title,
          message,
          type: config.type || 'info',
          duration: config.duration ?? 5000,
        });
      }

      // Handle show_modal action with buttons
      if (actionType === 'show_modal') {
        const config = action.config || {};
        
        let message = config.message || config.content || 'Modal content';
        let title = config.title || '';
        
        // Replace variables in message and title
        if (trigger.itemData) {
          Object.entries(trigger.itemData).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{item\\.${key}\\}\\}`, 'g');
            message = message.replace(regex, String(value));
            title = title.replace(regex, String(value));
          });
        }

        // Process buttons - replace variables in button text
        const buttons: ModalButton[] = (config.buttons || []).map((btn: ModalButton) => {
          let buttonText = btn.text || 'OK';
          if (trigger.itemData) {
            Object.entries(trigger.itemData).forEach(([key, value]) => {
              const regex = new RegExp(`\\{\\{item\\.${key}\\}\\}`, 'g');
              buttonText = buttonText.replace(regex, String(value));
            });
          }
          return {
            ...btn,
            text: buttonText,
          };
        });

        messages.push({
          title,
          message,
          type: 'info',
          duration: 0, // Manual close for modals
          isModal: true,
          buttons: buttons.length > 0 ? buttons : undefined,
        });
      }

      // Handle show_form action - display form in full-screen modal
      if (actionType === 'show_form') {
        const config = action.config || {};
        const formConfig = config.formConfig || config;
        
        let formTitle = config.title || formConfig.title || 'Complete Form';
        
        // Replace variables in title
        if (trigger.itemData) {
          Object.entries(trigger.itemData).forEach(([key, value]) => {
            const regex = new RegExp(`\\{\\{item\\.${key}\\}\\}`, 'g');
            formTitle = formTitle.replace(regex, String(value));
          });
        }

        messages.push({
          title: formTitle,
          message: '', // Forms don't use message
          type: 'info',
          duration: 0, // Manual close
          isForm: true,
          formAction: {
            formConfig: formConfig,
            triggerData: trigger.itemData,
            title: formTitle,
            // Include workflow context for booking creation
            workflowItemsId: workflowContext?.workflowItemsId,
            itemId: trigger.itemId,
            itemSlug: trigger.itemSlug,
            itemType: trigger.itemType,
            activityId: workflowContext?.activityId,
          },
        });
      }
    }

    return messages;
  }, []);

  // Main trigger function to call from detail pages - executes once only
  const triggerWorkflow = useCallback(async (
    trigger: WorkflowTriggerEvent
  ): Promise<WorkflowExecutionResult> => {
    const allResults: WorkflowExecutionResult = {
      inAppMessages: [],
      executedActions: [],
    };
    
    // Track activities and actions executed for logging
    const executionLog: { 
      activities: { id: number; name: string; actions: string[]; success: boolean }[] 
    } = { activities: [] };

    setIsLoading(true);

    try {
      // Step 1: Get workflow triggers by item slug
      setExecutionStatus({ phase: 'fetching_workflow' });
      console.log(`[Workflow] Fetching workflows for slug: ${trigger.itemSlug}`);
      const workflowTriggers = await elegantAPI.getWorkflowsBySlug(trigger.itemSlug);
      
      if (!workflowTriggers || workflowTriggers.length === 0) {
        console.log('[Workflow] No workflows found for this item - POST /workflows_logs will NOT be called');
        setExecutionStatus({ phase: 'idle' });
        return allResults;
      }

      console.log('[Workflow] Found workflow triggers:', JSON.stringify(workflowTriggers, null, 2));

      // Filter triggers matching the event type
      const matchingTriggers = workflowTriggers.filter(
        t => t.items_type === trigger.itemType && t.event_name === trigger.triggerEvent
      );

      console.log(`[Workflow] Found ${matchingTriggers.length} matching triggers for ${trigger.itemType}/${trigger.triggerEvent}`);

      if (matchingTriggers.length === 0) {
        console.log('[Workflow] No matching triggers for this event type - POST /workflows_logs will NOT be called');
        setExecutionStatus({ phase: 'idle' });
        return allResults;
      }

      // Sort by sequence
      matchingTriggers.sort((a, b) => a.seq - b.seq);

      // Step 2: Check throttling for the first matching trigger
      const workflowTrigger = matchingTriggers[0];
      const throttleConfig = workflowTrigger.event_info?.throttle;
      console.log('[Workflow] Throttle config for trigger:', throttleConfig);
      
      // Get clerk user ID for server-side throttle check
      const clerkUserId = elegantAPI.getClerkUserId();
      
      // Check throttle (handles browser/user/both targets with server-side for logged-in users)
      const throttleResult = await checkThrottle(
        workflowTrigger,
        trigger.itemSlug,
        trigger.itemType,
        trigger.triggerEvent,
        clerkUserId
      );
      
      if (!throttleResult.allowed) {
        console.log(`[Workflow] Trigger ${workflowTrigger.id} is throttled (${throttleResult.reason}) - POST /workflows_logs will NOT be called`);
        setExecutionStatus({ phase: 'idle' });
        return allResults;
      }


      setExecutionStatus({ phase: 'fetching_activities' });
      console.log(`[Workflow] Fetching activities for workflow_items_id: ${workflowTrigger.workflow_items_id}`);
      
      // Wrap activities fetch in try-catch to handle 404 gracefully
      let activities: any[] = [];
      try {
        activities = await elegantAPI.getWorkflowActivitiesByItemsId(workflowTrigger.workflow_items_id) || [];
      } catch (activitiesError) {
        console.warn('[Workflow] Failed to fetch activities (may not exist yet):', activitiesError);
        activities = [];
      }

      if (!activities || activities.length === 0) {
        console.log('[Workflow] No activities found for this workflow');
      } else {
        console.log(`[Workflow] Found ${activities.length} activities`);

        // Step 3: For each activity, get activity_info details and execute
        for (let i = 0; i < activities.length; i++) {
          const activity = activities[i];
          const activityLog = { id: activity.id, name: activity.name, actions: [] as string[], success: false };
          
          setExecutionStatus({
            phase: 'executing_activity',
            currentActivity: activity.name,
            totalActivities: activities.length,
            currentActivityIndex: i + 1,
          });
          
          try {
            console.log(`[Workflow] Fetching details for activity: ${activity.id} - ${activity.name}`);
            const activityDetails = await elegantAPI.getWorkflowActivityDetails(activity.id);

            if (!activityDetails?.activity_info?.actions) {
              console.log('[Workflow] No actions found in activity_info');
              activityLog.success = true; // No actions is not an error
              executionLog.activities.push(activityLog);
              continue;
            }

            const actions = activityDetails.activity_info.actions;
            console.log(`[Workflow] Executing ${actions.length} actions from activity: ${activity.name}`);

            // Execute actions and collect messages - pass workflow context for form submissions
            const workflowContext = {
              workflowItemsId: workflowTrigger.workflow_items_id,
              activityId: activity.id,
            };
            const messages = executeActions(actions, trigger, workflowContext);
            allResults.inAppMessages.push(...messages);
            
            // Track executed action types
            const actionTypes = actions.map((a: any) => typeof a === 'object' ? a.type : 'unknown');
            allResults.executedActions.push(...actionTypes);
            activityLog.actions = actionTypes;
            activityLog.success = true;
            
            console.log(`[Workflow] Activity ${activity.name} executed successfully`);
          } catch (error) {
            console.error(`[Workflow] Error executing activity ${activity.name}:`, error);
            activityLog.success = false;
          }
          
          executionLog.activities.push(activityLog);
        }
      }

      // Queue messages to display
      if (allResults.inAppMessages.length > 0) {
        setPendingMessages(prev => [...prev, ...allResults.inAppMessages]);
      }

      // Log execution once (regardless of success or failure)
      setExecutionStatus({ phase: 'logging' });
      try {
        const logData = {
          workflows_items_id: workflowTrigger.workflow_items_id,
          items_id: trigger.itemId || 0,
          items_slug: trigger.itemSlug,
          item_type: trigger.itemType, // Top-level for easier querying
          event: trigger.triggerEvent, // Top-level for easier querying
          log: {
            trigger_event: trigger.triggerEvent,
            item_type: trigger.itemType,
            executed_actions: allResults.executedActions,
            activities_executed: executionLog.activities,
            messages_count: allResults.inAppMessages.length,
            timestamp: new Date().toISOString(),
          }
        };
        
        console.log('[Workflow] Attempting to send execution log to POST /workflows_logs:', JSON.stringify(logData, null, 2));
        const logResponse = await elegantAPI.createWorkflowLog(logData);
        console.log('[Workflow] Log POST response:', logResponse);
      } catch (logError) {
        console.error('[Workflow] Failed to POST execution log:', logError);
        // Log the full error details
        if (logError instanceof Error) {
          console.error('[Workflow] Error name:', logError.name);
          console.error('[Workflow] Error message:', logError.message);
          console.error('[Workflow] Error stack:', logError.stack);
        }
      }

    } catch (error) {
      console.error('[Workflow] Error in workflow execution:', error);
    } finally {
      setIsLoading(false);
      setExecutionStatus({ phase: 'complete' });
      // Reset to idle after a brief moment
      setTimeout(() => setExecutionStatus({ phase: 'idle' }), 1000);
    }

    return allResults;
  }, [executeActions]);

  // Clear a message from the queue
  const dismissMessage = useCallback((index: number) => {
    setPendingMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear all messages
  const dismissAllMessages = useCallback(() => {
    setPendingMessages([]);
  }, []);

  return {
    triggerWorkflow,
    pendingMessages,
    dismissMessage,
    dismissAllMessages,
    isLoading,
    executionStatus,
  };
}
