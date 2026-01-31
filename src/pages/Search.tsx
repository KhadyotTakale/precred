import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Search, Filter, X } from "lucide-react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { elegantAPI, type SearchItemsResponse } from "@/lib/elegant-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchItemsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemTypeFilter, setItemTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setSearchQuery(query);
      setCurrentPage(1);
      performSearch(query, 1);
    }
  }, [searchParams]);

  useEffect(() => {
    const query = searchParams.get("q");
    if (query && currentPage > 1) {
      performSearch(query, currentPage);
    }
  }, [currentPage]);

  const performSearch = async (query: string, page: number = 1) => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await elegantAPI.searchItems(query.trim(), page, 10);
      setResults(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error("Search failed:", err);
      setError("Failed to perform search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentPage(1);
      setSearchParams({ q: searchQuery.trim() });
    }
  };

  const getItemImage = (item: SearchItemsResponse["items"][0]) => {
    const images = item._item_images_of_items?.items;
    if (images && images.length > 0) {
      return images[0].display_image;
    }
    return "/placeholder.svg";
  };

  const filteredResults = results?.items.filter((item) => {
    if (itemTypeFilter === "all") return true;
    return item.item_type === itemTypeFilter;
  }) || [];

  const itemTypes = Array.from(
    new Set(results?.items.map((item) => item.item_type).filter(Boolean) || [])
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Search Results - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Search results for minerals, gems, vendors, classes, and more." />
        <link rel="canonical" href={`${window.location.origin}/search`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Search Results - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Search results for minerals, gems, vendors, classes, and more." />
        <meta property="og:url" content={`${window.location.origin}/search`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Search Results - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Search results for minerals, gems, vendors, classes, and more." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-20">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Search Results</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Search Results
          </h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="relative max-w-2xl">
              <Input
                type="text"
                placeholder="Search for minerals, gems, vendors, classes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pr-12 text-base"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10"
                disabled={!searchQuery.trim()}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Desktop Filter */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Filter by:</span>
              <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {itemTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {itemTypeFilter !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setItemTypeFilter("all")}
                  className="h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Mobile Filter */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Item Type</label>
                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {itemTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {itemTypeFilter !== "all" && (
                    <Button
                      variant="outline"
                      onClick={() => setItemTypeFilter("all")}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Results Count */}
            {results && (
              <div className="ml-auto">
                <span className="text-sm text-muted-foreground">
                  {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} found
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-2xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredResults.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResults.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer"
                onClick={() => {
                  // Navigate based on item type
                  const typeRoutes: Record<string, string> = {
                    Event: "event",
                    Classes: "classes",
                    Vendors: "vendors",
                    Minerals: "rocks",
                    Product: "shop",
                  };
                  const route = typeRoutes[item.item_type] || "shop";
                  navigate(`/${route}/${item.slug}`);
                }}
              >
                <div className="relative h-48 overflow-hidden bg-muted">
                  <img
                    src={getItemImage(item)}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                  <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                    {item.item_type}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {item.description}
                  </p>
                  {item._shops && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{item._shops.name}</span>
                    </div>
                  )}
                  {item.price && item.price > 0 && (
                    <div className="mt-2">
                      <span className="text-lg font-bold text-primary">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.unit && (
                        <span className="text-sm text-muted-foreground ml-1">
                          / {item.unit}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {results && (results.prevPage || results.nextPage) && (
            <Pagination className="mt-8">
              <PaginationContent>
                {results.prevPage && (
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(results.prevPage!)}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationLink isActive>
                    Page {results.curPage}
                  </PaginationLink>
                </PaginationItem>

                {results.nextPage && (
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(results.nextPage!)}
                      className="cursor-pointer"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
          </>
        ) : results ? (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground">
                No results found for "{searchParams.get("q")}". Try different keywords.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground">
                Enter a search term to find minerals, gems, vendors, and more.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
