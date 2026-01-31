import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { elegantAPI, type Booking } from "@/lib/elegant-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    ChevronRight, AlertCircle, FileText, CheckCircle2, AlertTriangle,
    Building2, Calendar, MapPin, Briefcase, TrendingUp, Shield,
    Lightbulb, Target, Download, ArrowLeft, Clock, User, Mail,
    FileCheck, FileWarning, Banknote, Receipt, BadgeCheck, XCircle,
    ExternalLink, Star, Loader2, Globe, Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for business verification
interface VerificationResult {
    businessName: string;
    address: string;
    googleLocation: {
        found: boolean;
        url?: string;
        title?: string;
        snippet?: string;
        results?: Array<{ url: string; title: string; snippet?: string }>;
    } | null;
    googleBusiness: {
        found: boolean;
        rating?: number | null;
        reviewCount?: number | null;
        url?: string;
        snippet?: string;
    } | null;
    foodPlatforms: {
        swiggy: {
            found: boolean;
            url?: string;
            title?: string;
            rating?: number | null;
            snippet?: string;
        } | null;
        zomato: {
            found: boolean;
            url?: string;
            title?: string;
            rating?: number | null;
            snippet?: string;
        } | null;
    } | null;
    overallScore: number;
    verificationStatus: 'verified' | 'partial' | 'unverified' | 'unknown';
}

// Business Verification Card Component
const BusinessVerificationCard = ({
    businessName,
    address,
    businessType
}: {
    businessName: string;
    address: string;
    businessType: string;
}) => {
    const [verification, setVerification] = useState<VerificationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract city from address
    const extractCity = (addr: string): string => {
        const parts = addr.split(',').map(p => p.trim());
        // Try to find a common city pattern
        for (const part of parts) {
            if (part.length > 3 && !part.match(/^\d/) && !part.match(/road|street|lane|complex|g\.i\.d\.c/i)) {
                return part;
            }
        }
        return parts[parts.length - 2] || parts[0] || '';
    };

    const verifyBusiness = async () => {
        if (!businessName || !address) {
            setError("Business name or address not available");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/verify/business', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessName,
                    address,
                    city: extractCity(address),
                    businessType
                })
            });

            if (!response.ok) {
                throw new Error('Verification failed');
            }

            const data = await response.json();
            if (data.success) {
                setVerification(data.data);
            } else {
                setError(data.error || 'Verification failed');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Failed to verify business');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'bg-green-100 text-green-700 border-green-300';
            case 'partial': return 'bg-amber-100 text-amber-700 border-amber-300';
            case 'unverified': return 'bg-red-100 text-red-700 border-red-300';
            default: return 'bg-slate-100 text-slate-700 border-slate-300';
        }
    };

    const getRatingStars = (rating: number | null | undefined) => {
        if (!rating) return null;
        const fullStars = Math.floor(rating);
        const hasHalf = rating % 1 >= 0.5;
        return (
            <div className="flex items-center gap-1">
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                {hasHalf && <Star className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />}
                <span className="text-sm font-medium ml-1">{rating.toFixed(1)}</span>
            </div>
        );
    };

    // Generate Google Maps embed URL
    const mapEmbedUrl = address
        ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`
        : null;

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Globe className="h-5 w-5 text-indigo-600" />
                            Business Verification
                        </CardTitle>
                        <CardDescription>Verify business location and online presence</CardDescription>
                    </div>
                    {verification && (
                        <Badge className={getStatusColor(verification.verificationStatus)}>
                            {verification.verificationStatus === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {verification.verificationStatus === 'partial' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {verification.verificationStatus === 'unverified' && <XCircle className="h-3 w-3 mr-1" />}
                            {verification.verificationStatus.charAt(0).toUpperCase() + verification.verificationStatus.slice(1)}
                            {verification.overallScore > 0 && ` (${verification.overallScore}%)`}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Map Section */}
                {address && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Location Map
                            </h4>
                            <a
                                href={`https://www.google.com/maps/search/${encodeURIComponent(address)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                Open in Google Maps <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                            <iframe
                                src={mapEmbedUrl || ''}
                                width="100%"
                                height="250"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Business Location Map"
                            />
                        </div>
                        <p className="text-xs text-slate-500">{address}</p>
                    </div>
                )}

                {/* Verify Button */}
                {!verification && !loading && (
                    <Button
                        onClick={verifyBusiness}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                        disabled={!businessName || !address}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Verify Business Online Presence
                    </Button>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        <span className="ml-3 text-slate-600">Verifying business...</span>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 rounded-lg text-red-600 text-sm">
                        {error}
                    </div>
                )}

                {/* Verification Results */}
                {verification && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Google Location */}
                        <div className={`p-4 rounded-xl border-2 ${verification.googleLocation?.found ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <MapPin className={`h-5 w-5 ${verification.googleLocation?.found ? 'text-green-600' : 'text-red-600'}`} />
                                <span className="font-medium text-sm">Google Maps</span>
                            </div>
                            {verification.googleLocation?.found ? (
                                <div className="space-y-2">
                                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                        <CheckCircle2 className="h-3 w-3 mr-1" /> Found
                                    </Badge>
                                    {verification.googleLocation.url && (
                                        <a
                                            href={verification.googleLocation.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline block truncate"
                                        >
                                            View on Maps →
                                        </a>
                                    )}
                                </div>
                            ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                                    <XCircle className="h-3 w-3 mr-1" /> Not Found
                                </Badge>
                            )}
                        </div>

                        {/* Google Business */}
                        <div className={`p-4 rounded-xl border-2 ${verification.googleBusiness?.found ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className={`h-5 w-5 ${verification.googleBusiness?.found ? 'text-green-600' : 'text-slate-400'}`} />
                                <span className="font-medium text-sm">Reviews</span>
                            </div>
                            {verification.googleBusiness?.found ? (
                                <div className="space-y-2">
                                    {getRatingStars(verification.googleBusiness.rating)}
                                    {verification.googleBusiness.reviewCount && (
                                        <p className="text-xs text-slate-500">{verification.googleBusiness.reviewCount} reviews</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">No reviews found</p>
                            )}
                        </div>

                        {/* Food Platforms - Swiggy */}
                        {verification.foodPlatforms && (
                            <>
                                <div className={`p-4 rounded-xl border-2 ${verification.foodPlatforms.swiggy?.found ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">🍴</span>
                                        <span className="font-medium text-sm">Swiggy</span>
                                    </div>
                                    {verification.foodPlatforms.swiggy?.found ? (
                                        <div className="space-y-2">
                                            {getRatingStars(verification.foodPlatforms.swiggy.rating)}
                                            {verification.foodPlatforms.swiggy.url && (
                                                <a
                                                    href={verification.foodPlatforms.swiggy.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-orange-600 hover:underline block"
                                                >
                                                    View on Swiggy →
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">Not listed</p>
                                    )}
                                </div>

                                {/* Zomato */}
                                <div className={`p-4 rounded-xl border-2 ${verification.foodPlatforms.zomato?.found ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xl">🍽️</span>
                                        <span className="font-medium text-sm">Zomato</span>
                                    </div>
                                    {verification.foodPlatforms.zomato?.found ? (
                                        <div className="space-y-2">
                                            {getRatingStars(verification.foodPlatforms.zomato.rating)}
                                            {verification.foodPlatforms.zomato.url && (
                                                <a
                                                    href={verification.foodPlatforms.zomato.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-red-600 hover:underline block"
                                                >
                                                    View on Zomato →
                                                </a>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">Not listed</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Re-verify Button */}
                {verification && (
                    <Button
                        variant="outline"
                        onClick={verifyBusiness}
                        className="w-full"
                        disabled={loading}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Re-verify
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};


/**
 * AdminApplicationDetails Component
 * 
 * Displays the full details and AI analysis of a specific application for admins
 * as a visual credit memo dashboard.
 */
const AdminApplicationDetails = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [application, setApplication] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!slug || !user?.id) return;

            setLoading(true);
            try {
                const details = await elegantAPI.getBookingBySlug(slug, user.id);
                setApplication(details);
            } catch (err) {
                console.error("Failed to fetch application details:", err);
                setError("Failed to load application details. Please try again.");
                toast.error("Error loading details");
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [slug, user?.id]);

    // Parse the analysis result into structured data
    const parsedAnalysis = useMemo(() => {
        const analysisResult = application?.booking_info?.analysis_result || "";

        if (!analysisResult) {
            return null;
        }

        // Helper to extract a numbered section
        const extractSection = (text: string, sectionNum: number, sectionName: string): string => {
            const regex = new RegExp(`${sectionNum}\\.\\s*${sectionName}[\\s\\S]*?(?=\\d+\\.|$)`, 'i');
            const match = text.match(regex);
            return match ? match[0] : "";
        };

        // Helper to extract bullet points from a section
        const extractBullets = (sectionText: string): string[] => {
            const lines = sectionText.split('\n')
                .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().startsWith('○'))
                .map(line => line.replace(/^[\s\-\*○]+/, '').trim())
                .filter(line => line.length > 5);
            return lines;
        };

        // Helper to extract key-value pairs like "Business Type: XYZ"
        const extractKeyValue = (text: string, key: string): string => {
            const regex = new RegExp(`\\*\\*${key}[:\\*]*\\**\\s*(.+?)(?=\\n|\\*\\*|$)`, 'i');
            const match = text.match(regex);
            return match ? match[1].trim() : "";
        };

        // Extract uploaded files
        const filesSection = extractSection(analysisResult, 1, "Uploaded Files Summary");
        const files = extractBullets(filesSection).map(file => {
            const hasContent = !file.toLowerCase().includes("content not extracted");
            const parts = file.split(':');
            return {
                name: parts[0]?.trim() || file,
                description: parts[1]?.trim() || "",
                hasContent
            };
        });

        // Extract key facts
        const factsSection = extractSection(analysisResult, 2, "Key Extracted Facts");
        const keyFacts = {
            businessType: extractKeyValue(factsSection, "Business Type"),
            vintage: extractKeyValue(factsSection, "Vintage/Years in Business"),
            classification: extractKeyValue(factsSection, "Classification"),
            address: extractKeyValue(factsSection, "Registered Address & Operational Location"),
            turnover: extractKeyValue(factsSection, "Turnover"),
            loanRequested: extractKeyValue(factsSection, "Loan Requested"),
        };

        // Extract Strengths & Risks
        const strengthsSection = analysisResult.match(/Strengths:[\s\S]*?(?=Risks:|$)/i)?.[0] || "";
        const risksSection = analysisResult.match(/Risks:[\s\S]*?(?=\d+\.|$)/i)?.[0] || "";
        const strengths = extractBullets(strengthsSection);
        const risks = extractBullets(risksSection);

        // Extract NBFC Matches
        const nbfcSection = extractSection(analysisResult, 5, "Recommended NBFC Matches");
        const nbfcMatches = extractBullets(nbfcSection);

        // Extract Improvement Plan
        const improvementSection = extractSection(analysisResult, 6, "Improvement Plan");
        const improvements = extractBullets(improvementSection);

        // Extract Important Reminders
        const remindersSection = extractSection(analysisResult, 7, "Important Reminders");
        const reminders = extractBullets(remindersSection);

        // Calculate credit score based on analysis
        let creditScore = 50;
        const lowerAnalysis = analysisResult.toLowerCase();

        // Score based on keywords
        const positiveWords = (lowerAnalysis.match(/good|strong|stable|consistent|positive|verified|valid|registered|favorable/g) || []).length;
        const negativeWords = (lowerAnalysis.match(/weak|poor|unstable|missing|invalid|concern|risk|unknown|incomplete|short/g) || []).length;

        if (lowerAnalysis.includes("high risk") || lowerAnalysis.includes("reject")) {
            creditScore = 35;
        } else if (lowerAnalysis.includes("low risk") || lowerAnalysis.includes("approve") || lowerAnalysis.includes("favorable")) {
            creditScore = 85;
        } else if (lowerAnalysis.includes("medium risk") || lowerAnalysis.includes("moderate")) {
            creditScore = 60;
        } else if (positiveWords > negativeWords * 1.5) {
            creditScore = 72;
        } else if (negativeWords > positiveWords * 1.5) {
            creditScore = 45;
        } else {
            creditScore = 58;
        }

        // Determine risk level
        let riskLevel = "Medium";
        let riskColor = "text-amber-600 bg-amber-50";
        if (creditScore >= 70) {
            riskLevel = "Low Risk";
            riskColor = "text-green-600 bg-green-50";
        } else if (creditScore < 50) {
            riskLevel = "High Risk";
            riskColor = "text-red-600 bg-red-50";
        }

        return {
            files,
            keyFacts,
            strengths,
            risks,
            nbfcMatches,
            improvements,
            reminders,
            creditScore,
            riskLevel,
            riskColor,
            rawAnalysis: analysisResult
        };
    }, [application]);

    if (loading) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-7xl">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Skeleton className="h-48 lg:col-span-1" />
                    <Skeleton className="h-48 lg:col-span-3" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                    <Skeleton className="h-64" />
                </div>
            </div>
        );
    }

    if (error || !application) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-5xl flex flex-col items-center justify-center min-h-[50vh]">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Error Loading Application</h2>
                <p className="text-muted-foreground mb-6">{error || "Application not found"}</p>
                <Button onClick={() => navigate('/admin')}>Return to Admin Dashboard</Button>
            </div>
        );
    }

    const customerName = application._customers?.Full_name || "Unknown Applicant";
    const status = application.status || "pending";

    const getStatusBadge = () => {
        switch (status.toLowerCase()) {
            case 'approved':
                return <Badge className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 text-sm">Approved</Badge>;
            case 'rejected':
                return <Badge className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-sm">Rejected</Badge>;
            case 'processing':
                return <Badge className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm">Processing</Badge>;
            default:
                return <Badge className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 text-sm">Pending</Badge>;
        }
    };

    const getCreditScoreColor = (score: number) => {
        if (score >= 70) return "from-green-500 to-emerald-500";
        if (score >= 50) return "from-amber-500 to-orange-500";
        return "from-red-500 to-rose-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/admin')}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <p className="text-sm text-muted-foreground">Application</p>
                                <h1 className="text-xl font-bold">{customerName}</h1>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {getStatusBadge()}
                            <Button variant="outline" className="gap-2">
                                <Download className="h-4 w-4" />
                                Export Report
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
                {/* Top Section: Credit Score + Quick Info */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Credit Score Card */}
                    <Card className="lg:col-span-1 border-0 shadow-lg overflow-hidden">
                        <div className={`h-2 bg-gradient-to-r ${parsedAnalysis ? getCreditScoreColor(parsedAnalysis.creditScore) : 'from-slate-300 to-slate-400'}`} />
                        <CardContent className="p-6 text-center">
                            <p className="text-sm font-medium text-muted-foreground mb-3">Credit Score</p>
                            <div className="relative inline-flex items-center justify-center w-32 h-32">
                                <svg className="w-32 h-32 transform -rotate-90">
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        fill="none"
                                        className="text-slate-200"
                                    />
                                    <circle
                                        cx="64"
                                        cy="64"
                                        r="56"
                                        stroke="url(#scoreGradient)"
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={`${(parsedAnalysis?.creditScore || 0) * 3.52} 352`}
                                        strokeLinecap="round"
                                    />
                                    <defs>
                                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor={parsedAnalysis && parsedAnalysis.creditScore >= 70 ? "#22c55e" : parsedAnalysis && parsedAnalysis.creditScore >= 50 ? "#f59e0b" : "#ef4444"} />
                                            <stop offset="100%" stopColor={parsedAnalysis && parsedAnalysis.creditScore >= 70 ? "#10b981" : parsedAnalysis && parsedAnalysis.creditScore >= 50 ? "#f97316" : "#f43f5e"} />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <span className="absolute text-4xl font-bold">{parsedAnalysis?.creditScore || "--"}</span>
                            </div>
                            {parsedAnalysis && (
                                <Badge className={`mt-4 ${parsedAnalysis.riskColor}`}>
                                    {parsedAnalysis.riskLevel}
                                </Badge>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Info Cards */}
                    <Card className="lg:col-span-3 border-0 shadow-lg">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-slate-600" />
                                Key Business Facts
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {parsedAnalysis?.keyFacts ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {parsedAnalysis.keyFacts.businessType && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Building2 className="h-4 w-4" />
                                                <span className="text-xs font-medium">Business Type</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.businessType}</p>
                                        </div>
                                    )}
                                    {parsedAnalysis.keyFacts.vintage && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Calendar className="h-4 w-4" />
                                                <span className="text-xs font-medium">Business Vintage</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.vintage}</p>
                                        </div>
                                    )}
                                    {parsedAnalysis.keyFacts.classification && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <BadgeCheck className="h-4 w-4" />
                                                <span className="text-xs font-medium">Classification</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.classification}</p>
                                        </div>
                                    )}
                                    {parsedAnalysis.keyFacts.turnover && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Banknote className="h-4 w-4" />
                                                <span className="text-xs font-medium">Turnover</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.turnover}</p>
                                        </div>
                                    )}
                                    {parsedAnalysis.keyFacts.loanRequested && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Receipt className="h-4 w-4" />
                                                <span className="text-xs font-medium">Loan Request</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.loanRequested}</p>
                                        </div>
                                    )}
                                    {parsedAnalysis.keyFacts.address && (
                                        <div className="p-4 bg-slate-50 rounded-xl">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <MapPin className="h-4 w-4" />
                                                <span className="text-xs font-medium">Location</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">{parsedAnalysis.keyFacts.address}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">No business facts available</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Documents Section */}
                {parsedAnalysis?.files && parsedAnalysis.files.length > 0 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-600" />
                                Uploaded Documents
                            </CardTitle>
                            <CardDescription>Documents submitted with this application</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {parsedAnalysis.files.map((file, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all ${file.hasContent
                                            ? 'border-green-200 bg-green-50/50 hover:border-green-300'
                                            : 'border-amber-200 bg-amber-50/50 hover:border-amber-300'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${file.hasContent ? 'bg-green-100' : 'bg-amber-100'}`}>
                                            {file.hasContent ? (
                                                <FileCheck className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <FileWarning className="h-5 w-5 text-amber-600" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm text-slate-900 truncate">{file.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{file.description}</p>
                                            <Badge
                                                variant="outline"
                                                className={`mt-2 text-xs ${file.hasContent ? 'border-green-300 text-green-700' : 'border-amber-300 text-amber-700'}`}
                                            >
                                                {file.hasContent ? 'Content Extracted' : 'Pending Review'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Strengths & Risks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="h-5 w-5" />
                                Key Strengths
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {parsedAnalysis?.strengths && parsedAnalysis.strengths.length > 0 ? (
                                <ul className="space-y-3">
                                    {parsedAnalysis.strengths.map((strength, idx) => (
                                        <li key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                            <div className="p-1 bg-green-100 rounded-full mt-0.5">
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                            </div>
                                            <span className="text-sm text-slate-700">{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No strengths identified</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Risks */}
                    <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                                <AlertTriangle className="h-5 w-5" />
                                Key Risks
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {parsedAnalysis?.risks && parsedAnalysis.risks.length > 0 ? (
                                <ul className="space-y-3">
                                    {parsedAnalysis.risks.map((risk, idx) => (
                                        <li key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                                            <div className="p-1 bg-red-100 rounded-full mt-0.5">
                                                <AlertTriangle className="h-3 w-3 text-red-600" />
                                            </div>
                                            <span className="text-sm text-slate-700">{risk}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-center py-4">No significant risks identified</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* NBFC Recommendations & Improvement Plan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NBFC Recommendations */}
                    {parsedAnalysis?.nbfcMatches && parsedAnalysis.nbfcMatches.length > 0 && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Recommended NBFCs
                                </CardTitle>
                                <CardDescription>Potential lenders matching this profile</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {parsedAnalysis.nbfcMatches.map((nbfc, idx) => (
                                        <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                            <div className="p-1.5 bg-blue-100 rounded-full mt-0.5">
                                                <Target className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <span className="text-sm text-slate-700">{nbfc}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {/* Improvement Plan */}
                    {parsedAnalysis?.improvements && parsedAnalysis.improvements.length > 0 && (
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lightbulb className="h-5 w-5 text-amber-600" />
                                    Improvement Plan
                                </CardTitle>
                                <CardDescription>Actions to strengthen the application</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {parsedAnalysis.improvements.map((improvement, idx) => (
                                        <li key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                                            <div className="flex items-center justify-center w-6 h-6 bg-amber-100 rounded-full text-xs font-bold text-amber-700 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <span className="text-sm text-slate-700">{improvement}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Business Verification Section */}
                <BusinessVerificationCard
                    businessName={parsedAnalysis?.keyFacts?.businessType?.split('(')[0]?.trim() || customerName}
                    address={parsedAnalysis?.keyFacts?.address || ""}
                    businessType={parsedAnalysis?.keyFacts?.classification || ""}
                />

                {/* Application Details Sidebar (at bottom on mobile) */}
                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5 text-slate-600" />
                            Application Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <User className="h-4 w-4" />
                                    <span className="text-xs font-medium">Applicant</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{customerName}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-xs font-medium">Email</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 truncate">{application._customers?.email || "N/A"}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs font-medium">Application ID</span>
                                </div>
                                <p className="text-xs font-mono text-slate-900 truncate">{application.booking_slug}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-medium">Submitted</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">{new Date(application.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                                <div className="flex items-center gap-2 text-slate-500 mb-2">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-xs font-medium">Quick Actions</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Approve
                                    </Button>
                                    <Button size="sm" variant="destructive" className="text-xs">
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Raw Analysis Tab (for reference) */}
                {parsedAnalysis?.rawAnalysis && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-lg">Raw AI Analysis</CardTitle>
                            <CardDescription>Full analysis report for reference</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="formatted">
                                <TabsList>
                                    <TabsTrigger value="formatted">Formatted</TabsTrigger>
                                    <TabsTrigger value="raw">Raw Text</TabsTrigger>
                                </TabsList>
                                <TabsContent value="formatted" className="mt-4">
                                    <div className="prose prose-slate max-w-none prose-sm">
                                        <div dangerouslySetInnerHTML={{
                                            __html: parsedAnalysis.rawAnalysis
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br />')
                                        }} />
                                    </div>
                                </TabsContent>
                                <TabsContent value="raw" className="mt-4">
                                    <pre className="p-4 bg-slate-100 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap">
                                        {parsedAnalysis.rawAnalysis}
                                    </pre>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AdminApplicationDetails;
