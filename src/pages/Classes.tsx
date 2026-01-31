import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import ClassCard from "@/components/ClassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { GraduationCap, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import classImage from "@/assets/classes-lapidary.jpg";
import { createItemListSchema, createCollectionPageSchema, createBreadcrumbSchema, cleanSchema } from "@/lib/schema-utils";

const Classes = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<PublicItem[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "title" | "level">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const classesPerPage = 12;

  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await elegantAPI.getPublicItems(1, 100, 'Classes');
        const activeClasses = response.items.filter(item => !item.Is_disabled);
        setClasses(activeClasses);
        setFilteredClasses(activeClasses);
      } catch (error) {
        console.error('Failed to fetch classes:', error);
        setError('Unable to load classes. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    let filtered = [...classes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(cls =>
        cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply level filter
    if (levelFilter !== "all") {
      filtered = filtered.filter(cls => {
        const info = getClassInfo(cls);
        return info?.educationalLevel?.toLowerCase() === levelFilter.toLowerCase();
      });
    }

    // Apply sorting
    if (sortBy === "date") {
      filtered.sort((a, b) => {
        const dateA = getClassStartDate(a);
        const dateB = getClassStartDate(b);
        return dateA && dateB ? new Date(dateA).getTime() - new Date(dateB).getTime() : 0;
      });
    } else if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "level") {
      const levelOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      filtered.sort((a, b) => {
        const levelA = getClassInfo(a)?.educationalLevel?.toLowerCase() || '';
        const levelB = getClassInfo(b)?.educationalLevel?.toLowerCase() || '';
        return (levelOrder[levelA as keyof typeof levelOrder] || 999) - (levelOrder[levelB as keyof typeof levelOrder] || 999);
      });
    }

    setFilteredClasses(filtered);
    setCurrentPage(1);
  }, [searchQuery, levelFilter, sortBy, classes]);

  const getClassInfo = (cls: PublicItem) => {
    try {
      return cls.item_info ? JSON.parse(JSON.stringify(cls.item_info)) : null;
    } catch {
      return null;
    }
  };

  const getClassStartDate = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.startDate;
  };

  const getClassDate = (cls: PublicItem) => {
    const info = getClassInfo(cls);
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

  const convertISO8601ToHours = (iso: string): string => {
    if (!iso) return 'TBA';
    const hourMatch = iso.match(/(\d+)H/);
    const minuteMatch = iso.match(/(\d+)M/);
    
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    
    if (hours === 0 && minutes === 0) return 'TBA';
    if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    if (hours === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    return `${hours}h ${minutes}m`;
  };

  const getClassDuration = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.duration ? convertISO8601ToHours(info.duration) : 'TBA';
  };

  const getClassCapacity = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.maximumAttendeeCapacity ? `Max ${info.maximumAttendeeCapacity}` : 'TBA';
  };

  const getClassLevel = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.educationalLevel || 'All Levels';
  };

  const getClassImage = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    const imageData = info?.image;
    
    if (Array.isArray(imageData) && imageData.length > 0) {
      return imageData[0];
    }
    
    return imageData || classImage;
  };

  const getClassImages = (cls: PublicItem): string[] => {
    const images: string[] = [];
    const info = getClassInfo(cls);
    
    // First, extract all images from item_info.image array if available
    if (info?.image && Array.isArray(info.image)) {
      images.push(...info.image.filter(Boolean));
    }
    
    // Then, extract all images from _item_images_of_items if available
    const itemWithImages = cls as any;
    if (itemWithImages._item_images_of_items?.items) {
      const imageItems = itemWithImages._item_images_of_items.items
        .filter((item: any) => item.image_type === 'Image' && item.display_image)
        .sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0))
        .map((item: any) => item.display_image);
      
      // Add only unique images
      imageItems.forEach((img: string) => {
        if (!images.includes(img)) {
          images.push(img);
        }
      });
    }
    
    // Fall back to main image if no images found
    if (images.length === 0) {
      const mainImage = getClassImage(cls);
      if (mainImage) {
        images.push(mainImage);
      }
    }
    
    return images;
  };

  const getRandomLayout = (): 'single' | 'triple' | 'mixed' | 'double' | 'horizontal' | 'compact' => {
    const layouts: ('single' | 'triple' | 'mixed' | 'double' | 'horizontal' | 'compact')[] = [
      'single', 'single', // More weight to single
      'triple', 'mixed', 'double', 
      'horizontal', 'horizontal', 'horizontal', // More weight to horizontal for variety
      'compact'
    ];
    return layouts[Math.floor(Math.random() * layouts.length)];
  };

  const getRandomGridSpan = (): string => {
    const spans = [
      'col-span-1 row-span-1', // Standard
      'md:col-span-2 lg:col-span-2 row-span-1', // Wide on desktop
      'col-span-1 row-span-2', // Tall
      'md:col-span-2 lg:col-span-2 row-span-2', // Large on desktop
    ];
    // Favor smaller spans for better masonry effect
    const weights = [0.5, 0.25, 0.20, 0.05];
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) return spans[i];
    }
    return spans[0];
  };

  const getRegistrationUrl = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.offers?.url || '#';
  };

  // Pagination
  const indexOfLastClass = currentPage * classesPerPage;
  const indexOfFirstClass = indexOfLastClass - classesPerPage;
  const currentClasses = filteredClasses.slice(indexOfFirstClass, indexOfLastClass);
  const totalPages = Math.ceil(filteredClasses.length / classesPerPage);

  // Get unique levels for filter
  const uniqueLevels = Array.from(
    new Set(
      classes
        .map(c => getClassInfo(c)?.educationalLevel)
        .filter(Boolean)
    )
  );

  // Schema.org structured data for listing page
  const itemListSchema = useMemo(() => {
    if (!filteredClasses.length) return null;
    return createItemListSchema({
      name: "Lapidary Classes & Workshops",
      description: "Master gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice in our lapidary classes.",
      url: `${window.location.origin}/classes`,
      items: filteredClasses.map((cls) => {
        const info = getClassInfo(cls);
        return {
          name: cls.title,
          url: `${window.location.origin}/classes/${cls.slug}`,
          image: getClassImage(cls),
          description: cls.description?.substring(0, 160),
        };
      }),
    });
  }, [filteredClasses]);

  const collectionPageSchema = useMemo(() => createCollectionPageSchema({
    name: "Lapidary Classes & Workshops - Tampa Bay Minerals & Science Club",
    description: "Master gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice in our lapidary classes.",
    url: `${window.location.origin}/classes`,
    image: `${window.location.origin}${classImage}`,
  }), []);

  const breadcrumbSchema = useMemo(() => createBreadcrumbSchema([
    { name: "Home", url: `${window.location.origin}/` },
    { name: "Classes", url: `${window.location.origin}/classes` },
  ]), []);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Lapidary Classes & Workshops - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Master gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice in our lapidary classes." />
        <link rel="canonical" href={`${window.location.origin}/classes`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Lapidary Classes & Workshops - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Master gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice in our lapidary classes." />
        <meta property="og:url" content={`${window.location.origin}/classes`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}${classImage}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lapidary Classes & Workshops - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Master gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice in our lapidary classes." />
        <meta name="twitter:image" content={`${window.location.origin}${classImage}`} />
        
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
      <section className="relative py-12 mt-20 bg-gradient-to-br from-accent/10 via-background to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Learn & Grow</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Lapidary Classes & Workshops
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Master the art of gemstone cutting, polishing, and jewelry making with expert instruction and hands-on practice
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
                  placeholder="Search classes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters & Sort */}
              <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                {/* Level Filter */}
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={(value: "date" | "title" | "level") => setSortBy(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="title">Sort by Title</SelectItem>
                    <SelectItem value="level">Sort by Level</SelectItem>
                  </SelectContent>
                </Select>

                {/* Results count */}
                <Badge variant="secondary">
                  {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Classes Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Skeleton 
                    key={i} 
                    className={`rounded-lg ${
                      i === 1 ? 'col-span-2 row-span-2' : 
                      i === 4 || i === 7 ? 'col-span-2' : ''
                    }`} 
                  />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : currentClasses.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px] mb-12">
                  {currentClasses.map((cls, index) => {
                    // Repeating bento pattern every 8 items
                    const patternIndex = index % 8;
                    const layouts = [
                      'col-span-2 row-span-2', // 0: Large feature
                      '', // 1: Small
                      '', // 2: Small
                      'col-span-2', // 3: Wide
                      '', // 4: Small
                      '', // 5: Small
                      'col-span-2', // 6: Wide
                      '', // 7: Small
                    ];
                    const layout = layouts[patternIndex] || '';
                    const isLarge = patternIndex === 0;
                    const isWide = patternIndex === 3 || patternIndex === 6;
                    
                    return (
                      <Link
                        key={cls.id}
                        to={`/classes/${cls.slug}`}
                        className={`group relative overflow-hidden rounded-lg bg-muted transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/20 ${layout}`}
                      >
                        <img
                          src={getClassImage(cls)}
                          alt={cls.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className={`absolute inset-0 bg-gradient-to-t ${isLarge || isWide ? 'from-black/80 via-black/20 to-transparent' : 'from-black/70 to-transparent'} transition-opacity group-hover:from-black/90`} />
                        <div className={`absolute inset-0 p-4 flex flex-col ${isLarge ? 'justify-end' : isWide ? 'flex-row items-end gap-4' : 'justify-end'}`}>
                          {isWide ? (
                            <>
                              <div className="flex-1" />
                              <div className="flex-1 text-white">
                                <h3 className="font-bold text-lg mb-1 line-clamp-2">{cls.title}</h3>
                                <p className="text-white/80 text-sm line-clamp-2">{cls.description}</p>
                                <span className="inline-flex items-center text-primary text-sm mt-2 group-hover:underline">
                                  Learn more <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                                </span>
                              </div>
                            </>
                          ) : isLarge ? (
                            <div className="text-white">
                              <Badge className="mb-2 bg-primary/90">{getClassLevel(cls)}</Badge>
                              <h3 className="font-bold text-xl md:text-2xl mb-2">{cls.title}</h3>
                              <p className="text-white/80 text-sm line-clamp-3 mb-3 max-w-md">{cls.description}</p>
                              <div className="flex items-center gap-4 text-white/70 text-sm mb-3">
                                <span>{getClassDuration(cls)}</span>
                                <span>•</span>
                                <span>{cls.price ? `$${cls.price}` : 'Free'}</span>
                              </div>
                              <span className="inline-flex items-center text-primary text-sm group-hover:underline">
                                Learn more <ArrowRight className="ml-1 h-3 w-3 transition-transform group-hover:translate-x-1" />
                              </span>
                            </div>
                          ) : (
                            <div className="text-white">
                              <h3 className="font-semibold text-sm md:text-base line-clamp-2">{cls.title}</h3>
                              {cls.price && <span className="text-xs text-white/70">${cls.price}</span>}
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
                  <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No classes found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? `No classes match "${searchQuery}". Try a different search term.`
                      : levelFilter !== "all"
                        ? `No ${levelFilter} classes available. Try a different level.`
                        : "No classes available at this time. Check back soon for new workshops!"
                    }
                  </p>
                  {(searchQuery || levelFilter !== "all") && (
                    <div className="flex gap-2 justify-center">
                      {searchQuery && (
                        <Button onClick={() => setSearchQuery("")} variant="outline">
                          Clear Search
                        </Button>
                      )}
                      {levelFilter !== "all" && (
                        <Button onClick={() => setLevelFilter("all")} variant="outline">
                          Show All Levels
                        </Button>
                      )}
                    </div>
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
              Ready to Start Your Learning Journey?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join our community of passionate learners and discover the art of lapidary craftsmanship
            </p>
            <Button size="lg" onClick={() => navigate("/#newsletter")}>
              Subscribe for Class Updates
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Classes;
