import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { adminAPI, type DashboardAnalyticsResponse, type CampaignActivityItem, type TaskStatusItem, type TaskAssigneeItem, type TaskDueDateItem, type TaskTypeItem, type TaskTimelineItem, type CampaignLeadsAnalytics, type MemberGrowthAnalytics, type BookingAnalytics, type ItemPerformanceAnalytics } from "@/lib/admin-api";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  Users, 
  ShoppingCart, 
  FileText, 
  UserPlus, 
  Star, 
  TrendingUp,
  TrendingDown,
  Building2,
  MessageSquare,
  Package,
  DollarSign,
  BarChart3,
  Activity,
  CalendarIcon,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Mail,
  Eye,
  Send,
  Clock,
  MousePointerClick,
  Link2,
  ExternalLink,
  ClipboardList,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Megaphone,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Tag,
  TrendingUp as TrendingUpIcon,
  Target,
  UserCheck,
  MailOpen,
  Percent,
  Crown,
  Wallet,
  CreditCard,
  Receipt,
  Award,
  Flame
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area, LineChart, Line, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Campaign activity status colors for timeline chart
const ACTIVITY_COLORS: Record<string, string> = {
  'email sent': '#3b82f6',
  'delivery': '#22c55e',
  'open': '#a855f7',
  'click': '#06b6d4',
  'link click': '#06b6d4',
  'unique click': '#14b8a6',
  'unsubscribe': '#f97316',
  'bounce': '#ef4444',
  'hard bounce': '#ef4444',
  'soft bounce': '#ef4444',
  'spam complaint': '#f43f5e',
  'too early to contact': '#f59e0b',
};

interface AdminDashboardProps {
  clerkUserId: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type DatePreset = 'all' | '7d' | '30d' | '90d' | 'this-month' | 'last-month' | 'this-year' | 'custom';

// Helper to calculate percentage change
const calculateChange = (current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } => {
  if (previous === 0) {
    return current > 0 ? { value: 100, direction: 'up' } : { value: 0, direction: 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
};

// Process campaign activity data for timeline chart
const processCampaignActivityTimeline = (activities: CampaignActivityItem[]) => {
  const dateMap: Record<string, Record<string, number>> = {};
  
  activities.forEach(activity => {
    activity.activity_date.forEach(timestamp => {
      const date = format(new Date(timestamp), 'MMM d');
      if (!dateMap[date]) {
        dateMap[date] = {};
      }
      const statusKey = activity.status.toLowerCase();
      dateMap[date][statusKey] = (dateMap[date][statusKey] || 0) + 1;
    });
  });
  
  // Sort by date and convert to array
  const sortedDates = Object.keys(dateMap).sort((a, b) => {
    const dateA = new Date(a + ', 2025');
    const dateB = new Date(b + ', 2025');
    return dateA.getTime() - dateB.getTime();
  });
  
  return sortedDates.map(date => ({
    date,
    ...dateMap[date]
  }));
};

const generateSparklineData = (currentValue: number, previousValue?: number, points: number = 7): { value: number }[] => {
  const data: { value: number }[] = [];
  const startValue = previousValue ?? Math.round(currentValue * 0.7);
  const endValue = currentValue;
  
  for (let i = 0; i < points; i++) {
    // Create a smooth curve with some randomization
    const progress = i / (points - 1);
    const baseValue = startValue + (endValue - startValue) * progress;
    // Add some variance for visual interest (±15%)
    const variance = baseValue * 0.15 * (Math.sin(i * 1.5) + Math.random() * 0.5 - 0.25);
    data.push({ value: Math.max(0, Math.round(baseValue + variance)) });
  }
  
  // Ensure the last point is the current value
  data[points - 1] = { value: endValue };
  
  return data;
};

// Sparkline Component
interface SparklineProps {
  data: { value: number }[];
  color: string;
  height?: number;
}

const Sparkline = ({ data, color, height = 40 }: SparklineProps) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace(/[^a-zA-Z]/g, '')})`}
          isAnimationActive={true}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Metric Card Component with comparison support and sparkline
interface MetricCardProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  newCount: number;
  previousValue?: number;
  comparisonEnabled: boolean;
  color?: string;
}

const MetricCard = ({ title, icon: Icon, value, newCount, previousValue, comparisonEnabled, color = 'hsl(var(--primary))' }: MetricCardProps) => {
  const change = comparisonEnabled && previousValue !== undefined 
    ? calculateChange(value, previousValue) 
    : null;
  
  const sparklineData = generateSparklineData(value, previousValue);
  const sparklineColor = change?.direction === 'down' ? 'hsl(var(--destructive))' : color;

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pb-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{value.toLocaleString()}</span>
          {change && (
            <div className={cn(
              "flex items-center text-xs font-medium",
              change.direction === 'up' && "text-green-600",
              change.direction === 'down' && "text-red-600",
              change.direction === 'neutral' && "text-muted-foreground"
            )}>
              {change.direction === 'up' && <ArrowUpRight className="h-3 w-3" />}
              {change.direction === 'down' && <ArrowDownRight className="h-3 w-3" />}
              {change.direction === 'neutral' && <Minus className="h-3 w-3" />}
              {change.value}%
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 mb-2">
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            +{newCount} new
          </Badge>
          {change && previousValue !== undefined && (
            <span className="text-xs text-muted-foreground">
              vs {previousValue.toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
      {/* Sparkline at bottom of card */}
      <div className="-mx-1 -mb-1">
        <Sparkline data={sparklineData} color={sparklineColor} />
      </div>
    </Card>
  );
};

export const AdminDashboard = ({ clerkUserId }: AdminDashboardProps) => {
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<DashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const { toast } = useToast();

  const applyDatePreset = (preset: DatePreset) => {
    const now = new Date();
    setDatePreset(preset);
    
    switch (preset) {
      case 'all':
        setStartDate(undefined);
        setEndDate(undefined);
        break;
      case '7d':
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case '30d':
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case '90d':
        setStartDate(subDays(now, 90));
        setEndDate(now);
        break;
      case 'this-month':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'this-year':
        setStartDate(startOfYear(now));
        setEndDate(now);
        break;
      case 'custom':
        // Keep current dates for custom
        break;
    }
  };

  const fetchAnalytics = async () => {
    if (!clerkUserId) return;
    
    setLoading(true);
    try {
      const startTimestamp = startDate ? startDate.getTime() : undefined;
      const endTimestamp = endDate ? endDate.getTime() : undefined;
      
      // Fetch current period data
      const data = await adminAPI.getDashboardAnalytics(clerkUserId, startTimestamp, endTimestamp);
      setAnalytics(data);
      
      // Fetch previous period data for comparison if enabled and dates are set
      if (comparisonEnabled && startDate && endDate) {
        const periodLength = differenceInDays(endDate, startDate);
        const prevEndDate = new Date(startDate.getTime() - 1); // Day before current start
        const prevStartDate = subDays(prevEndDate, periodLength);
        
        const prevData = await adminAPI.getDashboardAnalytics(
          clerkUserId, 
          prevStartDate.getTime(), 
          prevEndDate.getTime()
        );
        setPreviousAnalytics(prevData);
      } else {
        setPreviousAnalytics(null);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [clerkUserId, startDate, endDate, comparisonEnabled]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const { metrics, shop_info } = analytics;

  // Prepare item types data for pie chart
  const itemTypesData = metrics.item_types.items.map((item, index) => ({
    name: item.items_item_types,
    value: item.count,
    price: item.total_item_price,
    currency: item.items_currency[0] || 'USD',
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // Prepare metrics for bar chart
  const metricsBarData = [
    { name: 'Items', total: metrics.items.total, new: metrics.items.new },
    { name: 'Bookings', total: metrics.bookings.total, new: metrics.bookings.new },
    { name: 'Customers', total: metrics.customers.total, new: metrics.customers.new },
    { name: 'Leads', total: metrics.leads.total, new: metrics.leads.new },
  ];

  // Calculate review stats
  const reviewRating = metrics.reviews.ratings?.[0];
  const avgRating = reviewRating 
    ? ((reviewRating.reviews_Rating + reviewRating.reviews_Rating_1 + reviewRating.reviews_Rating_2) / 3).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Date Filter & Shop Info Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">{shop_info.name}</h2>
                <p className="text-sm text-muted-foreground">{shop_info.domain}</p>
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={datePreset} onValueChange={(value) => applyDatePreset(value as DatePreset)}>
                <SelectTrigger className="w-[140px] bg-background">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {datePreset === 'custom' && (
                <>
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[130px] justify-start text-left font-normal bg-background",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM d, yyyy") : "Start"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setIsStartOpen(false);
                        }}
                        disabled={(date) => date > new Date() || (endDate && date > endDate)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-muted-foreground">to</span>
                  
                  <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[130px] justify-start text-left font-normal bg-background",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM d, yyyy") : "End"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date);
                          setIsEndOpen(false);
                        }}
                        disabled={(date) => date > new Date() || (startDate && date < startDate)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
              
              {/* Comparison Toggle */}
              {datePreset !== 'all' && (
                <div className="flex items-center gap-2 px-2 py-1 bg-background rounded-md border">
                  <Switch
                    id="comparison-mode"
                    checked={comparisonEnabled}
                    onCheckedChange={setComparisonEnabled}
                  />
                  <Label htmlFor="comparison-mode" className="text-xs cursor-pointer whitespace-nowrap">
                    Compare
                  </Label>
                </div>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAnalytics}
                disabled={loading}
                className="bg-background"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
          
          {/* Active filter display */}
          {(startDate || endDate) && datePreset !== 'all' && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  Showing data from{' '}
                  <span className="font-medium text-foreground">
                    {startDate ? format(startDate, "MMM d, yyyy") : 'beginning'}
                  </span>
                  {' '}to{' '}
                  <span className="font-medium text-foreground">
                    {endDate ? format(endDate, "MMM d, yyyy") : 'now'}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => applyDatePreset('all')}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Items"
          icon={FileText}
          value={metrics.items.total}
          newCount={metrics.items.new}
          previousValue={previousAnalytics?.metrics.items.total}
          comparisonEnabled={comparisonEnabled}
          color="hsl(var(--primary))"
        />
        
        <MetricCard
          title="Customers"
          icon={Users}
          value={metrics.customers.total}
          newCount={metrics.customers.new}
          previousValue={previousAnalytics?.metrics.customers.total}
          comparisonEnabled={comparisonEnabled}
          color="hsl(var(--chart-2))"
        />
        
        <MetricCard
          title="Total Leads"
          icon={UserPlus}
          value={metrics.leads.total}
          newCount={metrics.leads.new}
          previousValue={previousAnalytics?.metrics.leads.total}
          comparisonEnabled={comparisonEnabled}
          color="hsl(var(--chart-3))"
        />
        
        <MetricCard
          title="Bookings"
          icon={ShoppingCart}
          value={metrics.bookings.total}
          newCount={metrics.bookings.new}
          previousValue={previousAnalytics?.metrics.bookings.total}
          comparisonEnabled={comparisonEnabled}
          color="hsl(var(--chart-4))"
        />
      </div>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Reviews Overview
          </CardTitle>
          <CardDescription>
            {metrics.reviews.total} total reviews • {metrics.reviews.new} new
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{avgRating}/5</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="p-3 bg-primary/10 rounded-full">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comments</p>
                <p className="text-2xl font-bold">{reviewRating?.reviews_Comments || 0}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="p-3 bg-green-500/10 rounded-full">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Helpful Count</p>
                <p className="text-2xl font-bold">{reviewRating?.reviews_Helpful_count || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Growth Analytics Section */}
      {metrics?.member_growth && (() => {
        const { member_growth } = metrics;
        
        const roleColors = [
          { bar: '#8b5cf6' }, // violet
          { bar: '#06b6d4' }, // cyan
          { bar: '#ec4899' }, // pink
          { bar: '#84cc16' }, // lime
          { bar: '#f97316' }, // orange
          { bar: '#6366f1' }, // indigo
        ];

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Member Growth
              </CardTitle>
              <CardDescription>
                Member acquisition and growth trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Growth Timeline</TabsTrigger>
                  <TabsTrigger value="roles">By Role</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{member_growth.total_members}</p>
                        <p className="text-xs text-muted-foreground">Total Members</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-green-500/10 rounded-full">
                            <UserPlus className="h-5 w-5 text-green-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{member_growth.new_members}</p>
                        <p className="text-xs text-muted-foreground">New Members</p>
                        <p className="text-xs text-green-600 mt-1">
                          {member_growth.total_members > 0 
                            ? Math.round((member_growth.new_members / member_growth.total_members) * 100)
                            : 0}% growth
                        </p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-blue-500/10 rounded-full">
                            <Activity className="h-5 w-5 text-blue-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{member_growth.active_members}</p>
                        <p className="text-xs text-muted-foreground">Active Members</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {member_growth.total_members > 0 
                            ? Math.round((member_growth.active_members / member_growth.total_members) * 100)
                            : 0}% active
                        </p>
                      </div>
                    </div>

                    {/* Quick Role Overview */}
                    {member_growth.by_role && member_growth.by_role.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Role Distribution</h4>
                        <div className="flex flex-wrap gap-2">
                          {member_growth.by_role.map((role, index) => (
                            <div 
                              key={role.role} 
                              className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
                            >
                              <Crown className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{role.role}</span>
                              <Badge variant="secondary">{role.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="timeline">
                  {member_growth.timeline && member_growth.timeline.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart 
                          data={member_growth.timeline.map(t => ({
                            date: typeof t.date === 'string' && t.date.includes('-') 
                              ? format(new Date(t.date), 'MMM d')
                              : t.date,
                            Total: t.total,
                            New: t.new,
                          }))}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="memberTotalGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="memberNewGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Total"
                            stroke="hsl(var(--primary))"
                            fill="url(#memberTotalGradient)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="New"
                            stroke="#22c55e"
                            fill="url(#memberNewGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Growth Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(() => {
                          const totalNew = member_growth.timeline.reduce((sum, t) => sum + t.new, 0);
                          const avgPerPeriod = member_growth.timeline.length > 0 
                            ? Math.round(totalNew / member_growth.timeline.length * 10) / 10
                            : 0;
                          const peakPeriod = member_growth.timeline.reduce((max, t) => 
                            t.new > max.new ? t : max, 
                            member_growth.timeline[0]
                          );
                          const latestTotal = member_growth.timeline[member_growth.timeline.length - 1]?.total || 0;

                          return (
                            <>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Total Acquired</p>
                                <p className="text-xl font-bold">{totalNew}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Avg Per Period</p>
                                <p className="text-xl font-bold">{avgPerPeriod}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Peak New</p>
                                <p className="text-xl font-bold">{peakPeriod?.new || 0}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Current Total</p>
                                <p className="text-xl font-bold">{latestTotal}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <TrendingUpIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p>No timeline data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="roles">
                  {member_growth.by_role && member_growth.by_role.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Role List */}
                      <div className="space-y-3">
                        {member_growth.by_role.map((role, index) => {
                          const percentage = member_growth.total_members > 0 
                            ? Math.round((role.count / member_growth.total_members) * 100) 
                            : 0;
                          const color = roleColors[index % roleColors.length];
                          
                          return (
                            <div key={role.role} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-full">
                                    <Crown className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{role.role}</p>
                                    <p className="text-xs text-muted-foreground">{percentage}% of members</p>
                                  </div>
                                </div>
                                <span className="text-2xl font-bold">{role.count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%`, backgroundColor: color.bar }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Role Pie Chart */}
                      <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={member_growth.by_role.map((r, index) => ({
                                name: r.role,
                                value: r.count,
                                fill: roleColors[index % roleColors.length].bar,
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {member_growth.by_role.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={roleColors[index % roleColors.length].bar} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                          {member_growth.by_role.map((r, index) => (
                            <div key={r.role} className="flex items-center gap-1.5">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: roleColors[index % roleColors.length].bar }}
                              />
                              <span className="text-xs text-muted-foreground">{r.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Crown className="h-12 w-12 mb-3 opacity-50" />
                      <p>No role data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Booking/Order Analytics Section */}
      {metrics?.booking_analytics && (() => {
        const { booking_analytics } = metrics;
        
        const statusColors: Record<string, { text: string; bg: string; bar: string }> = {
          'paid': { text: 'text-green-500', bg: 'bg-green-500/10', bar: '#22c55e' },
          'pending': { text: 'text-amber-500', bg: 'bg-amber-500/10', bar: '#f59e0b' },
          'new': { text: 'text-blue-500', bg: 'bg-blue-500/10', bar: '#3b82f6' },
          'cancelled': { text: 'text-red-500', bg: 'bg-red-500/10', bar: '#ef4444' },
        };

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: booking_analytics.currency || 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount);
        };

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Bookings & Revenue
              </CardTitle>
              <CardDescription>
                Order analytics and revenue trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="revenue">Revenue Trend</TabsTrigger>
                  <TabsTrigger value="by-status">By Status</TabsTrigger>
                  <TabsTrigger value="by-type">By Type</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{booking_analytics.total_bookings}</p>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                        {booking_analytics.new_bookings > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            +{booking_analytics.new_bookings} new
                          </Badge>
                        )}
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-green-500/10 rounded-full">
                            <DollarSign className="h-5 w-5 text-green-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(booking_analytics.total_revenue)}</p>
                        <p className="text-xs text-muted-foreground">Total Revenue</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-blue-500/10 rounded-full">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(booking_analytics.new_revenue)}</p>
                        <p className="text-xs text-muted-foreground">New Revenue</p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-purple-500/10 rounded-full">
                            <ShoppingCart className="h-5 w-5 text-purple-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">
                          {booking_analytics.total_bookings > 0 
                            ? formatCurrency(booking_analytics.total_revenue / booking_analytics.total_bookings)
                            : formatCurrency(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Avg Order Value</p>
                      </div>
                    </div>

                    {/* Quick Status Overview */}
                    {booking_analytics.by_status && booking_analytics.by_status.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {booking_analytics.by_status.map((status) => {
                          const colors = statusColors[status.status.toLowerCase()] || { text: 'text-muted-foreground', bg: 'bg-muted' };
                          return (
                            <div key={status.status} className={cn("p-3 rounded-lg", colors.bg)}>
                              <div className="flex items-center justify-between">
                                <span className={cn("text-sm font-medium capitalize", colors.text)}>{status.status}</span>
                                <span className="font-bold">{status.count}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(status.revenue)}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="revenue">
                  {booking_analytics.revenue_timeline && booking_analytics.revenue_timeline.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart 
                          data={booking_analytics.revenue_timeline.map(t => ({
                            date: typeof t.date === 'string' && t.date.includes('-') 
                              ? format(new Date(t.date), 'MMM d')
                              : t.date,
                            Revenue: t.revenue,
                            Orders: t.bookings_count,
                          }))}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fontSize: 12 }} 
                            tickFormatter={(value) => `$${value}`}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 12 }}
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value, name) => [
                              name === 'Revenue' ? formatCurrency(value as number) : value,
                              name
                            ]}
                          />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="Revenue"
                            stroke="#22c55e"
                            fill="url(#revenueGradient)"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="Orders"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Revenue Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {(() => {
                          const totalRevenue = booking_analytics.revenue_timeline.reduce((sum, t) => sum + t.revenue, 0);
                          const totalOrders = booking_analytics.revenue_timeline.reduce((sum, t) => sum + t.bookings_count, 0);
                          const avgPerPeriod = booking_analytics.revenue_timeline.length > 0 
                            ? Math.round(totalRevenue / booking_analytics.revenue_timeline.length)
                            : 0;
                          const peakPeriod = booking_analytics.revenue_timeline.reduce((max, t) => 
                            t.revenue > max.revenue ? t : max, 
                            booking_analytics.revenue_timeline[0]
                          );

                          return (
                            <>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Period Revenue</p>
                                <p className="text-xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Avg Per Period</p>
                                <p className="text-xl font-bold">{formatCurrency(avgPerPeriod)}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Peak Revenue</p>
                                <p className="text-xl font-bold">{formatCurrency(peakPeriod?.revenue || 0)}</p>
                              </div>
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">Total Orders</p>
                                <p className="text-xl font-bold">{totalOrders}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <TrendingUpIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p>No revenue timeline data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="by-status">
                  {booking_analytics.by_status && booking_analytics.by_status.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Status List */}
                      <div className="space-y-3">
                        {booking_analytics.by_status.map((status) => {
                          const colors = statusColors[status.status.toLowerCase()] || { text: 'text-muted-foreground', bg: 'bg-muted', bar: '#888888' };
                          const percentage = booking_analytics.total_bookings > 0 
                            ? Math.round((status.count / booking_analytics.total_bookings) * 100) 
                            : 0;
                          
                          return (
                            <div key={status.status} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-full", colors.bg)}>
                                    <Circle className={cn("h-4 w-4", colors.text)} />
                                  </div>
                                  <div>
                                    <p className="font-medium capitalize">{status.status}</p>
                                    <p className="text-xs text-muted-foreground">{percentage}% of orders</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold">{status.count}</p>
                                  <p className="text-xs text-green-600">{formatCurrency(status.revenue)}</p>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${percentage}%`, backgroundColor: colors.bar }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Status Pie Chart */}
                      <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={booking_analytics.by_status.map((s) => ({
                                name: s.status,
                                value: s.count,
                                fill: statusColors[s.status.toLowerCase()]?.bar || '#888888',
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {booking_analytics.by_status.map((s, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={statusColors[s.status.toLowerCase()]?.bar || '#888888'} 
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                          {booking_analytics.by_status.map((s) => (
                            <div key={s.status} className="flex items-center gap-1.5">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: statusColors[s.status.toLowerCase()]?.bar || '#888888' }}
                              />
                              <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Circle className="h-12 w-12 mb-3 opacity-50" />
                      <p>No status data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="by-type">
                  {booking_analytics.by_type && booking_analytics.by_type.length > 0 ? (
                    <div className="space-y-4">
                      {/* Type Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {booking_analytics.by_type.map((type, index) => {
                          const percentage = booking_analytics.total_bookings > 0 
                            ? Math.round((type.count / booking_analytics.total_bookings) * 100) 
                            : 0;
                          
                          return (
                            <div key={type.booking_type} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{type.booking_type}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-background rounded text-center">
                                  <p className="text-lg font-bold">{type.count}</p>
                                  <p className="text-xs text-muted-foreground">Orders</p>
                                </div>
                                <div className="p-2 bg-background rounded text-center">
                                  <p className="text-lg font-bold text-green-600">{formatCurrency(type.revenue)}</p>
                                  <p className="text-xs text-muted-foreground">Revenue</p>
                                </div>
                              </div>
                              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${percentage}%`, 
                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length] 
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 text-right">{percentage}% of orders</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Type Comparison Bar Chart */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-3">Revenue by Type</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart 
                            data={booking_analytics.by_type.map(t => ({
                              name: t.booking_type.length > 12 ? t.booking_type.substring(0, 12) + '...' : t.booking_type,
                              revenue: t.revenue,
                              orders: t.count,
                            }))}
                            layout="vertical"
                          >
                            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'revenue' ? formatCurrency(value as number) : value,
                                name === 'revenue' ? 'Revenue' : 'Orders'
                              ]}
                            />
                            <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Package className="h-12 w-12 mb-3 opacity-50" />
                      <p>No booking type data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Item Performance Analytics Section */}
      {metrics?.item_performance && (() => {
        const { item_performance } = metrics;
        
        const formatCurrency = (amount: number, currency: string = 'USD') => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(amount);
        };

        const totalRevenue = item_performance.top_items.reduce((sum, item) => sum + item.total_revenue, 0);
        const totalSold = item_performance.top_items.reduce((sum, item) => sum + item.total_sold, 0);

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Item Performance
              </CardTitle>
              <CardDescription>
                Top-selling items and revenue breakdown by product
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="top-items" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="top-items">Top Sellers</TabsTrigger>
                  <TabsTrigger value="revenue-leaders">Revenue Leaders</TabsTrigger>
                  <TabsTrigger value="by-type">By Item Type</TabsTrigger>
                </TabsList>

                <TabsContent value="top-items">
                  {item_performance.top_items && item_performance.top_items.length > 0 ? (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="p-2 bg-primary/10 rounded-full">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{item_performance.top_items.length}</p>
                          <p className="text-xs text-muted-foreground">Items Tracked</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="p-2 bg-green-500/10 rounded-full">
                              <DollarSign className="h-5 w-5 text-green-500" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                          <div className="flex items-center justify-center mb-2">
                            <div className="p-2 bg-blue-500/10 rounded-full">
                              <ShoppingCart className="h-5 w-5 text-blue-500" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">{totalSold}</p>
                          <p className="text-xs text-muted-foreground">Units Sold</p>
                        </div>
                      </div>

                      {/* Top Items List */}
                      <div className="space-y-3">
                        {item_performance.top_items.slice(0, 10).map((item, index) => {
                          const revenuePercentage = totalRevenue > 0 
                            ? Math.round((item.total_revenue / totalRevenue) * 100) 
                            : 0;
                          
                          return (
                            <div key={item.item_id} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-start gap-4">
                                {/* Rank Badge */}
                                <div className={cn(
                                  "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                                  index === 0 && "bg-yellow-500/20 text-yellow-600",
                                  index === 1 && "bg-gray-300/30 text-gray-600",
                                  index === 2 && "bg-amber-600/20 text-amber-700",
                                  index > 2 && "bg-muted text-muted-foreground"
                                )}>
                                  {index === 0 && <Flame className="h-4 w-4" />}
                                  {index > 0 && `#${index + 1}`}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div>
                                      <p className="font-medium truncate">{item.item_title}</p>
                                      <Badge variant="outline" className="text-xs mt-1">{item.item_type}</Badge>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-lg font-bold text-green-600">
                                        {formatCurrency(item.total_revenue, item.currency)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{item.total_sold} sold</p>
                                    </div>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                                    <div 
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${revenuePercentage}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{revenuePercentage}% of total revenue</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Package className="h-12 w-12 mb-3 opacity-50" />
                      <p>No item performance data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="revenue-leaders">
                  {item_performance.revenue_leaders && item_performance.revenue_leaders.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Revenue Leaders List */}
                      <div className="space-y-3">
                        {item_performance.revenue_leaders.map((item, index) => (
                          <div key={item.item_id} className="p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "p-2 rounded-full",
                                  index === 0 ? "bg-yellow-500/20" : "bg-primary/10"
                                )}>
                                  {index === 0 ? (
                                    <Award className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <DollarSign className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{item.item_title}</p>
                                  <Badge variant="outline" className="text-xs">{item.item_type}</Badge>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-green-600">{formatCurrency(item.revenue)}</p>
                                <p className="text-xs text-muted-foreground">{item.percentage_of_total}%</p>
                              </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${item.percentage_of_total}%`,
                                  backgroundColor: index === 0 ? '#eab308' : CHART_COLORS[index % CHART_COLORS.length]
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Revenue Pie Chart */}
                      <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={item_performance.revenue_leaders.map((item, index) => ({
                                name: item.item_title.length > 20 ? item.item_title.substring(0, 20) + '...' : item.item_title,
                                value: item.revenue,
                                fill: index === 0 ? '#eab308' : CHART_COLORS[index % CHART_COLORS.length],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {item_performance.revenue_leaders.map((_, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={index === 0 ? '#eab308' : CHART_COLORS[index % CHART_COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-2 justify-center mt-2">
                          {item_performance.revenue_leaders.slice(0, 5).map((item, index) => (
                            <div key={item.item_id} className="flex items-center gap-1.5">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: index === 0 ? '#eab308' : CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {item.item_title}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Award className="h-12 w-12 mb-3 opacity-50" />
                      <p>No revenue leaders data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="by-type">
                  {item_performance.by_item_type && item_performance.by_item_type.length > 0 ? (
                    <div className="space-y-6">
                      {/* Type Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {item_performance.by_item_type.map((type, index) => {
                          const typeRevenue = item_performance.by_item_type.reduce((sum, t) => sum + t.total_revenue, 0);
                          const percentage = typeRevenue > 0 
                            ? Math.round((type.total_revenue / typeRevenue) * 100) 
                            : 0;
                          
                          return (
                            <div key={type.item_type} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <div 
                                  className="p-2 rounded-full"
                                  style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                                >
                                  <Package 
                                    className="h-4 w-4" 
                                    style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                                  />
                                </div>
                                <span className="font-medium">{type.item_type}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="p-2 bg-background rounded text-center">
                                  <p className="text-lg font-bold">{type.items_sold}</p>
                                  <p className="text-xs text-muted-foreground">Sold</p>
                                </div>
                                <div className="p-2 bg-background rounded text-center">
                                  <p className="text-lg font-bold text-green-600">{formatCurrency(type.total_revenue)}</p>
                                  <p className="text-xs text-muted-foreground">Revenue</p>
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${percentage}%`, 
                                    backgroundColor: CHART_COLORS[index % CHART_COLORS.length] 
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 text-right">{percentage}% of revenue</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Type Comparison Bar Chart */}
                      <div>
                        <h4 className="text-sm font-medium mb-3">Revenue Comparison by Type</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart 
                            data={item_performance.by_item_type.map((t, index) => ({
                              name: t.item_type,
                              revenue: t.total_revenue,
                              sold: t.items_sold,
                              fill: CHART_COLORS[index % CHART_COLORS.length],
                            }))}
                          >
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip 
                              formatter={(value, name) => [
                                name === 'revenue' ? formatCurrency(value as number) : value,
                                name === 'revenue' ? 'Revenue' : 'Units Sold'
                              ]}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                              {item_performance.by_item_type.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Package className="h-12 w-12 mb-3 opacity-50" />
                      <p>No item type data available</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Campaign Activity Section */}
      {metrics?.campaign_activity?.total && metrics.campaign_activity.total.length > 0 && (() => {
        const timelineData = processCampaignActivityTimeline(metrics.campaign_activity.total);
        const activeStatuses = metrics.campaign_activity.total.map(a => a.status.toLowerCase());
        
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Campaign Activity
              </CardTitle>
              <CardDescription>
                Email campaign engagement metrics and timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {metrics.campaign_activity.total.map((activity) => {
                      const getActivityIcon = (status: string) => {
                        switch (status.toLowerCase()) {
                          case 'email sent':
                            return <Send className="h-5 w-5" />;
                          case 'delivery':
                            return <Mail className="h-5 w-5" />;
                          case 'open':
                            return <Eye className="h-5 w-5" />;
                          case 'click':
                          case 'link click':
                            return <MousePointerClick className="h-5 w-5" />;
                          case 'unique click':
                            return <Link2 className="h-5 w-5" />;
                          case 'unsubscribe':
                            return <ExternalLink className="h-5 w-5" />;
                          case 'bounce':
                          case 'hard bounce':
                          case 'soft bounce':
                            return <ArrowDownRight className="h-5 w-5" />;
                          case 'spam complaint':
                            return <MessageSquare className="h-5 w-5" />;
                          default:
                            return <Clock className="h-5 w-5" />;
                        }
                      };
                      
                      const getActivityColor = (status: string) => {
                        switch (status.toLowerCase()) {
                          case 'email sent':
                            return 'text-blue-500 bg-blue-500/10';
                          case 'delivery':
                            return 'text-green-500 bg-green-500/10';
                          case 'open':
                            return 'text-purple-500 bg-purple-500/10';
                          case 'click':
                          case 'link click':
                            return 'text-cyan-500 bg-cyan-500/10';
                          case 'unique click':
                            return 'text-teal-500 bg-teal-500/10';
                          case 'unsubscribe':
                            return 'text-orange-500 bg-orange-500/10';
                          case 'bounce':
                          case 'hard bounce':
                          case 'soft bounce':
                            return 'text-red-500 bg-red-500/10';
                          case 'spam complaint':
                            return 'text-rose-500 bg-rose-500/10';
                          default:
                            return 'text-amber-500 bg-amber-500/10';
                        }
                      };
                      
                      const colorClasses = getActivityColor(activity.status);
                      const [textColor, bgColor] = colorClasses.split(' ');
                      
                      return (
                        <div key={activity.status} className="p-4 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-2 rounded-full", bgColor)}>
                              <span className={textColor}>{getActivityIcon(activity.status)}</span>
                            </div>
                            <span className="text-sm font-medium truncate">{activity.status}</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">{activity.leads}</span>
                            <span className="text-sm text-muted-foreground">leads</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.count} {activity.count === 1 ? 'campaign' : 'campaigns'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="timeline">
                  {timelineData.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }} 
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            className="text-muted-foreground"
                            allowDecimals={false}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          {activeStatuses.map((status) => (
                            <Line
                              key={status}
                              type="monotone"
                              dataKey={status}
                              name={status.charAt(0).toUpperCase() + status.slice(1)}
                              stroke={ACTIVITY_COLORS[status] || '#888888'}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                      
                      {/* Legend with colors */}
                      <div className="flex flex-wrap gap-3 justify-center">
                        {activeStatuses.map((status) => (
                          <div key={status} className="flex items-center gap-1.5">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ACTIVITY_COLORS[status] || '#888888' }}
                            />
                            <span className="text-xs text-muted-foreground capitalize">{status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      No timeline data available
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Campaign Leads Analytics Section */}
      {metrics?.campaign_leads && (() => {
        const { campaign_leads } = metrics;
        
        // Status colors
        const leadStatusColors: Record<string, { text: string; bg: string; bar: string }> = {
          'new': { text: 'text-blue-500', bg: 'bg-blue-500/10', bar: '#3b82f6' },
          'contacted': { text: 'text-amber-500', bg: 'bg-amber-500/10', bar: '#f59e0b' },
          'converted': { text: 'text-green-500', bg: 'bg-green-500/10', bar: '#22c55e' },
          'unresponsive': { text: 'text-red-500', bg: 'bg-red-500/10', bar: '#ef4444' },
          'qualified': { text: 'text-purple-500', bg: 'bg-purple-500/10', bar: '#a855f7' },
        };

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Campaign Leads Analytics
              </CardTitle>
              <CardDescription>
                Lead conversion and engagement metrics across all campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="by-status">By Status</TabsTrigger>
                  <TabsTrigger value="by-campaign">By Campaign</TabsTrigger>
                  {campaign_leads.engagement_timeline && campaign_leads.engagement_timeline.length > 0 && (
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview">
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-blue-500/10 rounded-full">
                            <UserPlus className="h-5 w-5 text-blue-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{campaign_leads.total_leads}</p>
                        <p className="text-xs text-muted-foreground">Total Leads</p>
                        {campaign_leads.new_leads > 0 && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            +{campaign_leads.new_leads} new
                          </Badge>
                        )}
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-amber-500/10 rounded-full">
                            <Mail className="h-5 w-5 text-amber-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{campaign_leads.contacted_leads}</p>
                        <p className="text-xs text-muted-foreground">Contacted</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign_leads.total_leads > 0 
                            ? Math.round((campaign_leads.contacted_leads / campaign_leads.total_leads) * 100)
                            : 0}% of total
                        </p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-green-500/10 rounded-full">
                            <UserCheck className="h-5 w-5 text-green-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{campaign_leads.converted_leads}</p>
                        <p className="text-xs text-muted-foreground">Converted</p>
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          {campaign_leads.conversion_rate}% rate
                        </p>
                      </div>

                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <div className="flex items-center justify-center mb-2">
                          <div className="p-2 bg-purple-500/10 rounded-full">
                            <MailOpen className="h-5 w-5 text-purple-500" />
                          </div>
                        </div>
                        <p className="text-2xl font-bold">{campaign_leads.engagement_rate}%</p>
                        <p className="text-xs text-muted-foreground">Engagement Rate</p>
                        <p className="text-xs text-muted-foreground mt-1">Opens & clicks</p>
                      </div>
                    </div>

                    {/* Conversion Funnel */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Conversion Funnel</h4>
                      {[
                        { label: 'Total Leads', value: campaign_leads.total_leads, color: '#3b82f6' },
                        { label: 'Contacted', value: campaign_leads.contacted_leads, color: '#f59e0b' },
                        { label: 'Converted', value: campaign_leads.converted_leads, color: '#22c55e' },
                      ].map((stage, index) => {
                        const percentage = campaign_leads.total_leads > 0 
                          ? (stage.value / campaign_leads.total_leads) * 100 
                          : 0;
                        return (
                          <div key={stage.label} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{stage.label}</span>
                              <span className="font-medium">{stage.value} ({Math.round(percentage)}%)</span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: stage.color
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="by-status">
                  {campaign_leads.by_status && campaign_leads.by_status.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Status List */}
                      <div className="space-y-3">
                        {campaign_leads.by_status.map((statusItem, index) => {
                          const statusKey = statusItem.status.toLowerCase();
                          const colors = leadStatusColors[statusKey] || { text: 'text-muted-foreground', bg: 'bg-muted', bar: '#888888' };
                          const percentage = campaign_leads.total_leads > 0 
                            ? Math.round((statusItem.count / campaign_leads.total_leads) * 100) 
                            : 0;
                          
                          return (
                            <div key={statusItem.status} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-full", colors.bg)}>
                                    <Circle className={cn("h-4 w-4", colors.text)} />
                                  </div>
                                  <div>
                                    <p className="font-medium capitalize">{statusItem.status}</p>
                                    <p className="text-xs text-muted-foreground">{percentage}% of leads</p>
                                  </div>
                                </div>
                                <span className="text-2xl font-bold">{statusItem.count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: colors.bar
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Status Pie Chart */}
                      <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={campaign_leads.by_status.map((s, index) => ({
                                name: s.status,
                                value: s.count,
                                fill: leadStatusColors[s.status.toLowerCase()]?.bar || CHART_COLORS[index % CHART_COLORS.length],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {campaign_leads.by_status.map((s, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={leadStatusColors[s.status.toLowerCase()]?.bar || CHART_COLORS[index % CHART_COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                          {campaign_leads.by_status.map((s, index) => (
                            <div key={s.status} className="flex items-center gap-1.5">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ 
                                  backgroundColor: leadStatusColors[s.status.toLowerCase()]?.bar || CHART_COLORS[index % CHART_COLORS.length] 
                                }}
                              />
                              <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Circle className="h-12 w-12 mb-3 opacity-50" />
                      <p>No status data available</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="by-campaign">
                  {campaign_leads.by_campaign && campaign_leads.by_campaign.length > 0 ? (
                    <div className="space-y-4">
                      {/* Campaign Performance Table */}
                      <div className="space-y-3">
                        {campaign_leads.by_campaign.map((campaign, index) => {
                          const conversionRate = campaign.leads_count > 0 
                            ? Math.round((campaign.converted_count / campaign.leads_count) * 100) 
                            : 0;
                          const contactRate = campaign.leads_count > 0 
                            ? Math.round((campaign.contacted_count / campaign.leads_count) * 100) 
                            : 0;
                          
                          return (
                            <div key={campaign.campaign_id} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-full">
                                    <Megaphone className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{campaign.campaign_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {campaign.leads_count} leads
                                    </p>
                                  </div>
                                </div>
                                <Badge 
                                  variant={conversionRate >= 20 ? "default" : conversionRate >= 10 ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {conversionRate}% conversion
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="p-2 bg-background rounded">
                                  <p className="text-lg font-bold">{campaign.leads_count}</p>
                                  <p className="text-xs text-muted-foreground">Leads</p>
                                </div>
                                <div className="p-2 bg-background rounded">
                                  <p className="text-lg font-bold text-amber-500">{campaign.contacted_count}</p>
                                  <p className="text-xs text-muted-foreground">Contacted</p>
                                </div>
                                <div className="p-2 bg-background rounded">
                                  <p className="text-lg font-bold text-green-500">{campaign.converted_count}</p>
                                  <p className="text-xs text-muted-foreground">Converted</p>
                                </div>
                              </div>

                              {/* Mini progress bars */}
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-16">Contact</span>
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 rounded-full"
                                      style={{ width: `${contactRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8">{contactRate}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-16">Convert</span>
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full"
                                      style={{ width: `${conversionRate}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8">{conversionRate}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Campaign Comparison Bar Chart */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-3">Campaign Comparison</h4>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart 
                            data={campaign_leads.by_campaign.map(c => ({
                              name: c.campaign_name.length > 15 ? c.campaign_name.substring(0, 15) + '...' : c.campaign_name,
                              leads: c.leads_count,
                              contacted: c.contacted_count,
                              converted: c.converted_count,
                            }))}
                          >
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="leads" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="contacted" name="Contacted" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="converted" name="Converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Megaphone className="h-12 w-12 mb-3 opacity-50" />
                      <p>No campaign data available</p>
                    </div>
                  )}
                </TabsContent>

                {campaign_leads.engagement_timeline && campaign_leads.engagement_timeline.length > 0 && (
                  <TabsContent value="engagement">
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart 
                          data={campaign_leads.engagement_timeline.map(t => ({
                            date: typeof t.date === 'string' && t.date.includes('-') 
                              ? format(new Date(t.date), 'MMM d')
                              : t.date,
                            Opens: t.opens,
                            Clicks: t.clicks,
                            Deliveries: t.deliveries,
                          }))}
                          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="opensGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Deliveries"
                            stroke="#22c55e"
                            fill="transparent"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="Opens"
                            stroke="#a855f7"
                            fill="url(#opensGradient)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="Clicks"
                            stroke="#06b6d4"
                            fill="url(#clicksGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>

                      {/* Engagement Summary */}
                      <div className="grid grid-cols-3 gap-4">
                        {(() => {
                          const totals = campaign_leads.engagement_timeline.reduce(
                            (acc, t) => ({
                              opens: acc.opens + t.opens,
                              clicks: acc.clicks + t.clicks,
                              deliveries: acc.deliveries + t.deliveries,
                            }),
                            { opens: 0, clicks: 0, deliveries: 0 }
                          );
                          const openRate = totals.deliveries > 0 ? Math.round((totals.opens / totals.deliveries) * 100) : 0;
                          const clickRate = totals.opens > 0 ? Math.round((totals.clicks / totals.opens) * 100) : 0;

                          return (
                            <>
                              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                                <p className="text-xl font-bold text-green-600">{totals.deliveries}</p>
                                <p className="text-xs text-muted-foreground">Deliveries</p>
                              </div>
                              <div className="p-3 bg-purple-500/10 rounded-lg text-center">
                                <p className="text-xl font-bold text-purple-600">{totals.opens}</p>
                                <p className="text-xs text-muted-foreground">Opens ({openRate}%)</p>
                              </div>
                              <div className="p-3 bg-cyan-500/10 rounded-lg text-center">
                                <p className="text-xl font-bold text-cyan-600">{totals.clicks}</p>
                                <p className="text-xs text-muted-foreground">Clicks ({clickRate}%)</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Tasks Section */}
      {metrics?.tasks?.total && metrics.tasks.total.length > 0 && (() => {
        const taskStatusColors: Record<string, { text: string; bg: string }> = {
          'new': { text: 'text-blue-500', bg: 'bg-blue-500/10' },
          'in progress': { text: 'text-amber-500', bg: 'bg-amber-500/10' },
          'completed': { text: 'text-green-500', bg: 'bg-green-500/10' },
          'cancelled': { text: 'text-red-500', bg: 'bg-red-500/10' },
        };

        const getTaskStatusIcon = (status: string) => {
          switch (status.toLowerCase()) {
            case 'new':
              return <Circle className="h-5 w-5" />;
            case 'in progress':
              return <Loader2 className="h-5 w-5" />;
            case 'completed':
              return <CheckCircle2 className="h-5 w-5" />;
            case 'cancelled':
              return <XCircle className="h-5 w-5" />;
            default:
              return <ClipboardList className="h-5 w-5" />;
          }
        };

        const totalTasks = metrics.tasks.total.reduce((sum, t) => sum + t.tasks_count, 0);
        const completedTasks = metrics.tasks.total.find(t => t.tasks_status.toLowerCase() === 'completed')?.tasks_count || 0;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // Prepare data for pie chart
        const taskPieData = metrics.tasks.total.map((t, index) => ({
          name: t.tasks_status,
          value: t.tasks_count,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        // Compute due date analytics from inline data
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const oneWeek = 7 * oneDay;
        
        const computedDueDates = {
          overdue: 0,
          due_today: 0,
          due_this_week: 0,
          due_later: 0,
          no_due_date: 0,
        };
        
        metrics.tasks.total.forEach(task => {
          task.tasks_due_date.forEach(dueDate => {
            if (dueDate === null) {
              computedDueDates.no_due_date++;
            } else {
              const diff = dueDate - now;
              if (diff < 0) {
                computedDueDates.overdue++;
              } else if (diff < oneDay) {
                computedDueDates.due_today++;
              } else if (diff < oneWeek) {
                computedDueDates.due_this_week++;
              } else {
                computedDueDates.due_later++;
              }
            }
          });
        });

        // Compute assignee analytics from inline data
        const assigneeMap = new Map<string | null, { count: number; statuses: Set<string> }>();
        metrics.tasks.total.forEach(task => {
          task.tasks_assigned_customers_id.forEach(assigneeId => {
            const key = assigneeId || null;
            if (!assigneeMap.has(key)) {
              assigneeMap.set(key, { count: 0, statuses: new Set() });
            }
            const entry = assigneeMap.get(key)!;
            entry.count++;
            entry.statuses.add(task.tasks_status);
          });
        });
        
        const computedAssignees = Array.from(assigneeMap.entries()).map(([id, data]) => ({
          assigned_customers_id: id,
          assigned_customer_name: id ? `Member ${id.substring(0, 8)}...` : null,
          tasks_count: data.count,
          tasks_status: Array.from(data.statuses),
        })).sort((a, b) => b.tasks_count - a.tasks_count);

        // Compute type analytics from inline data
        const typeMap = new Map<string, { count: number; statuses: Set<string> }>();
        metrics.tasks.total.forEach(task => {
          task.tasks_type.forEach(type => {
            if (!typeMap.has(type)) {
              typeMap.set(type, { count: 0, statuses: new Set() });
            }
            const entry = typeMap.get(type)!;
            entry.count += 1;
            entry.statuses.add(task.tasks_status);
          });
        });
        
        const computedTypes = Array.from(typeMap.entries()).map(([type, data]) => ({
          task_type: type,
          tasks_count: data.count,
          tasks_status: Array.from(data.statuses),
        })).sort((a, b) => b.tasks_count - a.tasks_count);

        // Compute timeline from inline data
        const timelineMap = new Map<string, { total: number; statuses: Record<string, number> }>();
        metrics.tasks.total.forEach(task => {
          task.tasks_created_at.forEach((timestamp, idx) => {
            const dateStr = format(new Date(timestamp), 'MMM d');
            if (!timelineMap.has(dateStr)) {
              timelineMap.set(dateStr, { total: 0, statuses: {} });
            }
            const entry = timelineMap.get(dateStr)!;
            entry.total++;
            entry.statuses[task.tasks_status] = (entry.statuses[task.tasks_status] || 0) + 1;
          });
        });
        
        const computedTimeline = Array.from(timelineMap.entries())
          .map(([date, data]) => ({ date, total: data.total, ...data.statuses }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Tasks Overview
              </CardTitle>
              <CardDescription>
                {totalTasks} total tasks • {completionRate}% completion rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="status" className="space-y-4">
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="status">By Status</TabsTrigger>
                  <TabsTrigger value="assignee">By Assignee</TabsTrigger>
                  <TabsTrigger value="due-dates">Due Dates</TabsTrigger>
                  <TabsTrigger value="types">By Type</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="status">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Task Status Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      {metrics.tasks.total.map((task) => {
                        const statusKey = task.tasks_status.toLowerCase();
                        const colors = taskStatusColors[statusKey] || { text: 'text-muted-foreground', bg: 'bg-muted' };
                        
                        return (
                          <div key={task.tasks_status} className="p-4 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-2 rounded-full", colors.bg)}>
                                <span className={colors.text}>{getTaskStatusIcon(task.tasks_status)}</span>
                              </div>
                              <span className="text-sm font-medium">{task.tasks_status}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold">{task.tasks_count}</span>
                              <span className="text-sm text-muted-foreground">tasks</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {task.tasks_type.slice(0, 2).map((type, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {type}
                                </Badge>
                              ))}
                              {task.tasks_type.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{task.tasks_type.length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Task Distribution Pie Chart */}
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={taskPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {taskPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {taskPieData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assignee">
                  {computedAssignees.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Assignee List */}
                      <div className="space-y-3">
                        {computedAssignees.map((assignee, index) => {
                          const assigneeName = assignee.assigned_customer_name || 'Unassigned';
                          const percentage = totalTasks > 0 ? Math.round((assignee.tasks_count / totalTasks) * 100) : 0;
                          
                          return (
                            <div key={assignee.assigned_customers_id || 'unassigned'} className="p-4 bg-muted/50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={cn("p-2 rounded-full", "bg-primary/10")}>
                                    <Users className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{assigneeName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {assignee.tasks_count} tasks ({percentage}%)
                                    </p>
                                  </div>
                                </div>
                                <span className="text-2xl font-bold">{assignee.tasks_count}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {assignee.tasks_status.map((status, i) => {
                                  const statusKey = status.toLowerCase();
                                  const colors = taskStatusColors[statusKey] || { text: 'text-muted-foreground', bg: 'bg-muted' };
                                  return (
                                    <Badge key={i} variant="outline" className={cn("text-xs", colors.text)}>
                                      {status}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Assignee Pie Chart */}
                      <div className="flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={computedAssignees.map((a, index) => ({
                                name: a.assigned_customer_name || 'Unassigned',
                                value: a.tasks_count,
                                fill: CHART_COLORS[index % CHART_COLORS.length],
                              }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {computedAssignees.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                          {computedAssignees.map((a, index) => (
                            <div key={a.assigned_customers_id || 'unassigned'} className="flex items-center gap-1.5">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {a.assigned_customer_name || 'Unassigned'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Users className="h-12 w-12 mb-3 opacity-50" />
                      <p>No assignee data available</p>
                      <p className="text-xs mt-1">Tasks need to be assigned to members to see this breakdown</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="due-dates">
                  {(() => {
                    const dueDateColors: Record<string, { text: string; bg: string; barColor: string }> = {
                      'overdue': { text: 'text-red-500', bg: 'bg-red-500/10', barColor: '#ef4444' },
                      'due_today': { text: 'text-amber-500', bg: 'bg-amber-500/10', barColor: '#f59e0b' },
                      'due_this_week': { text: 'text-blue-500', bg: 'bg-blue-500/10', barColor: '#3b82f6' },
                      'due_later': { text: 'text-green-500', bg: 'bg-green-500/10', barColor: '#22c55e' },
                      'no_due_date': { text: 'text-muted-foreground', bg: 'bg-muted', barColor: '#888888' },
                    };

                    const dueDateLabels: Record<string, string> = {
                      'overdue': 'Overdue',
                      'due_today': 'Due Today',
                      'due_this_week': 'Due This Week',
                      'due_later': 'Due Later',
                      'no_due_date': 'No Due Date',
                    };

                    const getDueDateIcon = (category: string) => {
                      switch (category) {
                        case 'overdue':
                          return <CalendarX className="h-5 w-5" />;
                        case 'due_today':
                          return <AlertTriangle className="h-5 w-5" />;
                        case 'due_this_week':
                          return <CalendarClock className="h-5 w-5" />;
                        case 'due_later':
                          return <CalendarCheck className="h-5 w-5" />;
                        default:
                          return <CalendarIcon className="h-5 w-5" />;
                      }
                    };

                    const urgentTotal = computedDueDates.overdue + computedDueDates.due_today;

                    // Convert computed due dates to array format for rendering
                    const dueDateItems = [
                      { category: 'overdue', tasks_count: computedDueDates.overdue },
                      { category: 'due_today', tasks_count: computedDueDates.due_today },
                      { category: 'due_this_week', tasks_count: computedDueDates.due_this_week },
                      { category: 'due_later', tasks_count: computedDueDates.due_later },
                      { category: 'no_due_date', tasks_count: computedDueDates.no_due_date },
                    ].filter(d => d.tasks_count > 0);

                    // Data for bar chart
                    const dueDateBarData = dueDateItems.map(d => ({
                      name: dueDateLabels[d.category] || d.category,
                      count: d.tasks_count,
                      fill: dueDateColors[d.category]?.barColor || '#888888',
                    }));

                    if (dueDateItems.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                          <CalendarClock className="h-12 w-12 mb-3 opacity-50" />
                          <p>No due date data available</p>
                          <p className="text-xs mt-1">Set due dates on tasks to see this breakdown</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {/* Urgent Alert */}
                        {urgentTotal > 0 && (
                          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-medium text-red-600 dark:text-red-400">
                                {urgentTotal} task{urgentTotal > 1 ? 's' : ''} need attention
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {computedDueDates.overdue > 0 && `${computedDueDates.overdue} overdue`}
                                {computedDueDates.overdue > 0 && computedDueDates.due_today > 0 && ', '}
                                {computedDueDates.due_today > 0 && `${computedDueDates.due_today} due today`}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Due Date Cards */}
                          <div className="space-y-3">
                            {dueDateItems.map((dueDate) => {
                              const colors = dueDateColors[dueDate.category] || { text: 'text-muted-foreground', bg: 'bg-muted', barColor: '#888888' };
                              const label = dueDateLabels[dueDate.category] || dueDate.category;
                              const percentage = totalTasks > 0 ? Math.round((dueDate.tasks_count / totalTasks) * 100) : 0;
                              
                              return (
                                <div key={dueDate.category} className="p-4 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={cn("p-2 rounded-full", colors.bg)}>
                                        <span className={colors.text}>{getDueDateIcon(dueDate.category)}</span>
                                      </div>
                                      <div>
                                        <p className="font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{percentage}% of tasks</p>
                                      </div>
                                    </div>
                                    <span className={cn("text-2xl font-bold", colors.text)}>{dueDate.tasks_count}</span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        width: `${percentage}%`,
                                        backgroundColor: colors.barColor
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Due Date Bar Chart */}
                          <div>
                            <ResponsiveContainer width="100%" height={250}>
                              <BarChart data={dueDateBarData} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                                <Tooltip />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                  {dueDateBarData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="types">
                  {computedTypes.length > 0 ? (() => {
                    const typeColors = [
                      { text: 'text-violet-500', bg: 'bg-violet-500/10', bar: '#8b5cf6' },
                      { text: 'text-cyan-500', bg: 'bg-cyan-500/10', bar: '#06b6d4' },
                      { text: 'text-pink-500', bg: 'bg-pink-500/10', bar: '#ec4899' },
                      { text: 'text-lime-500', bg: 'bg-lime-500/10', bar: '#84cc16' },
                      { text: 'text-orange-500', bg: 'bg-orange-500/10', bar: '#f97316' },
                      { text: 'text-indigo-500', bg: 'bg-indigo-500/10', bar: '#6366f1' },
                    ];

                    // Data for pie chart
                    const typePieData = computedTypes.map((t, index) => ({
                      name: t.task_type,
                      value: t.tasks_count,
                      fill: typeColors[index % typeColors.length].bar,
                    }));

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Type List */}
                        <div className="space-y-3">
                          {computedTypes.map((taskType, index) => {
                            const colors = typeColors[index % typeColors.length];
                            const percentage = totalTasks > 0 ? Math.round((taskType.tasks_count / totalTasks) * 100) : 0;
                            
                            return (
                              <div key={taskType.task_type} className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-full", colors.bg)}>
                                      <Tag className={cn("h-4 w-4", colors.text)} />
                                    </div>
                                    <div>
                                      <p className="font-medium">{taskType.task_type}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {taskType.tasks_count} tasks ({percentage}%)
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-2xl font-bold">{taskType.tasks_count}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {taskType.tasks_status.map((status, i) => {
                                    const statusKey = status.toLowerCase();
                                    const statusColors = taskStatusColors[statusKey] || { text: 'text-muted-foreground', bg: 'bg-muted' };
                                    return (
                                      <Badge key={i} variant="outline" className={cn("text-xs", statusColors.text)}>
                                        {status}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Type Pie Chart */}
                        <div className="flex flex-col items-center">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={typePieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                              >
                                {typePieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-3 justify-center mt-2">
                            {typePieData.map((item, index) => (
                              <div key={item.name} className="flex items-center gap-1.5">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-xs text-muted-foreground">{item.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Tag className="h-12 w-12 mb-3 opacity-50" />
                      <p>No task type data available</p>
                      <p className="text-xs mt-1">Assign types to tasks to see this breakdown</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline">
                  {computedTimeline.length > 0 ? (() => {
                    // Get all unique statuses for lines
                    const allStatuses = [...new Set(
                      computedTimeline.flatMap(t => Object.keys(t).filter(k => k !== 'date' && k !== 'total'))
                    )];

                    const statusLineColors: Record<string, string> = {
                      'New': '#3b82f6',
                      'In Progress': '#f59e0b',
                      'Completed': '#22c55e',
                      'Cancelled': '#ef4444',
                    };

                    return (
                      <div className="space-y-4">
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={computedTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="taskTimelineGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }} 
                              className="text-muted-foreground"
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }} 
                              className="text-muted-foreground"
                              allowDecimals={false}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="total"
                              name="Total Tasks"
                              stroke="hsl(var(--primary))"
                              fill="url(#taskTimelineGradient)"
                              strokeWidth={2}
                            />
                            {allStatuses.map((status) => (
                              <Line
                                key={status}
                                type="monotone"
                                dataKey={status}
                                name={status}
                                stroke={statusLineColors[status] || '#888888'}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                              />
                            ))}
                          </AreaChart>
                        </ResponsiveContainer>
                        
                        {/* Summary stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {(() => {
                            const totalCreated = computedTimeline.reduce((sum, t) => sum + t.total, 0);
                            const avgPerDay = computedTimeline.length > 0 
                              ? Math.round(totalCreated / computedTimeline.length * 10) / 10
                              : 0;
                            const maxDay = computedTimeline.reduce((max, t) => 
                              t.total > max.total ? t : max, 
                              computedTimeline[0]
                            );
                            const recentTrend = computedTimeline.length >= 2
                              ? computedTimeline[computedTimeline.length - 1].total - 
                                computedTimeline[computedTimeline.length - 2].total
                              : 0;

                            return (
                              <>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                  <p className="text-xs text-muted-foreground">Total Created</p>
                                  <p className="text-xl font-bold">{totalCreated}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                  <p className="text-xs text-muted-foreground">Avg Per Day</p>
                                  <p className="text-xl font-bold">{avgPerDay}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                  <p className="text-xs text-muted-foreground">Peak Day</p>
                                  <p className="text-xl font-bold">{maxDay?.total || 0}</p>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center">
                                  <p className="text-xs text-muted-foreground">Recent Trend</p>
                                  <p className={cn(
                                    "text-xl font-bold flex items-center justify-center gap-1",
                                    recentTrend > 0 && "text-green-500",
                                    recentTrend < 0 && "text-red-500"
                                  )}>
                                    {recentTrend > 0 && <ArrowUpRight className="h-4 w-4" />}
                                    {recentTrend < 0 && <ArrowDownRight className="h-4 w-4" />}
                                    {recentTrend === 0 && <Minus className="h-4 w-4" />}
                                    {Math.abs(recentTrend)}
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <TrendingUpIcon className="h-12 w-12 mb-3 opacity-50" />
                      <p>No timeline data available</p>
                      <p className="text-xs mt-1">Task creation history will appear here</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Item Types Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Item Types Distribution
            </CardTitle>
            <CardDescription>
              {metrics.item_types.total} total across {metrics.item_types.items.length} types
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemTypesData.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={itemTypesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {itemTypesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} items ($${props.payload.price} ${props.payload.currency})`,
                        props.payload.name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-[150px]">
                  {itemTypesData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No item types data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metrics Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Metrics Overview
            </CardTitle>
            <CardDescription>
              Total vs New comparison across all metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={metricsBarData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="new" name="New" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Item Types Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Item Types Revenue
          </CardTitle>
          <CardDescription>
            Breakdown of items by type with total revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.item_types.items.map((item, index) => {
              const percentage = metrics.item_types.total > 0 
                ? (item.count / metrics.item_types.total) * 100 
                : 0;
              
              return (
                <div key={item.items_item_types} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-medium">{item.items_item_types}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{item.count} items</span>
                      <Badge variant="outline">
                        ${item.total_item_price.toLocaleString()} {item.items_currency[0] || 'USD'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
