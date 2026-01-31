import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, Building2, TrendingUp, ArrowRight, Info } from 'lucide-react';
import type { DecisionPreviewResponse } from '@/lib/decision-preview-api';

interface DecisionPreviewPanelProps {
    data: DecisionPreviewResponse | null;
    isLoading: boolean;
    onProceed: () => void;
    ctaButtonText?: string;
}

export function DecisionPreviewPanel({
    data,
    isLoading,
    onProceed,
    ctaButtonText = 'Send to Underwriting',
}: DecisionPreviewPanelProps) {
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Unable to load decision preview. Please try again.</p>
                </CardContent>
            </Card>
        );
    }

    const getRiskBandColor = (band: string) => {
        switch (band) {
            case 'Low':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200';
            case 'Medium':
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200';
            case 'High':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
        }
    };

    const getLikelihoodColor = (likelihood: number) => {
        if (likelihood >= 70) return 'text-green-600 dark:text-green-400';
        if (likelihood >= 40) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getProgressColor = (likelihood: number) => {
        if (likelihood >= 70) return '[&>div]:bg-green-500';
        if (likelihood >= 40) return '[&>div]:bg-yellow-500';
        return '[&>div]:bg-red-500';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Decision Preview</h2>
                <p className="text-muted-foreground">
                    Review your application assessment before proceeding
                </p>
            </div>

            {/* Approval Likelihood */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Approval Likelihood
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-muted/20"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="42"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${data.approvalLikelihood * 2.64} 264`}
                                    className={getLikelihoodColor(data.approvalLikelihood)}
                                />
                            </svg>
                            <span className={`absolute text-2xl font-bold ${getLikelihoodColor(data.approvalLikelihood)}`}>
                                {data.approvalLikelihood}%
                            </span>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Progress
                                value={data.approvalLikelihood}
                                className={`h-3 ${getProgressColor(data.approvalLikelihood)}`}
                            />
                            <p className="text-sm text-muted-foreground">
                                Based on the information provided
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Risk Band & NBFC Scheme */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge
                            variant="outline"
                            className={`text-lg px-4 py-2 ${getRiskBandColor(data.riskBand)}`}
                        >
                            {data.riskBand} Risk
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Matched Scheme
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="font-medium text-lg">{data.matchedNBFCScheme}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Strengths & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-green-200 dark:border-green-800/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            Strengths
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {data.strengths.map((strength, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                    <span className="text-sm">{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="h-5 w-5" />
                            Risks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {data.risks.map((risk, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <span className="text-sm">{risk}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>

            {/* Disclaimer */}
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                            <strong>Disclaimer:</strong> This preview is for informational purposes only and does not
                            constitute a final lending decision. The actual approval is subject to underwriting review
                            and verification of all submitted information.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* CTA Button */}
            <div className="flex justify-center pt-4">
                <Button size="lg" onClick={onProceed} className="gap-2">
                    {ctaButtonText}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
