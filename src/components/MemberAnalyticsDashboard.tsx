import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area 
} from "recharts";
import { 
  Package, Users, FileText, TrendingUp, DollarSign, 
  Calendar, Activity, RefreshCw, ChevronRight, AlertCircle, Loader2, WifiOff
} from "lucide-react";
import { format, fromUnixTime } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { elegantAPI, MemberDashboardAnalyticsResponse, BookingTypeMetric, BookingItemMetric, ItemCategoryMetric, CampaignActivityMetric } from "@/lib/elegant-api";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7c43",
  "#a05195",
];

// Empty state component for charts
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  height?: string;
}

const EmptyState = ({ icon: Icon, title, description, height = "h-[250px]" }: EmptyStateProps) => (
  <div className={cn("flex flex-col items-center justify-center text-center p-6", height)}>
    <div className="rounded-full bg-muted p-3 mb-3">
      <Icon className="h-6 w-6 text-muted-foreground" />
    </div>
    <p className="font-medium text-muted-foreground">{title}</p>
    {description && (
      <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">{description}</p>
    )}
  </div>
);

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  onClick?: () => void;
}

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, onClick }: MetricCardProps) => (
  <Card 
    className={cn("hover:shadow-md transition-shadow", onClick && "cursor-pointer")}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      {trend !== undefined && (
        <div className={cn(
          "flex items-center text-xs mt-1",
          trend >= 0 ? "text-green-600" : "text-red-600"
        )}>
          <TrendingUp className={cn("h-3 w-3 mr-1", trend < 0 && "rotate-180")} />
          {Math.abs(trend)}% vs previous period
        </div>
      )}
    </CardContent>
  </Card>
);

interface MemberAnalyticsDashboardProps {
  clerkUserId?: string;
  onBookingTypeClick?: (bookingType: string) => void;
}

export const MemberAnalyticsDashboard = ({ clerkUserId, onBookingTypeClick }: MemberAnalyticsDashboardProps) => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<MemberDashboardAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await elegantAPI.getMemberDashboardAnalytics(clerkUserId);
      setAnalytics(data);
      setRetryCount(0);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      const errorMessage = err?.message?.includes("fetch") 
        ? "Network error. Please check your connection."
        : err?.message || "Failed to load analytics data";
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clerkUserId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Enhanced loading skeleton with animated pulse
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        {/* Metrics skeleton with staggered animation */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-10 w-full max-w-md" />
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading analytics...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced error state with more context
  if (error || !analytics) {
    const isNetworkError = error?.includes("Network") || error?.includes("fetch");
    
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            {isNetworkError ? (
              <WifiOff className="h-8 w-8 text-destructive" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {isNetworkError ? "Connection Error" : "Unable to Load Analytics"}
          </h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {error || "No analytics data available. This could be a temporary issue."}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => fetchAnalytics()} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryCount > 0 ? `Retry (${retryCount})` : "Try Again"}
            </Button>
            {retryCount >= 2 && (
              <Button onClick={() => navigate("/member-portal")} variant="outline">
                Go to Dashboard
              </Button>
            )}
          </div>
          {retryCount >= 3 && (
            <Alert className="mt-6 max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Persistent Error</AlertTitle>
              <AlertDescription>
                If this issue continues, please try refreshing the page or contact support.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  const { metrics, shop_info } = analytics;

  // Process booking types for pie chart with null safety
  const bookingTypesData = (metrics?.bookings?.total_booking_types || [])
    .filter((b: BookingTypeMetric) => b.booking_types && b.bookings > 0)
    .map((b: BookingTypeMetric) => ({
      name: b.booking_types || "Other",
      value: b.bookings,
      statuses: b.booking_status,
    }));

  // Process item types for bar chart with null safety
  const itemTypesData = (metrics?.item_types?.new_items || [])
    .filter((i: ItemCategoryMetric) => i.count > 0)
    .map((i: ItemCategoryMetric) => ({
      name: i.items_item_types,
      count: i.count,
      revenue: i.total_item_price,
    }));

  // Process booking items for revenue chart with null safety
  const bookingItemsData = (metrics?.bookings?.total_booking_items || [])
    .filter((item: BookingItemMetric) => item.booking_items)
    .map((item: BookingItemMetric) => ({
      name: item.booking_items,
      bookings: item.bookings,
      price: item.price,
      quantity: item.quantity,
    }));

  // Create simple timeline from booking items (use quantity as proxy for activity)
  const timelineData = bookingItemsData.map((item: { name: string; bookings: number; price: number; quantity: number }) => ({
    date: item.name || "Other",
    count: item.quantity,
    revenue: item.price,
  }));

  // Process campaign activity with null safety
  const campaignActivityData = (metrics?.campaign_activity?.total || []).map((c: CampaignActivityMetric) => ({
    name: c.status,
    count: c.count,
    leads: c.leads,
  }));

  // Calculate total revenue with null safety
  const totalRevenue = (metrics?.bookings?.total_booking_items || []).reduce(
    (sum: number, item: BookingItemMetric) => sum + (item.price || 0), 0
  );

  const handleBookingTypeClick = (bookingType: string) => {
    if (onBookingTypeClick) {
      onBookingTypeClick(bookingType);
    } else {
      navigate(`/member-portal/orders?type=${encodeURIComponent(bookingType)}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Shop Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{shop_info.name}</h2>
          <p className="text-sm text-muted-foreground">Analytics Overview</p>
        </div>
        <Button 
          onClick={() => fetchAnalytics(true)} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Bookings"
          value={metrics.bookings.total}
          subtitle={`${metrics.bookings.new} new`}
          icon={Package}
        />
        <MetricCard
          title="Total Items"
          value={metrics.items.total}
          subtitle={`${metrics.items.new} new items`}
          icon={FileText}
        />
        <MetricCard
          title="Total Leads"
          value={metrics.leads.total}
          subtitle={`${metrics.leads.new} new leads`}
          icon={Users}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(totalRevenue / 100).toFixed(2)}`}
          subtitle="From all bookings"
          icon={DollarSign}
        />
      </div>

      {/* Main Charts Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Booking Types Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bookings by Type</CardTitle>
                <CardDescription>Distribution of booking types</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingTypesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={bookingTypesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {bookingTypesData.map((_: unknown, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    icon={Package} 
                    title="No booking data yet" 
                    description="Bookings will appear here once they're created"
                  />
                )}
              </CardContent>
            </Card>

            {/* Item Types Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Items by Category</CardTitle>
                <CardDescription>Item types and their counts</CardDescription>
              </CardHeader>
              <CardContent>
                {itemTypesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={itemTypesData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))' 
                        }} 
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState 
                    icon={FileText} 
                    title="No items available" 
                    description="Items will be displayed here as they're added"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
              <CardDescription>Booking items created over time</CardDescription>
            </CardHeader>
            <CardContent>
              {timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={Activity} 
                  title="No activity recorded" 
                  description="Timeline data will appear as bookings are created"
                  height="h-[300px]"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          {/* Booking Types List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Types</CardTitle>
              <CardDescription>Click to view bookings by type</CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.bookings?.total_booking_types || []).filter((b: BookingTypeMetric) => b.bookings > 0).length > 0 ? (
                <div className="space-y-2">
                  {(metrics?.bookings?.total_booking_types || [])
                    .filter((b: BookingTypeMetric) => b.bookings > 0)
                    .map((booking: BookingTypeMetric) => (
                      <div
                        key={booking.booking_types || 'other'}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleBookingTypeClick(booking.booking_types)}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{booking.booking_types || "Other"}</p>
                            <div className="flex gap-1 mt-1">
                              {(booking.booking_status || []).slice(0, 3).map((status: string) => (
                                <Badge key={status} variant="secondary" className="text-xs">
                                  {status || "N/A"}
                                </Badge>
                              ))}
                              {(booking.booking_status || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{booking.booking_status.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{booking.bookings}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyState 
                  icon={Package} 
                  title="No bookings yet" 
                  description="Your booking types will appear here"
                />
              )}
            </CardContent>
          </Card>

          {/* Booking Items Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue by Item Type</CardTitle>
              <CardDescription>Total revenue from booking items</CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.bookings?.total_booking_items || []).filter((i: BookingItemMetric) => i.booking_items).length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={(metrics?.bookings?.total_booking_items || []).filter((i: BookingItemMetric) => i.booking_items)}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="booking_items" className="text-xs" />
                    <YAxis className="text-xs" tickFormatter={(value) => `$${(value / 100).toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: number) => [`$${(value / 100).toFixed(2)}`, 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Bar dataKey="price" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={DollarSign} 
                  title="No revenue data yet" 
                  description="Revenue from booking items will be displayed here"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          {/* Item Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item Categories</CardTitle>
              <CardDescription>Items grouped by type with revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {itemTypesData.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {itemTypesData.map((item: { name: string; count: number; revenue: number }) => (
                    <div
                      key={item.name}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{item.name}</Badge>
                        <span className="text-sm text-muted-foreground">{item.count} items</span>
                      </div>
                      <p className="text-xl font-bold">
                        ${(item.revenue / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total value</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState 
                  icon={FileText} 
                  title="No item categories" 
                  description="Categories will appear as items are added to the system"
                />
              )}
            </CardContent>
          </Card>

          {/* Item Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Item Distribution</CardTitle>
              <CardDescription>Visual breakdown of item categories</CardDescription>
            </CardHeader>
            <CardContent>
              {itemTypesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={itemTypesData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="count"
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {itemTypesData.map((_: unknown, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={Package} 
                  title="No item distribution data" 
                  description="Visual breakdown will be available when items are added"
                  height="h-[300px]"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Campaign Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Activity</CardTitle>
              <CardDescription>Email campaign engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignActivityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={campaignActivityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }} 
                    />
                    <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Leads" />
                    <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState 
                  icon={Activity} 
                  title="No campaign activity" 
                  description="Email campaign metrics will appear after campaigns are sent"
                />
              )}
            </CardContent>
          </Card>

          {/* Activity Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Email Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaignActivityData.find((c: { name: string }) => c.name === "Email Sent")?.leads || 0}
                </div>
                <p className="text-xs text-muted-foreground">Emails sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaignActivityData.find((c: { name: string }) => c.name === "Delivery")?.leads || 0}
                </div>
                <p className="text-xs text-muted-foreground">Successfully delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Opens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaignActivityData.find((c: { name: string }) => c.name === "Open")?.leads || 0}
                </div>
                <p className="text-xs text-muted-foreground">Emails opened</p>
              </CardContent>
            </Card>
          </div>

          {/* Reviews Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reviews Summary</CardTitle>
              <CardDescription>Customer feedback overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="text-4xl font-bold">{metrics?.reviews?.total || 0}</div>
                  <p className="text-muted-foreground">Total Reviews</p>
                  {(metrics?.reviews?.new || 0) > 0 && (
                    <Badge className="mt-2">{metrics.reviews.new} new</Badge>
                  )}
                  {(metrics?.reviews?.total || 0) === 0 && (
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      No reviews yet. Reviews will appear here.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MemberAnalyticsDashboard;
