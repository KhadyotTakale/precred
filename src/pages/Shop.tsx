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
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, Plus, DollarSign } from "lucide-react";

const Shop = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [products, setProducts] = useState<PublicItem[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "title">("title");
  const [priceRange, setPriceRange] = useState<"all" | "0-50" | "50-100" | "100+">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await elegantAPI.getPublicProducts(1);
        const activeProducts = response.items.filter(item => !item.Is_disabled);
        setProducts(activeProducts);
        setFilteredProducts(activeProducts);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setError('Unable to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply price filter
    if (priceRange !== "all") {
      filtered = filtered.filter(product => {
        const price = product.price || 0;
        switch (priceRange) {
          case "0-50": return price <= 50;
          case "50-100": return price > 50 && price <= 100;
          case "100+": return price > 100;
          default: return true;
        }
      });
    }

    // Apply sorting
    if (sortBy === "price-asc") {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "title") {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, sortBy, priceRange, products]);

  const getProductImage = (product: PublicItem) => {
    try {
      const info = product.item_info ? JSON.parse(JSON.stringify(product.item_info)) : null;
      const imageData = info?.image;
      
      if (Array.isArray(imageData) && imageData.length > 0) {
        return imageData[0];
      }
      
      return imageData || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
    } catch {
      return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500';
    }
  };

  const handleAddToCart = (product: PublicItem) => {
    addItem({
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      price: product.price || 0,
      currency: product.currency || 'USD',
      image: getProductImage(product),
    });
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const uniqueCategories = Array.from(
    new Set(
      products
        .filter(p => p.tags)
        .flatMap(p => p.tags!.split(',').map(t => t.trim()))
    )
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Marketplace - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Shop unique minerals, gems, tools, and collectibles from our curated marketplace." />
        <link rel="canonical" href={`${window.location.origin}/shop`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Marketplace - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Shop unique minerals, gems, tools, and collectibles from our curated marketplace." />
        <meta property="og:url" content={`${window.location.origin}/shop`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Marketplace - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Shop unique minerals, gems, tools, and collectibles from our curated marketplace." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Premium Products</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Shop Our Collection
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover unique minerals, gems, tools, and collectibles from our curated marketplace
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
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4 w-full md:w-auto flex-wrap">
                <Select value={priceRange} onValueChange={(value: any) => setPriceRange(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Price Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="0-50">Under $50</SelectItem>
                    <SelectItem value="50-100">$50 - $100</SelectItem>
                    <SelectItem value="100+">Over $100</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Sort by Name</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="ml-auto md:ml-0">
                  {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                </Badge>
              </div>
            </div>

            {/* Category Tags */}
            {uniqueCategories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">Categories:</span>
                {uniqueCategories.slice(0, 8).map((category) => (
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

      {/* Products Grid */}
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
            ) : currentProducts.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                  {currentProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
                      <div 
                        className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                        onClick={() => navigate(`/shop/${product.slug}`)}
                      >
                        <img
                          src={getProductImage(product)}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.price && (
                          <Badge className="absolute top-3 right-3 bg-primary/90 backdrop-blur">
                            ${product.price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle 
                          className="text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/shop/${product.slug}`)}
                        >
                          {product.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                        {product.tags && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.tags.split(',').slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex gap-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => navigate(`/shop/${product.slug}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                        >
                          <Plus className="h-4 w-4" />
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
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? `No products match "${searchQuery}". Try a different search term.`
                      : "No products available at this time. Check back soon!"
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

export default Shop;
