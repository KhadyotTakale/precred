import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getSmallImageUrl } from '@/lib/image-utils';

interface BentoImageProps {
  src: string;
  alt: string;
  className?: string;
  useSmallTpl?: boolean;
}

export function BentoImage({ src, alt, className = '', useSmallTpl = true }: BentoImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageSrc = useSmallTpl ? getSmallImageUrl(src) : src;

  return (
    <>
      {!isLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </>
  );
}
