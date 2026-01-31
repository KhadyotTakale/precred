import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import VendorCard from "@/components/VendorCard";
import { VendorApplicationForm } from "@/components/VendorApplicationForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronLeft, ChevronRight, Lock, Store } from "lucide-react";

const Vendors = () => {
  const { isSignedIn } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Auto-open application form if redirected after sign-in
  useEffect(() => {
    if (searchParams.get('apply') === 'true' && isSignedIn) {
      setShowApplicationForm(true);
      // Clean up the URL
      navigate('/vendors', { replace: true });
    }
  }, [searchParams, isSignedIn, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["vendors", currentPage],
    queryFn: () => elegantAPI.getPublicVendors(currentPage),
  });

  const filteredVendors = data?.items?.filter((vendor) =>
    vendor.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = data?.pageTotal || 1;

  // Show full-screen application form
  if (showApplicationForm) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Vendor Application - Tampa Bay Minerals & Science Club</title>
          <meta name="description" content="Apply to become a vendor in our trusted directory." />
        </Helmet>
        <Navbar />
        <div className="mt-20">
          <VendorApplicationForm onBack={() => setShowApplicationForm(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Vendor Directory - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Browse our directory of trusted vendors offering minerals, gems, tools, and supplies." />
        <link rel="canonical" href={`${window.location.origin}/vendors`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Vendor Directory - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Browse our directory of trusted vendors offering minerals, gems, tools, and supplies." />
        <meta property="og:url" content={`${window.location.origin}/vendors`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vendor Directory - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Browse our directory of trusted vendors offering minerals, gems, tools, and supplies." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-12 mt-20 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">Vendor Directory</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Discover trusted vendors specializing in minerals, gems, fossils, and lapidary supplies
          </p>
          <Button size="lg" className="gap-2" onClick={() => navigate('/application/vendor-application:-tampa-bay-mineral-and-science-club-of-tampa-2026-spring')}>
            <Store className="h-5 w-5" />
            Apply April 2026 Show
          </Button>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 px-4 border-b border-border">
        <div className="container mx-auto">
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Vendors Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-lg" />
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No vendors found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    name={vendor.title}
                    specialty={vendor.item_type || "General Vendor"}
                    rating={vendor.rank || 5}
                    description={vendor.description || "Trusted vendor in the mineral and gem community"}
                    tags={vendor.tags?.split(',').map(k => k.trim()).filter(Boolean) || ["Minerals", "Gems"]}
                    slug={vendor.slug}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <span className="text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Vendors;
