import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, CalendarDays, List, Grid3x3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, isAfter, startOfDay } from "date-fns";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = 'month' | 'week' | 'list';

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allEvents, setAllEvents] = useState<PublicItem[]>([]);
  const [allClasses, setAllClasses] = useState<PublicItem[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoadingCalendar(true);
        setError(null);
        const [eventsResponse, classesResponse] = await Promise.all([
          elegantAPI.getPublicItems(1, 100, 'Event'),
          elegantAPI.getPublicItems(1, 100, 'Classes')
        ]);
        
        setAllEvents(eventsResponse.items.filter(item => !item.Is_disabled));
        setAllClasses(classesResponse.items.filter(item => !item.Is_disabled));
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setError('Unable to load calendar. Please try again later.');
      } finally {
        setLoadingCalendar(false);
      }
    };

    fetchCalendarData();
  }, []);

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayEvents = allEvents.filter(event => {
      if (!event.item_info?.startDate) return false;
      const eventDate = format(parseISO(event.item_info.startDate), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });

    const dayClasses = allClasses.filter(cls => {
      if (!cls.item_info?.startDate) return false;
      const classDate = format(parseISO(cls.item_info.startDate), 'yyyy-MM-dd');
      return classDate === dateStr;
    });

    return [...dayEvents, ...dayClasses];
  };

  const handlePreviousMonth = () => {
    if (viewMode === 'week') {
      setCurrentMonth(subWeeks(currentMonth, 1));
    } else {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === 'week') {
      setCurrentMonth(addWeeks(currentMonth, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const handleDayClick = (date: Date, items: PublicItem[]) => {
    if (items.length > 0) {
      setSelectedDate(date);
      setPopoverOpen(true);
    }
  };

  const formatItemTime = (item: PublicItem) => {
    if (!item.item_info?.startDate) return 'Time TBA';
    const date = new Date(item.item_info.startDate);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  // Week view calculations
  const weekStart = startOfWeek(currentMonth);
  const weekEnd = endOfWeek(currentMonth);
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // List view - get all upcoming items
  const getAllUpcomingItems = () => {
    const today = startOfDay(new Date());
    const allItems = [...allEvents, ...allClasses];
    
    return allItems
      .filter(item => item.item_info?.startDate && isAfter(parseISO(item.item_info.startDate), today))
      .sort((a, b) => new Date(a.item_info.startDate).getTime() - new Date(b.item_info.startDate).getTime());
  };

  const upcomingItems = getAllUpcomingItems();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Event Calendar - Tampa Bay Mineral and Science Club</title>
        <meta name="description" content="View all upcoming events, classes, and field trips on our comprehensive calendar. Stay connected with the Tampa Bay Mineral and Science Club community." />
        <link rel="canonical" href={`${window.location.origin}/calendar`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Event Calendar - Tampa Bay Mineral and Science Club" />
        <meta property="og:description" content="View all upcoming events, classes, and field trips on our comprehensive calendar. Stay connected with the Tampa Bay Mineral and Science Club community." />
        <meta property="og:url" content={`${window.location.origin}/calendar`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Event Calendar - Tampa Bay Mineral and Science Club" />
        <meta name="twitter:description" content="View all upcoming events, classes, and field trips on our comprehensive calendar. Stay connected with the Tampa Bay Mineral and Science Club community." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-6 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Event Calendar
            </h1>
            <p className="text-lg text-muted-foreground">
              Stay up to date with all our upcoming events, classes, and field trips. Click on any day to see scheduled activities.
            </p>
          </div>
        </div>
      </section>

      {/* Calendar Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {error ? (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Card className="max-w-6xl mx-auto">
              <CardContent className="p-6 md:p-8">
                {/* View Toggle and Navigation */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handlePreviousMonth}
                      disabled={viewMode === 'list'}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-2xl font-bold min-w-[200px] text-center">
                      {viewMode === 'week' 
                        ? `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
                        : format(currentMonth, 'MMMM yyyy')
                      }
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleNextMonth}
                      disabled={viewMode === 'list'}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="month" className="flex items-center gap-2">
                        <Grid3x3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Month</span>
                      </TabsTrigger>
                      <TabsTrigger value="week" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span className="hidden sm:inline">Week</span>
                      </TabsTrigger>
                      <TabsTrigger value="list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        <span className="hidden sm:inline">List</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {loadingCalendar ? (
                  <Skeleton className="h-[600px] w-full" />
                ) : viewMode === 'list' ? (
                  /* List View */
                  <div className="space-y-4">
                    {upcomingItems.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        No upcoming events or classes scheduled
                      </div>
                    ) : (
                      upcomingItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => {
                            const path = item.item_type === 'Event' 
                              ? `/event/${item.slug}` 
                              : `/classes/${item.slug}`;
                            window.location.href = path;
                          }}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-3 md:w-48">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-primary">
                                  {format(parseISO(item.item_info.startDate), 'd')}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(parseISO(item.item_info.startDate), 'MMM yyyy')}
                                </div>
                              </div>
                              <Badge 
                                variant={item.item_type === 'Event' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {item.item_type}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Clock className="h-4 w-4" />
                                {formatItemTime(item)}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Month/Week View */
                  <div className="space-y-4">
                    {/* Calendar Header */}
                    <div className="grid grid-cols-7 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Empty cells for days before month starts (only for month view) */}
                      {viewMode === 'month' && emptyDays.map((_, index) => (
                        <div key={`empty-${index}`} className="aspect-square" />
                      ))}
                      
                      {/* Days of the month/week */}
                      {(viewMode === 'month' ? daysInMonth : daysInWeek).map(day => {
                        const itemsForDay = getItemsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        const hasItems = itemsForDay.length > 0;
                        
                        const dayCell = (
                          <div
                            onClick={() => handleDayClick(day, itemsForDay)}
                            className={cn(
                              "aspect-square p-2 border rounded-lg relative transition-all",
                              isToday && "border-primary bg-primary/5 font-semibold ring-2 ring-primary",
                              hasItems && "bg-accent/50 cursor-pointer hover:shadow-md hover:scale-105",
                              !hasItems && "hover:bg-muted/30",
                              !isSameMonth(day, currentMonth) && "text-muted-foreground opacity-50"
                            )}
                          >
                            <div className="text-sm md:text-base">{format(day, 'd')}</div>
                            {hasItems && (
                              <div className="absolute bottom-1 left-1 right-1">
                                <div className="flex gap-0.5 flex-wrap justify-center">
                                  {itemsForDay.slice(0, 4).map((item, idx) => (
                                    <div
                                      key={idx}
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        item.item_type === 'Event' ? "bg-blue-500" : "bg-green-500"
                                      )}
                                      title={item.title}
                                    />
                                  ))}
                                  {itemsForDay.length > 4 && (
                                    <div className="text-[8px] text-muted-foreground font-semibold">+{itemsForDay.length - 4}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );

                        if (hasItems) {
                          return (
                            <Popover 
                              key={day.toISOString()} 
                              open={popoverOpen && selectedDate ? isSameDay(selectedDate, day) : false}
                              onOpenChange={(open) => {
                                setPopoverOpen(open);
                                if (!open) setSelectedDate(null);
                              }}
                            >
                              <PopoverTrigger asChild>
                                {dayCell}
                              </PopoverTrigger>
                              <PopoverContent className="w-80 bg-background border shadow-lg z-50" align="center">
                                <div className="space-y-4">
                                  <div className="border-b pb-2">
                                    <h4 className="font-semibold text-lg">
                                      {format(day, 'EEEE, MMMM d, yyyy')}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {itemsForDay.length} {itemsForDay.length === 1 ? 'item' : 'items'} scheduled
                                    </p>
                                  </div>
                                  <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {itemsForDay.map((item, idx) => (
                                      <div 
                                        key={idx}
                                        className="p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                                        onClick={() => {
                                          const path = item.item_type === 'Event' 
                                            ? `/event/${item.slug}` 
                                            : `/classes/${item.slug}`;
                                          window.location.href = path;
                                        }}
                                      >
                                        <div className="flex items-start gap-2 mb-2">
                                          <Badge 
                                            variant={item.item_type === 'Event' ? 'default' : 'secondary'}
                                            className="text-xs"
                                          >
                                            {item.item_type}
                                          </Badge>
                                        </div>
                                        <h5 className="font-semibold text-sm mb-1">{item.title}</h5>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Clock className="h-3 w-3" />
                                          {formatItemTime(item)}
                                        </div>
                                        {item.description && (
                                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                            {item.description}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        }
                        
                        return <div key={day.toISOString()}>{dayCell}</div>;
                      })}
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 mt-8 pt-6 border-t">
                      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="w-5 h-5 rounded-full bg-blue-500 shadow-md" />
                        <span className="text-base font-semibold text-foreground">Events</span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="w-5 h-5 rounded-full bg-green-500 shadow-md" />
                        <span className="text-base font-semibold text-foreground">Classes</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Section */}
          <div className="max-w-4xl mx-auto mt-12">
            <Card className="bg-muted/30">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-center">How to Use the Calendar</h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">1</div>
                    <p className="font-semibold mb-1">Browse by Month</p>
                    <p className="text-muted-foreground">Use arrows to navigate between months</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">2</div>
                    <p className="font-semibold mb-1">Click on Days</p>
                    <p className="text-muted-foreground">Days with dots have scheduled events</p>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mx-auto mb-2">3</div>
                    <p className="font-semibold mb-1">View Details</p>
                    <p className="text-muted-foreground">Click any item to see full details</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Calendar;
