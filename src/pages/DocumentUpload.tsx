import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { elegantAPI } from '@/lib/elegant-api';
import { FileUpload } from '@/components/upload/FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnalysisResult } from '@/components/analysis/AnalysisResult';


const DocumentUpload = () => {
    const { user } = useUser();
    const [step, setStep] = useState(1);
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        bankStatement: null,
        loanApplication: null,
        udyamCert: null,
        gstCert: null,
        itrAck: null,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [digitalFootprint, setDigitalFootprint] = useState<{
        entityInfo: { companyName: string; location: string } | null;
        searchResults: any[];
    } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleFileSelect = (key: string, file: File) => {
        setIsSaved(false); // Reset saved status on new file
        setFiles((prev) => ({ ...prev, [key]: file }));
    };

    const handleRemoveFile = (key: string) => {
        setFiles((prev) => ({ ...prev, [key]: null }));
    };

    const nextStep = () => {
        if (step === 1 && !files.bankStatement) {
            toast.error("Bank Statement is mandatory.");
            return;
        }
        setStep((prev) => Math.min(prev + 1, 5));
        window.scrollTo(0, 0);
    };

    const prevStep = () => {
        setStep((prev) => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
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
                if (data.entityInfo || data.searchResults) {
                    setDigitalFootprint({
                        entityInfo: data.entityInfo,
                        searchResults: data.searchResults || []
                    });
                }
                toast.success("Analysis complete! Please review and save the application.");
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

    const handleSaveApplication = async () => {
        if (!user?.id || !analysis) return;

        setIsSaving(true);
        try {
            await elegantAPI.createBooking({
                booking_type: 'Application',
                status: 'pending',
                items_id: 0,
                booking_info: {
                    analysis_result: analysis,
                    uploaded_files_summary: Object.keys(files).filter(k => files[k]).map(k => `${k}: ${files[k]?.name}`)
                }
            }, user.id);
            toast.success("Application saved successfully!");
            setIsSaved(true);
        } catch (saveError) {
            console.error("Failed to save application:", saveError);
            toast.error("Failed to save application record.");
        } finally {
            setIsSaving(false);
        }
    };


    const completedCount = Object.values(files).filter(Boolean).length;
    // 5 total documents tracked
    const progressPercentage = (completedCount / 5) * 100;

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FileUpload
                            key="bankStatement"
                            label="Bank Statements (6-12 Months)"
                            description="Most Important! Upload consolidated PDF or zip if multiple files."
                            required
                            accept=".pdf,.zip,.csv"
                            onFileSelect={(f) => handleFileSelect('bankStatement', f)}
                            onRemove={() => handleRemoveFile('bankStatement')}
                            initialFile={files.bankStatement}
                        />
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FileUpload
                            key="loanApplication"
                            label="MSME Loan Application Form"
                            description="Filled and signed application form."
                            onFileSelect={(f) => handleFileSelect('loanApplication', f)}
                            onRemove={() => handleRemoveFile('loanApplication')}
                            initialFile={files.loanApplication}
                        />
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <FileUpload
                            key="udyamCert"
                            label="Udyam Certificate"
                            onFileSelect={(f) => handleFileSelect('udyamCert', f)}
                            onRemove={() => handleRemoveFile('udyamCert')}
                            initialFile={files.udyamCert}
                        />
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 gap-6">
                            <FileUpload
                                key="gstCert"
                                label="GST Certificate / Returns"
                                onFileSelect={(f) => handleFileSelect('gstCert', f)}
                                onRemove={() => handleRemoveFile('gstCert')}
                                initialFile={files.gstCert}
                            />
                            <Separator />
                            <FileUpload
                                key="itrAck"
                                label="ITR Acknowledgement"
                                description="Last 1-2 years ITR acknowledgement."
                                onFileSelect={(f) => handleFileSelect('itrAck', f)}
                                onRemove={() => handleRemoveFile('itrAck')}
                                initialFile={files.itrAck}
                            />
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-4">
                            <Card className="border-slate-100 shadow-sm bg-slate-50/50">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                                        <span className="text-sm text-slate-600">Bank Statement</span>
                                        <Badge variant={files.bankStatement ? "default" : "destructive"} className={files.bankStatement ? "bg-emerald-600" : ""}>
                                            {files.bankStatement ? "Uploaded" : "Missing"}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                                        <span className="text-sm text-slate-600">MSME Form</span>
                                        <Badge variant="outline">{files.loanApplication ? "Uploaded" : "Skipped"}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                                        <span className="text-sm text-slate-600">Udyam Cert</span>
                                        <Badge variant="outline">{files.udyamCert ? "Uploaded" : "Skipped"}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                                        <span className="text-sm text-slate-600">GST Returns</span>
                                        <Badge variant="outline">{files.gstCert ? "Uploaded" : "Skipped"}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-0">
                                        <span className="text-sm text-slate-600">ITR Acknowledgement</span>
                                        <Badge variant="outline">{files.itrAck ? "Uploaded" : "Skipped"}</Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-sm text-yellow-800 flex gap-3">
                                <Loader2 className="w-5 h-5 shrink-0" />
                                <p>
                                    Analysis typically takes 30-45 seconds. Please do not close the window once you click "Start Analysis".
                                </p>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Section */}
                {analysis ? (
                    <AnalysisResult
                        analysis={analysis}
                        digitalFootprint={digitalFootprint}
                        onReset={() => {
                            setAnalysis(null);
                            setDigitalFootprint(null);
                            setIsSaved(false);
                        }}
                        onSave={handleSaveApplication}
                        isSaving={isSaving}
                        isSaved={isSaved}
                    />
                ) : (
                    <>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                                    Step {step} of 5
                                </Badge>
                                <span className="text-sm text-muted-foreground">Document Collection</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                                {step === 1 && "Upload Bank Statements"}
                                {step === 2 && "Business Identity"}
                                {step === 3 && "Registration Certificate"}
                                {step === 4 && "Tax Documents"}
                                {step === 5 && "Review & Submit"}
                            </h1>
                            <p className="text-muted-foreground max-w-2xl">
                                {step === 1 && "Please upload the last 6-12 months of bank statements for cash flow analysis."}
                                {step === 2 && "Upload the signed MSME loan application form."}
                                {step === 3 && "Provide the Udyam Registration Certificate."}
                                {step === 4 && "Upload GST Returns and ITR Acknowledgements for compliance verification."}
                                {step === 5 && "Review your uploaded documents before initiating the AI analysis."}
                            </p>
                        </div >

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Upload Form */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-none shadow-md min-h-[300px] flex flex-col justify-center">
                                    <CardHeader>
                                        <CardTitle className="text-xl">
                                            {step === 5 ? "Summary" : "Required Document"}
                                        </CardTitle>
                                        {step !== 5 && (
                                            <CardDescription>
                                                Supported formats: PDF, JPG, PNG (Max 10MB each)
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {renderStepContent()}
                                    </CardContent>
                                </Card>

                                <div className="flex justify-between gap-4">
                                    <Button
                                        variant="outline"
                                        onClick={prevStep}
                                        disabled={step === 1 || isSubmitting}
                                        className="min-w-[100px]"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>

                                    {step < 5 ? (
                                        <Button
                                            onClick={nextStep}
                                            disabled={step === 1 && !files.bankStatement}
                                            className="min-w-[120px]"
                                        >
                                            Next <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    ) : (
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
                                    )}
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
                                            <h4 className="font-medium text-emerald-400 text-sm">
                                                {step === 1 && "Why Bank Statements?"}
                                                {step === 2 && "Identity Verification"}
                                                {step === 3 && "Registration Check"}
                                                {step === 4 && "Compliance Check"}
                                                {step === 5 && "Ready to Analyze"}
                                            </h4>
                                            <p className="text-sm text-slate-300">
                                                {step === 1 && "Our agent analyzes cash flow patterns to predict repayment capability with 95% accuracy before hitting the bureau."}
                                                {step === 2 && "We verify the application details against your KYC documents to ensure business legitimacy."}
                                                {step === 3 && "Udyam certification confirms your MSME status and eligibility for priority sector lending."}
                                                {step === 4 && "GST and ITR data helps us verify turnover and assess tax compliance health."}
                                                {step === 5 && "Your data is encrypted and only shared with NBFCs when confidence is high. This protects your CIBIL score."}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Progress</CardTitle>
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
            </div >
        </div >
    );
};

export default DocumentUpload;
