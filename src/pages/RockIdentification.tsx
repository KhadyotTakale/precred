import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Search, Mountain, ChevronLeft, ChevronRight, Gem, Info } from "lucide-react";

const RockIdentification = () => {
  const navigate = useNavigate();
  const [minerals, setMinerals] = useState<PublicItem[]>([]);
  const [filteredMinerals, setFilteredMinerals] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "rank">("title");
  const [filterType, setFilterType] = useState<"all" | "mineral" | "gem" | "fossil">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchMinerals = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await elegantAPI.getPublicMinerals(1);
        const activeMinerals = response.items.filter(item => !item.Is_disabled);
        setMinerals(activeMinerals);
        setFilteredMinerals(activeMinerals);
      } catch (error) {
        console.error('Failed to fetch minerals:', error);
        setError('Unable to load minerals. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMinerals();
  }, []);

  useEffect(() => {
    let filtered = [...minerals];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(mineral =>
        mineral.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mineral.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mineral.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter(mineral => 
        mineral.tags?.toLowerCase().includes(filterType.toLowerCase())
      );
    }

    // Apply sorting
    if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "rank") {
      filtered.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    }

    setFilteredMinerals(filtered);
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterType, minerals]);

  const getMineralImage = (mineral: PublicItem) => {
    try {
      const info = mineral.item_info ? JSON.parse(JSON.stringify(mineral.item_info)) : null;
      const imageData = info?.image;
      
      if (Array.isArray(imageData) && imageData.length > 0) {
        return imageData[0];
      }
      
      return imageData || 'https://images.unsplash.com/photo-1596003906949-67221c37965c?w=500';
    } catch {
      return 'https://images.unsplash.com/photo-1596003906949-67221c37965c?w=500';
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentMinerals = filteredMinerals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMinerals.length / itemsPerPage);

  const uniqueCategories = Array.from(
    new Set(
      minerals
        .filter(m => m.tags)
        .flatMap(m => m.tags!.split(',').map(t => t.trim()))
    )
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Rock & Mineral Identification - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Explore our comprehensive directory of minerals, gems, and fossils with detailed identification information." />
        <link rel="canonical" href={`${window.location.origin}/rock-identification`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Rock & Mineral Identification - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Explore our comprehensive directory of minerals, gems, and fossils with detailed identification information." />
        <meta property="og:url" content={`${window.location.origin}/rock-identification`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Rock & Mineral Identification - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Explore our comprehensive directory of minerals, gems, and fossils with detailed identification information." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Gem className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Mineral Directory</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Rock Identification Guide
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore our comprehensive directory of minerals, gems, and fossils with detailed information and images
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 border-b bg-card/50 sticky top-16 z-40">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search minerals, gems, fossils..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="mineral">Minerals</SelectItem>
                    <SelectItem value="gem">Gems</SelectItem>
                    <SelectItem value="fossil">Fossils</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Sort by Name</SelectItem>
                    <SelectItem value="rank">Sort by Rank</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="ml-auto md:ml-0">
                  {filteredMinerals.length} {filteredMinerals.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>
            </div>

            {/* Category Tags */}
            {uniqueCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Categories:</span>
                {uniqueCategories.slice(0, 10).map((category) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(category)}
                    className="h-7 text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Minerals Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-56 w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : currentMinerals.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                  {currentMinerals.map((mineral) => (
                    <Card key={mineral.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div 
                        className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                        onClick={() => navigate(`/rocks/${mineral.slug}`)}
                      >
                        <img
                          src={getMineralImage(mineral)}
                          alt={mineral.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {mineral.rank && (
                          <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                            Rank {mineral.rank}
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle 
                          className="text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/rocks/${mineral.slug}`)}
                        >
                          {mineral.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {mineral.description}
                        </p>
                        {mineral.tags && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {mineral.tags.split(',').slice(0, 3).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => navigate(`/rocks/${mineral.slug}`)}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
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
                  <Mountain className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No minerals found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? `No minerals match "${searchQuery}". Try a different search term.`
                      : "No minerals available at this time. Check back soon!"
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
    </div>
  );
};

export default RockIdentification;
