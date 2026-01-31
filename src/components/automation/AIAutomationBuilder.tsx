import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, ArrowLeft, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { parseNaturalLanguageToWorkflow, getExamplePrompts } from '@/lib/ai-automation-parser';
import { adminAPI } from '@/lib/admin-api';
import type { Workflow } from './types';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AIAutomationBuilderProps {
    onBack: () => void;
    onWorkflowGenerated: (workflow: Workflow) => void;
    onSwitchToCanvas: () => void;
    onSwitchToTree: () => void;
}

export function AIAutomationBuilder({
    onBack,
    onWorkflowGenerated,
    onSwitchToCanvas,
    onSwitchToTree
}: AIAutomationBuilderProps) {
    const { user } = useUser();
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedWorkflow, setGeneratedWorkflow] = useState<Workflow | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const examplePrompts = getExamplePrompts();

    const handleGenerate = async () => {
        if (!description.trim()) {
            toast.error('Please enter a description');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedWorkflow(null);

        try {
            const result = await parseNaturalLanguageToWorkflow({
                description: description.trim()
            });

            setGeneratedWorkflow(result.workflow);
            toast.success('Automation generated successfully!');
        } catch (err: any) {
            console.error('Generation error:', err);
            const errorMessage = err.message || 'Failed to generate automation. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const saveToBackend = async (workflow: Workflow): Promise<Workflow | null> => {
        if (!user?.id) {
            toast.error('Please sign in to save automations');
            return null;
        }

        setIsSaving(true);
        try {
            const response = await adminAPI.createWorkflow(user.id, {
                name: workflow.name,
                description: workflow.description || '',
                item_info: {
                    nodes: workflow.nodes,
                    connections: workflow.connections,
                },
                is_active: false,
            });

            // Transform the response to match Workflow type
            const savedWorkflow: Workflow = {
                id: String(response.id),
                name: response.title || workflow.name,
                description: response.description || workflow.description || '',
                nodes: response.item_info?.nodes || workflow.nodes,
                connections: response.item_info?.connections || workflow.connections,
                isActive: response.isActive ?? false,
                createdAt: response.createdAt || new Date().toISOString(),
                updatedAt: response.updatedAt || new Date().toISOString(),
            };

            return savedWorkflow;
        } catch (err) {
            console.error('Failed to save workflow:', err);
            toast.error('Failed to save automation. Please try again.');
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveWorkflow = async () => {
        if (!generatedWorkflow) return;

        const savedWorkflow = await saveToBackend(generatedWorkflow);
        if (savedWorkflow) {
            toast.success('Automation saved successfully!');
            onBack(); // Go back to list to see the saved workflow
        }
    };

    const handleEditInCanvas = async () => {
        if (!generatedWorkflow) return;

        const savedWorkflow = await saveToBackend(generatedWorkflow);
        if (savedWorkflow) {
            onWorkflowGenerated(savedWorkflow);
            onSwitchToCanvas();
        }
    };

    const handleEditInTree = async () => {
        if (!generatedWorkflow) return;

        const savedWorkflow = await saveToBackend(generatedWorkflow);
        if (savedWorkflow) {
            onWorkflowGenerated(savedWorkflow);
            onSwitchToTree();
        }
    };

    const handleUseExample = (example: string) => {
        setDescription(example);
    };

    return (
        <div className="h-full flex flex-col p-6 bg-gradient-to-br from-purple-50 via-white to-blue-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-purple-600" />
                            AI Automation Builder
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Describe what you want in plain English, and AI will build it for you
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Left Panel - Input */}
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Describe Your Automation</CardTitle>
                            <CardDescription>
                                Tell us what you want to happen, when it should happen, and who should be notified
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Example: Send an email to people who register for my event and payment is done"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[150px] text-base"
                                disabled={isGenerating}
                            />

                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !description.trim()}
                                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                size="lg"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating Automation...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Generate Automation
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Example Prompts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Need Inspiration? Try These:</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {examplePrompts.map((example, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleUseExample(example)}
                                        disabled={isGenerating}
                                        className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {example}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel - Result */}
                <div className="flex flex-col gap-4 overflow-y-auto">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {generatedWorkflow && (
                        <Card className="border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Automation Generated Successfully!
                                </CardTitle>
                                <CardDescription>
                                    Your automation is ready. You can save it or edit it further.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Workflow Preview */}
                                <div className="bg-white p-4 rounded-lg border">
                                    <h3 className="font-semibold mb-2">{generatedWorkflow.name}</h3>
                                    {generatedWorkflow.description && (
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {generatedWorkflow.description}
                                        </p>
                                    )}

                                    <div className="space-y-2">
                                        <div className="text-sm">
                                            <span className="font-medium">Triggers:</span>{' '}
                                            {generatedWorkflow.nodes
                                                .filter(n => n.type === 'start')
                                                .flatMap(n => n.data.triggerEvents || [])
                                                .map(t => `${t.itemType} ${t.triggerEvent}`)
                                                .join(', ')}
                                        </div>

                                        <div className="text-sm">
                                            <span className="font-medium">Actions:</span>{' '}
                                            {generatedWorkflow.nodes
                                                .filter(n => n.type === 'activity')
                                                .flatMap(n => n.data.actions || [])
                                                .map(a => a.label)
                                                .join(', ')}
                                        </div>

                                        <div className="text-sm">
                                            <span className="font-medium">Steps:</span> {generatedWorkflow.nodes.length} nodes,{' '}
                                            {generatedWorkflow.connections.length} connections
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowPreview(true)}
                                        className="mt-3 gap-2"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View Full Details
                                    </Button>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-1 gap-2">
                                    <Button
                                        onClick={handleSaveWorkflow}
                                        disabled={isSaving}
                                        className="w-full gap-2 bg-green-600 hover:bg-green-700"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                Save Automation
                                            </>
                                        )}
                                    </Button>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            onClick={handleEditInCanvas}
                                            disabled={isSaving}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            {isSaving ? 'Saving...' : 'Edit in Canvas'}
                                        </Button>
                                        <Button
                                            onClick={handleEditInTree}
                                            disabled={isSaving}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            {isSaving ? 'Saving...' : 'Edit in Tree'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!generatedWorkflow && !error && !isGenerating && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
                                <p className="text-muted-foreground">
                                    Your generated automation will appear here
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Workflow Details</DialogTitle>
                        <DialogDescription>
                            Complete JSON structure of your generated automation
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs">
                            {JSON.stringify(generatedWorkflow, null, 2)}
                        </pre>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
