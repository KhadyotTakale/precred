import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Link, Youtube, FolderOpen, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import { elegantAPI } from '@/lib/elegant-api';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/clerk-react';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string, mediaType?: 'Image' | 'Video' | 'YouTube') => void;
  itemsType?: 'Image' | 'Video' | 'YouTube';
  sequence?: number;
  label?: string;
  showTypeSelector?: boolean;
}

const ITEMS_PER_PAGE = 24;

export function ImageUpload({ 
  onImageUploaded, 
  itemsType: defaultItemsType = 'Image',
  sequence = 1,
  label = "Upload Media",
  showTypeSelector = true
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'Image' | 'Video' | 'YouTube'>(defaultItemsType);
  const [currentMediaType, setCurrentMediaType] = useState<'Image' | 'Video' | 'YouTube'>('Image');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [existingMedia, setExistingMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  
  // Pagination and search state
  const [browseSearch, setBrowseSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const { toast } = useToast();
  const { user } = useUser();

  const fetchExistingMedia = useCallback(async (search: string = '', page: number = 1) => {
    if (!user?.id) return;
    
    setLoadingMedia(true);
    try {
      const response = await elegantAPI.getImages(search, page, ITEMS_PER_PAGE);
      setExistingMedia(response.items || []);
      setTotalItems(response.itemsTotal || 0);
      setTotalPages(response.pageTotal || 0);
      setCurrentPage(response.curPage || 1);
    } catch (error) {
      console.error('Failed to fetch existing media:', error);
      toast({
        title: "Error",
        description: "Failed to load existing media files",
        variant: "destructive",
      });
    } finally {
      setLoadingMedia(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchExistingMedia();
  }, [fetchExistingMedia]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExistingMedia(browseSearch, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [browseSearch, fetchExistingMedia]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchExistingMedia(browseSearch, newPage);
    }
  };

  const handleSelectExistingMedia = (media: any) => {
    const mediaUrl = media.image?.url || media.video?.url;
    if (mediaUrl) {
      setSelectedMediaId(media.id);
      setPreviewUrl(mediaUrl);
      setCurrentMediaType(media.image_type);
      onImageUploaded(mediaUrl, media.image_type);
      toast({
        title: "Success",
        description: "Media file selected",
      });
    }
  };

  // Auto-detect media type from file extension
  const detectMediaTypeFromFile = (file: File): 'Image' | 'Video' => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'];
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];
    
    if (imageExtensions.includes(extension)) {
      return 'Image';
    } else if (videoExtensions.includes(extension)) {
      return 'Video';
    }
    
    // Also check MIME type as fallback
    if (file.type.startsWith('image/')) {
      return 'Image';
    } else if (file.type.startsWith('video/')) {
      return 'Video';
    }
    
    return 'Image'; // Default to Image
  };

  // Detect if URL is YouTube
  const isYouTubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('youtube.com') || 
             urlObj.hostname.includes('youtu.be') ||
             urlObj.hostname.includes('www.youtube.com') ||
             urlObj.hostname.includes('m.youtube.com');
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file extension before upload
    if (!file.name.includes('.')) {
      toast({
        title: "Error",
        description: "Please select a file with a valid extension",
        variant: "destructive",
      });
      return;
    }

    // Auto-detect media type from file
    const detectedType = detectMediaTypeFromFile(file);
    setSelectedType(detectedType);

    // Create local preview URL
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setCurrentMediaType(detectedType);

    setUploading(true);
    try {
      const response = await adminAPI.uploadImage(file, detectedType, sequence, user.id);
      
      // Extract the correct URL based on upload type
      const uploadedUrl = response.image_type === 'Image' 
        ? response.image?.url 
        : response.video?.url;
      
      if (!uploadedUrl) {
        throw new Error('No URL returned from upload');
      }
      
      // Update preview to uploaded URL
      setPreviewUrl(uploadedUrl);
      setCurrentMediaType(response.image_type);
      onImageUploaded(uploadedUrl, response.image_type);
      toast({
        title: "Success",
        description: `${selectedType} uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      setPreviewUrl(''); // Clear preview on error
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please sign in to add YouTube videos",
        variant: "destructive",
      });
      return;
    }

    // Extract YouTube video ID and create embed URL
    let videoId = '';
    try {
      const url = new URL(youtubeUrl);
      // Validate it's actually a YouTube domain
      if (url.hostname.includes('youtube.com') || url.hostname.includes('www.youtube.com') || url.hostname.includes('m.youtube.com')) {
        videoId = url.searchParams.get('v') || '';
      } else if (url.hostname === 'youtu.be') {
        videoId = url.pathname.slice(1).split('?')[0]; // Remove any query params
      } else {
        throw new Error('Not a YouTube URL');
      }
    } catch {
      // Try direct video ID (11 character alphanumeric string)
      const directIdMatch = youtubeUrl.trim().match(/^[a-zA-Z0-9_-]{11}$/);
      if (directIdMatch) {
        videoId = youtubeUrl.trim();
      }
    }

    // Validate video ID format (YouTube IDs are typically 11 characters)
    if (videoId && videoId.length === 11 && /^[a-zA-Z0-9_-]+$/.test(videoId)) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      
      setUploading(true);
      try {
        // Send to API with image_type: "YouTube" and url
        await adminAPI.uploadYouTubeUrl(youtubeUrl.trim(), user.id);
        
        setPreviewUrl(embedUrl);
        setCurrentMediaType('YouTube');
        onImageUploaded(embedUrl, 'YouTube');
        toast({
          title: "Success",
          description: "YouTube video URL added",
        });
      } catch (error) {
        console.error('YouTube upload error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add YouTube URL",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    } else {
      toast({
        title: "Error",
        description: "Invalid YouTube URL. Please enter a valid YouTube video URL or video ID.",
        variant: "destructive",
      });
    }
  };

  const handleExternalUrlSubmit = () => {
    if (externalUrl) {
      // Auto-detect if it's a YouTube URL
      if (isYouTubeUrl(externalUrl)) {
        setYoutubeUrl(externalUrl);
        setSelectedType('YouTube');
        // Trigger YouTube submit instead
        handleYoutubeSubmit();
        return;
      }
      
      setPreviewUrl(externalUrl);
      setCurrentMediaType(selectedType);
      onImageUploaded(externalUrl, selectedType);
      toast({
        title: "Success",
        description: "External URL added",
      });
    }
  };

  const getAcceptTypes = () => {
    switch (selectedType) {
      case 'Image':
        return 'image/*';
      case 'Video':
        return 'video/*';
      default:
        return '*/*';
    }
  };

  const renderPreview = () => {
    if (!previewUrl) return null;

    // Check if it's a YouTube embed based on media type or URL
    if (currentMediaType === 'YouTube' || previewUrl.includes('youtube.com/embed') || previewUrl.includes('youtu.be')) {
      const embedUrl = previewUrl.includes('youtube.com/embed') ? previewUrl : previewUrl;
      return (
        <div className="relative">
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-10">
            YouTube
          </div>
          <iframe
            width="560"
            height="315"
            src={embedUrl}
            className="w-full rounded-lg"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // Check if URL indicates it's a video by extension, type, or blob
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    const isVideoUrl = videoExtensions.some(ext => previewUrl.toLowerCase().includes(ext)) || 
                       currentMediaType === 'Video' ||
                       (previewUrl.startsWith('blob:') && selectedType === 'Video');

    if (isVideoUrl) {
      return (
        <div className="relative">
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-10">
            Video
          </div>
          <video 
            src={previewUrl} 
            controls 
            className="w-full h-auto max-h-96 rounded-lg"
            onError={(e) => {
              console.error('Video preview error:', e);
              toast({
                title: "Preview Error",
                description: "Unable to preview this video format. The file was uploaded successfully.",
                variant: "destructive",
              });
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Default to image preview
    return (
      <div className="relative">
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs z-10">
          Image
        </div>
        <img 
          src={previewUrl} 
          alt="Preview" 
          className="w-full h-auto max-h-96 object-contain rounded-lg"
          onError={(e) => {
            console.error('Image preview error:', e);
            toast({
              title: "Preview Error", 
              description: "Unable to preview this file. The file was uploaded successfully.",
              variant: "destructive",
            });
          }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {showTypeSelector && (
          <Select value={selectedType} onValueChange={(value: 'Image' | 'Video' | 'YouTube') => setSelectedType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Image" disabled={selectedType === 'YouTube'}>Image</SelectItem>
              <SelectItem value="Video" disabled={selectedType === 'YouTube'}>Video</SelectItem>
              <SelectItem value="YouTube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs defaultValue={selectedType === 'YouTube' ? 'youtube' : 'upload'} className="w-full">
        {selectedType === 'YouTube' ? (
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
          </TabsList>
        ) : (
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="browse">
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
          </TabsList>
        )}
         
        {selectedType !== 'YouTube' && (
          <>
            <TabsContent value="upload" className="space-y-2">
              <Input
                type="file"
                accept={getAcceptTypes()}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <p className="text-sm text-muted-foreground">Uploading...</p>
              )}
            </TabsContent>

            <TabsContent value="browse" className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name or tags..."
                  value={browseSearch}
                  onChange={(e) => setBrowseSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {loadingMedia ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading media files...</p>
                </div>
              ) : existingMedia.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {browseSearch ? 'No media files match your search' : 'No media files found'}
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-72 w-full rounded-md border">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 p-2">
                      {existingMedia.map((media) => {
                        const mediaUrl = media.image?.url || media.video?.url;
                        const isSelected = selectedMediaId === media.id;
                        
                        return (
                          <div
                            key={media.id}
                            className={`relative cursor-pointer rounded-md overflow-hidden border-2 transition-all hover:border-primary ${
                              isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                            }`}
                            onClick={() => handleSelectExistingMedia(media)}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            <div className="absolute top-1 left-1 z-10 bg-black/70 text-white px-1 py-0.5 rounded text-[10px]">
                              {media.image_type}
                            </div>
                            {media.image_type === 'Image' && mediaUrl ? (
                              <img
                                src={mediaUrl}
                                alt={media.image?.name || media.title || 'Media'}
                                className="w-full h-16 object-cover"
                              />
                            ) : media.image_type === 'Video' && mediaUrl ? (
                              <video
                                src={mediaUrl}
                                className="w-full h-16 object-cover"
                              />
                            ) : media.image_type === 'YouTube' ? (
                              <div className="w-full h-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                                <Youtube className="h-5 w-5 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-full h-16 bg-muted flex items-center justify-center">
                                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="p-1 bg-background">
                              <p className="text-[10px] truncate font-medium leading-tight">
                                {media.title || media.image?.name || media.video?.name || 'Unnamed'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage <= 1 || loadingMedia}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-2">
                          {currentPage} / {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage >= totalPages || loadingMedia}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                />
                <Button onClick={handleExternalUrlSubmit} disabled={!externalUrl}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link to an external {selectedType.toLowerCase()}
              </p>
            </TabsContent>
          </>
        )}
        
        <TabsContent value="youtube" className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={uploading}
            />
            <Button onClick={handleYoutubeSubmit} disabled={!youtubeUrl || uploading}>
              {uploading ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a YouTube video URL or video ID
          </p>
        </TabsContent>
      </Tabs>
      
      {/* Preview */}
      {previewUrl && (
        <div className="mt-4">
          <Label>Preview</Label>
          <div className="mt-2 border rounded-lg overflow-hidden bg-muted p-2">
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
