import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseNaturalLanguageToForm, getExampleFormPrompts } from '@/lib/ai-form-parser';
import type { FormField, WizardConfig } from './FormFieldBuilder';
import { toast } from 'sonner';

interface AIFormBuilderProps {
    onBack: () => void;
    onFormGenerated: (fields: FormField[], wizardConfig?: WizardConfig) => void;
}

export function AIFormBuilder({ onBack, onFormGenerated }: AIFormBuilderProps) {
    const { user } = useUser();
    const [description, setDescription] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedFields, setGeneratedFields] = useState<FormField[] | null>(null);
    const [generatedWizard, setGeneratedWizard] = useState<WizardConfig | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const examplePrompts = getExampleFormPrompts();

    const handleGenerate = async () => {
        if (!description.trim()) {
            toast.error('Please enter a description');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedFields(null);
        setGeneratedWizard(undefined);

        try {
            const result = await parseNaturalLanguageToForm({
                description: description.trim()
            });

            setGeneratedFields(result.fields);
            setGeneratedWizard(result.wizardConfig);
            toast.success('Form generated successfully!');
        } catch (err: any) {
            console.error('Generation error:', err);
            const errorMessage = err.message || 'Failed to generate form. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUseForm = () => {
        if (generatedFields) {
            onFormGenerated(generatedFields, generatedWizard);
            toast.success('Form loaded into builder!');
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
                        Back to Builder
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-purple-600" />
                            AI Form Builder
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Describe the form you want, and AI will build it instantly
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Left Panel - Input */}
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Describe Your Form</CardTitle>
                            <CardDescription>
                                Tell us what kind of form you need and what fields it should have
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Example: Create a contact form with name, email, phone, and message fields"
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
                                        Generating Form...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Generate Form
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

                    {generatedFields && (
                        <Card className="border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Form Generated Successfully!
                                </CardTitle>
                                <CardDescription>
                                    Your form is ready. Review it and load it into the builder.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Form Preview */}
                                <div className="bg-white p-4 rounded-lg border space-y-3">
                                    <div className="text-sm">
                                        <span className="font-medium">Form Type:</span>{' '}
                                        {generatedWizard?.enabled ?
                                            `Multi-Step Wizard (${generatedWizard.steps.length} steps)` :
                                            'Single Page Form'}
                                    </div>

                                    <div className="text-sm">
                                        <span className="font-medium">Total Fields:</span> {generatedFields.length}
                                    </div>

                                    {generatedWizard?.enabled && (
                                        <div className="space-y-2">
                                            <div className="text-sm font-medium">Steps:</div>
                                            <div className="space-y-1">
                                                {generatedWizard.steps.map((step, idx) => (
                                                    <div key={step.id} className="text-sm pl-3 border-l-2 border-purple-200">
                                                        {idx + 1}. {step.title} ({step.type})
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Fields:</div>
                                        <div className="space-y-1">
                                            {generatedFields.map((field, idx) => (
                                                <div key={field.id} className="text-sm pl-3 border-l-2 border-blue-200">
                                                    {idx + 1}. {field.label} ({field.type}){field.required ? ' *' : ''}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <Button
                                    onClick={handleUseForm}
                                    className="w-full gap-2 bg-green-600 hover:bg-green-700"
                                    size="lg"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Load This Form Into Builder
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {!generatedFields && !error && !isGenerating && (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <Sparkles className="h-12 w-12 text-gray-300 mb-4" />
                                <p className="text-muted-foreground">
                                    Your generated form will appear here
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
