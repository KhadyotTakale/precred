import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, Gift, ArrowRight, Sparkles } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import heroImage1 from "@/assets/hero-minerals.jpg";
import heroImage2 from "@/assets/hero-collage.png";
import heroImage3 from "@/assets/hero-show-1.jpg";
import heroImage4 from "@/assets/hero-show-2.jpg";
import heroImage5 from "@/assets/hero-show-3.jpg";
import clubLogo from "@/assets/club-logo-new.png";
import eventImage from "@/assets/event-show.jpg";
import { elegantAPI, type MediaItem } from "@/lib/elegant-api";

// Static fallback images
const staticHeroImages = [heroImage1, heroImage2, heroImage3, heroImage4, heroImage5];

interface RaffleItem {
  id: number;
  title: string;
  slug: string;
  price?: number;
  item_info?: {
    end_date?: string;
  };
  _item_images_of_items?: {
    items?: Array<{
      display_image?: string;
      image_type?: string;
    }>;
  };
}

interface HeroProps {
  raffles?: RaffleItem[];
  loadingRaffles?: boolean;
}

const Hero = ({
  raffles = [],
  loadingRaffles = false
}: HeroProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [dynamicImages, setDynamicImages] = useState<string[]>([]);
  
  // Fetch random images from API
  useEffect(() => {
    const fetchRandomImages = async () => {
      try {
        const response = await elegantAPI.getImages("", 1, 30);
        const allImages = response.items || [];
        // Filter to only images (not videos)
        const imageOnly = allImages.filter(item => item.image_type === 'Image' && item.image?.url);
        // Shuffle and pick 3 random images
        const shuffled = imageOnly.sort(() => Math.random() - 0.5);
        const urls = shuffled.slice(0, 3).map(item => {
          const url = item.image?.url || '';
          return url.includes("?") ? `${url}&tpl=medium.jpg` : `${url}?tpl=medium.jpg`;
        });
        if (urls.length > 0) {
          setDynamicImages(urls);
        }
      } catch (error) {
        console.error('Failed to fetch hero images:', error);
      }
    };
    fetchRandomImages();
  }, []);
  
  // Use dynamic images if available, otherwise fall back to static
  const floatingImages = useMemo(() => {
    if (dynamicImages.length >= 3) {
      return dynamicImages;
    }
    // Fallback to static images
    const shuffled = [...staticHeroImages].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [dynamicImages]);
  
  // Preload floating images
  useEffect(() => {
    if (floatingImages.length === 0) return;
    let loaded = 0;
    floatingImages.forEach(src => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        if (loaded === floatingImages.length) setImageLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        if (loaded === floatingImages.length) setImageLoaded(true);
      };
      img.src = src;
    });
  }, [floatingImages]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth"
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getRaffleImage = (raffle: RaffleItem) => {
    const images = raffle._item_images_of_items?.items;
    if (images && images.length > 0) {
      const displayImage = images.find(img => img.image_type === 'Image');
      return displayImage?.display_image || images[0]?.display_image;
    }
    return eventImage;
  };

  const getTimeRemaining = (endDateStr: string | undefined) => {
    if (!endDateStr) return null;
    const now = new Date();
    const endDate = new Date(endDateStr);
    const diff = endDate.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h left`;
  };

  return (
    <section className="relative min-h-[90vh] flex flex-col bg-background overflow-hidden">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3 text-sm">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              New
            </Badge>
            <span className="text-muted-foreground">
              Spring Classes Now Open for Registration!
            </span>
            <Link 
              to="/classes" 
              className="text-primary font-medium hover:underline inline-flex items-center gap-1 group"
            >
              Enroll Today
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Hero Content */}
      <div className="flex-1 flex items-center relative">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 relative z-10">
              <div className="space-y-2">
                <p className="text-sm italic text-muted-foreground tracking-wide">
                  Discover with us
                </p>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight text-foreground">
                  Mineral
                  <br />
                  discoveries for
                  <br />
                  <span className="font-serif italic text-primary font-normal">
                    your journey
                  </span>
                </h1>
              </div>
              
              <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
                Bringing knowledge and beauty to life, one specimen at a time. 
                Discover unique minerals, expert classes, and a passionate community.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  size="lg" 
                  className="px-8 h-12 text-base font-semibold rounded-full group" 
                  onClick={() => scrollToSection("events")}
                >
                  Explore Events
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="lg" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => scrollToSection("about")}
                >
                  Our Story
                </Button>
              </div>

              {/* Search Box */}
              <form onSubmit={handleSearch} className="max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    type="text" 
                    placeholder="Search minerals, gems, vendors, classes..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="h-12 pl-12 pr-4 text-base bg-muted/50 border-border/50 rounded-full" 
                  />
                </div>
              </form>
            </div>

            {/* Right Content - Floating Image Cards - BIGGER */}
            <div className="hidden lg:block relative h-[560px]">
              {/* Main tilted card - LARGER */}
              <div 
                className={`absolute top-0 right-0 w-80 h-96 rounded-3xl overflow-hidden shadow-2xl transform rotate-6 hover:rotate-3 transition-all duration-500 ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '100ms' }}
              >
                <img 
                  src={floatingImages[0]} 
                  alt="Mineral showcase" 
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1">
                  Featured
                </Badge>
              </div>
              
              {/* Secondary card - bottom left - LARGER */}
              <div 
                className={`absolute bottom-0 left-0 w-64 h-72 rounded-3xl overflow-hidden shadow-xl transform -rotate-6 hover:-rotate-3 transition-all duration-500 ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '200ms' }}
              >
                <img 
                  src={floatingImages[1]} 
                  alt="Mineral showcase" 
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              
              {/* Third card - middle overlapping - LARGER */}
              <div 
                className={`absolute top-36 left-32 w-56 h-64 rounded-3xl overflow-hidden shadow-xl transform rotate-3 hover:rotate-0 transition-all duration-500 border-4 border-background ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '300ms' }}
              >
                <img 
                  src={floatingImages[2]} 
                  alt="Mineral showcase" 
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {/* Decorative elements */}
              <div className="absolute top-16 right-[340px] w-6 h-6 text-primary">
                <Sparkles className="w-full h-full" />
              </div>
              <div className="absolute bottom-24 right-8 w-4 h-4 rounded-full bg-accent" />
              <div className="absolute top-56 right-4 w-3 h-3 rounded-full bg-secondary" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Raffles */}
      {raffles.length > 0 && (
        <div className="lg:hidden bg-card/90 backdrop-blur-sm border-t border-border/50 py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Active Raffles</p>
              <Link to="/raffles">
                <Button variant="ghost" size="sm" className="text-xs text-primary h-7">
                  View All
                </Button>
              </Link>
            </div>
            
            <div className="space-y-1">
              {raffles.slice(0, 3).map(raffle => (
                <Link 
                  key={raffle.id} 
                  to={`/raffles/${raffle.slug}`} 
                  className="flex items-center gap-3 py-2 group"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <Gift className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {raffle.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getTimeRemaining(raffle.item_info?.end_date) || 'Enter to win'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
