import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AdBanner from "@/components/AdBanner";
import { BentoImage } from "@/components/BentoImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Heart, Trophy, Mail, Gem, Hammer, Mountain, 
  Calendar as CalendarIcon, Ticket, Clock, Gift, 
  ArrowRight, Users, BookOpen, Star, CheckCircle2,
  Facebook, Instagram, Twitter, MapPin, Phone, Plus, Sparkles
} from "lucide-react";
import { NewsletterSubscriptionDialog } from "@/components/NewsletterSubscriptionDialog";
import eventImage from "@/assets/event-show.jpg";
import classImage from "@/assets/classes-lapidary.jpg";
import heroImage1 from "@/assets/hero-minerals.jpg";
import heroImage2 from "@/assets/hero-show-1.jpg";
import heroImage3 from "@/assets/hero-show-2.jpg";
import heroImage4 from "@/assets/hero-show-3.jpg";
import { elegantAPI, type PublicItem, type MediaItem } from "@/lib/elegant-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Index = () => {
  const { user } = useUser();
  const [events, setEvents] = useState<PublicItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [classes, setClasses] = useState<PublicItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [raffles, setRaffles] = useState<PublicItem[]>([]);
  const [loadingRaffles, setLoadingRaffles] = useState(true);
  const [rafflesError, setRafflesError] = useState<string | null>(null);
  const [sponsorAd, setSponsorAd] = useState<PublicItem | null>(null);
  const [galleryImages, setGalleryImages] = useState<MediaItem[]>([]);
  const [loadingGalleryImages, setLoadingGalleryImages] = useState(true);
  const [email, setEmail] = useState("");
  const [newsletterDialogOpen, setNewsletterDialogOpen] = useState(false);


  // Consolidated data fetching - batch all API calls to reduce 429 errors
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      // Fetch primary data first (events + raffles needed for hero)
      try {
        const [eventsResponse, rafflesResponse] = await Promise.allSettled([
          elegantAPI.getPublicItems(1, 6, 'Event'),
          elegantAPI.getPublicItems(1, 6, 'Raffle'),
        ]);
        
        if (!isMounted) return;
        
        // Handle events
        if (eventsResponse.status === 'fulfilled') {
          setEvents(eventsResponse.value.items.filter(item => !item.Is_disabled));
        } else {
          console.error('Failed to fetch events:', eventsResponse.reason);
          setEventsError('Unable to load events. Please try again later.');
        }
        setLoadingEvents(false);
        
        // Handle raffles
        if (rafflesResponse.status === 'fulfilled') {
          const now = new Date();
          const activeRaffles = rafflesResponse.value.items.filter(item => {
            if (item.Is_disabled) return false;
            const endDate = item.item_info?.end_date;
            if (endDate) return new Date(endDate) >= now;
            return true;
          });
          setRaffles(activeRaffles);
        } else {
          console.error('Failed to fetch raffles:', rafflesResponse.reason);
          setRafflesError('Unable to load raffles. Please try again later.');
        }
        setLoadingRaffles(false);
      } catch (error) {
        console.error('Failed to fetch primary data:', error);
        if (isMounted) {
          setLoadingEvents(false);
          setLoadingRaffles(false);
        }
      }
      
      // Delay secondary data fetches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isMounted) return;
      
      // Fetch secondary data (classes, ads, images)
      try {
        const [classesResponse, adsResponse, imagesResponse] = await Promise.allSettled([
          elegantAPI.getPublicItems(1, 6, 'Classes'),
          elegantAPI.getPublicItems(1, 50, 'AD'),
          elegantAPI.getImages("", 1, 50),
        ]);
        
        if (!isMounted) return;
        
        // Handle classes
        if (classesResponse.status === 'fulfilled') {
          setClasses(classesResponse.value.items.filter(item => !item.Is_disabled));
        } else {
          console.error('Failed to fetch classes:', classesResponse.reason);
          setClassesError('Unable to load classes. Please try again later.');
        }
        setLoadingClasses(false);
        
        // Handle ads
        if (adsResponse.status === 'fulfilled') {
          const now = new Date();
          const activeSponsors = adsResponse.value.items.filter(item => {
            if (item.Is_disabled) return false;
            const expirationDate = item.item_info?.expiration_date;
            if (expirationDate) return new Date(expirationDate) >= now;
            return true;
          });
          if (activeSponsors.length > 0) {
            const randomIndex = Math.floor(Math.random() * activeSponsors.length);
            setSponsorAd(activeSponsors[randomIndex]);
          }
        } else {
          console.error('Failed to fetch sponsors:', adsResponse.reason);
        }
        
        // Handle images
        if (imagesResponse.status === 'fulfilled') {
          const allImages = imagesResponse.value.items || [];
          const imageOnly = allImages.filter(item => item.image_type === 'Image' && item.image?.url);
          const shuffled = imageOnly.sort(() => Math.random() - 0.5);
          setGalleryImages(shuffled.slice(0, 6));
        } else {
          console.error('Failed to fetch gallery images:', imagesResponse.reason);
        }
        setLoadingGalleryImages(false);
      } catch (error) {
        console.error('Failed to fetch secondary data:', error);
        if (isMounted) {
          setLoadingClasses(false);
          setLoadingGalleryImages(false);
        }
      }
    };
    
    fetchAllData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper functions
  const getEventInfo = (event: PublicItem) => {
    try {
      return event.item_info ? JSON.parse(JSON.stringify(event.item_info)) : null;
    } catch { return null; }
  };

  const getEventImage = (event: PublicItem) => {
    const info = getEventInfo(event);
    const imageData = info?.image;
    if (Array.isArray(imageData) && imageData.length > 0) return imageData[0];
    return imageData || eventImage;
  };

  const getEventDate = (event: PublicItem) => {
    const info = getEventInfo(event);
    if (info?.startDate) {
      const date = new Date(info.startDate);
      const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${dateStr} at ${timeStr}`;
    }
    return 'Date TBA';
  };

  const getClassInfo = (cls: PublicItem) => {
    try {
      return cls.item_info ? JSON.parse(JSON.stringify(cls.item_info)) : null;
    } catch { return null; }
  };

  const getClassImage = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    const imageData = info?.image;
    if (Array.isArray(imageData) && imageData.length > 0) return imageData[0];
    return imageData || classImage;
  };

  const getClassLevel = (cls: PublicItem) => {
    const info = getClassInfo(cls);
    return info?.educationalLevel || 'All Levels';
  };

  // Category data for accordion
  const categories = [
    { 
      icon: CalendarIcon, 
      title: "Events & Shows", 
      description: "Gem shows, mineral exhibitions, and community gatherings",
      link: "/event"
    },
    { 
      icon: BookOpen, 
      title: "Classes & Workshops", 
      description: "Learn gem cutting, jewelry making, and mineral identification",
      link: "/classes"
    },
    { 
      icon: Gem, 
      title: "Rock Identification", 
      description: "Expert identification services for your specimens",
      link: "/rock-identification"
    },
    { 
      icon: Gift, 
      title: "Raffles & Prizes", 
      description: "Win amazing minerals and gemstones",
      link: "/raffles"
    },
  ];

  // Helper to get image URL with optimization
  const getGalleryImageUrl = (item: MediaItem, index: number) => {
    const url = item.image?.url;
    if (url) {
      return url.includes("?") ? `${url}&tpl=medium.jpg` : `${url}?tpl=medium.jpg`;
    }
    // Fallback to static images
    return [heroImage1, heroImage2, heroImage3, heroImage4][index % 4];
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Tampa Bay Minerals & Science Club - Events, Classes & Community</title>
        <meta name="description" content="Join Tampa Bay's premier mineral and science club. Explore events, classes, workshops, and connect with fellow enthusiasts." />
        <link rel="canonical" href={window.location.origin} />
        <meta property="og:title" content="Tampa Bay Minerals & Science Club - Events, Classes & Community" />
        <meta property="og:description" content="Join Tampa Bay's premier mineral and science club. Explore events, classes, workshops, and connect with fellow enthusiasts." />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Tampa Bay Minerals & Science Club - Events, Classes & Community" />
        <meta name="twitter:description" content="Join Tampa Bay's premier mineral and science club. Explore events, classes, workshops, and connect with fellow enthusiasts." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      <Hero raffles={raffles} loadingRaffles={loadingRaffles} />

      {/* Ad Banner */}
      {sponsorAd && (
        <AdBanner
          title={sponsorAd.title}
          description={sponsorAd.description}
          ctaText="Learn More"
          ctaLink={sponsorAd.item_info?.reference_url || '#'}
          imageUrl={(sponsorAd as any)._item_images_of_items?.items?.[0]?.display_image || eventImage}
        />
      )}

      {/* What We Offer Section - Modern Asymmetric Layout */}
      <section id="events" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Side - Text & Accordion */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm italic text-muted-foreground">What we offer</p>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                  Discover our
                  <br />
                  collection of{" "}
                  <span className="font-serif italic text-primary font-normal">
                    experiences
                  </span>
                </h2>
              </div>

              {/* Category Accordion */}
              <div className="space-y-3">
                {categories.map((category, index) => (
                  <Link 
                    key={index}
                    to={category.link}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                      <category.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:rotate-45 transition-all" />
                  </Link>
                ))}
              </div>

              <Link to="/event">
                <Button size="lg" className="rounded-full px-8 group">
                  View All Events
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Right Side - Dynamic Gallery Grid - BIGGER TILES */}
            <div className="hidden lg:block">
              <Link to="/images" className="block">
                <div className="grid grid-cols-3 gap-4 auto-rows-[180px]">
                  {loadingGalleryImages ? (
                    // Loading skeletons
                    <>
                      <Skeleton className="col-span-2 row-span-2 rounded-3xl" />
                      <Skeleton className="rounded-3xl" />
                      <Skeleton className="rounded-3xl" />
                      <Skeleton className="col-span-2 rounded-3xl" />
                      <Skeleton className="rounded-3xl" />
                    </>
                  ) : galleryImages.length > 0 ? (
                    // Dynamic images from API
                    <>
                      {/* Large featured image */}
                      <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden shadow-2xl group relative">
                        <img 
                          src={getGalleryImageUrl(galleryImages[0], 0)} 
                          alt="Gallery image" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                          Gallery
                        </Badge>
                      </div>
                      
                      {/* Top right */}
                      {galleryImages[1] && (
                        <div className="rounded-3xl overflow-hidden shadow-xl group">
                          <img 
                            src={getGalleryImageUrl(galleryImages[1], 1)} 
                            alt="Gallery image" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      {/* Middle right */}
                      {galleryImages[2] && (
                        <div className="rounded-3xl overflow-hidden shadow-xl group">
                          <img 
                            src={getGalleryImageUrl(galleryImages[2], 2)} 
                            alt="Gallery image" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      {/* Bottom wide */}
                      {galleryImages[3] && (
                        <div className="col-span-2 rounded-3xl overflow-hidden shadow-xl group relative">
                          <img 
                            src={getGalleryImageUrl(galleryImages[3], 3)} 
                            alt="Gallery image" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                      
                      {/* Bottom right */}
                      {galleryImages[4] && (
                        <div className="rounded-3xl overflow-hidden shadow-xl group">
                          <img 
                            src={getGalleryImageUrl(galleryImages[4], 4)} 
                            alt="Gallery image" 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    // Fallback to static images
                    <>
                      <div className="col-span-2 row-span-2 rounded-3xl overflow-hidden shadow-2xl group">
                        <img src={heroImage1} alt="Mineral showcase" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="rounded-3xl overflow-hidden shadow-xl group">
                        <img src={heroImage2} alt="Mineral showcase" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="rounded-3xl overflow-hidden shadow-xl group">
                        <img src={heroImage3} alt="Mineral showcase" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="col-span-2 rounded-3xl overflow-hidden shadow-xl group">
                        <img src={heroImage4} alt="Mineral showcase" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    </>
                  )}
                </div>
                
                {/* View Gallery link */}
                <div className="mt-5 text-center">
                  <span className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
                    View full gallery
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="text-primary-foreground">
              <div className="text-4xl md:text-5xl font-black mb-2">50+</div>
              <div className="text-sm font-medium opacity-80">Years Active</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-4xl md:text-5xl font-black mb-2">500+</div>
              <div className="text-sm font-medium opacity-80">Members</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-4xl md:text-5xl font-black mb-2">10+</div>
              <div className="text-sm font-medium opacity-80">Events/Year</div>
            </div>
            <div className="text-primary-foreground">
              <div className="text-4xl md:text-5xl font-black mb-2">150+</div>
              <div className="text-sm font-medium opacity-80">Vendors</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - Accordion Style */}
      <section id="about" className="py-20 bg-accent/10">
        <div className="container mx-auto px-4">
          <p className="text-sm italic text-muted-foreground mb-8">About the club</p>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left - Accordion */}
            <div>
              <Accordion type="single" collapsible defaultValue="story" className="space-y-3">
                <AccordionItem value="story" className="bg-card rounded-xl border border-border/50 px-6">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold text-foreground">Our Story</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Founded in 1970, the Tampa Bay Minerals & Science Club was born from a passion 
                    for earth sciences and a love for discovering the natural beauty hidden beneath 
                    our feet. Every event is crafted with care, attention to detail, and a commitment 
                    to quality that you can see and feel in each experience.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="education" className="bg-card rounded-xl border border-border/50 px-6">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold text-foreground">Education & Learning</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We offer hands-on classes in lapidary arts, gem cutting, jewelry making, and 
                    mineral identification. Our expert instructors bring decades of experience to 
                    help you develop skills that will last a lifetime.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="community" className="bg-card rounded-xl border border-border/50 px-6">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold text-foreground">Community</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Join a vibrant community of collectors, hobbyists, and professionals who share 
                    your passion. From field trips to monthly meetings, there are countless 
                    opportunities to connect and learn from fellow enthusiasts.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="events" className="bg-card rounded-xl border border-border/50 px-6">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-semibold text-foreground">Events & Shows</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Our annual gem and mineral shows attract vendors and visitors from across the 
                    country. Discover rare specimens, unique jewelry, and educational displays that 
                    showcase the beauty of the mineral world.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            
            {/* Right - Feature Card */}
            <div className="flex items-start">
              <Card className="bg-card border-border/50 overflow-hidden w-full max-w-md">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">Made with</span>
                    <Heart className="h-5 w-5 text-destructive fill-destructive" />
                    <span className="text-lg font-semibold">Passion</span>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Every specimen in our collection, every class we teach, and every event we host 
                    is crafted in our welcoming clubhouse, where creativity meets geological wonder.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events - Bento Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <p className="text-sm italic text-muted-foreground mb-2">Coming up</p>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                Upcoming Events
              </h2>
            </div>
            <Link to="/event">
              <Button variant="outline" size="lg" className="rounded-full group">
                View All
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {loadingEvents ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={`rounded-2xl ${i === 1 ? 'col-span-2 row-span-2' : i === 4 ? 'col-span-2' : ''}`} />
              ))}
            </div>
          ) : eventsError ? (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertDescription>{eventsError}</AlertDescription>
            </Alert>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {events.slice(0, 6).map((event, index) => {
                const layouts = [
                  'col-span-2 row-span-2',
                  '',
                  '',
                  'col-span-2',
                  '',
                  '',
                ];
                const layout = layouts[index] || '';
                const isLarge = index === 0;
                const isWide = index === 3;
                
                return (
                  <Link
                    key={event.id}
                    to={`/event/${event.slug}`}
                    className={`group relative overflow-hidden rounded-2xl bg-muted transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${layout}`}
                  >
                    <BentoImage
                      src={getEventImage(event)}
                      alt={event.title}
                      className="group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isLarge || isWide ? 'from-black/80 via-black/20 to-transparent' : 'from-black/70 to-transparent'} transition-opacity group-hover:from-black/90`} />
                    <div className={`absolute inset-0 p-4 flex flex-col ${isLarge ? 'justify-end' : isWide ? 'flex-row items-end gap-4' : 'justify-end'}`}>
                      {isWide ? (
                        <>
                          <div className="flex-1" />
                          <div className="flex-1 text-white">
                            <h3 className="font-bold text-lg mb-1 line-clamp-2">{event.title}</h3>
                            <p className="text-white/80 text-sm line-clamp-2">{event.description}</p>
                          </div>
                        </>
                      ) : isLarge ? (
                        <div className="text-white">
                          <Badge className="mb-2 bg-primary/90 rounded-full">{getEventDate(event).split(' at ')[0]}</Badge>
                          <h3 className="font-bold text-xl md:text-2xl mb-2">{event.title}</h3>
                          <p className="text-white/80 text-sm line-clamp-3 mb-3 max-w-md">{event.description}</p>
                        </div>
                      ) : (
                        <div className="text-white">
                          <h3 className="font-semibold text-sm md:text-base line-clamp-2">{event.title}</h3>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="max-w-2xl mx-auto p-8 text-center bg-muted/30 border-dashed rounded-2xl">
              <CardContent className="pt-6">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No upcoming events at this time. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Classes Section */}
      <section id="classes" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div>
              <p className="text-sm italic text-muted-foreground mb-2">Learn with us</p>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                Classes & Workshops
              </h2>
            </div>
            <Link to="/classes">
              <Button variant="outline" size="lg" className="rounded-full group">
                View All Classes
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {loadingClasses ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className={`rounded-2xl ${i === 1 ? 'col-span-2 row-span-2' : ''}`} />
              ))}
            </div>
          ) : classesError ? (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertDescription>{classesError}</AlertDescription>
            </Alert>
          ) : classes.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
              {classes.slice(0, 4).map((cls, index) => {
                const layouts = ['col-span-2 row-span-2', '', '', ''];
                const layout = layouts[index] || '';
                const isLarge = index === 0;
                
                return (
                  <Link
                    key={cls.id}
                    to={`/classes/${cls.slug}`}
                    className={`group relative overflow-hidden rounded-2xl bg-muted transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${layout}`}
                  >
                    <img
                      src={getClassImage(cls)}
                      alt={cls.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isLarge ? 'from-black/80 via-black/20 to-transparent' : 'from-black/70 to-transparent'}`} />
                    
                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      {isLarge ? (
                        <div className="text-white">
                          <Badge className="mb-2 bg-accent/90 rounded-full">{getClassLevel(cls)}</Badge>
                          <h3 className="font-bold text-xl md:text-2xl mb-2">{cls.title}</h3>
                          <p className="text-white/80 text-sm line-clamp-3 max-w-md">{cls.description}</p>
                        </div>
                      ) : (
                        <div className="text-white">
                          <h3 className="font-semibold text-sm md:text-base line-clamp-2">{cls.title}</h3>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="max-w-2xl mx-auto p-8 text-center bg-background border-dashed rounded-2xl">
              <CardContent className="pt-6">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No classes available at this time. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Membership CTA */}
      <section id="membership" className="py-20">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-0 shadow-2xl rounded-3xl">
            <div className="grid lg:grid-cols-2">
              <div className="bg-primary p-12 flex flex-col justify-center">
                <Badge className="mb-6 bg-primary-foreground/20 text-primary-foreground w-fit">
                  <Users className="h-3 w-3 mr-1" />
                  Join Us
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black text-primary-foreground mb-4">
                  Become a Member
                </h2>
                <p className="text-lg text-primary-foreground/80 mb-8">
                  Join our community and unlock exclusive benefits, resources, and opportunities to connect with fellow enthusiasts.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/memberships">
                    <Button size="lg" variant="secondary" className="font-semibold rounded-full">
                      Join Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-12">
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { price: "$50", label: "First Adult" },
                    { price: "$25", label: "Additional" },
                    { price: "$5", label: "Each Child" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-4 bg-card rounded-xl">
                      <div className="text-2xl font-black text-primary mb-1">{item.price}</div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    "Monthly newsletter",
                    "Discounted event admission",
                    "Access to member library",
                    "Field trip participation",
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto bg-gradient-to-br from-accent to-accent/80 border-0 overflow-hidden rounded-3xl">
            <CardContent className="p-12 text-center relative">
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent-foreground/10 mb-6">
                  <Mail className="h-8 w-8 text-accent-foreground" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-accent-foreground mb-4">Stay Connected</h2>
                <p className="text-lg text-accent-foreground/80 mb-8 max-w-xl mx-auto">
                  Subscribe for event updates, class schedules, and exclusive member benefits
                </p>
                <form 
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (email.trim()) {
                      setNewsletterDialogOpen(true);
                    }
                  }}
                >
                  <Input 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-accent-foreground/10 border-accent-foreground/20 text-accent-foreground placeholder:text-accent-foreground/50 rounded-full"
                    required
                  />
                  <Button type="submit" variant="secondary" size="lg" className="h-12 px-8 font-semibold whitespace-nowrap rounded-full">
                    Subscribe
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <h3 className="font-black text-xl mb-4">Tampa Bay Minerals</h3>
              <p className="text-sm text-background/70 mb-6">
                Fostering passion for minerals, gems, and earth sciences through education and community since 1970.
              </p>
              <div className="flex gap-3">
                <Button size="icon" variant="ghost" className="h-9 w-9 text-background/70 hover:text-background hover:bg-background/10 rounded-full">
                  <Facebook className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-background/70 hover:text-background hover:bg-background/10 rounded-full">
                  <Instagram className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-background/70 hover:text-background hover:bg-background/10 rounded-full">
                  <Twitter className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">Quick Links</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/event" className="text-background/70 hover:text-background transition-colors">Events</Link></li>
                <li><Link to="/classes" className="text-background/70 hover:text-background transition-colors">Classes</Link></li>
                <li><Link to="/vendors" className="text-background/70 hover:text-background transition-colors">Vendors</Link></li>
                <li><Link to="/donation" className="text-background/70 hover:text-background transition-colors">Donate</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">Resources</h3>
              <ul className="space-y-3 text-sm">
                <li><Link to="/member-portal" className="text-background/70 hover:text-background transition-colors">Member Portal</Link></li>
                <li><Link to="/calendar" className="text-background/70 hover:text-background transition-colors">Calendar</Link></li>
                <li><Link to="/blog" className="text-background/70 hover:text-background transition-colors">Blog</Link></li>
                <li><Link to="/about" className="text-background/70 hover:text-background transition-colors">About Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">Contact</h3>
              <ul className="space-y-3 text-sm text-background/70">
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Tampa Bay, Florida
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  info@tampaminerals.org
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  (813) 555-0123
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-background/10 pt-8 text-center space-y-2">
            <p className="text-sm text-background/50">
              © {new Date().getFullYear()} Tampa Bay Minerals & Science Club. All rights reserved.
            </p>
            <p className="text-xs text-background/40">
              Powered by{' '}
              <a 
                href="https://www.xzentrq.com/?utm_source=tbmsc&utm_medium=website&utm_campaign=tbmsc_2026&utm_content=footer_link"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-background transition-colors underline"
              >
                xzentrq.com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Newsletter Subscription Dialog */}
      <NewsletterSubscriptionDialog
        open={newsletterDialogOpen}
        onOpenChange={(open) => {
          setNewsletterDialogOpen(open);
          if (!open) {
            setEmail(""); // Clear email after dialog closes
          }
        }}
        initialEmail={email}
      />
    </div>
  );
};

export default Index;
