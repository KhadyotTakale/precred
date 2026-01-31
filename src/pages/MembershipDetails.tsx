import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { elegantAPI, type ItemDetailsResponse } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  CheckCircle,
  Users,
  ShoppingCart,
  Clock,
  Calendar,
  Star
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

const MembershipDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [membership, setMembership] = useState<ItemDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'membership', membership ? { id: membership.id, title: membership.title, slug: membership.slug } : undefined, !loading && !!membership, membership?.id);

  useEffect(() => {
    const fetchMembershipDetails = async () => {
      if (!slug) {
        setError("Membership not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await elegantAPI.getItemDetails(slug);
        setMembership(data);
      } catch (error) {
        console.error("Failed to fetch membership details:", error);
        setError("Unable to load membership details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipDetails();
  }, [slug]);

  const getMembershipInfo = () => {
    if (!membership?.item_info) return null;
    try {
      return typeof membership.item_info === 'string' 
        ? JSON.parse(membership.item_info) 
        : membership.item_info;
    } catch {
      return null;
    }
  };

  const handleAddToCart = () => {
    if (!membership) return;
    
    addItem({
      id: membership.id,
      slug: membership.slug,
      title: membership.title,
      description: membership.description || '',
      price: membership.price || 0,
      currency: membership.currency || 'USD',
      image: '',
      maxQuantity: 1,
      itemType: 'Membership',
      sku: membership.sku || ''
    });
    
    toast.success("Added to cart", {
      description: `${membership.title} has been added to your cart.`,
    });
  };

  const membershipUrl = `${window.location.origin}/memberships/${slug}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-20">
          <Button
            variant="ghost"
            onClick={() => navigate("/memberships")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Memberships
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || "Membership not found"}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const info = getMembershipInfo();
  const bookingConditions = info?.booking_conditions || [];
  const notes = info?.notes || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{membership.title} | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={membership.description || 'View membership details'} />
        <link rel="canonical" href={membershipUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={membership.title} />
        <meta property="og:description" content={membership.description || 'View membership details'} />
        <meta property="og:url" content={membershipUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={membership.title} />
        <meta name="twitter:description" content={membership.description || 'View membership details'} />
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
              <BreadcrumbLink asChild>
                <Link to="/memberships">Memberships</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{membership.title}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-8 md:p-12">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-6 w-6 text-primary" />
                <Badge variant="secondary">{membership.tags || 'Membership'}</Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{membership.title}</h1>
              {membership.sku && (
                <Badge variant="outline" className="mb-4">
                  {membership.sku}
                </Badge>
              )}
              <div className="flex items-baseline gap-2 mt-6">
                <span className="text-5xl font-bold text-primary">
                  ${membership.price || 0}
                </span>
                <span className="text-xl text-muted-foreground">
                  / {membership.unit || 'Year'}
                </span>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Membership</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {membership.description || 'No description available.'}
                </p>
              </CardContent>
            </Card>

            {/* Benefits */}
            {notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Membership Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {notes.map((note: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{note}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Conditions */}
            {bookingConditions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {bookingConditions.map((condition: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        • {condition}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <Card className="sticky top-24">
              <CardHeader className="bg-gradient-to-br from-primary/5 to-accent/5">
                <CardTitle className="text-center">Join Today</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-primary">
                      ${membership.price || 0}
                    </span>
                    <span className="text-muted-foreground">
                      / {membership.unit || 'Year'}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Duration: {membership.unit || 'Annual'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Starts immediately upon purchase</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    handleAddToCart();
                    navigate('/cart');
                  }}
                >
                  Buy Now
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Join?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Access to all club events and meetings</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Discounted rates on classes</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Monthly newsletter and updates</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">Access to club resources</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* QR Code Section */}
            <QRCodeCard 
              url={membershipUrl} 
              title="Membership"
              filename={membership?.slug || 'membership'}
              itemType="Membership"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipDetails;
