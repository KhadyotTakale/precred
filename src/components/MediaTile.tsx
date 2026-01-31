import { type MediaFile } from "@/lib/admin-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Image, Video, Trash2, Youtube } from "lucide-react";
import { getSmallImageUrl } from "@/lib/image-utils";

interface MediaTileProps {
  item: MediaFile;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  showDelete?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
}

export const MediaTile = ({ 
  item, 
  onClick, 
  onDelete, 
  showDelete = false,
  selectable = false,
  selected = false,
  onSelectChange
}: MediaTileProps) => {
  const isVideo = item.image_type === 'Video';
  const isYouTube = item.image_type === 'YouTube';
  const mediaUrl = isVideo ? item.video?.url : item.image?.url;
  const mediaName = isVideo ? item.video?.name : item.image?.name;
  
  // Get title from direct field first, then fallback to media_info or filename
  const title = item.title || item.media_info?.name || mediaName || 'Untitled';
  const description = item.description || item.media_info?.description || '';
  const tags = item.tags || item.media_attributes?.tags || '';
  const authorName = item._customers?.Full_name || item.created_by?.Full_name || item.media_info?.author?.name || 'Unknown';

  // Get YouTube thumbnail
  const getYoutubeThumbnail = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  const youtubeThumbnail = isYouTube && mediaUrl ? getYoutubeThumbnail(mediaUrl) : null;

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card 
      className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative ${
        selected ? 'ring-2 ring-primary' : ''
      }`} 
      onClick={onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-muted">
          {isYouTube ? (
            youtubeThumbnail ? (
              <img
                src={youtubeThumbnail}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 flex items-center justify-center">
                <Youtube className="h-10 w-10 text-red-500" />
              </div>
            )
          ) : isVideo ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={getSmallImageUrl(mediaUrl || '')}
              alt={title}
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Checkbox for selection */}
          {selectable && (
            <div 
              className={`absolute top-1.5 left-1.5 transition-opacity ${
                selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={handleCheckboxChange}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelectChange?.(checked as boolean)}
                className="h-5 w-5 bg-background/80 border-2"
              />
            </div>
          )}
          
          <Badge
            variant="secondary"
            className={`absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 ${
              isYouTube ? 'bg-red-600 text-white hover:bg-red-700' : ''
            }`}
          >
            {isYouTube ? (
              <>
                <Youtube className="w-2.5 h-2.5 mr-0.5" />
                YouTube
              </>
            ) : isVideo ? (
              <>
                <Video className="w-2.5 h-2.5 mr-0.5" />
                Video
              </>
            ) : (
              <>
                <Image className="w-2.5 h-2.5 mr-0.5" />
                Image
              </>
            )}
          </Badge>
          
          {/* Delete button on hover */}
          {showDelete && onDelete && (
            <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="p-2 space-y-1">
          <h3 className="text-xs font-medium line-clamp-1">{title}</h3>
          {tags && (
            <p className="text-[10px] text-primary/80 line-clamp-1">
              {tags}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            By {authorName}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
