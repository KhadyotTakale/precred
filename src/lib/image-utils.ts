/**
 * Image optimization utilities for faster loading and better performance
 */

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Appends thumbnail template parameter to image URLs
 * Adds &tpl=small.jpg for optimized image delivery
 */
export function getSmallImageUrl(url: string): string {
  if (!url) return '';
  
  // Skip if it's a local asset or data URL
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  
  try {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tpl=medium.jpg`;
  } catch {
    return url;
  }
}

/**
 * Generates an optimized image URL with query parameters
 * Supports common image CDN patterns and adds tpl=small.jpg
 */
export function getOptimizedImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';

  // Skip if it's a local asset or data URL
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const { width, height, quality = 80, format } = options;
  
  try {
    const urlObj = new URL(url);
    
    // If it's a Google Cloud Storage URL
    if (urlObj.hostname.includes('googleapis.com') || urlObj.hostname.includes('googleusercontent.com')) {
      const params = new URLSearchParams();
      if (width) params.append('w', width.toString());
      if (height) params.append('h', height.toString());
      if (quality) params.append('q', quality.toString());
      if (format) params.append('fm', format);
      params.append('tpl', 'medium.jpg');
      
      return params.toString() ? `${url}?${params.toString()}` : url;
    }
    
    // For other URLs, just add tpl parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tpl=medium.jpg`;
  } catch {
    // If URL parsing fails, try to add tpl anyway
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tpl=medium.jpg`;
  }
}

/**
 * Gets optimized metadata image (OG/Twitter cards)
 * Uses smaller dimensions for faster loading
 */
export function getMetadataImage(url: string): string {
  return getOptimizedImageUrl(url, {
    width: 1200,
    height: 630,
    quality: 85,
    format: 'webp'
  });
}

/**
 * Gets optimized thumbnail image
 */
export function getThumbnailImage(url: string, size: 'small' | 'medium' | 'large' = 'medium'): string {
  const sizes = {
    small: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 800 }
  };
  
  const { width, height } = sizes[size];
  
  return getOptimizedImageUrl(url, {
    width,
    height,
    quality: 80,
    format: 'webp'
  });
}

/**
 * Gets optimized hero/featured image
 */
export function getHeroImage(url: string): string {
  return getOptimizedImageUrl(url, {
    width: 1920,
    quality: 85,
    format: 'webp'
  });
}

/**
 * Generates a blur placeholder data URL
 */
export function getBlurDataUrl(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Cfilter id="b"%3E%3CfeGaussianBlur stdDeviation="10"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" fill="%23e5e7eb" filter="url(%23b)"/%3E%3C/svg%3E';
}

/**
 * Preloads critical images for better performance
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Creates a responsive image srcset
 */
export function createResponsiveSrcSet(url: string, sizes: number[]): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(url, { width: size })} ${size}w`)
    .join(', ');
}
