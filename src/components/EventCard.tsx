import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Youtube, Video as VideoIcon, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSmallImageUrl } from "@/lib/image-utils";

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  description: string;
  image: string;
  mediaType?: 'Image' | 'Video' | 'YouTube';
  slug: string;
  showSlug?: boolean;
}

const EventCard = ({ title, date, location, description, image, mediaType, slug, showSlug = false }: EventCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Detect media type from URL if not provided
  const detectedType = mediaType || (() => {
    if (!image) return 'Image';
    if (image.includes('youtube.com') || image.includes('youtu.be')) return 'YouTube';
    if (image.match(/\.(mp4|webm|ogg|mov)$/i)) return 'Video';
    return 'Image';
  })();

  const handleMouseEnter = () => {
    if (videoRef.current && detectedType === 'Video') {
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current && detectedType === 'Video') {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <Card 
      className="overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative h-48 overflow-hidden bg-black">
        {detectedType === 'YouTube' ? (
          <iframe
            src={image}
            className="w-full h-full object-cover"
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        ) : detectedType === 'Video' ? (
          <video
            ref={videoRef}
            src={image}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            muted
            loop
            playsInline
          />
        ) : (
          <>
            {!imageLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
            <img 
              src={getSmallImageUrl(image)} 
              alt={title}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-110 transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Slug Badge */}
        {showSlug && (
          <Badge variant="secondary" className="absolute bottom-2 left-2 z-10 font-mono text-xs">
            {slug}
          </Badge>
        )}
        
        {/* Media Type Badge */}
        <div className="absolute top-2 right-2 z-10">
          {detectedType === 'YouTube' && (
            <div className="bg-red-600 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold shadow-lg">
              <Youtube className="h-3 w-3" />
              YouTube
            </div>
          )}
          {detectedType === 'Video' && (
            <div className="bg-blue-600 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold shadow-lg">
              <VideoIcon className="h-3 w-3" />
              Video
            </div>
          )}
          {detectedType === 'Image' && (
            <div className="bg-green-600 text-white px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold shadow-lg">
              <ImageIcon className="h-3 w-3" />
              Image
            </div>
          )}
        </div>
      </div>
      
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        </div>

        <p className="text-muted-foreground mb-4 line-clamp-3">{description}</p>

        <Link to={`/event/${slug}`}>
          <Button variant="outline" className="w-full group/btn">
            Learn More
            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default EventCard;
