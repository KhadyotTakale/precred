import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { elegantAPI, type PublicItem } from "@/lib/elegant-api";
import { Users, Search, ChevronLeft, ChevronRight, Sparkles, ShoppingCart, CheckCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const Memberships = () => {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [memberships, setMemberships] = useState<PublicItem[]>([]);
  const [filteredMemberships, setFilteredMemberships] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const membershipsPerPage = 9;

  useEffect(() => {
    const fetchMemberships = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await elegantAPI.getPublicItems(1, 100, 'Membership');
        const activeMemberships = response.items.filter(item => !item.Is_disabled);
        setMemberships(activeMemberships);
        setFilteredMemberships(activeMemberships);
      } catch (error) {
        console.error('Failed to fetch memberships:', error);
        setError('Unable to load memberships. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemberships();
  }, []);

  useEffect(() => {
    let filtered = [...memberships];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(membership =>
        membership.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredMemberships(filtered);
    setCurrentPage(1);
  }, [searchQuery, memberships]);

  const getMembershipInfo = (membership: PublicItem) => {
    try {
      return membership.item_info ? JSON.parse(JSON.stringify(membership.item_info)) : null;
    } catch {
      return null;
    }
  };

  const handleAddToCart = (membership: PublicItem) => {
    addItem({
      id: membership.id,
      slug: membership.slug,
      title: membership.title,
      description: membership.description || '',
      price: membership.price || 0,
      currency: membership.currency || 'USD',
      image: '',
      maxQuantity: membership.min_quantity || 1,
      itemType: 'Membership',
      sku: membership.sku || ''
    });
    toast.success("Added to cart", {
      description: `${membership.title} has been added to your cart.`,
    });
  };

  // Pagination
  const indexOfLastMembership = currentPage * membershipsPerPage;
  const indexOfFirstMembership = indexOfLastMembership - membershipsPerPage;
  const currentMemberships = filteredMemberships.slice(indexOfFirstMembership, indexOfLastMembership);
  const totalPages = Math.ceil(filteredMemberships.length / membershipsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Membership Plans - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Join our community with various membership plans. Enjoy exclusive benefits, events, and resources." />
        <link rel="canonical" href={`${window.location.origin}/memberships`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Membership Plans - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Join our community with various membership plans. Enjoy exclusive benefits, events, and resources." />
        <meta property="og:url" content={`${window.location.origin}/memberships`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Membership Plans - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Join our community with various membership plans. Enjoy exclusive benefits, events, and resources." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 bg-gradient-to-br from-accent/10 via-background to-primary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Join Our Community</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Membership Plans
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Become a part of our vibrant mineral and gem enthusiast community. Choose the membership that fits your needs.
            </p>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 border-b bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search memberships..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Results count */}
              <Badge variant="secondary">
                {filteredMemberships.length} {filteredMemberships.length === 1 ? 'membership' : 'memberships'}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Memberships Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader>
                      <Skeleton className="h-8 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive" className="max-w-2xl mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : currentMemberships.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                  {currentMemberships.map((membership) => {
                    const info = getMembershipInfo(membership);
                    const bookingConditions = info?.booking_conditions || [];
                    const notes = info?.notes || [];
                    
                    return (
                      <Card 
                        key={membership.id} 
                        className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col cursor-pointer"
                        onClick={() => navigate(`/memberships/${membership.slug}`)}
                      >
                        <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/5">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-xl font-bold">
                              {membership.title}
                            </CardTitle>
                            {membership.tags && (
                              <Badge variant="secondary" className="shrink-0">
                                {membership.tags}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2 mt-4">
                            <span className="text-4xl font-bold text-primary">
                              ${membership.price}
                            </span>
                            <span className="text-muted-foreground">
                              / {membership.unit || 'Year'}
                            </span>
                          </div>
                          {membership.sku && (
                            <Badge variant="outline" className="w-fit mt-2">
                              {membership.sku}
                            </Badge>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pt-6 flex-1">
                          <p className="text-muted-foreground mb-4 line-clamp-3">
                            {membership.description}
                          </p>

                          {notes.length > 0 && (
                            <div className="space-y-2 mb-4">
                              <h4 className="font-semibold text-sm">Benefits:</h4>
                              <ul className="space-y-1">
                                {notes.slice(0, 3).map((note: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground">{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {bookingConditions.length > 0 && (
                            <div className="mt-4 p-3 bg-muted/50 rounded-md">
                              <p className="text-xs text-muted-foreground">
                                {bookingConditions[0]}
                              </p>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="pt-6 border-t">
                          <Button 
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart(membership);
                            }}
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </CardFooter>
                      </Card>
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
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No memberships found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery 
                      ? `No memberships match "${searchQuery}". Try a different search term.`
                      : "No memberships available at this time. Check back soon!"
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
              Ready to Join Our Community?
            </h2>
            <p className="text-lg text-muted-foreground">
              Select a membership plan and become part of our passionate mineral and gem enthusiast community today.
            </p>
            <Button size="lg" onClick={() => navigate('/cart')}>
              View Cart
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Memberships;
