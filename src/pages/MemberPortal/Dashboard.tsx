import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { elegantAPI, ElegantCustomer, PublicItem } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, Mail, User, Award, ChevronLeft, ChevronRight, Clock, Download, Bell, List, Grid3X3, LayoutGrid, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, isAfter, isBefore, addMonths, subMonths, startOfDay, startOfQuarter, endOfQuarter, addQuarters, subQuarters } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { exportSingleItem, exportMultipleItems } from "@/lib/ical-utils";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown } from "lucide-react";
import { MemberAnalyticsDashboard } from "@/components/MemberAnalyticsDashboard";

const NOTIFICATION_CATEGORIES = [
  { id: 'silver-smithy', label: 'Silver Smithy' },
  { id: 'cabochon', label: 'Cabochon' },
  { id: 'shows', label: 'Shows' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'field-trips', label: 'Field Trips' },
  { id: 'beads', label: 'Beads' },
  { id: 'wire-wrapping', label: 'Wire Wrapping' },
  { id: 'specials', label: 'Specials' },
  { id: 'intarsia', label: 'Intarsia' },
  { id: 'casting', label: 'Casting' },
  { id: 'silver-clay', label: 'Silver Clay' },
  { id: 'lapidary', label: 'Lapidary' },
  { id: 'table-crafts', label: 'Table Crafts' },
  { id: 'open-shops', label: 'Open Shops' },
  { id: 'newsletters', label: 'Newsletters' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'volunteer-work', label: 'Volunteer Work' },
];

const Dashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<PublicItem[]>([]);
  const [classes, setClasses] = useState<PublicItem[]>([]);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [emailFrequency, setEmailFrequency] = useState<string>('weekly');
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'list' | 'month' | 'quarter'>('list');
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [sponsorAds, setSponsorAds] = useState<PublicItem[]>([]);
  const [dashboardView, setDashboardView] = useState<'overview' | 'analytics'>('overview');

  useEffect(() => {
    if (user) {
      fetchCustomerData();
      fetchCalendarData();
      fetchSponsorAds();
    }
  }, [user]);

  const fetchSponsorAds = async () => {
    try {
      const response = await elegantAPI.getPublicItems(1, 10, 'AD');
      const now = new Date();
      const activeAds = response.items.filter(ad => {
        if (ad.Is_disabled) return false;
        if (ad.item_info?.expiration_date) {
          const expirationDate = new Date(ad.item_info.expiration_date);
          if (expirationDate < now) return false;
        }
        return true;
      });
      setSponsorAds(activeAds);
    } catch (error) {
      console.error('Error fetching sponsor ads:', error);
    }
  };

  const fetchCustomerData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await elegantAPI.getCustomer(user.id);
      setCustomer(response.customer);
      
      // Load notification preferences from cust_info
      const savedNotifications = response.customer?.cust_info?.notifications;
      if (savedNotifications) {
        setSelectedNotifications(savedNotifications.categories || []);
        setEmailFrequency(savedNotifications.emailFrequency || 'weekly');
      } else {
        // Default: all categories selected
        setSelectedNotifications(NOTIFICATION_CATEGORIES.map(cat => cat.id));
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      setLoadingCalendar(true);
      const [eventsResponse, classesResponse] = await Promise.all([
        elegantAPI.getPublicItems(1, 50, 'Event'),
        elegantAPI.getPublicItems(1, 50, 'Classes')
      ]);
      
      setEvents(eventsResponse.items);
      setClasses(classesResponse.items);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayEvents = events.filter(event => {
      if (!event.item_info?.startDate) return false;
      const eventDate = format(parseISO(event.item_info.startDate), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });

    const dayClasses = classes.filter(cls => {
      if (!cls.item_info?.startDate) return false;
      const classDate = format(parseISO(cls.item_info.startDate), 'yyyy-MM-dd');
      return classDate === dateStr;
    });

    return [...dayEvents, ...dayClasses];
  };

  const getUpcomingItems = () => {
    const today = startOfDay(new Date());
    
    const upcomingEvents = events
      .filter(event => event.item_info?.startDate && isAfter(parseISO(event.item_info.startDate), today))
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime())
      .slice(0, 5);

    const upcomingClasses = classes
      .filter(cls => cls.item_info?.startDate && isAfter(parseISO(cls.item_info.startDate), today))
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime())
      .slice(0, 5);

    return [...upcomingEvents, ...upcomingClasses]
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime())
      .slice(0, 6);
  };

  const handlePrevious = () => {
    if (calendarView === 'quarter') {
      setCurrentMonth(subQuarters(currentMonth, 1));
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNext = () => {
    if (calendarView === 'quarter') {
      setCurrentMonth(addQuarters(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const getListItems = () => {
    const today = startOfDay(new Date());
    const allItems = [...events, ...classes]
      .filter(item => item.item_info?.startDate && isAfter(parseISO(item.item_info.startDate), today))
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime());
    return allItems;
  };

  const getQuarterItems = () => {
    const qStart = startOfQuarter(currentMonth);
    const qEnd = endOfQuarter(currentMonth);
    const allItems = [...events, ...classes]
      .filter(item => {
        if (!item.item_info?.startDate) return false;
        const itemDate = parseISO(item.item_info.startDate);
        return !isBefore(itemDate, qStart) && !isAfter(itemDate, qEnd);
      })
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime());
    return allItems;
  };

  const getNavigationLabel = () => {
    if (calendarView === 'quarter') {
      const qStart = startOfQuarter(currentMonth);
      const qEnd = endOfQuarter(currentMonth);
      return `${format(qStart, 'MMM')} - ${format(qEnd, 'MMM yyyy')}`;
    }
    return format(currentMonth, 'MMMM yyyy');
  };

  const handleItemClick = (item: PublicItem) => {
    if (item.item_type === 'Event') {
      navigate(`/event/${item.slug}`);
    } else if (item.item_type === 'Classes') {
      navigate(`/classes/${item.slug}`);
    }
  };

  const handleExportItem = (e: React.MouseEvent, item: PublicItem) => {
    e.stopPropagation();
    const baseUrl = window.location.origin;
    exportSingleItem(item, baseUrl);
    toast.success(`Exported ${item.title} to calendar`);
  };

  const handleExportAll = () => {
    const allItems = [...events, ...classes];
    if (allItems.length === 0) {
      toast.error("No events or classes to export");
      return;
    }
    const baseUrl = window.location.origin;
    exportMultipleItems(allItems, baseUrl);
    toast.success(`Exported ${allItems.length} items to calendar`);
  };

  const handleNotificationToggle = (categoryId: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedNotifications(NOTIFICATION_CATEGORIES.map(cat => cat.id));
  };

  const handleClearAll = () => {
    setSelectedNotifications([]);
  };

  const handleSavePreferences = async () => {
    if (!user || !customer) return;
    
    try {
      setSavingPreferences(true);
      const notificationsData = {
        categories: selectedNotifications,
        emailFrequency: emailFrequency,
      };
      
      const updatedCustInfo = {
        ...(customer.cust_info || {}),
        notifications: notificationsData,
      };
      
      await elegantAPI.patchCustomer(user.id, customer.id, {
        cust_info: updatedCustInfo,
      });
      
      // Update local customer state
      setCustomer({
        ...customer,
        cust_info: updatedCustInfo,
      });
      
      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSavingPreferences(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get first day of the week for the month (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  
  // Add empty cells for days before the first day of the month
  const emptyDays = Array(firstDayOfWeek).fill(null);
  
  const upcomingItems = getUpcomingItems();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome back, {customer?.Full_name || 'Member'}!</h1>
          <p className="text-muted-foreground">Here's an overview of your membership</p>
        </div>
        <Tabs value={dashboardView} onValueChange={(v) => setDashboardView(v as 'overview' | 'analytics')}>
          <TabsList>
            <TabsTrigger value="overview">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {dashboardView === 'analytics' ? (
        <MemberAnalyticsDashboard clerkUserId={user?.id} />
      ) : (
        <>
          {/* Notification Preferences Filter */}
      <Collapsible open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", preferencesOpen && "rotate-180")} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedNotifications.length} categories selected
                </div>
              </div>
              <CardDescription>Click to expand and customize your notification settings</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Email Frequency Section */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Email Frequency</Label>
                <RadioGroup value={emailFrequency} onValueChange={setEmailFrequency} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="cursor-pointer">Once a Week</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly" className="cursor-pointer">Once a Month</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="cursor-pointer">Do not notify</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Categories Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Notification Categories</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <div
                      key={category.id}
                      className={cn(
                        "flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors",
                        selectedNotifications.includes(category.id)
                          ? "bg-primary/10 border-primary"
                          : "bg-background hover:bg-accent"
                      )}
                      onClick={() => handleNotificationToggle(category.id)}
                    >
                      <Checkbox
                        id={category.id}
                        checked={selectedNotifications.includes(category.id)}
                        onCheckedChange={() => handleNotificationToggle(category.id)}
                      />
                      <Label
                        htmlFor={category.id}
                        className="text-sm font-medium cursor-pointer select-none"
                      >
                        {category.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedNotifications.length} of {NOTIFICATION_CATEGORIES.length} categories selected
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSavePreferences} disabled={savingPreferences}>
                  {savingPreferences ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Status</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg uppercase">
                {customer?._customer_role?.role || 'Member'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status: {customer?._customer_role?.status || 'Active'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold break-all">{customer?.email}</div>
            <p className="text-xs text-muted-foreground mt-2">Primary contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Since</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {customer?.created_at ? format(new Date(customer.created_at), 'MMM dd, yyyy') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Join date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Event Calendar
                  </CardTitle>
                  <CardDescription>Upcoming events and classes</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportAll}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Tabs value={calendarView} onValueChange={(v) => setCalendarView(v as 'list' | 'month' | 'quarter')}>
                  <TabsList>
                    <TabsTrigger value="list" className="gap-1">
                      <List className="h-4 w-4" />
                      List
                    </TabsTrigger>
                    <TabsTrigger value="month" className="gap-1">
                      <Grid3X3 className="h-4 w-4" />
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="quarter" className="gap-1">
                      <LayoutGrid className="h-4 w-4" />
                      Quarter
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {calendarView !== 'list' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevious}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-semibold min-w-[140px] text-center">
                      {getNavigationLabel()}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCalendar ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                {/* List View */}
                {calendarView === 'list' && (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {getListItems().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No upcoming events or classes</p>
                    ) : (
                      getListItems().map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <Badge variant={item.item_type === 'Event' ? 'default' : 'secondary'} className="text-xs">
                              {item.item_type}
                            </Badge>
                            <div>
                              <h4 className="text-sm font-semibold">{item.title}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                {item.item_info?.startDate && format(parseISO(item.item_info.startDate), 'EEE, MMM dd, yyyy • h:mm a')}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleExportItem(e, item)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Month View */}
                {calendarView === 'month' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {emptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="aspect-square" />
                      ))}
                      {daysInMonth.map(day => {
                        const itemsForDay = getItemsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        const hasItems = itemsForDay.length > 0;
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "aspect-square p-2 border rounded-lg relative",
                              isToday && "border-primary bg-primary/5",
                              hasItems && "bg-accent/50",
                              !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
                            )}
                          >
                            <div className="text-sm font-medium">{format(day, 'd')}</div>
                            {hasItems && (
                              <div className="absolute bottom-1 left-1 right-1">
                                <div className="flex gap-0.5 flex-wrap">
                                  {itemsForDay.slice(0, 3).map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        item.item_type === 'Event' ? "bg-blue-500" : "bg-green-500"
                                      )}
                                      title={item.title}
                                    />
                                  ))}
                                  {itemsForDay.length > 3 && (
                                    <div className="text-[8px] text-muted-foreground">+{itemsForDay.length - 3}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quarter View */}
                {calendarView === 'quarter' && (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {getQuarterItems().length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No events or classes this quarter</p>
                    ) : (
                      getQuarterItems().map(item => (
                        <div
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <Badge variant={item.item_type === 'Event' ? 'default' : 'secondary'} className="text-xs">
                              {item.item_type}
                            </Badge>
                            <div>
                              <h4 className="text-sm font-semibold">{item.title}</h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                {item.item_info?.startDate && format(parseISO(item.item_info.startDate), 'EEE, MMM dd, yyyy • h:mm a')}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleExportItem(e, item)}>
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Events</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Classes</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sponsor Ads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sponsors</CardTitle>
            <CardDescription>Featured partners</CardDescription>
          </CardHeader>
          <CardContent>
            {sponsorAds.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active sponsors
              </p>
            ) : (
              <div className="space-y-4">
                {sponsorAds.slice(0, 4).map(ad => {
                  const adImage = (ad as any)._item_images_of_items?.items?.[0]?.display_image;
                  return (
                    <a
                      key={ad.id}
                      href={ad.item_info?.reference_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 border rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        {adImage && (
                          <img
                            src={adImage}
                            alt={ad.title}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium text-primary/60 uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
                              AD
                            </span>
                            <h4 className="text-sm font-semibold truncate">{ad.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ad.description}
                          </p>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and activities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">• Browse upcoming events and classes</p>
            <p className="text-sm text-muted-foreground">• Check your order history</p>
            <p className="text-sm text-muted-foreground">• Update your profile information</p>
            <p className="text-sm text-muted-foreground">• Manage your membership details</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your membership details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Member #: {customer?.customer_number || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Club: {customer?._shops?.name || 'Tampa Bay Mineral and Science Club'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
