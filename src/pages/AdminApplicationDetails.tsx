import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";
import { adminAPI, type Order } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, AlertCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';

/**
 * AdminApplicationDetails Component
 * 
 * Displays the full details and AI analysis of a specific application for admins.
 * This restores the functionality that was previously part of the general ApplicationDetails page.
 */
const AdminApplicationDetails = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useUser();
    const [application, setApplication] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!slug || !user?.id) return;

            setLoading(true);
            try {
                const details = await adminAPI.getApplicationDetails(slug, user.id);
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

    if (loading) {
        return (
            <div className="container mx-auto py-10 px-4 max-w-5xl">
                <Button variant="outline" className="mb-6" onClick={() => navigate('/admin')}>
                    <ChevronRight className="h-4 w-4 rotate-180 mr-2" />
                    Back to Admin
                </Button>
                <div className="space-y-4">
                    <Skeleton className="h-12 w-3/4" />
                    <Skeleton className="h-64 w-full" />
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

    const analysisResult = application.booking_info?.analysis_result || "";
    const customerName = application._customers?.Full_name || "Unknown Applicant";
    const status = application.status || "Pending";

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Button
                            variant="link"
                            className="p-0 h-auto text-muted-foreground hover:text-foreground"
                            onClick={() => navigate('/admin')}
                        >
                            Admin
                        </Button>
                        <ChevronRight className="h-4 w-4" />
                        <span>Applications</span>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-foreground font-medium">{customerName}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{customerName}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={status === 'approved' ? 'default' : 'secondary'} className="text-base px-4 py-1 capitalize">
                        {status}
                    </Badge>
                </div>
            </div>

            {/* Analysis Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {analysisResult ? (
                        <Card className="shadow-sm">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    AI Analysis Report
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                                <div className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-foreground prose-h2:text-primary prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8 prose-strong:text-foreground">
                                    <ReactMarkdown>{analysisResult}</ReactMarkdown>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                                <p>No analysis data available for this application.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Application Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Applicant Name</p>
                                <p className="text-base">{customerName}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Email</p>
                                <p className="text-base">{application._customers?.email || "N/A"}</p>
                            </div>
                            {/* Mobile number not available in CustomerData type currently */}
                            {/* 
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                                <p className="text-base">{application._customers?.mobile_number || "N/A"}</p>
                            </div>
                            */}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Application ID</p>
                                <p className="text-xs font-mono bg-muted p-1 rounded mt-1">{application.booking_slug}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                                <p className="text-base">{new Date(application.created_at).toLocaleDateString()}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AdminApplicationDetails;
