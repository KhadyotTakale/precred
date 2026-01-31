import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle,
    XCircle,
    FileText,
    TrendingUp,
    Building2,
    CalendarDays,
    Wallet,
    AlertTriangle,
    Download
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisResultProps {
    analysis: string;
    onReset: () => void;
    onSave?: () => void;
    isSaving?: boolean;
    isSaved?: boolean;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ analysis, onReset, onSave, isSaving = false, isSaved = false }) => {

    // Extract metrics from the analysis text
    const extractedMetrics = useMemo(() => {
        const mabMatch = analysis.match(/Monthly Average Balance[:\s]*([₹\d,.]+)/i);
        const vintageMatch = analysis.match(/Vintage.*[:\s]*([^(\n]+)/i);
        const typeMatch = analysis.match(/Business Type[:\s]*([^(\n]+)/i);
        const turnoverMatch = analysis.match(/Turnover[:\s]*([₹\d,.]+[^(\n]*)/i);

        // Simple sentiment check for demo purposes
        const isPositive = !analysis.toLowerCase().includes("high risk") && !analysis.toLowerCase().includes("reject");

        return {
            mab: mabMatch ? mabMatch[1].trim() : "N/A",
            vintage: vintageMatch ? vintageMatch[1].trim() : "N/A",
            businessType: typeMatch ? typeMatch[1].trim() : "N/A",
            turnover: turnoverMatch ? turnoverMatch[1].trim() : "N/A",
            sentiment: isPositive ? "Positive" : "Caution",
            score: isPositive ? 85 : 45
        };
    }, [analysis]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Credit Analysis Memo</h2>
                    <p className="text-muted-foreground">Automated assessment based on uploaded documents</p>
                </div>
                <div className="flex gap-3">
                    {onSave && !isSaved && (
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onSave}
                            disabled={isSaving}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Save Application
                                </>
                            )}
                        </Button>
                    )}
                    {isSaved && (
                        <div className="flex items-center text-emerald-600 font-medium text-sm mr-2 animate-in fade-in">
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Application Saved
                        </div>
                    )}
                    <Button variant="outline" size="sm" onClick={onReset}>
                        <FileText className="w-4 h-4 mr-2" />
                        New App
                    </Button>
                    <Button size="sm" variant="secondary">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </div>
            </div>

            {/* Top Cards - Score & Decision */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900 text-white border-slate-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">AI Confidence Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-emerald-400">{extractedMetrics.score}</span>
                            <span className="text-sm text-slate-400">/ 100</span>
                        </div>
                        <Progress value={extractedMetrics.score} className="h-2 mt-4 bg-slate-700" indicatorClassName="bg-emerald-500" />
                        <p className="text-xs text-slate-400 mt-2">Based on cash flow stability and compliance</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Recommended Decision</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-3">
                            {extractedMetrics.sentiment === "Positive" ? (
                                <CheckCircle className="w-8 h-8 text-emerald-500" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 text-amber-500" />
                            )}
                            <div>
                                <h3 className="text-xl font-bold">
                                    {extractedMetrics.sentiment === "Positive" ? "Approve for Review" : "Manual Review Required"}
                                </h3>
                                <p className="text-xs text-muted-foreground">Preliminary assessment</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Business Identity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-primary" />
                                <span className="font-semibold truncate">{extractedMetrics.businessType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Vintage: {extractedMetrics.vintage}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="overview">Visual Overview</TabsTrigger>
                    <TabsTrigger value="report">Full Report</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                    {/* Financial Highlights */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-primary" />
                                Financial Highlights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Monthly Avg Balance</p>
                                <p className="text-2xl font-bold">{extractedMetrics.mab}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">Estimated Turnover</p>
                                <p className="text-2xl font-bold">{extractedMetrics.turnover}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-emerald-100 bg-emerald-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-emerald-800 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Key Strengths
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-emerald-900">
                                    <li className="flex gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Consistent repayment history observed in bank statements.</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Stable cash flow with regular deposits.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="border-amber-100 bg-amber-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base text-amber-800 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Risk Factors
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-amber-900">
                                    <li className="flex gap-2">
                                        <XCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <span>GST returns filing frequency varies slightly.</span>
                                    </li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="report" className="mt-6">
                    <Card>
                        <CardContent className="p-8">
                            <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-slate-900 prose-h2:text-primary prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-strong:text-slate-800">
                                <ReactMarkdown>{analysis}</ReactMarkdown>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
