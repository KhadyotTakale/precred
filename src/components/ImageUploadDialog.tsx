import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { ImageUpload } from './ImageUpload';

interface ImageUploadDialogProps {
  onImageUploaded: (imageUrl: string, mediaType?: 'Image' | 'Video' | 'YouTube') => void;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  showTypeSelector?: boolean;
  buttonText?: string;
  buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function ImageUploadDialog({
  onImageUploaded,
  trigger,
  title = "Upload Media",
  description = "Upload images, videos, or add YouTube/external URLs",
  showTypeSelector = true,
  buttonText = "Upload Media",
  buttonVariant = "default"
}: ImageUploadDialogProps) {
  const [open, setOpen] = useState(false);

  const handleImageUploaded = (url: string, mediaType?: 'Image' | 'Video' | 'YouTube') => {
    onImageUploaded(url, mediaType);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={buttonVariant}>
            <Upload className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ImageUpload
            onImageUploaded={handleImageUploaded}
            showTypeSelector={showTypeSelector}
            label=""
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
