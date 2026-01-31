import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useWorkflowExecution, WorkflowTriggerEvent, WorkflowExecutionResult, InAppMessageAction, ExecutionStatus, WorkflowFormAction } from '@/hooks/useWorkflowExecution';
import { InAppMessageContainer } from '@/components/InAppMessage';

interface WorkflowContextValue {
  triggerWorkflow: (trigger: WorkflowTriggerEvent) => Promise<WorkflowExecutionResult>;
  isLoading: boolean;
  executionStatus: ExecutionStatus;
  error: string | null;
  clearError: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const {
    triggerWorkflow: originalTriggerWorkflow,
    pendingMessages,
    dismissMessage,
    isLoading,
    executionStatus,
  } = useWorkflowExecution();

  const [error, setError] = useState<string | null>(null);

  const triggerWorkflow = async (trigger: WorkflowTriggerEvent): Promise<WorkflowExecutionResult> => {
    setError(null);
    try {
      return await originalTriggerWorkflow(trigger);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Workflow execution failed';
      setError(errorMessage);
      console.error('[WorkflowContext] Error:', errorMessage);
      return { inAppMessages: [], executedActions: [] };
    }
  };

  const clearError = () => setError(null);

  // Handle form submission from workflow forms
  const handleFormSubmit = useCallback((formData: Record<string, string | boolean>) => {
    console.log('[WorkflowContext] Form submitted with data:', formData);
    // Form data can be logged, stored, or sent to an API
    // For now, we just log it - the form modal handles its own submission logic
  }, []);

  return (
    <WorkflowContext.Provider value={{ triggerWorkflow, isLoading, executionStatus, error, clearError }}>
      {children}
      <InAppMessageContainer 
        messages={pendingMessages} 
        onDismiss={dismissMessage}
        onFormSubmit={handleFormSubmit}
        isLoading={isLoading}
        executionStatus={executionStatus}
        error={error}
        onErrorDismiss={clearError}
      />
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}

// Helper hook for triggering on page view - fires once per page visit
// Resets on: page refresh, navigation away and back, or slug change
export function usePageViewTrigger(
  itemSlug: string,
  itemType: WorkflowTriggerEvent['itemType'],
  itemData?: Record<string, any>,
  enabled: boolean = true,
  itemId?: number
) {
  const { triggerWorkflow } = useWorkflow();
  const hasFiredRef = React.useRef(false);
  const mountIdRef = React.useRef(Date.now()); // Unique ID per mount
  
  // Store itemData in a ref to avoid dependency array issues
  const itemDataRef = React.useRef(itemData);
  React.useEffect(() => {
    itemDataRef.current = itemData;
  }, [itemData]);
  
  // Reset on mount - ensures fresh state on page refresh or navigation back
  React.useEffect(() => {
    // New mount = reset the fired flag
    hasFiredRef.current = false;
    mountIdRef.current = Date.now();
    
    return () => {
      // Reset on unmount so next mount will fire
      hasFiredRef.current = false;
    };
  }, []); // Empty deps - only runs on mount/unmount
  
  // Trigger workflow effect - only depends on stable values
  React.useEffect(() => {
    console.log('[usePageViewTrigger] Effect running:', { 
      hasFired: hasFiredRef.current, 
      enabled, 
      itemSlug, 
      itemType, 
      itemId,
      mountId: mountIdRef.current 
    });
    
    // Skip if already fired this mount, not enabled, or no slug
    if (hasFiredRef.current) {
      console.log('[usePageViewTrigger] Skipping: already fired this mount');
      return;
    }
    if (!enabled) {
      console.log('[usePageViewTrigger] Skipping: not enabled yet');
      return;
    }
    if (!itemSlug) {
      console.log('[usePageViewTrigger] Skipping: no itemSlug');
      return;
    }
    
    // Mark as fired immediately to prevent re-triggers
    hasFiredRef.current = true;
    const currentMountId = mountIdRef.current;
    
    console.log('[usePageViewTrigger] Will trigger workflow in 500ms for:', { itemSlug, itemType, itemId });
    
    // Small delay to ensure page is fully loaded
    const timer = setTimeout(() => {
      // Double-check mount ID hasn't changed (component still mounted from same session)
      if (mountIdRef.current !== currentMountId) {
        console.log('[usePageViewTrigger] Aborted: mount ID changed');
        return;
      }
      
      console.log('[usePageViewTrigger] Triggering workflow for:', { itemSlug, itemType, itemId });
      triggerWorkflow({
        itemSlug,
        itemId,
        itemType,
        triggerEvent: 'view',
        itemData: itemDataRef.current, // Use ref to get latest value
      }).catch(err => {
        console.error('[usePageViewTrigger] Error (logged, not retrying):', err);
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, [enabled, itemSlug, itemType, itemId, triggerWorkflow]); // Removed itemData from deps
  
  // Also reset when slug changes (navigating between different items)
  React.useEffect(() => {
    hasFiredRef.current = false;
  }, [itemSlug]);
}
