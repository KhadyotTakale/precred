import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { elegantAPI, type ItemDetailsResponse } from "@/lib/elegant-api";
import { getMetadataImage, getHeroImage, getSmallImageUrl } from "@/lib/image-utils";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Star,
  User,
  ShoppingCart,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Mail,
  Link as LinkIcon,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { usePageViewTrigger } from "@/contexts/WorkflowContext";

interface SharableLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
  email?: string;
  copylink?: string;
}

const ClassDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const { addItem } = useCart();
  const [classItem, setClassItem] = useState<ItemDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sharableLinks, setSharableLinks] = useState<SharableLinks | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'class', classItem ? { id: classItem.id, title: classItem.title, slug: classItem.slug } : undefined, !loading && !!classItem, classItem?.id);

  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!slug) {
        setError("Class not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch class details - works without authentication
        const classData = await elegantAPI.getItemDetails(slug);
        setClassItem(classData);

        // Fetch sharable links from API
        try {
          const baseUrl = `${window.location.origin}/classes/${slug}`;
          const links = await elegantAPI.getSharableLinks(classData.id, baseUrl);
          setSharableLinks(links);
        } catch (error) {
          console.error("Failed to fetch sharable links:", error);
        }
      } catch (error) {
        console.error("Failed to fetch class details:", error);
        setError("Unable to load class details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [slug]);

  const getClassInfo = () => {
    if (!classItem?.item_info) return null;
    try {
      return typeof classItem.item_info === 'string' 
        ? JSON.parse(classItem.item_info) 
        : classItem.item_info;
    } catch {
      return null;
    }
  };

  const getMediaItems = () => {
    if (!classItem?._item_images_of_items?.items) return [];
    return classItem._item_images_of_items.items
      .filter((item: any) => !item.Is_disabled)
      .sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0));
  };

  const getImageOnlyMedia = () => {
    return getMediaItems().filter((item: any) => item.image_type === 'Image');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "beginner":
        return "bg-secondary/20 text-secondary-foreground border-secondary";
      case "intermediate":
        return "bg-accent/20 text-accent-foreground border-accent";
      case "advanced":
        return "bg-primary/20 text-primary-foreground border-primary";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleRegister = () => {
    if (!classItem) return;
    
    const info = getClassInfo();
    const imageOnlyMedia = getImageOnlyMedia();
    const price = parseFloat(info?.offers?.price || 0);
    
    addItem({
      id: classItem.id,
      slug: classItem.slug,
      title: classItem.title,
      description: classItem.description,
      price: price,
      currency: info?.offers?.priceCurrency || 'USD',
      image: imageOnlyMedia[0]?.display_image,
      maxQuantity: info?.maximumAttendeeCapacity || 1,
      itemType: 'Classes',
    });
    
    navigate('/cart');
  };

  const getClassUrl = () => {
    return `${window.location.origin}/classes/${slug}`;
  };

  const handleShareFacebook = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'facebook');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    if (sharableLinks?.facebook) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharableLinks.facebook)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getClassUrl();
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareTwitter = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'twitter');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    if (sharableLinks?.twitter) {
      const text = classItem?.title || "Check out this class";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(sharableLinks.twitter)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getClassUrl();
      const text = classItem?.title || "Check out this class";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareLinkedIn = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'linkedin');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    if (sharableLinks?.linkedin) {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sharableLinks.linkedin)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getClassUrl();
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareWhatsApp = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'whatsapp');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    const text = classItem?.title || "Check out this class";
    if (sharableLinks?.whatsapp) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + sharableLinks.whatsapp)}`, '_blank');
    } else {
      const url = getClassUrl();
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

  const handleShareEmail = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'email');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    const title = classItem?.title || "Check out this class";
    const url = sharableLinks?.email || getClassUrl();
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`I thought you might be interested in this class:\n\n${title}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'copy_link');
      (window as any).clarity('set', 'share_item_type', 'class');
      (window as any).clarity('set', 'share_item_id', String(classItem?.id || ''));
    }
    const url = sharableLinks?.copylink || getClassUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({
        title: "Link Copied!",
        description: "Class link has been copied to clipboard",
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

  // Mock reviews data (replace with real data when available)
  const mockReviews = [
    {
      id: 1,
      name: "Sarah Johnson",
      rating: 5,
      date: "2024-01-15",
      comment: "Excellent class! The instructor was very knowledgeable and patient. I learned so much about lapidary techniques."
    },
    {
      id: 2,
      name: "Michael Chen",
      rating: 5,
      date: "2024-01-10",
      comment: "Great hands-on experience. The class size was perfect and everyone got plenty of practice time with the equipment."
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      rating: 4,
      date: "2024-01-05",
      comment: "Very informative class. Would have liked a bit more time on advanced techniques, but overall great value."
    }
  ];

  if (loading) {
  const classInfo = getClassInfo();
  const imageOnlyMedia = getImageOnlyMedia();
  const featuredImage = imageOnlyMedia[0]?.display_image || '';
  
  // Ensure absolute URL for social media crawlers
  const getAbsoluteImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${window.location.origin}${url.startsWith('/') ? url : '/' + url}`;
  };
  
  const optimizedMetaImage = featuredImage ? getMetadataImage(getAbsoluteImageUrl(featuredImage)) : '';
  const classUrl = `${window.location.origin}/classes/${slug}`;

  // Structured data for SEO
  const structuredData = classInfo ? {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    "name": classInfo.name || classItem?.title,
    "description": classInfo.description || classItem?.description,
    "startDate": classInfo.startDate,
    "endDate": classInfo.endDate,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": classInfo.location?.name ? {
      "@type": "Place",
      "name": classInfo.location.name,
      "address": classInfo.location.address
    } : undefined,
    "image": imageOnlyMedia.map((item: any) => item.display_image),
    "organizer": classInfo.organizer?.name ? {
      "@type": "Organization",
      "name": classInfo.organizer.name,
      "url": classInfo.organizer.url
    } : undefined,
    "instructor": classInfo.instructor?.name ? {
      "@type": "Person",
      "name": classInfo.instructor.name,
      "jobTitle": classInfo.instructor.jobTitle
    } : undefined,
    "educationalLevel": classInfo.educationalLevel,
    "teaches": classInfo.courseContent,
    "duration": classInfo.duration,
    "maximumAttendeeCapacity": classInfo.maximumAttendeeCapacity,
    "offers": classInfo.offers?.price ? {
      "@type": "Offer",
      "price": classInfo.offers.price,
      "priceCurrency": classInfo.offers.priceCurrency || "USD",
      "availability": "https://schema.org/InStock",
      "url": classUrl
    } : undefined
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{classInfo?.name || classItem?.title || 'Class Details'} | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={classInfo?.description || classItem?.description || 'Learn more about this class'} />
        <link rel="canonical" href={classUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={classInfo?.name || classItem?.title || 'Class Details'} />
        <meta property="og:description" content={classInfo?.description || classItem?.description || 'Learn more about this class'} />
        {optimizedMetaImage && <meta property="og:image" content={optimizedMetaImage} />}
        <meta property="og:url" content={classUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={classInfo?.name || classItem?.title || 'Class Details'} />
        <meta name="twitter:description" content={classInfo?.description || classItem?.description || 'Learn more about this class'} />
        {optimizedMetaImage && <meta name="twitter:image" content={optimizedMetaImage} />}
        
        {/* Structured Data */}
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
      </Helmet>
      
      <Navbar />
        <div className="container mx-auto px-4 py-8 mt-20">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full rounded-lg" />
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !classItem) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 mt-20">
          <Button
            variant="ghost"
            onClick={() => navigate("/classes")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || "Class not found"}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const info = getClassInfo();
  const mediaItems = getMediaItems();
  const currentMedia = mediaItems[currentImageIndex] || mediaItems[0];

  return (
    <div className="min-h-screen bg-background">
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
                <Link to="/classes">Classes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbPage>{classItem.title}</BreadcrumbPage>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Featured Media */}
            {currentMedia && (
              <div className="space-y-4">
                <div className="relative h-64 sm:h-80 md:h-96 lg:h-[32rem] rounded-lg overflow-hidden border bg-muted">
                  {currentMedia.image_type === 'YouTube' ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${currentMedia.display_image?.split('v=')[1]?.split('&')[0] || currentMedia.display_image?.split('/').pop()}`}
                      title={classItem.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : currentMedia.image_type === 'Video' ? (
                    <video
                      src={currentMedia.display_image}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <img 
                      src={getHeroImage(currentMedia.display_image)} 
                      alt={classItem.title}
                      loading="eager"
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                  )}
                  {info?.educationalLevel && (
                    <Badge 
                      className={`absolute top-4 right-4 ${getLevelColor(info.educationalLevel)}`}
                    >
                      {info.educationalLevel}
                    </Badge>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {mediaItems.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {mediaItems.map((item: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                          idx === currentImageIndex 
                            ? 'border-primary ring-2 ring-primary ring-offset-2' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {item.image_type === 'YouTube' ? (
                          <div className="w-full h-full bg-black flex items-center justify-center">
                            <Badge variant="destructive" className="text-xs">YouTube</Badge>
                          </div>
                        ) : item.image_type === 'Video' ? (
                          <video
                            src={item.display_image}
                            className="w-full h-full object-cover"
                            muted
                          />
                        ) : (
                          <img 
                            src={getSmallImageUrl(item.display_image)} 
                            alt={`${classItem.title} ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Title and Description */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-4xl font-bold text-foreground">{classItem.title}</h1>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                {classItem.description}
              </p>

              {/* Social Sharing Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
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
                  <Mail className="h-4 w-4" />
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
            </div>

            {/* Tabs for detailed information */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
                <TabsTrigger value="instructor">Instructor</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      What You'll Learn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {info?.teaches ? (
                      <div className="prose prose-sm max-w-none">
                        <p className="text-muted-foreground whitespace-pre-wrap">{info.teaches}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Details about what you'll learn will be provided soon.</p>
                    )}
                  </CardContent>
                </Card>

                {info?.assesses && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Skills Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{info.assesses}</p>
                    </CardContent>
                  </Card>
                )}

                {info?.audience?.audienceType && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Target Audience
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{info.audience.audienceType}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="curriculum" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Curriculum</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {info?.teaches ? (
                      <div className="space-y-3">
                        {info.teaches.split('\n').filter((line: string) => line.trim()).map((item: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-muted-foreground">{item}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Detailed curriculum will be provided upon enrollment.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="instructor" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Meet Your Instructor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {info?.instructor?.name ? (
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                            {info.instructor.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{info.instructor.name}</h3>
                          <p className="text-muted-foreground">
                            Expert lapidary artist with years of experience in gemstone cutting, polishing, and jewelry making. 
                            Passionate about sharing knowledge and helping students discover the art of working with minerals.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Instructor information will be provided soon.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Student Reviews</span>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-primary text-primary" />
                        <span className="text-2xl font-bold">4.8</span>
                        <span className="text-muted-foreground text-sm">(3 reviews)</span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {mockReviews.map((review) => (
                      <div key={review.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback className="bg-secondary">
                                {review.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{review.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(review.date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`h-4 w-4 ${idx < review.rating ? 'fill-primary text-primary' : 'text-muted'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-muted-foreground pl-12">{review.comment}</p>
                        {review.id !== mockReviews[mockReviews.length - 1].id && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Class Details Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Class Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {info?.startDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">{formatDate(info.startDate)}</p>
                    </div>
                  </div>
                )}

                {info?.duration && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">{convertISO8601ToHours(info.duration)}</p>
                    </div>
                  </div>
                )}

                {info?.location?.name && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{info.location.name}</p>
                      {info.location.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {info.location.address.streetAddress && `${info.location.address.streetAddress}, `}
                          {info.location.address.addressLocality && `${info.location.address.addressLocality}, `}
                          {info.location.address.addressRegion && info.location.address.addressRegion}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {info?.maximumAttendeeCapacity && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Class Size</p>
                      <p className="text-sm text-muted-foreground">Maximum {info.maximumAttendeeCapacity} students</p>
                    </div>
                  </div>
                )}

                {info?.educationalLevel && (
                  <div className="flex items-start gap-3">
                    <GraduationCap className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Level</p>
                      <Badge className={`mt-1 ${getLevelColor(info.educationalLevel)}`}>
                        {info.educationalLevel}
                      </Badge>
                    </div>
                  </div>
                )}

                {info?.offers?.price !== undefined && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Price</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">
                        {info.offers.price === 0 || info.offers.price === '0' 
                          ? 'FREE' 
                          : `${info.offers.priceCurrency || 'USD'} $${info.offers.price}`
                        }
                      </span>
                    </div>
                  </>
                )}

                <Separator />

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleRegister}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>

                {info?.eventAttendanceMode && (
                  <p className="text-xs text-center text-muted-foreground">
                    {info.eventAttendanceMode.includes('Offline') ? 'In-Person Class' : 
                     info.eventAttendanceMode.includes('Online') ? 'Online Class' : 'Hybrid Class'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Organizer Card */}
            {info?.organizer?.name && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Organized By</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold mb-1">{info.organizer.name}</p>
                  {info.organizer.url && (
                    <a 
                      href={info.organizer.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* QR Code Section */}
            <QRCodeCard 
              url={sharableLinks?.copylink || getClassUrl()} 
              title="Class"
              filename={classItem?.slug || 'class'}
              itemType="Class"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassDetails;
