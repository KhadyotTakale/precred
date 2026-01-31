import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { elegantAPI, type ItemDetailsResponse } from "@/lib/elegant-api";
import { getMetadataImage, getHeroImage, getThumbnailImage, getBlurDataUrl } from "@/lib/image-utils";
import Navbar from "@/components/Navbar";
import QRCodeCard from "@/components/QRCodeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, DollarSign, ArrowLeft, ExternalLink, Youtube, Video as VideoIcon, Image as ImageIcon, Facebook, Twitter, Linkedin, MessageCircle, Mail, Link as LinkIcon, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
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

const EventDetails = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  const [event, setEvent] = useState<ItemDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customDomain, setCustomDomain] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [sharableLinks, setSharableLinks] = useState<SharableLinks | null>(null);

  // Trigger workflow on page view
  usePageViewTrigger(slug || '', 'event', event ? { id: event.id, title: event.title, slug: event.slug } : undefined, !loading && !!event, event?.id);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!slug) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch event details - works without authentication
        const eventData = await elegantAPI.getItemDetails(slug);
        setEvent(eventData);

        // Fetch shop data for custom domain - works without authentication
        try {
          const shopData = await elegantAPI.getShop();
          setCustomDomain(shopData.custom_domain || "");
        } catch (error) {
          console.error("Failed to fetch shop data:", error);
        }

        // Fetch sharable links from API
        try {
          const baseUrl = `${window.location.origin}/event/${slug}`;
          const links = await elegantAPI.getSharableLinks(eventData.id, baseUrl);
          setSharableLinks(links);
        } catch (error) {
          console.error("Failed to fetch sharable links:", error);
        }
      } catch (error) {
        console.error("Failed to fetch event details:", error);
        setError("Unable to load event details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [slug]);

  const getEventInfo = () => {
    if (!event?.item_info) return null;
    try {
      return typeof event.item_info === 'string' 
        ? JSON.parse(event.item_info) 
        : event.item_info;
    } catch {
      return null;
    }
  };

  const getMediaItems = () => {
    if (!event?._item_images_of_items?.items) return [];
    return event._item_images_of_items.items
      .filter((item: any) => !item.Is_disabled)
      .sort((a: any, b: any) => (a.seq || 0) - (b.seq || 0));
  };

  const getImageOnlyMedia = () => {
    return getMediaItems().filter((item: any) => getMediaType(item) === 'Image');
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

  const getMediaType = (mediaItem: any): 'Image' | 'Video' | 'YouTube' => {
    if (mediaItem?.image_type) return mediaItem.image_type;
    const url = mediaItem?.display_image || '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.match(/\.(mp4|webm|ogg|mov)$/i)) return 'Video';
    return 'Image';
  };

  const getEventUrl = () => {
    const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
    return `${baseUrl}/event/${slug}`;
  };

  const handleShareFacebook = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'facebook');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    if (sharableLinks?.facebook) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharableLinks.facebook)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getEventUrl();
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareTwitter = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'twitter');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    if (sharableLinks?.twitter) {
      const text = event?.title || "Check out this event";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(sharableLinks.twitter)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getEventUrl();
      const text = event?.title || "Check out this event";
      window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareLinkedIn = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'linkedin');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    if (sharableLinks?.linkedin) {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(sharableLinks.linkedin)}`, '_blank', 'width=600,height=400');
    } else {
      const url = getEventUrl();
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank', 'width=600,height=400');
    }
  };

  const handleShareWhatsApp = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'whatsapp');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    const text = event?.title || "Check out this event";
    if (sharableLinks?.whatsapp) {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + sharableLinks.whatsapp)}`, '_blank');
    } else {
      const url = getEventUrl();
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
  };

  const handleShareEmail = () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'email');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    const title = event?.title || "Check out this event";
    const url = sharableLinks?.email || getEventUrl();
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`I thought you might be interested in this event:\n\n${title}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyLink = async () => {
    if ((window as any).clarity) {
      (window as any).clarity('set', 'share_platform', 'copy_link');
      (window as any).clarity('set', 'share_item_type', 'event');
      (window as any).clarity('set', 'share_item_id', String(event?.id || ''));
    }
    const url = sharableLinks?.copylink || getEventUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast({
        title: "Link Copied!",
        description: "Event link has been copied to clipboard",
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

  const openLightbox = (index: number) => {
    setCurrentMediaIndex(index);
    setLightboxOpen(true);
  };

  const navigateMedia = (direction: 'next' | 'prev') => {
    const mediaItems = getMediaItems();
    if (direction === 'next') {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length);
    } else {
      setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowRight') navigateMedia('next');
      if (e.key === 'ArrowLeft') navigateMedia('prev');
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (loading) {
  const eventInfo = getEventInfo();
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
  const eventUrl = getEventUrl();

  // Structured data for SEO
  const structuredData = eventInfo ? {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": eventInfo.name || event?.title,
    "description": eventInfo.description || event?.description,
    "startDate": eventInfo.startDate,
    "endDate": eventInfo.endDate,
    "eventStatus": eventInfo.eventStatus === "EventScheduled" ? "https://schema.org/EventScheduled" : "https://schema.org/EventCancelled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": eventInfo.location?.name ? {
      "@type": "Place",
      "name": eventInfo.location.name,
      "address": eventInfo.location.address
    } : undefined,
    "image": imageOnlyMedia.map((item: any) => item.display_image),
    "organizer": eventInfo.organizer?.name ? {
      "@type": "Organization",
      "name": eventInfo.organizer.name,
      "url": eventInfo.organizer.url
    } : undefined,
    "performer": eventInfo.performer?.name ? {
      "@type": "Person",
      "name": eventInfo.performer.name
    } : undefined,
    "offers": eventInfo.offers?.price ? {
      "@type": "Offer",
      "price": eventInfo.offers.price,
      "priceCurrency": eventInfo.offers.priceCurrency || "USD",
      "availability": "https://schema.org/InStock",
      "url": eventUrl
    } : undefined
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{eventInfo?.name || event?.title || 'Event Details'} | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content={eventInfo?.description || event?.description || 'Learn more about this event'} />
        <link rel="canonical" href={eventUrl} />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={eventInfo?.name || event?.title || 'Event Details'} />
        <meta property="og:description" content={eventInfo?.description || event?.description || 'Learn more about this event'} />
        {optimizedMetaImage && <meta property="og:image" content={optimizedMetaImage} />}
        <meta property="og:url" content={eventUrl} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={eventInfo?.name || event?.title || 'Event Details'} />
        <meta name="twitter:description" content={eventInfo?.description || event?.description || 'Learn more about this event'} />
        {optimizedMetaImage && <meta name="twitter:image" content={optimizedMetaImage} />}
        
        {/* Structured Data */}
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
      </Helmet>
      
      <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
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

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
          <Alert variant="destructive">
            <AlertDescription>{error || "Event not found"}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const eventInfo = getEventInfo();
  const mediaItems = getMediaItems();
  const mainMedia = mediaItems[0];
  const mainMediaType = mainMedia ? getMediaType(mainMedia) : 'Image';

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 mt-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        {/* Breadcrumb Navigation */}
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
                <Link to="/event">Events</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{event.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Image/Video */}
            {mainMedia && (
              <Card className="overflow-hidden cursor-pointer" onClick={() => openLightbox(0)}>
                <div className="relative aspect-video bg-black group">
                  {mainMediaType === 'YouTube' ? (
                    <iframe
                      src={mainMedia.display_image}
                      className="w-full h-full"
                      title={event.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : mainMediaType === 'Video' ? (
                    <video
                      src={mainMedia.display_image}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    <img
                      src={getHeroImage(mainMedia.display_image)}
                      alt={event.title}
                      loading="eager"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ backgroundColor: '#e5e7eb' }}
                    />
                  )}
                  
                  {/* Media Type Badge */}
                  <div className="absolute top-4 right-4">
                    {mainMediaType === 'YouTube' && (
                      <Badge className="bg-red-600 hover:bg-red-700 text-white">
                        <Youtube className="h-3 w-3 mr-1" />
                        YouTube
                      </Badge>
                    )}
                    {mainMediaType === 'Video' && (
                      <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                        <VideoIcon className="h-3 w-3 mr-1" />
                        Video
                      </Badge>
                    )}
                    {mainMediaType === 'Image' && (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Image
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Event Title & Description */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                {event.title}
              </h1>
              
              {event.tags && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.split(',').map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag.trim()}
                    </Badge>
                  ))}
                </div>
              )}

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

              <p className="text-lg text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </div>

            {/* Additional Media Gallery */}
            {mediaItems.length > 1 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {mediaItems.slice(1).map((mediaItem: any, idx: number) => {
                    const mediaType = getMediaType(mediaItem);
                    return (
                      <Card key={mediaItem.id || idx} className="overflow-hidden cursor-pointer" onClick={() => openLightbox(idx + 1)}>
                        <div className="relative aspect-video bg-black group">
                          {mediaType === 'YouTube' ? (
                            <iframe
                              src={mediaItem.display_image}
                              className="w-full h-full"
                              title={`${event.title} media ${idx + 2}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          ) : mediaType === 'Video' ? (
                            <video
                              src={mediaItem.display_image}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          ) : (
                            <img
                              src={getThumbnailImage(mediaItem.display_image, 'medium')}
                              alt={`${event.title} media ${idx + 2}`}
                              loading="lazy"
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              style={{ backgroundColor: '#e5e7eb' }}
                            />
                          )}
                          {/* Media Type Badge */}
                          <div className="absolute top-2 right-2">
                            {mediaType === 'YouTube' && (
                              <Badge className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                <Youtube className="h-3 w-3 mr-1" />
                                YouTube
                              </Badge>
                            )}
                            {mediaType === 'Video' && (
                              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                                <VideoIcon className="h-3 w-3 mr-1" />
                                Video
                              </Badge>
                            )}
                            {mediaType === 'Image' && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                Image
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Event Details Sections */}
            {eventInfo?.organizer && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Organized By</h3>
                  <div className="space-y-2">
                    <p className="text-lg font-medium">{eventInfo.organizer.name}</p>
                    {eventInfo.organizer.url && (
                      <a
                        href={eventInfo.organizer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Visit Website <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {eventInfo?.performer && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">Performers</h3>
                  <p className="text-lg">{eventInfo.performer.name}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Date & Time */}
            {eventInfo?.startDate && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Date & Time</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(eventInfo.startDate)}
                      </p>
                      {eventInfo.endDate && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Ends: {formatDate(eventInfo.endDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Location */}
            {eventInfo?.location && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Location</h3>
                      {typeof eventInfo.location === 'object' ? (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="font-medium">{eventInfo.location.name}</p>
                          {eventInfo.location.address && (
                            <div>
                              <p>{eventInfo.location.address.streetAddress}</p>
                              <p>
                                {eventInfo.location.address.addressLocality}, {eventInfo.location.address.addressRegion} {eventInfo.location.address.postalCode}
                              </p>
                              <p>{eventInfo.location.address.addressCountry}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{eventInfo.location}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            {eventInfo?.offers && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Pricing</h3>
                      <p className="text-2xl font-bold text-primary">
                        {eventInfo.offers.priceCurrency} ${eventInfo.offers.price}
                      </p>
                      {eventInfo.offers.url && (
                        <a
                          href={eventInfo.offers.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-block"
                        >
                          <Button className="w-full">
                            Get Tickets
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audience */}
            {eventInfo?.audience && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <h3 className="font-semibold mb-2">Audience</h3>
                      <p className="text-sm text-muted-foreground">
                        {eventInfo.audience.audienceType}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Keywords */}
            {eventInfo?.keywords && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Keywords</h3>
                  <p className="text-sm text-muted-foreground">
                    {eventInfo.keywords}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Event Status */}
            {eventInfo?.eventStatus && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Event Status</h3>
                  <Badge variant="outline">
                    {eventInfo.eventStatus.replace('https://schema.org/', '')}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {/* Sponsors */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Event Sponsors</h3>
                <div className="space-y-3">
                  {[
                    { name: "Premier Minerals Co", level: "Platinum", color: "bg-slate-200 dark:bg-slate-700" },
                    { name: "Rock & Gem Supply", level: "Gold", color: "bg-amber-100 dark:bg-amber-900/30" },
                    { name: "Crystal Collections Ltd", level: "Silver", color: "bg-slate-100 dark:bg-slate-800" },
                    { name: "Lapidary Tools Inc", level: "Bronze", color: "bg-orange-100 dark:bg-orange-900/30" }
                  ].map((sponsor, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-lg border bg-card p-3 transition-all hover:shadow-md hover:border-primary/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sponsor.name}</p>
                          <Badge variant="secondary" className={`mt-1.5 text-xs ${sponsor.color}`}>
                            {sponsor.level}
                          </Badge>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {sponsor.name.charAt(0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* QR Code Section */}
            <QRCodeCard 
              url={sharableLinks?.copylink || getEventUrl()} 
              title="Event"
              filename={event?.slug || 'event'}
              itemType="Event"
            />
          </div>
        </div>

        {/* Lightbox Modal */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Navigation Buttons */}
              {getMediaItems().length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateMedia('prev');
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 z-50 text-white hover:bg-white/20 h-12 w-12"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateMedia('next');
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {/* Media Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {currentMediaIndex + 1} / {getMediaItems().length}
              </div>

              {/* Current Media */}
              {(() => {
                const currentMedia = getMediaItems()[currentMediaIndex];
                if (!currentMedia) return null;
                const mediaType = getMediaType(currentMedia);

                return (
                  <div className="w-full h-full flex items-center justify-center p-8">
                    {mediaType === 'YouTube' ? (
                      <iframe
                        src={currentMedia.display_image}
                        className="w-full h-full max-w-6xl max-h-[80vh]"
                        title={`Media ${currentMediaIndex + 1}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : mediaType === 'Video' ? (
                      <video
                        src={currentMedia.display_image}
                        className="max-w-full max-h-full object-contain"
                        controls
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img
                        src={currentMedia.display_image}
                        alt={`Media ${currentMediaIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EventDetails;
