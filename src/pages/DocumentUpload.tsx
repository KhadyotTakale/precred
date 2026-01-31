import React, { useState } from 'react';
import { FileUpload } from '@/components/upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

const DocumentUpload = () => {
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        bankStatement: null,
        loanApplication: null,
        udyamCert: null,
        gstCert: null,
        itrAck: null,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);

    const handleFileSelect = (key: string, file: File) => {
        setFiles((prev) => ({ ...prev, [key]: file }));
    };

    const handleRemoveFile = (key: string) => {
        setFiles((prev) => ({ ...prev, [key]: null }));
    };

    const handleSubmit = async () => {
        if (!files.bankStatement) {
            toast.error("Bank Statement is mandatory.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();

        Object.entries(files).forEach(([key, file]) => {
            if (file) {
                formData.append(key, file);
            }
        });

        try {
            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            if (data.analysis) {
                setAnalysis(data.analysis);
                toast.success("Analysis complete!");
            } else {
                toast.error("Analysis data missing from response.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload and analyze documents.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const completedCount = Object.values(files).filter(Boolean).length;
    const progressPercentage = (completedCount / 5) * 100;

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Section */}
                {analysis ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analysis Result</h1>
                            <Button variant="outline" onClick={() => setAnalysis(null)}>Upload New Application</Button>
                        </div>
                        <Card className="shadow-lg border-emerald-100 bg-white">
                            <CardContent className="p-6 md:p-8">
                                <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-slate-900 prose-h2:text-emerald-700 prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-strong:text-slate-800">
                                    <ReactMarkdown>{analysis}</ReactMarkdown>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                                    Step 1 of 3
                                </Badge>
                                <span className="text-sm text-muted-foreground">Document Collection</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                Upload Loan Documents
                            </h1>
                            <p className="text-muted-foreground max-w-2xl">
                                Please upload the required documents for the AI Pre-Underwriting Agent to analyze.
                                High-quality scans ensure faster processing and higher approval chances.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Upload Form */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-none shadow-md">
                                    <CardHeader>
                                        <CardTitle className="text-xl">Required Documents</CardTitle>
                                        <CardDescription>
                                            Supported formats: PDF, JPG, PNG (Max 10MB each)
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">

                                        <div className="space-y-6">
                                            <FileUpload
                                                label="Bank Statements (6-12 Months)"
                                                description="Most Important! Upload consolidated PDF or zip if multiple files."
                                                required
                                                accept=".pdf,.zip,.csv"
                                                onFileSelect={(f) => handleFileSelect('bankStatement', f)}
                                                onRemove={() => handleRemoveFile('bankStatement')}
                                                initialFile={files.bankStatement}
                                            />

                                            <Separator />

                                            <FileUpload
                                                label="MSME Loan Application Form"
                                                description="Filled and signed application form."
                                                onFileSelect={(f) => handleFileSelect('loanApplication', f)}
                                                onRemove={() => handleRemoveFile('loanApplication')}
                                                initialFile={files.loanApplication}
                                            />

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <FileUpload
                                                    label="Udyam Certificate"
                                                    onFileSelect={(f) => handleFileSelect('udyamCert', f)}
                                                    onRemove={() => handleRemoveFile('udyamCert')}
                                                    initialFile={files.udyamCert}
                                                />
                                                <FileUpload
                                                    label="GST Certificate / Returns"
                                                    onFileSelect={(f) => handleFileSelect('gstCert', f)}
                                                    onRemove={() => handleRemoveFile('gstCert')}
                                                    initialFile={files.gstCert}
                                                />
                                            </div>

                                            <FileUpload
                                                label="ITR Acknowledgement"
                                                description="Last 1-2 years ITR acknowledgement."
                                                onFileSelect={(f) => handleFileSelect('itrAck', f)}
                                                onRemove={() => handleRemoveFile('itrAck')}
                                                initialFile={files.itrAck}
                                            />
                                        </div>

                                    </CardContent>
                                </Card>

                                <div className="flex justify-end gap-4">
                                    <Button variant="outline" disabled={isSubmitting}>
                                        Save Draft
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !files.bankStatement}
                                        className="min-w-[150px]"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                Proceed to Analysis
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Right Column: Assistant / Info */}
                            <div className="space-y-6">
                                <Card className="bg-slate-900 text-slate-50 border-none shadow-lg">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                            AI Agent Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-emerald-400 text-sm">Why Bank Statements?</h4>
                                            <p className="text-sm text-slate-300">
                                                Our agent analyzes cash flow patterns to predict repayment capability with 95% accuracy before hitting the bureau.
                                            </p>
                                        </div>
                                        <Separator className="bg-slate-700" />
                                        <div className="space-y-2">
                                            <h4 className="font-medium text-emerald-400 text-sm">Data Protection</h4>
                                            <p className="text-sm text-slate-300">
                                                Your data is encrypted and only shared with NBFCs when confidence is high. This protects your CIBIL score from unnecessary hits.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upload Progress</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm font-medium">
                                                <span>{completedCount}/5 Documents</span>
                                                <span>{progressPercentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                                                    style={{ width: `${progressPercentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DocumentUpload;
