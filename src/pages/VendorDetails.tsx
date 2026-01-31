import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { elegantAPI } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ChevronLeft,
  Star,
  Mail,
  Phone,
  MapPin,
  Globe,
  Package,
  MessageSquare,
  Lock,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Link as LinkIcon,
  Check,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

interface SharableLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  email?: string;
  copylink?: string;
}

const VendorDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isSignedIn } = useUser();
  const { toast } = useToast();
  const [sharableLinks, setSharableLinks] = useState<SharableLinks | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: vendorData, isLoading } = useQuery({
    queryKey: ["vendor-details", slug],
    queryFn: () => elegantAPI.getItemDetails(slug!),
    enabled: !!slug,
  });

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'vendor', vendorData ? { id: vendorData.id, title: vendorData.title, slug: vendorData.slug } : undefined, !isLoading && !!vendorData, vendorData?.id);

  // Fetch sharable links when vendor data is loaded
  useEffect(() => {
    const fetchSharableLinks = async () => {
      if (vendorData?.id) {
        try {
          const baseUrl = `${window.location.origin}/vendors/${slug}`;
          const links = await elegantAPI.getSharableLinks(vendorData.id, baseUrl);
          setSharableLinks(links);
        } catch (error) {
          console.error("Failed to fetch sharable links:", error);
        }
      }
    };
    fetchSharableLinks();
  }, [vendorData?.id, slug]);

  const getVendorUrl = () => {
    return `${window.location.origin}/vendors/${slug}`;
  };

  const handleShareFacebook = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'facebook');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    if (sharableLinks?.facebook) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharableLinks.facebook)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getVendorUrl();
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareTwitter = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'twitter');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    if (sharableLinks?.twitter) {
      const text = vendorData?.title || "Check out this vendor";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(sharableLinks.twitter)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getVendorUrl();
      const text = vendorData?.title || "Check out this vendor";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareLinkedIn = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'linkedin');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    if (sharableLinks?.linkedin) {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sharableLinks.linkedin)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getVendorUrl();
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareWhatsApp = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'whatsapp');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    const text = vendorData?.title || "Check out this vendor";
    if (sharableLinks?.whatsapp) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + sharableLinks.whatsapp)}`, '_blank');
    } else {
      const url = getVendorUrl();
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

  const handleShareEmail = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'email');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    const title = vendorData?.title || "Check out this vendor";
    const url = sharableLinks?.email || getVendorUrl();
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`I thought you might be interested in this vendor:\n\n${title}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'copy_link');
      (window as any).clarity('set', 'share_item_type', 'vendor');
      (window as any).clarity('set', 'share_item_id', String(vendorData?.id || ''));
    }
    const url = sharableLinks?.copylink || getVendorUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({
        title: "Link Copied!",
        description: "Vendor link has been copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold mb-4">Vendor Not Found</h1>
          <Button onClick={() => navigate("/vendors")}>Back to Vendors</Button>
        </div>
      </div>
    );
  }

  const vendorInfo = vendorData.item_info || {};
  const tags = vendorData.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [];
  const images = vendorData._item_images_of_items?.items?.filter(
    (img) => img.image_type === "Image"
  ) || [];
  const mainImage = images[0]?.display_image || "/placeholder.svg";

  // Extract contact information from item_info
  const formatAddress = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address;
    
    // Handle object address format
    const parts = [
      address.streetAddress,
      address.addressLocality,
      address.addressRegion,
      address.postalCode,
      address.addressCountry
    ].filter(Boolean);
    
    return parts.join(", ");
  };

  const rawContactInfo = {
    email: vendorInfo.email || vendorInfo.contactEmail || "",
    phone: vendorInfo.phone || vendorInfo.contactPhone || vendorInfo.telephone || "",
    address: formatAddress(vendorInfo.address || vendorInfo.location),
    website: vendorInfo.website || vendorInfo.url || "",
  };

  // Mask contact info if user is not signed in
  const contactInfo = {
    email: isSignedIn ? rawContactInfo.email : (rawContactInfo.email ? "•••@•••.•••" : ""),
    phone: isSignedIn ? rawContactInfo.phone : (rawContactInfo.phone ? "•••-•••-••••" : ""),
    address: isSignedIn ? rawContactInfo.address : (rawContactInfo.address ? "Sign in to view address" : ""),
    website: isSignedIn ? rawContactInfo.website : (rawContactInfo.website ? "Sign in to view website" : ""),
  };

  // Mock products and reviews (replace with actual API calls when available)
  const products = vendorInfo.products || [];
  const reviews = vendorInfo.reviews || [];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{vendorData.title} - Vendor Details | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={vendorData.description || `Learn more about ${vendorData.title}`} />
        <link rel="canonical" href={`${window.location.origin}/vendors/${slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${vendorData.title} - Vendor Details | Tampa Bay Minerals & Science Club`} />
        <meta property="og:description" content={vendorData.description || `Learn more about ${vendorData.title}`} />
        <meta property="og:url" content={`${window.location.origin}/vendors/${slug}`} />
        {mainImage && <meta property="og:image" content={mainImage} />}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${vendorData.title} - Vendor Details | Tampa Bay Minerals & Science Club`} />
        <meta name="twitter:description" content={vendorData.description || `Learn more about ${vendorData.title}`} />
        {mainImage && <meta name="twitter:image" content={mainImage} />}
      </Helmet>
      
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-20">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/")} className="cursor-pointer">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate("/vendors")} className="cursor-pointer">
                Vendors
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{vendorData.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/vendors")}
          className="mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Vendors
        </Button>

        {/* Vendor Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-6 mb-6">
                  <img
                    src={mainImage}
                    alt={vendorData.title}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h1 className="text-3xl font-bold text-foreground">
                        {vendorData.title}
                      </h1>
                      <div className="flex items-center gap-1 bg-secondary/20 px-3 py-1.5 rounded-full">
                        <Star className="h-5 w-5 fill-secondary text-secondary" />
                        <span className="text-lg font-semibold">
                          {vendorInfo.rating || 5.0}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="mb-3">
                      {vendorData.item_type}
                    </Badge>
                    <p className="text-muted-foreground">
                      {vendorData.description}
                    </p>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Social Sharing Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t">
                  <span className="text-sm text-muted-foreground mr-2">Share:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareFacebook}
                    className="gap-2"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareTwitter}
                    className="gap-2"
                  >
                    <Twitter className="h-4 w-4" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareLinkedIn}
                    className="gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className="gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareEmail}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="gap-2"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            {vendorInfo.about && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {vendorInfo.about}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Products Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products & Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.map((product: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-1">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {product.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Contact vendor for product and service information
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Customer Reviews
                  <Badge variant="secondary" className="ml-2">
                    {vendorData._reviews_item_total || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review: any, index: number) => (
                      <div key={index} className="border-b last:border-0 pb-4 last:pb-0">
                        <div className="flex items-start gap-3">
                          <Avatar>
                            <AvatarImage src={review.avatar} />
                            <AvatarFallback>
                              {review.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">
                                {review.name || "Anonymous"}
                              </span>
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < review.rating
                                        ? "fill-secondary text-secondary"
                                        : "text-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No reviews yet. Be the first to review this vendor!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contactInfo.email && (
                  <div className="flex items-start gap-3">
                    {isSignedIn ? (
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      {isSignedIn ? (
                        <a
                          href={`mailto:${contactInfo.email}`}
                          className="text-sm hover:text-primary transition-colors"
                        >
                          {contactInfo.email}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {contactInfo.phone && (
                  <div className="flex items-start gap-3">
                    {isSignedIn ? (
                      <Phone className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      {isSignedIn ? (
                        <a
                          href={`tel:${contactInfo.phone}`}
                          className="text-sm hover:text-primary transition-colors"
                        >
                          {contactInfo.phone}
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">{contactInfo.phone}</p>
                      )}
                    </div>
                  </div>
                )}

                {contactInfo.address && (
                  <div className="flex items-start gap-3">
                    {isSignedIn ? (
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Address</p>
                      <p className={`text-sm ${!isSignedIn ? 'text-muted-foreground' : ''}`}>
                        {contactInfo.address}
                      </p>
                    </div>
                  </div>
                )}

                {contactInfo.website && (
                  <div className="flex items-start gap-3">
                    {isSignedIn ? (
                      <Globe className="h-5 w-5 text-primary mt-0.5" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Website</p>
                      {isSignedIn ? (
                        <a
                          href={contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:text-primary transition-colors"
                        >
                          Visit Website
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">{contactInfo.website}</p>
                      )}
                    </div>
                  </div>
                )}

                {!contactInfo.email &&
                  !contactInfo.phone &&
                  !contactInfo.address &&
                  !contactInfo.website && (
                    <p className="text-sm text-muted-foreground">
                      Contact information not available
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Gallery */}
            {images.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {images.slice(1, 5).map((image) => (
                      <img
                        key={image.id}
                        src={image.display_image}
                        alt="Vendor gallery"
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    if (!isSignedIn) {
                      navigate("/sign-in");
                    } else {
                      // Handle contact vendor action for signed-in users
                      window.location.href = `mailto:${rawContactInfo.email}`;
                    }
                  }}
                >
                  {isSignedIn ? "Contact Vendor" : "Sign In to Contact"}
                </Button>
              </CardContent>
            </Card>

            {/* QR Code Section */}
            {sharableLinks?.copylink && (
              <QRCodeCard 
                url={sharableLinks.copylink} 
                title="Vendor"
                filename={vendorData?.slug || 'vendor'}
                itemType="Vendor"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
