import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getSmallImageUrl } from '@/lib/image-utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  skeletonClassName?: string;
  priority?: boolean;
  useSmallTpl?: boolean;
}

export function LazyImage({ 
  src, 
  alt, 
  className, 
  skeletonClassName,
  priority = false,
  useSmallTpl = true,
  ...props 
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageSrc = useSmallTpl ? getSmallImageUrl(src) : src;
  const [error, setError] = useState(false);

  useEffect(() => {
    if (priority && imageSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageSrc;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [imageSrc, priority]);

  if (error) {
    return (
      <div className={cn("bg-muted flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {!isLoaded && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", skeletonClassName)} />
      )}
      <img
        src={imageSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
}
