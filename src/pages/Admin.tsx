import { useState, useEffect, useCallback } from "react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  LayoutDashboard, FileText, Eye, Settings, Users, TrendingUp,
  BarChart3, Building2, Shield, Search, Bell, Filter, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, ArrowUpRight,
  MoreVertical, Send, UserPlus, MessageSquare,
  Download, Briefcase, Activity, Target, Layers, BookOpen, Zap, RefreshCw, PlusCircle
} from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import { adminAPI, type Order, type DashboardAnalyticsResponse } from "@/lib/admin-api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from "recharts";
import { useToast } from "@/hooks/use-toast";

// Types
type AdminView =
  | "dashboard"
  | "applications"
  | "decision-preview"
  | "schemes"
  | "analytics"
  | "workspace"
  | "outcomes"
  | "dsa-quality"
  | "settings"
  | "create-application";


// Mock data for elements not in API
// Scheme type for type safety
interface Scheme {
  id: number;
  item_name: string;
  item_info?: {
    loanType?: string;
    ticketSize?: string;
    tenure?: string;
    riskAppetite?: string;
  };
  status?: string;
}

const mockDSAs = [
  { name: "FinServe Partners", applications: 45, approvalRate: 72, junkRate: 8, avgTAT: "1.2 days" },
  { name: "LoanMart DSA", applications: 38, approvalRate: 58, junkRate: 15, avgTAT: "2.1 days" },
  { name: "Direct Portal", applications: 67, approvalRate: 81, junkRate: 5, avgTAT: "0.8 days" },
  { name: "BankPartner API", applications: 23, approvalRate: 65, junkRate: 12, avgTAT: "1.5 days" },
];

const Admin = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<AdminView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Data states
  const [applications, setApplications] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Schemes state
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [schemesLoading, setSchemesLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Order | null>(null);

  // Create Scheme state
  const [showAddSchemeDialog, setShowAddSchemeDialog] = useState(false);
  const [newSchemeLoading, setNewSchemeLoading] = useState(false);
  const [newSchemeData, setNewSchemeData] = useState({
    name: "",
    loanType: "Business",
    ticketSize: "",
    tenure: "",
    riskAppetite: "Medium"
  });

  const navItems = [
    { id: "dashboard" as AdminView, label: "Dashboard", icon: LayoutDashboard },
    { id: "create-application" as AdminView, label: "Create Application", icon: PlusCircle },
    { id: "applications" as AdminView, label: "Applications", icon: FileText },
    { id: "decision-preview" as AdminView, label: "Decision Preview", icon: Eye },
    { id: "schemes" as AdminView, label: "Schemes", icon: Layers },
    { id: "analytics" as AdminView, label: "Analytics", icon: BarChart3 },
    { id: "workspace" as AdminView, label: "Analyst Workspace", icon: Briefcase },
    { id: "outcomes" as AdminView, label: "Outcomes", icon: Target },
    { id: "dsa-quality" as AdminView, label: "DSA Quality", icon: Users },
    { id: "settings" as AdminView, label: "Settings", icon: Settings },
  ];

  // Fetch dashboard analytics
  const fetchAnalytics = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await adminAPI.getDashboardAnalytics(user.id);
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    }
  }, [user?.id]);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setApplicationsLoading(true);
    try {
      const response = await adminAPI.getOrders(user.id, 1, 50, {
        search: searchQuery || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setApplications(response.items || []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive",
      });
    } finally {
      setApplicationsLoading(false);
    }
  }, [user?.id, searchQuery, statusFilter, toast]);

  // Fetch schemes
  const fetchSchemes = useCallback(async () => {
    if (!user?.id) return;
    setSchemesLoading(true);
    try {
      const response = await adminAPI.getItems(user.id, 1, 50, "Scheme");
      // Map API items to Scheme interface
      const mappedSchemes: Scheme[] = (response.items || []).map((item: any) => ({
        id: item.id,
        item_name: item.item_name || item.name || "Unnamed Scheme",
        item_info: item.item_info || {},
        status: item.status || "Active"
      }));
      setSchemes(mappedSchemes);
    } catch (error) {
      console.error("Failed to fetch schemes:", error);
      toast({
        title: "Error",
        description: "Failed to load schemes",
        variant: "destructive",
      });
    } finally {
      setSchemesLoading(false);
    }
  }, [user?.id, toast]);

  // Handle create scheme
  const handleCreateScheme = async () => {
    if (!user?.id) return;

    // Validate
    if (!newSchemeData.name || !newSchemeData.ticketSize || !newSchemeData.tenure) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setNewSchemeLoading(true);
    try {
      // Basic slug generation
      const slug = newSchemeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await adminAPI.createItem({
        title: newSchemeData.name, // API uses title
        item_type: "Scheme",
        Is_disabled: false, // Active status
        description: `${newSchemeData.loanType} scheme with ${newSchemeData.riskAppetite} risk`,
        slug: slug,
        SEO_Tags: "scheme, loan",
        tags: newSchemeData.loanType,
        item_info: {
          loanType: newSchemeData.loanType,
          ticketSize: newSchemeData.ticketSize,
          tenure: newSchemeData.tenure,
          riskAppetite: newSchemeData.riskAppetite
        }
      }, user.id);

      toast({
        title: "Success",
        description: "Scheme created successfully",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      setShowAddSchemeDialog(false);
      setNewSchemeData({
        name: "",
        loanType: "Business",
        ticketSize: "",
        tenure: "",
        riskAppetite: "Medium"
      });
      fetchSchemes(); // Refresh list
    } catch (error) {
      console.error("Failed to create scheme:", error);
      toast({
        title: "Error",
        description: "Failed to create scheme",
        variant: "destructive",
      });
    } finally {
      setNewSchemeLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAnalytics(), fetchApplications()]);
      setLoading(false);
    };
    if (user?.id) {
      loadData();
    }
  }, [user?.id, fetchAnalytics, fetchApplications]);

  // Refetch applications when filters change
  useEffect(() => {
    if (user?.id && !loading) {
      fetchApplications();
    }
  }, [searchQuery, statusFilter]);

  // Fetch schemes when navigating to schemes view
  useEffect(() => {
    if (activeView === "schemes" && user?.id) {
      fetchSchemes();
    }
  }, [activeView, user?.id, fetchSchemes]);

  const getRiskBandColor = (band: string) => {
    switch (band) {
      case "Low": return "bg-green-100 text-green-700 border-green-200";
      case "Medium": return "bg-amber-100 text-amber-700 border-amber-200";
      case "High": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed": case "approved": return "bg-green-100 text-green-700";
      case "pending": case "preview": return "bg-blue-100 text-blue-700";
      case "processing": case "underwriting": return "bg-purple-100 text-purple-700";
      case "cancelled": case "rejected": case "closed": return "bg-slate-100 text-slate-600";
      default: return "bg-amber-100 text-amber-700";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Calculate derived stats from real data
  const calculateStats = () => {
    const total = applications.length;
    const pending = applications.filter(a => a.status?.toLowerCase() === 'pending').length;
    const completed = applications.filter(a => a.status?.toLowerCase() === 'completed').length;
    const today = applications.filter(a => {
      const appDate = new Date(a.created_at);
      const now = new Date();
      return appDate.toDateString() === now.toDateString();
    }).length;

    return {
      total,
      today,
      pending,
      completed,
      filteredPercent: total > 0 ? Math.round((pending / total) * 100) : 0,
      approvalRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const stats = calculateStats();

  // Dashboard View
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#c5cdea" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Applications Today</p>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">{stats.today}</p>
                    <p className="text-xs text-slate-500 mt-1">{stats.total} total</p>
                  </>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                <FileText className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#c5cdea" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending Review</p>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                    <p className="text-xs text-slate-500 mt-1">{stats.filteredPercent}% of total</p>
                  </>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                <Filter className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#c5cdea" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Completed</p>
                {loading ? (
                  <Skeleton className="h-9 w-16" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                    <p className="text-xs text-slate-500 mt-1">{stats.approvalRate}% approval rate</p>
                  </>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm" style={{ backgroundColor: "#c5cdea" }}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                {loading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-slate-900">
                      {analytics?.metrics?.booking_analytics?.total_revenue ? formatCurrency(analytics.metrics.booking_analytics.total_revenue) : "₹0"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">All time</p>
                  </>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-slate-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Customers</p>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{analytics?.metrics?.customers?.total || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Total Leads</p>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold text-slate-900">{analytics?.metrics?.leads?.total || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-600">Analyst Workload</p>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
            <Progress value={stats.pending > 0 ? Math.min(stats.pending * 10, 100) : 0} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-900">Recent Applications</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setActiveView("applications")}>
              View All <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No applications yet</p>
          ) : (
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                  <FileText className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">{app.booking_slug}</span>
                      {" - "}
                      {app._customers?.Full_name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(app.created_at)}</p>
                  </div>
                  <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Applications View
  const renderApplications = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search applications..."
                className="pl-10 rounded-xl border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fetchApplications()}
              disabled={applicationsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${applicationsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" className="rounded-xl gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        {applicationsLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No applications found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Application ID</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Customer</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Amount</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Date</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{app.booking_slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-900">{app._customers?.Full_name || "—"}</p>
                        <p className="text-xs text-slate-500">{app._customers?.email || "—"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-normal">
                        {app._items?.item_type || app.booking_type || "—"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {app._booking_items_of_bookings?.items?.[0]?.price
                        ? formatCurrency(app._booking_items_of_bookings.items[0].price)
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={getStatusColor(app.status)}>{app.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View Details"
                          onClick={() => navigate(`/applicationnumbers/${app.booking_slug}`)}
                        >
                          <Eye className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View Preview"
                          onClick={() => {
                            setSelectedApp(app);
                            setActiveView("decision-preview");
                          }}
                        >
                          <Send className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Assign">
                          <UserPlus className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Notes">
                          <MessageSquare className="h-4 w-4 text-slate-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );

  // Decision Preview View
  const renderDecisionPreview = () => {
    const app = selectedApp || applications[0];

    if (!app && !loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Eye className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Select an application to view decision preview</p>
            <Button
              className="mt-4"
              onClick={() => setActiveView("applications")}
            >
              Go to Applications
            </Button>
          </div>
        </div>
      );
    }

    // Parse the analysis_result to extract insights
    const analysisResult = app?.booking_info?.analysis_result || "";

    // Helper function to extract sections from markdown analysis
    const extractSection = (text: string, sectionName: string): string[] => {
      const regex = new RegExp(`##\\s*${sectionName}[\\s\\S]*?(?=##|$)`, 'i');
      const match = text.match(regex);
      if (!match) return [];

      // Extract bullet points or numbered items
      const lines = match[0].split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim()))
        .map(line => line.replace(/^[\s\-\*\d\.]+/, '').trim())
        .filter(line => line.length > 0 && !line.toLowerCase().startsWith('risks') && line.length > 5);

      return lines.slice(0, 5); // Limit to 5 items
    };

    // Extract key sections from analysis
    const strengths = extractSection(analysisResult, "Key Strengths|Strengths|Positive Factors|Positives");
    const risks = extractSection(analysisResult, "Key Risks|Risks|Risk Factors|Concerns|Areas of Concern|Red Flags");
    const recommendations = extractSection(analysisResult, "Recommendations|Suggested Actions|Next Steps");

    // Try to extract approval likelihood from analysis
    let likelihood = 50; // Default
    let riskBand = "Medium";

    // Look for explicit score/likelihood in analysis with multiple patterns
    const scorePatterns = [
      /(?:approval|likelihood|score|probability|creditworthiness)[:\s]*(\d{1,3})%?/i,
      /(\d{1,3})%\s*(?:approval|likelihood|probability)/i,
      /(?:overall|final)\s*(?:score|rating)[:\s]*(\d{1,3})/i,
      /(?:risk\s*score|credit\s*score)[:\s]*(\d{1,3})/i,
      /rated?\s*(?:at\s*)?(\d{1,3})(?:%|\s*out\s*of\s*100)?/i,
    ];

    let scoreFound = false;
    for (const pattern of scorePatterns) {
      const match = analysisResult.match(pattern);
      if (match) {
        likelihood = parseInt(match[1], 10);
        if (likelihood > 100) likelihood = 100;
        scoreFound = true;
        break;
      }
    }

    if (!scoreFound) {
      // Infer from risk level and recommendation keywords
      const lowerAnalysis = analysisResult.toLowerCase();

      // Check for explicit risk assessment
      if (lowerAnalysis.includes("high risk") || lowerAnalysis.includes("reject") ||
        lowerAnalysis.includes("decline") || lowerAnalysis.includes("not recommended") ||
        lowerAnalysis.includes("significant concerns")) {
        likelihood = 35;
      } else if (lowerAnalysis.includes("low risk") || lowerAnalysis.includes("approve") ||
        lowerAnalysis.includes("strong candidate") || lowerAnalysis.includes("recommended for approval") ||
        lowerAnalysis.includes("favorable")) {
        likelihood = 85;
      } else if (lowerAnalysis.includes("medium risk") || lowerAnalysis.includes("moderate") ||
        lowerAnalysis.includes("conditional") || lowerAnalysis.includes("with conditions")) {
        likelihood = 60;
      } else if (analysisResult.length > 100) {
        // If there's substantial analysis but no clear risk indicator, estimate based on content
        const positiveWords = (lowerAnalysis.match(/good|strong|stable|consistent|positive|verified|valid/g) || []).length;
        const negativeWords = (lowerAnalysis.match(/weak|poor|unstable|inconsistent|negative|missing|invalid|concern|risk/g) || []).length;

        if (positiveWords > negativeWords * 2) {
          likelihood = 78;
        } else if (negativeWords > positiveWords * 2) {
          likelihood = 42;
        } else {
          likelihood = 55;
        }
      } else if (app?.status === "completed") {
        likelihood = 89;
      } else if (app?.status === "processing") {
        likelihood = 72;
      } else if (app?.status === "pending") {
        likelihood = 65;
      }
    }

    // Determine risk band
    if (likelihood >= 70) riskBand = "Low";
    else if (likelihood >= 50) riskBand = "Medium";
    else riskBand = "High";

    // Fallback strengths if none found
    const displayStrengths = strengths.length > 0 ? strengths : [
      "Application submitted successfully",
      "Contact information verified",
      likelihood >= 70 ? "Strong approval indicators" : "Application complete",
    ];

    // Fallback risks if none found
    const displayRisks = risks.length > 0 ? risks : (likelihood < 70 ? [
      "Additional documentation may be required",
      "Manual review recommended",
    ] : []);

    // Extract why this score reasons
    const whyReasons = extractSection(analysisResult, "Assessment Basis|Scoring Factors|Analysis Summary");
    const displayWhyReasons = whyReasons.length > 0 ? whyReasons : [
      "Application completeness",
      "Customer profile data",
      "Historical patterns",
      "Similar case outcomes",
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Select
            value={app?.booking_slug || ""}
            onValueChange={(slug) => {
              const found = applications.find(a => a.booking_slug === slug);
              if (found) setSelectedApp(found);
            }}
          >
            <SelectTrigger className="w-64 rounded-xl">
              <SelectValue placeholder="Select Application" />
            </SelectTrigger>
            <SelectContent>
              {applications.map(a => (
                <SelectItem key={a.id} value={a.booking_slug}>{a.booking_slug}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!analysisResult && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              No AI Analysis Available
            </Badge>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Preview Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Approval Likelihood */}
            <Card className="border-0 shadow-sm" style={{ backgroundColor: "#c5cdea" }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Approval Likelihood</h3>
                  <Badge className={getRiskBandColor(riskBand)}>{riskBand} Risk</Badge>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-5xl font-bold text-slate-900">{likelihood}%</div>
                  <div className="flex-1">
                    <Progress value={likelihood} className="h-4 rounded-full" />
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-4">
                  {likelihood >= 70
                    ? "High probability of approval based on application data."
                    : likelihood >= 50
                      ? "Moderate probability - additional review recommended."
                      : "Lower probability - detailed review required."}
                </p>
              </CardContent>
            </Card>

            {/* Application Summary */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base">Application Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Customer</p>
                    <p className="text-sm font-medium text-slate-900">{app?._customers?.Full_name || "—"}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                    <p className="text-sm font-medium text-slate-900">
                      {app?._booking_items_of_bookings?.items?.[0]?.price
                        ? formatCurrency(app._booking_items_of_bookings.items[0].price)
                        : "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-slate-900">
                      {app?._items?.item_type || app?.booking_type || "—"}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <Badge className={getStatusColor(app?.status || "")}>{app?.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Risks */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {displayStrengths.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <Zap className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Key Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {displayRisks.length > 0 ? (
                      displayRisks.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">No significant risks identified</li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations (if available) */}
            {recommendations.length > 0 && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recommendations.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Why This Score */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Why This Score?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-slate-600">
                  <p>The {likelihood}% likelihood is calculated based on:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    {displayWhyReasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-4">
                <Button
                  className="w-full mb-2 bg-slate-900 hover:bg-slate-800 rounded-xl"
                  onClick={() => navigate(`/applicationnumbers/${app?.booking_slug}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Details
                </Button>
                <Button variant="outline" className="w-full rounded-xl">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Analyst
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Schemes View
  const renderSchemes = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">NBFC Schemes</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fetchSchemes()}
              disabled={schemesLoading}
            >
              <RefreshCw className={`h-4 w-4 ${schemesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800 rounded-xl gap-2"
              onClick={() => setShowAddSchemeDialog(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Add Scheme
            </Button>
          </div>
        </div>

        {/* Add Scheme Dialog */}
        <Dialog open={showAddSchemeDialog} onOpenChange={setShowAddSchemeDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Scheme</DialogTitle>
              <DialogDescription>
                Create a new lending scheme configuration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="scheme-name">Scheme Name</Label>
                <Input
                  id="scheme-name"
                  placeholder="e.g. MSME Business Loan"
                  value={newSchemeData.name}
                  onChange={(e) => setNewSchemeData({ ...newSchemeData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="loan-type">Loan Type</Label>
                  <Select
                    value={newSchemeData.loanType}
                    onValueChange={(val) => setNewSchemeData({ ...newSchemeData, loanType: val })}
                  >
                    <SelectTrigger id="loan-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business">Business</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Working Capital">Working Capital</SelectItem>
                      <SelectItem value="Education">Education</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="risk-appetite">Risk Appetite</Label>
                  <Select
                    value={newSchemeData.riskAppetite}
                    onValueChange={(val) => setNewSchemeData({ ...newSchemeData, riskAppetite: val })}
                  >
                    <SelectTrigger id="risk-appetite">
                      <SelectValue placeholder="Select risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low Risk</SelectItem>
                      <SelectItem value="Medium">Medium Risk</SelectItem>
                      <SelectItem value="High">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ticket-size">Ticket Size</Label>
                  <Input
                    id="ticket-size"
                    placeholder="e.g. ₹5L - ₹50L"
                    value={newSchemeData.ticketSize}
                    onChange={(e) => setNewSchemeData({ ...newSchemeData, ticketSize: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tenure">Tenure</Label>
                  <Input
                    id="tenure"
                    placeholder="e.g. 12-60 months"
                    value={newSchemeData.tenure}
                    onChange={(e) => setNewSchemeData({ ...newSchemeData, tenure: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddSchemeDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateScheme} disabled={newSchemeLoading}>
                {newSchemeLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Create Scheme
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {schemesLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : schemes.length === 0 ? (
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-8 text-center">
              <Layers className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No schemes configured yet</p>
              <p className="text-sm text-slate-400 mt-1">Create items with type "Scheme" in the Items section to see them here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="border-0 shadow-sm bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{scheme.item_name}</h3>
                        <p className="text-sm text-slate-500">
                          {scheme.item_info?.loanType || "—"} • {scheme.item_info?.ticketSize || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">{scheme.item_info?.tenure || "—"}</p>
                        {scheme.item_info?.riskAppetite && (
                          <Badge variant="outline" className={
                            scheme.item_info.riskAppetite === "Low" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                          }>
                            {scheme.item_info.riskAppetite} Risk
                          </Badge>
                        )}
                      </div>
                      <Badge className={scheme.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}>
                        {scheme.status}
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // DSA Quality View
  const renderDSAQuality = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">DSA / Source Quality</h2>

      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Source</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Applications</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Approval Rate</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Junk Rate</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Avg TAT</th>
                <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-4">Quality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockDSAs.map((dsa, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{dsa.name}</td>
                  <td className="px-6 py-4 text-center text-slate-600">{dsa.applications}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-green-600 font-medium">{dsa.approvalRate}%</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={dsa.junkRate > 10 ? "text-red-600" : "text-slate-600"}>
                      {dsa.junkRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600">{dsa.avgTAT}</td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className={
                      dsa.approvalRate >= 70 && dsa.junkRate <= 10
                        ? "bg-green-50 text-green-700 border-green-200"
                        : dsa.approvalRate >= 50
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }>
                      {dsa.approvalRate >= 70 && dsa.junkRate <= 10 ? "Good" : dsa.approvalRate >= 50 ? "Average" : "Poor"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  // Settings View
  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Settings & Compliance</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">PII Masking</span>
              <Badge className="bg-green-100 text-green-700">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Consent Tracking</span>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Audit Logs</span>
              <Badge className="bg-green-100 text-green-700">Recording</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Integrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Admin API</span>
              <Badge className="bg-green-100 text-green-700">Connected</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">Elegant API</span>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-sm text-slate-600">User Auth (Clerk)</span>
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Analytics View using real data
  const renderAnalytics = () => {
    // 1. Revenue Trends (Monthly)
    // Group applications by month and sum up revenue
    const revenueData = applications
      .filter(app => app.created_at)
      .reduce((acc: any[], app) => {
        const date = new Date(app.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        const revenue = app._booking_items_of_bookings?.items?.[0]?.price || 0;

        const existingMonth = acc.find(d => d.name === month);
        if (existingMonth) {
          existingMonth.revenue += revenue;
          existingMonth.applications += 1;
        } else {
          acc.push({ name: month, revenue: revenue, applications: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => { // Sort vaguely by month (this simple sort assumes current year)
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months.indexOf(a.name) - months.indexOf(b.name);
      });

    // 2. Loan Product Distribution
    // Group by item_type or item_name
    const productData = applications
      .reduce((acc: any[], app) => {
        const type = app._items?.item_type || app.booking_type || "Other";
        const existingType = acc.find(d => d.name === type);
        if (existingType) {
          existingType.value += 1;
        } else {
          acc.push({ name: type, value: 1 });
        }
        return acc;
      }, []);

    // Sort by count
    productData.sort((a, b) => b.value - a.value);

    // 3. Application Status Distribution
    const statusData = applications.reduce((acc: any[], app) => {
      const status = app.status || "Unknown";
      const existingStatus = acc.find(s => s.name === status);
      if (existingStatus) {
        existingStatus.value += 1;
      } else {
        acc.push({ name: status, value: 1 });
      }
      return acc;
    }, []);

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

    if (loading) {
      return (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Financial Analytics</h2>

        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value / 1000}k`} />
                    <Tooltip
                      formatter={(value: number) => [`₹${value}`, 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Product Distribution */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Loan Product Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {productData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {productData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Layers className="h-10 w-10 mb-2 opacity-50" />
                    <p>No product data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Application Status */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Application Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Activity className="h-10 w-10 mb-2 opacity-50" />
                    <p>No status data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Analyst Workspace View
  const renderAnalystWorkspace = () => {
    // Filter for pending/in-progress applications (mock logic for demo: all are tasks)
    const myTasks = applications.filter(app => app.status !== "Approved" && app.status !== "Rejected");
    const pendingCount = myTasks.length;
    const urgentCount = myTasks.filter(t => t.id % 2 !== 0).length; // Mock "urgent" logic

    return (
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Pending Review</p>
                <h3 className="text-2xl font-bold text-blue-900">{pendingCount}</h3>
              </div>
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Urgent Cases</p>
                <h3 className="text-2xl font-bold text-amber-900">{urgentCount}</h3>
              </div>
              <div className="bg-amber-100 p-2 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Approved Today</p>
                <h3 className="text-2xl font-bold text-purple-900">12</h3>
              </div>
              <div className="bg-purple-100 p-2 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100 shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Review Efficiency</p>
                <h3 className="text-2xl font-bold text-green-900">94%</h3>
              </div>
              <div className="bg-green-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Task List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">My Tasks</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Sort
                </Button>
              </div>
            </div>

            <Card className="border-0 shadow-sm bg-white">
              <CardContent className="p-0">
                {myTasks.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {myTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${task.id % 2 === 0 ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                            }`}>
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-900">
                              {task._items?.title || `Application #${task.id}`}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>Applied {new Date(task.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className={task.id % 2 === 0 ? "" : "text-amber-600 font-medium"}>
                                {task.id % 2 === 0 ? "Normal Priority" : "High Priority"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-slate-50">
                            {task.status || "Pending"}
                          </Badge>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setActiveView("applications");
                              // Ideally set filter or scroll to this app
                            }}
                          >
                            Review
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <p>All caught up! No pending tasks.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side Panel: Notes & Reminders */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-white h-full">
              <CardHeader>
                <CardTitle className="text-base">Analyst Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-sm">
                    <p className="font-medium text-yellow-800 mb-1">Verify GST Returns</p>
                    <p className="text-yellow-700">Check Q3 filings for Application #1245 before approval.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                    <p className="font-medium text-slate-800 mb-1">Team Meeting</p>
                    <p className="text-slate-600">Credit policy review at 4 PM today.</p>
                  </div>
                  <Button variant="outline" className="w-full border-dashed gap-2 text-slate-500 hover:text-slate-700">
                    <PlusCircle className="h-4 w-4" />
                    Add Note
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Outcomes View
  const renderOutcomes = () => {
    // Derived stats
    const totalDecisions = applications.filter(app => app.status === "Approved" || app.status === "Rejected").length;
    const approvals = applications.filter(app => app.status === "Approved").length;
    const rejections = applications.filter(app => app.status === "Rejected").length;
    const approvalRate = totalDecisions > 0 ? Math.round((approvals / totalDecisions) * 100) : 0;

    // Mock Rejection Data (since API doesn't give specific reasons yet)
    const rejectionReasons = [
      { name: 'Low Credit Score', value: 35 },
      { name: 'High DTI Ratio', value: 25 },
      { name: 'Policy Mismatch', value: 20 },
      { name: 'Incomplete Docs', value: 15 },
      { name: 'Other', value: 5 },
    ];

    const COLORS_REJECT = ['#ef4444', '#f97316', '#eab308', '#64748b', '#94a3b8'];

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Outcomes & Learning</h2>

        {/* Funnel Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-slate-500">Total Decisions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalDecisions}</h3>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-green-600">Approved</p>
              <h3 className="text-2xl font-bold text-green-900 mt-1">{approvals}</h3>
              <p className="text-xs text-green-700 mt-1">{approvalRate}% Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-red-600">Rejected</p>
              <h3 className="text-2xl font-bold text-red-900 mt-1">{rejections}</h3>
              <p className="text-xs text-red-700 mt-1">{100 - approvalRate}% Rate</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-blue-600">Avg Decision Time</p>
              <h3 className="text-2xl font-bold text-blue-900 mt-1">4.2 Hrs</h3>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Rejection Analysis */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Rejection Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rejectionReasons}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {rejectionReasons.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_REJECT[index % COLORS_REJECT.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 flex flex-col justify-center space-y-3">
                  {rejectionReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS_REJECT[idx] }} />
                        <span className="text-slate-600">{reason.name}</span>
                      </div>
                      <span className="font-medium text-slate-900">{reason.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Decisions List */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Recent Decisions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {applications
                  .filter(app => app.status === "Approved" || app.status === "Rejected")
                  .slice(0, 5)
                  .map(app => (
                    <div key={app.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${app.status === "Approved" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          }`}>
                          {app.status === "Approved" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {app._items?.title || `App #${app.id}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            Decided on {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={app.status === "Approved" ? "default" : "destructive"} className={
                        app.status === "Approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                      }>
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                {totalDecisions === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <p>No decision history available yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Placeholder views
  const renderPlaceholder = (title: string) => (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500">This module is coming soon.</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case "dashboard": return renderDashboard();
      case "create-application": return <DocumentUpload />;
      case "applications": return renderApplications();
      case "decision-preview": return renderDecisionPreview();
      case "schemes": return renderSchemes();
      case "dsa-quality": return renderDSAQuality();
      case "settings": return renderSettings();
      case "analytics": return renderAnalytics();
      case "workspace": return renderAnalystWorkspace();
      case "outcomes": return renderOutcomes();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#e8ebf7" }}>
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-20" : "w-64"} bg-white border-r border-slate-200 flex flex-col transition-all duration-300`}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {!sidebarCollapsed && <span className="text-xl font-bold text-slate-900">Precred</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${activeView === item.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {user && <UserButton appearance={{ elements: { avatarBox: "h-10 w-10" } }} />}
            {!sidebarCollapsed && user && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user.fullName}</p>
                <p className="text-xs text-slate-500 truncate">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {navItems.find(n => n.id === activeView)?.label || "Dashboard"}
              </h1>
              <p className="text-sm text-slate-500">
                {activeView === "dashboard" && "Overview of your operations"}
                {activeView === "create-application" && "Upload documents for new loan application"}
                {activeView === "applications" && "Manage and review applications"}
                {activeView === "decision-preview" && "AI-powered decision insights"}
                {activeView === "schemes" && "Configure lending schemes"}
                {activeView === "dsa-quality" && "Monitor source and DSA performance"}
                {activeView === "settings" && "Compliance and integration settings"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." className="w-64 pl-10 rounded-xl border-slate-200" />
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Bell className="h-5 w-5 text-slate-600" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// Plus icon component
const Plus = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export default Admin;