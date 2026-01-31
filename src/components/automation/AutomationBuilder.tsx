import { useState } from "react";
import { AutomationList } from "./AutomationList";
import { AutomationCanvas } from "./AutomationCanvas";
import { WorkflowTreeView } from "./WorkflowTreeView";
import { AIAutomationBuilder } from "./AIAutomationBuilder";
import type { Workflow } from "./types";

type View = 'list' | 'canvas' | 'tree' | 'ai';

export function AutomationBuilder() {
  const [view, setView] = useState<View>('list');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  // Track preferred editor mode (canvas or tree)
  const [preferredEditor, setPreferredEditor] = useState<'canvas' | 'tree'>(() => {
    const stored = localStorage.getItem('automation_preferred_editor');
    return (stored === 'tree' || stored === 'canvas') ? stored : 'canvas';
  });

  const handleCreateNew = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setView(preferredEditor);
  };

  const handleCreateWithAI = () => {
    setEditingWorkflow(null);
    setView('ai');
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setView(preferredEditor);
  };

  const handleBack = () => {
    setView('list');
    setEditingWorkflow(null);
  };

  const handleSwitchToCanvas = () => {
    setView('canvas');
    setPreferredEditor('canvas');
    localStorage.setItem('automation_preferred_editor', 'canvas');
  };

  const handleSwitchToTree = () => {
    setView('tree');
    setPreferredEditor('tree');
    localStorage.setItem('automation_preferred_editor', 'tree');
  };

  const handleAIWorkflowGenerated = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    // Stay in AI view so user can save or edit
  };

  if (view === 'ai') {
    return (
      <div className="h-[calc(100vh-140px)] min-h-[500px]">
        <AIAutomationBuilder
          onBack={handleBack}
          onWorkflowGenerated={handleAIWorkflowGenerated}
          onSwitchToCanvas={handleSwitchToCanvas}
          onSwitchToTree={handleSwitchToTree}
        />
      </div>
    );
  }

  if (view === 'canvas') {
    return (
      <div className="h-[calc(100vh-140px)] min-h-[500px]">
        <AutomationCanvas
          onBack={handleBack}
          editingWorkflow={editingWorkflow}
          onSwitchToTree={handleSwitchToTree}
        />
      </div>
    );
  }

  if (view === 'tree') {
    return (
      <div className="h-[calc(100vh-140px)] min-h-[500px]">
        <WorkflowTreeView
          onBack={handleBack}
          editingWorkflow={editingWorkflow}
          onSwitchToCanvas={handleSwitchToCanvas}
        />
      </div>
    );
  }

  return (
    <AutomationList
      onCreateNew={handleCreateNew}
      onEdit={handleEdit}
      onCreateWithAI={handleCreateWithAI}
    />
  );
}
