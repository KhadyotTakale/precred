import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Calendar, ExternalLink, ArrowRight, ChevronLeft, ChevronRight, ShoppingCart, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Skeleton } from "@/components/ui/skeleton";
import { getSmallImageUrl } from "@/lib/image-utils";
interface ClassCardProps {
  title: string;
  duration: string;
  capacity: string;
  description: string;
  level: string;
  date?: string;
  image?: string;
  images?: string[]; // Support multiple images
  slug?: string;
  registrationUrl?: string;
  layoutVariant?: 'single' | 'triple' | 'mixed' | 'double' | 'horizontal' | 'compact';
  gridSpan?: string; // For masonry layout
  id: number;
  price: number;
  currency: string;
  maxQuantity?: number;
  itemType?: string;
}
const ClassCard = ({
  title,
  duration,
  capacity,
  description,
  level,
  date,
  image,
  images = [],
  slug,
  registrationUrl,
  layoutVariant = 'single',
  gridSpan = '',
  id,
  price,
  currency,
  maxQuantity,
  itemType = 'Classes'
}: ClassCardProps) => {
  const navigate = useNavigate();
  const {
    addItem
  } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLayout, setImageLayout] = useState<1 | 2 | 4>(1);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  // Determine image layout on mount
  useEffect(() => {
    if (images.length > 1) {
      // Randomly choose: 1 (with thumbnails), 2 (side by side), 4 (grid)
      const layouts: (1 | 2 | 4)[] = [1, 1, 2, 4]; // Weight towards single with thumbnails
      const randomLayout = layouts[Math.floor(Math.random() * layouts.length)];
      setImageLayout(randomLayout);
    }
  }, [images.length]);
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
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
  const handleViewDetails = () => {
    if (slug) {
      navigate(`/classes/${slug}`);
    }
  };
  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (registrationUrl && registrationUrl !== '#') {
      window.open(registrationUrl, '_blank');
    }
  };
  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id,
      slug: slug || '',
      title,
      description,
      price,
      currency,
      image: displayImages[0],
      maxQuantity,
      itemType
    });
  };
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1);
  };
  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1);
  };

  // Determine which images to display
  const displayImages = images.length > 0 ? images : image ? [image] : [];
  const hasMultipleImages = displayImages.length > 1;

  // Determine if this is a compact layout
  const isCompactLayout = layoutVariant === 'triple' || layoutVariant === 'mixed' || layoutVariant === 'compact';
  const isMiniLayout = layoutVariant === 'triple' || layoutVariant === 'compact';
  const isHorizontal = layoutVariant === 'horizontal';

  // Get images to display based on layout
  const getImagesToShow = () => {
    if (!hasMultipleImages) return displayImages;
    if (imageLayout === 1) return displayImages; // Show all for thumbnail layout
    return displayImages.slice(0, imageLayout);
  };
  const imagesToShow = getImagesToShow();
  const handleThumbnailClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setCurrentImageIndex(index);
  };
  const renderImageLayout = () => {
    if (!displayImages.length) return null;

    // Horizontal layout - small square image on left
    if (isHorizontal) {
      return <div className="relative w-32 self-stretch flex-shrink-0 overflow-hidden rounded-lg group/images">
          {hasMultipleImages ? <>
              <div ref={scrollContainerRef} className="relative w-full h-full overflow-hidden">
                {!loadedImages.has(currentImageIndex) && <Skeleton className="absolute inset-0 w-full h-full" />}
                <img src={getSmallImageUrl(displayImages[currentImageIndex])} alt={title} loading="lazy" onLoad={() => handleImageLoad(currentImageIndex)} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${loadedImages.has(currentImageIndex) ? 'opacity-100' : 'opacity-0'}`} />
              </div>
              {displayImages.length > 1 && <>
                  <button onClick={handlePrevImage} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover/images:opacity-100 transition-opacity z-10">
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button onClick={handleNextImage} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover/images:opacity-100 transition-opacity z-10">
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                    {displayImages.map((_, idx) => <div key={idx} className={`w-1 h-1 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-2' : 'bg-white/50'}`} />)}
                  </div>
                </>}
            </> : <>
              {!loadedImages.has(0) && <Skeleton className="absolute inset-0 w-full h-full" />}
              <img src={getSmallImageUrl(displayImages[0])} alt={title} loading="lazy" onLoad={() => handleImageLoad(0)} className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${loadedImages.has(0) ? 'opacity-100' : 'opacity-0'}`} />
            </>}
        </div>;
    }

    // Grid layout (2 or 4 images)
    if (hasMultipleImages && imageLayout > 1) {
      return <div className="relative h-48 min-h-[12rem] overflow-hidden group/images bg-background">
          <div className={`grid gap-2 h-full ${imageLayout === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
            {imagesToShow.map((img, idx) => <div key={idx} className="relative overflow-hidden rounded-lg bg-muted">
                {!loadedImages.has(idx) && <Skeleton className="absolute inset-0 w-full h-full" />}
                <img src={getSmallImageUrl(img)} alt={`${title} ${idx + 1}`} loading="lazy" onLoad={() => handleImageLoad(idx)} className={`w-full h-full object-cover object-center transition-all duration-300 group-hover/images:scale-105 ${loadedImages.has(idx) ? 'opacity-100' : 'opacity-0'}`} />
              </div>)}
          </div>
          <Badge className={`absolute top-3 right-3 ${getLevelColor(level)} z-10 shadow-lg`}>
            {level}
          </Badge>
          {displayImages.length > imageLayout && <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2.5 py-1 rounded-full shadow-lg z-10">
              +{displayImages.length - imageLayout}
            </div>}
        </div>;
    }

    // Main image with thumbnail gallery (inspired by reference image 1)
    return <div className="relative overflow-hidden group/images">
        {hasMultipleImages ? <div className="flex flex-col gap-2 bg-muted/10">
            {/* Main large image */}
            <div className="relative h-40 overflow-hidden rounded-lg bg-background shadow-sm">
              {!loadedImages.has(currentImageIndex) && <Skeleton className="absolute inset-0 w-full h-full" />}
              <img src={getSmallImageUrl(displayImages[currentImageIndex])} alt={title} loading="lazy" onLoad={() => handleImageLoad(currentImageIndex)} className={`w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-105 ${loadedImages.has(currentImageIndex) ? 'opacity-100' : 'opacity-0'}`} />
              <Badge className={`absolute top-2 left-2 ${getLevelColor(level)} z-10 shadow-md`}>
                {level}
              </Badge>
              {/* Navigation arrows */}
              <button onClick={handlePrevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white/90 text-foreground p-1.5 rounded-full shadow-lg opacity-0 group-hover/images:opacity-100 transition-opacity z-10">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={handleNextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white hover:bg-white/90 text-foreground p-1.5 rounded-full shadow-lg opacity-0 group-hover/images:opacity-100 transition-opacity z-10">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            {/* Thumbnail strip */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {displayImages.slice(0, 5).map((img, idx) => <button key={idx} onClick={e => handleThumbnailClick(e, idx)} className={`relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden transition-all ${idx === currentImageIndex ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' : 'opacity-70 hover:opacity-100'}`}>
                  <img src={getSmallImageUrl(img)} alt={`${title} thumbnail ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                </button>)}
              {displayImages.length > 5 && <div className="flex-shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{displayImages.length - 5}
                </div>}
            </div>
            
            {/* Pagination dots */}
            <div className="flex justify-center gap-1">
              {displayImages.map((_, idx) => <div key={idx} className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 w-1'}`} />)}
            </div>
          </div> : <div className="relative h-48 min-h-[12rem] overflow-hidden">
            {!loadedImages.has(0) && <Skeleton className="absolute inset-0 w-full h-full" />}
            <img src={getSmallImageUrl(displayImages[0])} alt={title} loading="lazy" onLoad={() => handleImageLoad(0)} className={`w-full h-full object-cover object-center transition-all duration-300 group-hover:scale-110 ${loadedImages.has(0) ? 'opacity-100' : 'opacity-0'}`} />
            <Badge className={`absolute top-3 right-3 ${getLevelColor(level)}`}>
              {level}
            </Badge>
          </div>}
      </div>;
  };
  return <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 cursor-pointer ${gridSpan} ${isHorizontal ? 'flex flex-row items-center gap-4' : 'flex flex-col'} h-full relative`} onClick={handleViewDetails}>
      {/* Add to Cart Button */}
      <Button onClick={handleAddToCart} size="icon" variant="secondary" className="absolute bottom-3 right-3 z-20 h-9 w-9 shadow-lg hover:scale-110 transition-transform bg-[#f8f9f8]">
        <ShoppingCart className="h-4 w-4" />
        <Plus className="h-3 w-3 absolute -top-0.5 -right-0.5" />
      </Button>

      {renderImageLayout()}
      <CardContent className={`flex flex-col flex-1 ${isCompactLayout || isHorizontal ? 'p-4' : 'p-6'}`}>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 overflow-hidden">
              <h3 className={`font-bold text-foreground group-hover:text-primary transition-colors ${isMiniLayout || isHorizontal ? 'text-sm line-clamp-2' : 'text-xl line-clamp-2'}`}>
                {title}
              </h3>
              <Badge variant="secondary" className="mt-2 font-semibold">
                {!price || price === 0 ? 'FREE' : <span className="flex items-start">
                    <span className="text-base leading-none">
                      ${Math.floor(price)}
                    </span>
                    <span className="text-[0.6em] leading-none ml-0.5">
                      .{(price % 1).toFixed(2).split('.')[1]}
                    </span>
                  </span>}
              </Badge>
            </div>
            {isHorizontal && <Badge className={`${getLevelColor(level)} flex-shrink-0 text-xs`}>
                {level}
              </Badge>}
          </div>
          
          {!isMiniLayout && !isHorizontal && <p className="text-muted-foreground mb-4 line-clamp-2 text-sm overflow-hidden">{description}</p>}

          {isHorizontal && <p className="text-muted-foreground text-xs line-clamp-1 mb-2 overflow-hidden">{description}</p>}

          <div className={`space-y-2 mb-4 text-sm text-muted-foreground overflow-hidden ${isMiniLayout || isHorizontal ? 'text-xs' : ''}`}>
            {!isMiniLayout && !isHorizontal && date && <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="line-clamp-1 overflow-hidden">{date}</span>
              </div>}
            <div className={`flex items-center overflow-hidden ${isMiniLayout || isHorizontal ? 'gap-2' : 'gap-4'}`}>
              <div className="flex items-center gap-1 overflow-hidden">
                <Clock className={`flex-shrink-0 ${isHorizontal ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className="truncate">{(() => {
                  // Convert ISO 8601 duration to readable format
                  if (!duration) return 'TBA';
                  const hourMatch = duration.match(/(\d+)H/);
                  const minuteMatch = duration.match(/(\d+)M/);
                  const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
                  const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
                  if (hours === 0 && minutes === 0) return duration;
                  if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
                  if (hours === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
                  return `${hours}h ${minutes}m`;
                })()}</span>
              </div>
              {!isMiniLayout && !isHorizontal && <div className="flex items-center gap-1 overflow-hidden">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{capacity}</span>
                </div>}
            </div>
          </div>
        </div>

        {!isMiniLayout && !isHorizontal && registrationUrl && registrationUrl !== '#' && <div className="flex gap-2">
            <Button className="w-full" onClick={handleRegister}>
              Register
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>}
      </CardContent>
    </Card>;
};
export default ClassCard;