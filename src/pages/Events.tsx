import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Calendar, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import eventImage from "@/assets/event-show.jpg";
import { createItemListSchema, createCollectionPageSchema, createBreadcrumbSchema, cleanSchema } from "@/lib/schema-utils";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<PublicItem[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 12;

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await elegantAPI.getPublicItems(1, 100, 'Event');
        const activeEvents = response.items.filter(item => !item.Is_disabled);
        setEvents(activeEvents);
        setFilteredEvents(activeEvents);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setError('Unable to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy === "date") {
      filtered.sort((a, b) => {
        const dateA = getEventStartDate(a);
        const dateB = getEventStartDate(b);
        return dateA && dateB ? new Date(dateA).getTime() - new Date(dateB).getTime() : 0;
      });
    } else if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredEvents(filtered);
    setCurrentPage(1);
  }, [searchQuery, sortBy, events]);

  const getEventInfo = (event: PublicItem) => {
    try {
      return event.item_info ? JSON.parse(JSON.stringify(event.item_info)) : null;
    } catch {
      return null;
    }
  };

  const getEventImage = (event: PublicItem) => {
    const info = getEventInfo(event);
    const imageData = info?.image;
    
    if (Array.isArray(imageData) && imageData.length > 0) {
      return imageData[0];
    }
    
    return imageData || eventImage;
  };

  const getEventMediaType = (event: PublicItem): 'Image' | 'Video' | 'YouTube' => {
    const imageUrl = getEventImage(event);
    
    if (imageUrl.includes('youtube.com') || imageUrl.includes('youtu.be')) {
      return 'YouTube';
    }
    if (imageUrl.match(/\.(mp4|webm|ogg|mov)$/i)) {
      return 'Video';
    }
    return 'Image';
  };

  const getEventLocation = (event: PublicItem) => {
    const info = getEventInfo(event);
    return info?.location?.name || info?.location || 'Location TBA';
  };

  const getEventStartDate = (event: PublicItem) => {
    const info = getEventInfo(event);
    return info?.startDate;
  };

  const getEventDate = (event: PublicItem) => {
    const info = getEventInfo(event);
    if (info?.startDate) {
      const date = new Date(info.startDate);
      const dateStr = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr}`;
    }
    return 'Date TBA';
  };

  // Pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const uniqueTags = Array.from(
    new Set(
      events
        .filter(e => e.tags)
        .flatMap(e => e.tags!.split(',').map(t => t.trim()))
    )
  );

  // Schema.org structured data for listing page
  const itemListSchema = useMemo(() => {
    if (!filteredEvents.length) return null;
    return createItemListSchema({
      name: "Events",
      description: "Discover upcoming gem shows, mineral exhibitions, workshops, and community gatherings throughout the year.",
      url: `${window.location.origin}/event`,
      items: filteredEvents.map((event) => {
        return {
          name: event.title,
          url: `${window.location.origin}/event/${event.slug}`,
          image: getEventImage(event),
          description: event.description?.substring(0, 160),
        };
      }),
    });
  }, [filteredEvents]);

  const collectionPageSchema = useMemo(() => createCollectionPageSchema({
    name: "Events - Tampa Bay Minerals & Science Club",
    description: "Discover upcoming gem shows, mineral exhibitions, workshops, and community gatherings throughout the year.",
    url: `${window.location.origin}/event`,
    image: `${window.location.origin}${eventImage}`,
  }), []);

  const breadcrumbSchema = useMemo(() => createBreadcrumbSchema([
    { name: "Home", url: `${window.location.origin}/` },
    { name: "Events", url: `${window.location.origin}/event` },
  ]), []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Events - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Discover upcoming gem shows, mineral exhibitions, workshops, and community gatherings throughout the year." />
        <link rel="canonical" href={`${window.location.origin}/event`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Events - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Discover upcoming gem shows, mineral exhibitions, workshops, and community gatherings throughout the year." />
        <meta property="og:url" content={`${window.location.origin}/event`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}${eventImage}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Events - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Discover upcoming gem shows, mineral exhibitions, workshops, and community gatherings throughout the year." />
        <meta name="twitter:image" content={`${window.location.origin}${eventImage}`} />
        
        {/* Structured Data - CollectionPage */}
        <script type="application/ld+json">
          {JSON.stringify(cleanSchema(collectionPageSchema))}
        </script>
        
        {/* Structured Data - BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        
        {/* Structured Data - ItemList */}
        {itemListSchema && (
          <script type="application/ld+json">
            {JSON.stringify(cleanSchema(itemListSchema))}
          </script>
        )}
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Discover Amazing Events</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Upcoming Events & Shows
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join us at exciting gem shows, mineral exhibitions, workshops, and community gatherings throughout the year
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={(value: "date" | "title") => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Sort by Date</SelectItem>
                      <SelectItem value="title">Sort by Title</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results count */}
                <Badge variant="secondary" className="ml-auto md:ml-0">
                  {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </Badge>
              </div>
            </div>

            {/* Tags Filter */}
            {uniqueTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Popular tags:</span>
                {uniqueTags.slice(0, 8).map((tag) => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(tag)}
                    className="h-7 text-xs"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className={`rounded-xl ${i === 1 ? 'col-span-2 row-span-2' : ''}`} />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : currentEvents.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px] mb-12">
                  {currentEvents.map((event, index) => {
                    const patternIndex = index % 6;
                    const isLarge = patternIndex === 0;
                    const isWide = patternIndex === 5;
                    
                    return (
                      <Link
                        key={event.id}
                        to={`/event/${event.slug}`}
                        className={`group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.1)] ${
                          isLarge ? 'col-span-2 row-span-2' : isWide ? 'col-span-2' : ''
                        }`}
                      >
                        <img
                          src={getEventImage(event)}
                          alt={event.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        
                        {/* Badge */}
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-primary/90 text-primary-foreground text-xs">
                            {event.tags?.split(',')[0]?.trim() || 'Event'}
                          </Badge>
                        </div>
                        
                        {/* Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className={`font-bold text-white mb-1 line-clamp-2 ${isLarge ? 'text-xl md:text-2xl' : 'text-sm md:text-base'}`}>
                            {event.title}
                          </h3>
                          {(isLarge || isWide) && (
                            <p className="text-white/80 text-xs md:text-sm line-clamp-2 mb-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-white/70 text-xs">
                            <Calendar className="h-3 w-3" />
                            <span className="line-clamp-1">{getEventDate(event)}</span>
                          </div>
                          {isLarge && (
                            <div className="mt-3 flex items-center gap-1 text-white text-sm font-medium">
                              <span>Learn more</span>
                              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="max-w-2xl mx-auto p-12 text-center">
                <CardContent>
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No events found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? `No events match "${searchQuery}". Try a different search term.`
                      : "No upcoming events at this time. Check back soon for exciting new events!"
                    }
                  </p>
                  {searchQuery && (
                    <Button onClick={() => setSearchQuery("")} variant="outline">
                      Clear Search
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Don't Miss Out on Future Events
            </h2>
            <p className="text-lg text-muted-foreground">
              Subscribe to our newsletter to stay updated on upcoming events, workshops, and special announcements
            </p>
            <Button size="lg" onClick={() => navigate("/#newsletter")}>
              Subscribe to Newsletter
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Events;
