import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { elegantAPI, MediaItem } from "@/lib/elegant-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageIcon, ExternalLink, Play, Copy, Check, X, ChevronLeft, ChevronRight, Maximize2, Video, Youtube, Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Images() {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const perPage = 24;

  useEffect(() => {
    fetchImages();
  }, [currentPage, searchQuery, mediaTypeFilter]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await elegantAPI.getImages(searchQuery, currentPage, perPage, mediaTypeFilter);
      setImages(response.items || []);
      const total = response.pageTotal || 1;
      setTotalPages(total);
    } catch (error) {
      console.error("Failed to fetch images:", error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setMediaTypeFilter(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const getMediaUrl = (item: MediaItem): string => {
    // Check for YouTube URL first
    if (item.YouTubeurl) {
      return item.YouTubeurl;
    }
    if (item.image_type === "Video" && item.video?.url) {
      return item.video.url;
    }
    return item.image?.url || "";
  };

  const getMediaName = (item: MediaItem): string => {
    if (item.image_type === "Video" && item.video?.name) {
      return item.video.name;
    }
    return item.image?.name || "";
  };

  const getMediaType = (item: MediaItem): "image" | "video" | "youtube" => {
    // Check for YouTube URL first
    if (item.YouTubeurl) {
      return "youtube";
    }
    const url = getMediaUrl(item);
    // Check YouTube in URL (backup check)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return "youtube";
    }
    if (item.image_type === "Video" || url.includes(".mp4") || url.includes(".webm") || url.includes(".mov")) {
      return "video";
    }
    return "image";
  };

  // Filter images by type (client-side filtering) - must be after getMediaType definition
  const filteredImages = images.filter((item) => {
    if (mediaTypeFilter === "all") return true;
    const type = getMediaType(item);
    if (mediaTypeFilter === "image") return type === "image";
    if (mediaTypeFilter === "video") return type === "video";
    if (mediaTypeFilter === "youtube") return type === "youtube";
    return true;
  });

  const getYoutubeEmbedUrl = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const getYoutubeThumbnail = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : "";
  };

  // Generate video thumbnail
  const generateVideoThumbnail = (item: MediaItem, videoUrl: string) => {
    if (videoThumbnails[item.id]) return;
    
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'metadata';
    
    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          setVideoThumbnails(prev => ({ ...prev, [item.id]: thumbnail }));
        }
      } catch (e) {
        // CORS error - fallback to placeholder
      }
    };
  };

  // Open lightbox
  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Navigate lightbox (use filteredImages length)
  const navigateLightbox = (direction: 'prev' | 'next') => {
    const length = filteredImages.length;
    if (direction === 'prev') {
      setLightboxIndex(prev => (prev === 0 ? length - 1 : prev - 1));
    } else {
      setLightboxIndex(prev => (prev === length - 1 ? 0 : prev + 1));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowLeft') navigateLightbox('prev');
      if (e.key === 'ArrowRight') navigateLightbox('next');
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, filteredImages.length]);

  // Swipe gesture support for mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current !== null ? Math.abs(touchStartY.current - (touchEndX.current || 0)) : 0;
    const minSwipeDistance = 50;
    
    // Only register horizontal swipes (not vertical scrolling)
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        // Swiped left - go to next
        navigateLightbox('next');
      } else {
        // Swiped right - go to previous
        navigateLightbox('prev');
      }
    }
    
    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => handlePageChange(1)}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => handlePageChange(i)} 
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // Current lightbox item (use filteredImages for consistency)
  const currentLightboxItem = filteredImages[lightboxIndex];
  const currentLightboxType = currentLightboxItem ? getMediaType(currentLightboxItem) : 'image';
  const currentLightboxUrl = currentLightboxItem ? getMediaUrl(currentLightboxItem) : '';
  const currentLightboxName = currentLightboxItem ? getMediaName(currentLightboxItem) : '';

  return (
    <>
      <Helmet>
        <title>Image Gallery | Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Browse all images and media from the Tampa Bay Minerals & Science Club." />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-6">
            <ImageIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Image Gallery</h1>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={mediaTypeFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: perPage }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {searchQuery || mediaTypeFilter !== "all" ? "No matching media found" : "No images found"}
                </h2>
                <p className="text-muted-foreground">
                  {searchQuery || mediaTypeFilter !== "all" 
                    ? "Try adjusting your search or filter." 
                    : "There are no images uploaded yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Pagination - Top */}
              {totalPages > 1 && (
                <div className="mb-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredImages.map((item, index) => {
                  const mediaType = getMediaType(item);
                  const mediaUrl = getMediaUrl(item);
                  const mediaName = getMediaName(item);
                  const imageUrl = mediaUrl.includes("?") 
                    ? `${mediaUrl}&tpl=medium.jpg` 
                    : `${mediaUrl}?tpl=medium.jpg`;
                  
                  // Get title and tags
                  const title = item.title || item.media_info?.name || mediaName || '';
                  const tags = item.tags || item.media_attributes?.tags || '';
                  const tagsList = tags ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
                  
                  // Get YouTube thumbnail
                  const youtubeThumbnail = mediaType === "youtube" ? getYoutubeThumbnail(mediaUrl) : null;
                  
                  // Generate video thumbnail on mount
                  if (mediaType === "video" && !videoThumbnails[item.id]) {
                    generateVideoThumbnail(item, mediaUrl);
                  }
                  
                  return (
                    <Card 
                      key={item.id} 
                      className="group overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                      onClick={() => openLightbox(index)}
                    >
                      <div className="aspect-square relative bg-muted">
                        {mediaType === "image" && (
                          <img
                            src={imageUrl}
                            alt={mediaName || "Image"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        {mediaType === "video" && (
                          <div className="w-full h-full relative">
                            {videoThumbnails[item.id] ? (
                              <img
                                src={videoThumbnails[item.id]}
                                alt={mediaName || "Video thumbnail"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                                <Video className="h-8 w-8 text-muted-foreground/50" />
                              </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                                <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        {mediaType === "youtube" && (
                          <div className="w-full h-full relative">
                            {youtubeThumbnail ? (
                              <img
                                src={youtubeThumbnail}
                                alt={mediaName || "YouTube thumbnail"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
                                <Youtube className="h-10 w-10 text-red-500" />
                              </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                                <Play className="h-5 w-5 text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Expand icon on hover */}
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                            <Maximize2 className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>

                        {/* Type badge */}
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "absolute top-2 right-2 text-xs flex items-center gap-1",
                            mediaType === "youtube" && "bg-red-600 text-white hover:bg-red-700",
                            mediaType === "video" && "bg-primary text-primary-foreground"
                          )}
                        >
                          {mediaType === "youtube" && <Youtube className="h-3 w-3" />}
                          {mediaType === "video" && <Video className="h-3 w-3" />}
                          {mediaType === "image" && <ImageIcon className="h-3 w-3" />}
                          {mediaType}
                        </Badge>
                      </div>
                      <CardContent className="p-2 space-y-1">
                        {title && (
                          <p className="text-xs font-medium text-foreground line-clamp-1" title={title}>
                            {title}
                          </p>
                        )}
                        {tagsList.length > 0 && (
                          <ul className="flex flex-wrap gap-1">
                            {tagsList.slice(0, 3).map((tag: string, tagIndex: number) => (
                              <li key={tagIndex} className="text-[10px] text-primary flex items-center gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-primary" />
                                {tag}
                              </li>
                            ))}
                            {tagsList.length > 3 && (
                              <li className="text-[10px] text-muted-foreground">+{tagsList.length - 3}</li>
                            )}
                          </ul>
                        )}
                        {!title && !tagsList.length && mediaName && (
                          <p className="text-xs text-muted-foreground truncate" title={mediaName}>
                            {mediaName}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

            </>
          )}
        </div>
      </main>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 h-10 w-10"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Navigation buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            {/* Media content */}
            <div className="w-full h-full flex items-center justify-center p-16">
              {currentLightboxType === "image" && (
                <img
                  src={currentLightboxUrl}
                  alt={currentLightboxName || "Image"}
                  className="max-w-full max-h-full object-contain animate-fade-in"
                />
              )}
              {currentLightboxType === "video" && (
                <video
                  key={currentLightboxUrl}
                  src={currentLightboxUrl}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain animate-fade-in"
                />
              )}
              {currentLightboxType === "youtube" && (
                <iframe
                  key={currentLightboxUrl}
                  src={`${getYoutubeEmbedUrl(currentLightboxUrl)}?autoplay=1`}
                  className="w-full max-w-4xl aspect-video animate-fade-in"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>

            {/* Bottom info bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="secondary" className={cn(
                    currentLightboxType === "youtube" && "bg-red-600 text-white"
                  )}>
                    {currentLightboxType}
                  </Badge>
                  {currentLightboxName && (
                    <p className="text-white text-sm">{currentLightboxName}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-sm">
                    {lightboxIndex + 1} / {images.length}
                  </span>
                  {currentLightboxType === "image" && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => window.open(currentLightboxUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-8 w-8"
                        onClick={() => copyToClipboard(currentLightboxUrl)}
                      >
                        {copiedUrl === currentLightboxUrl ? (
                          <Check className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
