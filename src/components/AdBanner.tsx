import { X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AdBannerProps {
  title: string;
  description: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  variant?: "horizontal" | "vertical";
  dismissible?: boolean;
}

const AdBanner = ({
  title,
  description,
  ctaText = "Learn More",
  ctaLink = "#",
  imageUrl,
  variant = "horizontal",
  dismissible = true,
}: AdBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  if (variant === "vertical") {
    return (
      <div className="relative bg-gradient-to-b from-primary/10 via-accent/5 to-transparent border border-border/50 rounded-xl p-4 backdrop-blur-sm">
        {dismissible && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        {imageUrl && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-24 object-cover"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary/70 uppercase tracking-wider">Sponsored</p>
          <h4 className="font-semibold text-foreground text-sm leading-tight">{title}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          
          <a
            href={ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-2"
          >
            {ctaText}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-y border-border/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {imageUrl && (
              <div className="hidden sm:block flex-shrink-0">
                <img
                  src={imageUrl}
                  alt={title}
                  className="h-12 w-12 rounded-lg object-cover ring-1 ring-border/50"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-primary/60 uppercase tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">
                  AD
                </span>
                <h4 className="font-medium text-foreground text-sm truncate">{title}</h4>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-full transition-colors"
            >
              {ctaText}
              <ExternalLink className="h-3 w-3" />
            </a>
            
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsVisible(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdBanner;
