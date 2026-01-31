import type { WorkflowNode, Connection, ActivityRoute } from "./types";

export interface ValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  routeId?: string;
  message: string;
  fixable?: boolean;
  fixType?: 'add_default_route' | 'add_placeholder_action';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// Generate unique ID for fixes
const generateId = () => `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Auto-fix functions
export function applyAutoFixes(
  nodes: WorkflowNode[],
  connections: Connection[],
  validationResult: ValidationResult
): { nodes: WorkflowNode[]; connections: Connection[]; fixedCount: number } {
  let fixedCount = 0;
  let updatedNodes = [...nodes];

  // Get all fixable issues
  const allIssues = [...validationResult.errors, ...validationResult.warnings];
  const fixableIssues = allIssues.filter(issue => issue.fixable && issue.nodeId);

  fixableIssues.forEach(issue => {
    if (issue.fixType === 'add_default_route' && issue.nodeId) {
      updatedNodes = updatedNodes.map(node => {
        if (node.id === issue.nodeId && node.type === 'activity') {
          const routes = node.data.routes || [];
          // Find the end node to route to
          const endNode = nodes.find(n => n.type === 'end');
          const hasDefault = routes.some(r => r.isDefault);
          
          if (!hasDefault) {
            const newRoute: ActivityRoute = {
              id: generateId(),
              targetActivityId: endNode?.id || '',
              isDefault: true,
            };
            fixedCount++;
            return {
              ...node,
              data: {
                ...node.data,
                routes: [...routes, newRoute],
              },
            };
          }
        }
        return node;
      });
    }

    if (issue.fixType === 'add_placeholder_action' && issue.nodeId) {
      updatedNodes = updatedNodes.map(node => {
        if (node.id === issue.nodeId && node.type === 'activity') {
          const actions = node.data.actions || [];
          if (actions.length === 0) {
            fixedCount++;
            return {
              ...node,
              data: {
                ...node.data,
                actions: [{
                  id: generateId(),
                  type: 'add_note',
                  label: 'Add Note (placeholder)',
                  category: 'task_management' as const,
                  config: { note: 'Configure this action' },
                }],
              },
            };
          }
        }
        return node;
      });
    }
  });

  return { nodes: updatedNodes, connections, fixedCount };
}

// Count fixable issues
export function countFixableIssues(validationResult: ValidationResult): number {
  const allIssues = [...validationResult.errors, ...validationResult.warnings];
  return allIssues.filter(issue => issue.fixable).length;
}

export function validateWorkflow(
  nodes: WorkflowNode[],
  connections: Connection[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for start node
  const startNode = nodes.find(n => n.type === 'start');
  if (!startNode) {
    errors.push({ type: 'error', message: 'Workflow must have a start node' });
  } else {
    // Validate start node has trigger configured
    if (!startNode.data.itemType || !startNode.data.triggerEvent) {
      errors.push({
        type: 'error',
        nodeId: startNode.id,
        message: 'Start node must have a trigger configured',
      });
    }
  }

  // Check for end node
  const endNode = nodes.find(n => n.type === 'end');
  if (!endNode) {
    errors.push({ type: 'error', message: 'Workflow must have an end node' });
  }

  // Validate each node
  nodes.forEach(node => {
    // Skip start/end nodes for connection validation
    if (node.type === 'start' || node.type === 'end') return;

    // Check if node has incoming connection (except start)
    const hasIncoming = connections.some(c => c.targetId === node.id);
    if (!hasIncoming) {
      warnings.push({
        type: 'warning',
        nodeId: node.id,
        message: `"${node.data.label}" has no incoming connection`,
      });
    }

    // Check if node has outgoing connection (except end)
    const hasOutgoing = connections.some(c => c.sourceId === node.id);
    if (!hasOutgoing) {
      warnings.push({
        type: 'warning',
        nodeId: node.id,
        message: `"${node.data.label}" has no outgoing connection`,
      });
    }

    // Validate activity nodes
    if (node.type === 'activity') {
      validateActivityNode(node, nodes, errors, warnings);
    }

    // Validate condition nodes
    if (node.type === 'condition') {
      validateConditionNode(node, connections, errors, warnings);
    }

    // Validate delay nodes
    if (node.type === 'delay') {
      validateDelayNode(node, errors);
    }
  });

  // Check for disconnected paths
  if (startNode && endNode) {
    const reachableFromStart = getReachableNodes(startNode.id, connections, 'forward');
    const reachableFromEnd = getReachableNodes(endNode.id, connections, 'backward');
    
    nodes.forEach(node => {
      if (node.type === 'start' || node.type === 'end') return;
      
      if (!reachableFromStart.has(node.id)) {
        warnings.push({
          type: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" is not reachable from start`,
        });
      }
      
      if (!reachableFromEnd.has(node.id)) {
        warnings.push({
          type: 'warning',
          nodeId: node.id,
          message: `"${node.data.label}" does not lead to end`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateActivityNode(
  node: WorkflowNode,
  allNodes: WorkflowNode[],
  errors: ValidationError[],
  warnings: ValidationError[]
) {
  const routes = node.data.routes || [];
  
  // Validate routes
  routes.forEach(route => {
    // Check if target activity exists
    if (!route.targetActivityId) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        routeId: route.id,
        message: `Route in "${node.data.label}" has no target activity selected`,
      });
    } else {
      const targetExists = allNodes.some(
        n => n.id === route.targetActivityId && n.type === 'activity'
      );
      if (!targetExists) {
        errors.push({
          type: 'error',
          nodeId: node.id,
          routeId: route.id,
          message: `Route in "${node.data.label}" points to non-existent activity`,
        });
      }
    }

    // Validate conditional routes have complete conditions
    if (!route.isDefault && route.condition) {
      const { field, operator, value } = route.condition;
      
      if (!field) {
        errors.push({
          type: 'error',
          nodeId: node.id,
          routeId: route.id,
          message: `Condition in "${node.data.label}" is missing a field`,
        });
      }
      
      if (!operator) {
        errors.push({
          type: 'error',
          nodeId: node.id,
          routeId: route.id,
          message: `Condition in "${node.data.label}" is missing an operator`,
        });
      }
      
      // Value is required for most operators except is_empty/is_not_empty
      const noValueOperators = ['is_empty', 'is_not_empty'];
      if (operator && !noValueOperators.includes(operator) && !value) {
        errors.push({
          type: 'error',
          nodeId: node.id,
          routeId: route.id,
          message: `Condition in "${node.data.label}" is missing a value`,
        });
      }
    }

    // Non-default routes should have conditions defined
    if (!route.isDefault && !route.condition) {
      warnings.push({
        type: 'warning',
        nodeId: node.id,
        routeId: route.id,
        message: `Non-default route in "${node.data.label}" has no condition configured`,
      });
    }
  });

  // Check if activity has at least one action (warning only)
  const actions = node.data.actions || [];
  if (actions.length === 0) {
    warnings.push({
      type: 'warning',
      nodeId: node.id,
      message: `Activity "${node.data.label}" has no actions defined`,
      fixable: true,
      fixType: 'add_placeholder_action',
    });
  }

  // If there are routes, check for a default route
  if (routes.length > 0 && !routes.some(r => r.isDefault)) {
    warnings.push({
      type: 'warning',
      nodeId: node.id,
      message: `Activity "${node.data.label}" has routes but no default route`,
      fixable: true,
      fixType: 'add_default_route',
    });
  }
}

function validateConditionNode(
  node: WorkflowNode,
  connections: Connection[],
  errors: ValidationError[],
  warnings: ValidationError[]
) {
  // Check if condition is configured
  if (!node.data.conditionField) {
    errors.push({
      type: 'error',
      nodeId: node.id,
      message: `Condition "${node.data.label}" has no field configured`,
    });
  }

  if (!node.data.conditionOperator) {
    errors.push({
      type: 'error',
      nodeId: node.id,
      message: `Condition "${node.data.label}" has no operator configured`,
    });
  }

  // Check for both yes and no branches
  const hasYesBranch = connections.some(
    c => c.sourceId === node.id && c.sourceHandle === 'yes'
  );
  const hasNoBranch = connections.some(
    c => c.sourceId === node.id && c.sourceHandle === 'no'
  );

  if (!hasYesBranch) {
    warnings.push({
      type: 'warning',
      nodeId: node.id,
      message: `Condition "${node.data.label}" has no "Yes" branch connected`,
    });
  }

  if (!hasNoBranch) {
    warnings.push({
      type: 'warning',
      nodeId: node.id,
      message: `Condition "${node.data.label}" has no "No" branch connected`,
    });
  }
}

function validateDelayNode(
  node: WorkflowNode,
  errors: ValidationError[]
) {
  if (!node.data.delayAmount || node.data.delayAmount <= 0) {
    errors.push({
      type: 'error',
      nodeId: node.id,
      message: `Delay "${node.data.label}" has no valid duration set`,
    });
  }

  if (!node.data.delayUnit) {
    errors.push({
      type: 'error',
      nodeId: node.id,
      message: `Delay "${node.data.label}" has no time unit selected`,
    });
  }
}

function getReachableNodes(
  startId: string,
  connections: Connection[],
  direction: 'forward' | 'backward'
): Set<string> {
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const nextConnections = direction === 'forward'
      ? connections.filter(c => c.sourceId === current)
      : connections.filter(c => c.targetId === current);

    nextConnections.forEach(conn => {
      const nextId = direction === 'forward' ? conn.targetId : conn.sourceId;
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    });
  }

  return visited;
}
