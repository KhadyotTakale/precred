import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical } from 'lucide-react';

interface SortableMediaItemProps {
  id: number;
  mediaItem: {
    url: string;
    type: 'Image' | 'Video' | 'YouTube';
    seq: number;
  };
  index: number;
  onRemove: () => void;
}

export function SortableMediaItem({
  id,
  mediaItem,
  index,
  onRemove,
}: SortableMediaItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-40 h-40 border rounded-lg overflow-hidden bg-card"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-20 bg-black/70 text-white p-1 rounded cursor-move hover:bg-black/90"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Media Preview */}
      <div className="w-full h-full">
        {mediaItem.type === 'YouTube' ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            <iframe
              src={mediaItem.url}
              className="w-full h-full"
              title={`YouTube ${index}`}
            />
            <div className="absolute bottom-1 right-1 bg-red-600 text-white text-xs px-1 rounded">
              YouTube
            </div>
          </div>
        ) : mediaItem.type === 'Video' ? (
          <div className="relative w-full h-full">
            <video
              src={mediaItem.url}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute bottom-1 right-1 bg-blue-600 text-white text-xs px-1 rounded">
              Video
            </div>
          </div>
        ) : (
          <img
            src={mediaItem.url}
            alt={`Preview ${index}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-1 right-1 z-20">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="h-7 px-2"
          onClick={onRemove}
        >
          ×
        </Button>
      </div>
    </div>
  );
}
