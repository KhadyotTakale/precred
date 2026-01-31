import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI, Item } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Save, Plus, Trash2, GripVertical, Image, Type, 
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  Quote, List, ListOrdered, Code, Minus, Eye, ChevronUp, ChevronDown,
  LayoutTemplate, Columns, ImageIcon, Video, FileText
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// Types for blog builder
type BlockType = 'heading' | 'paragraph' | 'image' | 'quote' | 'list' | 'code' | 'divider' | 'callout' | 'video';
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
type TextAlignment = 'left' | 'center' | 'right';
type ImagePosition = 'above' | 'below' | 'left' | 'right' | 'full' | 'background';
type ListStyle = 'bullet' | 'numbered' | 'checklist';

interface ContentBlock {
  id: string;
  type: BlockType;
  content: string;
  // Heading specific
  headingLevel?: HeadingLevel;
  // Text formatting
  alignment?: TextAlignment;
  bold?: boolean;
  italic?: boolean;
  // Image specific
  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;
  imagePosition?: ImagePosition;
  imageWidth?: 'small' | 'medium' | 'large' | 'full';
  // List specific
  listStyle?: ListStyle;
  listItems?: string[];
  // Code specific
  codeLanguage?: string;
  // Callout specific
  calloutType?: 'info' | 'warning' | 'success' | 'error';
  // Video specific
  videoUrl?: string;
  videoType?: 'youtube' | 'vimeo' | 'upload';
}

interface BlogSection {
  id: string;
  title: string;
  blocks: ContentBlock[];
  backgroundColor?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  layout?: 'single' | 'two-column' | 'sidebar-left' | 'sidebar-right';
}

interface BlogBuilderConfig {
  sections: BlogSection[];
  heroImage?: string;
  heroImagePosition?: ImagePosition;
  heroOverlayOpacity?: number;
  showTableOfContents?: boolean;
  tocPosition?: 'top' | 'sidebar';
  authorImage?: string;
  publishDate?: string;
  lastModified?: string;
}

interface BlogFormProps {
  blog?: Item | null;
  onSuccess: () => void;
}

// Sortable Block Component
function SortableBlock({ 
  block, 
  onUpdate, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: { 
  block: ContentBlock; 
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderBlockEditor = () => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Select value={block.headingLevel || 'h2'} onValueChange={(v) => onUpdate({ headingLevel: v as HeadingLevel })}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button type="button" variant={block.alignment === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'left' })}>
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button type="button" variant={block.alignment === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'center' })}>
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button type="button" variant={block.alignment === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'right' })}>
                  <AlignRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Input
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter heading text..."
              className="font-semibold"
            />
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button type="button" variant={block.alignment === 'left' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'left' })}>
                  <AlignLeft className="h-3 w-3" />
                </Button>
                <Button type="button" variant={block.alignment === 'center' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'center' })}>
                  <AlignCenter className="h-3 w-3" />
                </Button>
                <Button type="button" variant={block.alignment === 'right' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7" onClick={() => onUpdate({ alignment: 'right' })}>
                  <AlignRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Write your paragraph content..."
              rows={4}
              className="resize-y"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Label className="text-xs font-medium">Position:</Label>
              <Select value={block.imagePosition || 'full'} onValueChange={(v) => onUpdate({ imagePosition: v as ImagePosition })}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Width</SelectItem>
                  <SelectItem value="left">Float Left</SelectItem>
                  <SelectItem value="right">Float Right</SelectItem>
                  <SelectItem value="above">Above Text</SelectItem>
                  <SelectItem value="below">Below Text</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                </SelectContent>
              </Select>
              <Label className="text-xs font-medium ml-2">Size:</Label>
              <Select value={block.imageWidth || 'large'} onValueChange={(v) => onUpdate({ imageWidth: v as 'small' | 'medium' | 'large' | 'full' })}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {block.imageUrl ? (
              <div className="relative">
                <img src={block.imageUrl} alt={block.imageAlt || ''} className="max-h-48 rounded-lg object-cover mx-auto" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => onUpdate({ imageUrl: undefined })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <ImageUploadDialog
                onImageUploaded={(url) => onUpdate({ imageUrl: url })}
                title="Upload Image"
                description="Add an image to this block"
                buttonText="Upload Image"
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                value={block.imageAlt || ''}
                onChange={(e) => onUpdate({ imageAlt: e.target.value })}
                placeholder="Alt text for accessibility..."
              />
              <Input
                value={block.imageCaption || ''}
                onChange={(e) => onUpdate({ imageCaption: e.target.value })}
                placeholder="Image caption..."
              />
            </div>
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Optional text to accompany the image..."
              rows={2}
            />
          </div>
        );

      case 'quote':
        return (
          <div className="space-y-3">
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter quote text..."
              rows={3}
              className="italic border-l-4 border-primary pl-4"
            />
            <Input
              value={block.imageCaption || ''}
              onChange={(e) => onUpdate({ imageCaption: e.target.value })}
              placeholder="Quote attribution (optional)..."
            />
          </div>
        );

      case 'list':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={block.listStyle || 'bullet'} onValueChange={(v) => onUpdate({ listStyle: v as ListStyle })}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bullet">Bullet List</SelectItem>
                  <SelectItem value="numbered">Numbered List</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              value={(block.listItems || []).join('\n')}
              onChange={(e) => onUpdate({ listItems: e.target.value.split('\n').filter(Boolean) })}
              placeholder="Enter each list item on a new line..."
              rows={5}
            />
          </div>
        );

      case 'code':
        return (
          <div className="space-y-3">
            <Select value={block.codeLanguage || 'javascript'} onValueChange={(v) => onUpdate({ codeLanguage: v })}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="css">CSS</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="bash">Bash</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Enter code..."
              rows={6}
              className="font-mono text-sm"
            />
          </div>
        );

      case 'callout':
        return (
          <div className="space-y-3">
            <Select value={block.calloutType || 'info'} onValueChange={(v) => onUpdate({ calloutType: v as 'info' | 'warning' | 'success' | 'error' })}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={block.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Callout message..."
              rows={2}
            />
          </div>
        );

      case 'video':
        return (
          <div className="space-y-3">
            <Select value={block.videoType || 'youtube'} onValueChange={(v) => onUpdate({ videoType: v as 'youtube' | 'vimeo' | 'upload' })}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={block.videoUrl || ''}
              onChange={(e) => onUpdate({ videoUrl: e.target.value })}
              placeholder="Enter video URL..."
            />
            <Input
              value={block.imageCaption || ''}
              onChange={(e) => onUpdate({ imageCaption: e.target.value })}
              placeholder="Video caption..."
            />
          </div>
        );

      case 'divider':
        return (
          <div className="flex items-center justify-center py-2">
            <Separator className="flex-1" />
          </div>
        );

      default:
        return null;
    }
  };

  const getBlockIcon = () => {
    switch (block.type) {
      case 'heading': return <Heading2 className="h-4 w-4" />;
      case 'paragraph': return <Type className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'quote': return <Quote className="h-4 w-4" />;
      case 'list': return <List className="h-4 w-4" />;
      case 'code': return <Code className="h-4 w-4" />;
      case 'callout': return <FileText className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'divider': return <Minus className="h-4 w-4" />;
      default: return <Type className="h-4 w-4" />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-card mb-3">
      <div className="flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-t-lg border-b">
        <div {...attributes} {...listeners} className="cursor-grab hover:bg-muted p-1 rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getBlockIcon()}
          <span className="text-sm font-medium capitalize truncate">{block.type}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        {renderBlockEditor()}
      </div>
    </div>
  );
}

// Block Type Selector
function BlockTypeSelector({ onSelect }: { onSelect: (type: BlockType) => void }) {
  const blockTypes: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
    { type: 'heading', label: 'Heading', icon: <Heading2 className="h-5 w-5" />, description: 'Section title' },
    { type: 'paragraph', label: 'Paragraph', icon: <Type className="h-5 w-5" />, description: 'Rich text content' },
    { type: 'image', label: 'Image', icon: <ImageIcon className="h-5 w-5" />, description: 'Photo or graphic' },
    { type: 'quote', label: 'Quote', icon: <Quote className="h-5 w-5" />, description: 'Blockquote' },
    { type: 'list', label: 'List', icon: <List className="h-5 w-5" />, description: 'Bullet or numbered' },
    { type: 'code', label: 'Code', icon: <Code className="h-5 w-5" />, description: 'Code snippet' },
    { type: 'callout', label: 'Callout', icon: <FileText className="h-5 w-5" />, description: 'Info box' },
    { type: 'video', label: 'Video', icon: <Video className="h-5 w-5" />, description: 'Embed video' },
    { type: 'divider', label: 'Divider', icon: <Minus className="h-5 w-5" />, description: 'Section break' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
      {blockTypes.map(({ type, label, icon, description }) => (
        <Button
          key={type}
          type="button"
          variant="outline"
          className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-primary/5 hover:border-primary"
          onClick={() => onSelect(type)}
        >
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
}

export function BlogForm({ blog, onSuccess }: BlogFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('content');

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('blog');
  const [isDisabled, setIsDisabled] = useState(true);

  // Blog metadata
  const [authorName, setAuthorName] = useState('');
  const [authorImage, setAuthorImage] = useState('');
  const [category, setCategory] = useState('general');
  const [readTime, setReadTime] = useState('5 min read');

  // Hero section
  const [heroImage, setHeroImage] = useState('');
  const [heroImagePosition, setHeroImagePosition] = useState<ImagePosition>('above');
  const [showTableOfContents, setShowTableOfContents] = useState(false);

  // Content blocks
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

  // Featured images for item_images
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''));
    }
  }, [title, slugManuallyEdited]);

  // Calculate read time based on content
  useEffect(() => {
    const wordCount = blocks.reduce((count, block) => {
      const text = block.content + (block.listItems?.join(' ') || '');
      return count + text.split(/\s+/).filter(Boolean).length;
    }, 0);
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    setReadTime(`${minutes} min read`);
  }, [blocks]);

  // Load existing blog data
  useEffect(() => {
    if (blog) {
      setTitle(blog.title);
      setSlug(blog.slug || '');
      setSlugManuallyEdited(true);
      setDescription(blog.description);
      setTags(blog.tags || '');
      setSeoTags(blog.SEO_Tags || 'blog');
      setIsDisabled(blog.Is_disabled);

      if (blog.item_info) {
        const info = blog.item_info;
        setAuthorName(info.authorName || '');
        setAuthorImage(info.authorImage || '');
        setCategory(info.category || 'general');
        setReadTime(info.readTime || '5 min read');
        setHeroImage(info.heroImage || '');
        setHeroImagePosition(info.heroImagePosition || 'above');
        setShowTableOfContents(info.showTableOfContents || false);
        
        // Load blocks
        if (info.blocks && Array.isArray(info.blocks)) {
          setBlocks(info.blocks);
        } else if (info.content) {
          // Legacy: Convert plain content to paragraph block
          setBlocks([{
            id: crypto.randomUUID(),
            type: 'paragraph',
            content: info.content,
            alignment: 'left'
          }]);
        }
      }

      if (blog._item_images_of_items?.items) {
        const mediaItems = blog._item_images_of_items.items.map((item) => ({
          url: item.display_image,
          type: item.image_type || 'Image',
          id: item.id,
          seq: item.seq || 0,
        }));
        setImageUrls(mediaItems.sort((a, b) => a.seq - b.seq));
      }
    }
  }, [blog]);

  const generateBlockId = () => crypto.randomUUID();

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: generateBlockId(),
      type,
      content: '',
      alignment: 'left',
      headingLevel: type === 'heading' ? 'h2' : undefined,
      imagePosition: type === 'image' ? 'full' : undefined,
      imageWidth: type === 'image' ? 'large' : undefined,
      listStyle: type === 'list' ? 'bullet' : undefined,
      listItems: type === 'list' ? [] : undefined,
      codeLanguage: type === 'code' ? 'javascript' : undefined,
      calloutType: type === 'callout' ? 'info' : undefined,
      videoType: type === 'video' ? 'youtube' : undefined,
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    setBlocks(blocks.map(block => 
      block.id === id ? { ...block, ...updates } : block
    ));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  };

  const handleImageUploaded = async (imageUrl: string, itemId: number, seq: number) => {
    if (!user?.id) return;
    try {
      await adminAPI.createItemImage({
        items_id: itemId,
        display_image: imageUrl,
        seq,
        image_type: 'Image',
        Is_disabled: false,
      }, user.id);
    } catch (error) {
      console.error('Failed to associate image:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      // Collect all images from blocks for featured images
      const blockImages = blocks
        .filter(b => b.imageUrl)
        .map(b => b.imageUrl!);
      
      const allImages = heroImage ? [heroImage, ...blockImages] : blockImages;

      // Build blog item_info with full builder config
      const blogInfo: Record<string, any> = {
        // Metadata
        authorName,
        authorImage,
        category,
        readTime,
        // Hero
        heroImage,
        heroImagePosition,
        // TOC
        showTableOfContents,
        // Content blocks (full builder data)
        blocks,
        // Legacy compatibility - flatten content for simple rendering
        content: blocks
          .filter(b => ['paragraph', 'heading', 'quote'].includes(b.type))
          .map(b => b.content)
          .join('\n\n'),
        // Images array for backward compatibility
        image: allImages.slice(0, 5),
      };

      const itemData = {
        item_type: 'Blog',
        Is_disabled: isDisabled,
        title,
        field_value: title, // API requires field_value parameter
        description: description || '',
        SEO_Tags: seoTags || '',
        tags: tags || '',
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        item_info: blogInfo,
      };

      let savedItemId: number;
      if (blog) {
        await adminAPI.updateItem(blog.id, itemData, user.id);
        savedItemId = blog.id;
        toast({ title: "Success", description: "Blog updated successfully" });
      } else {
        const createdItem = await adminAPI.createItem(itemData, user.id);
        savedItemId = createdItem.id;
        toast({ title: "Success", description: "Blog created successfully" });
      }

      // Associate images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!mediaItem.id) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save blog:', error);
      toast({ title: "Error", description: "Failed to save blog", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Preview component
  const renderPreview = () => {
    return (
      <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
        {heroImage && (
          <div className={cn(
            "mb-6 rounded-lg overflow-hidden",
            heroImagePosition === 'background' && "relative"
          )}>
            <img src={heroImage} alt={title} className="w-full h-48 sm:h-64 object-cover" />
          </div>
        )}
        
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{title || 'Untitled Blog'}</h1>
        
        {(authorName || readTime) && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
            {authorName && (
              <div className="flex items-center gap-2">
                {authorImage && <img src={authorImage} alt={authorName} className="w-8 h-8 rounded-full object-cover" />}
                <span>{authorName}</span>
              </div>
            )}
            {readTime && <Badge variant="secondary">{readTime}</Badge>}
            {category && <Badge variant="outline">{category}</Badge>}
          </div>
        )}

        {showTableOfContents && blocks.filter(b => b.type === 'heading').length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-2">Table of Contents</h4>
            <ul className="space-y-1 text-sm">
              {blocks.filter(b => b.type === 'heading').map((block, idx) => (
                <li key={block.id} className={cn(
                  block.headingLevel === 'h3' && "ml-4",
                  block.headingLevel === 'h4' && "ml-8"
                )}>
                  • {block.content || `Heading ${idx + 1}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {blocks.map((block) => {
          const textAlign = block.alignment || 'left';
          
          switch (block.type) {
            case 'heading':
              const HeadingTag = block.headingLevel || 'h2';
              return (
                <HeadingTag 
                  key={block.id} 
                  className={cn("font-bold", textAlign === 'center' && "text-center", textAlign === 'right' && "text-right")}
                >
                  {block.content}
                </HeadingTag>
              );
            
            case 'paragraph':
              return (
                <p key={block.id} className={cn(textAlign === 'center' && "text-center", textAlign === 'right' && "text-right")}>
                  {block.content}
                </p>
              );
            
            case 'image':
              if (!block.imageUrl) return null;
              const imgWidthClass = {
                small: 'max-w-xs',
                medium: 'max-w-md',
                large: 'max-w-2xl',
                full: 'w-full'
              }[block.imageWidth || 'large'];
              const imgPositionClass = {
                left: 'float-left mr-4 mb-4',
                right: 'float-right ml-4 mb-4',
                full: 'mx-auto',
                above: 'mx-auto mb-4',
                below: 'mx-auto mt-4',
                background: ''
              }[block.imagePosition || 'full'];
              return (
                <figure key={block.id} className={cn(imgWidthClass, imgPositionClass, "my-4")}>
                  <img src={block.imageUrl} alt={block.imageAlt || ''} className="rounded-lg" />
                  {block.imageCaption && (
                    <figcaption className="text-sm text-muted-foreground text-center mt-2">{block.imageCaption}</figcaption>
                  )}
                  {block.content && <p className="mt-2">{block.content}</p>}
                </figure>
              );
            
            case 'quote':
              return (
                <blockquote key={block.id} className="border-l-4 border-primary pl-4 italic my-4">
                  <p>{block.content}</p>
                  {block.imageCaption && <cite className="text-sm text-muted-foreground">— {block.imageCaption}</cite>}
                </blockquote>
              );
            
            case 'list':
              const ListTag = block.listStyle === 'numbered' ? 'ol' : 'ul';
              return (
                <ListTag key={block.id} className={cn(block.listStyle === 'numbered' ? "list-decimal" : "list-disc", "pl-6 my-4")}>
                  {(block.listItems || []).map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ListTag>
              );
            
            case 'code':
              return (
                <pre key={block.id} className="bg-muted rounded-lg p-4 overflow-x-auto my-4">
                  <code className="text-sm font-mono">{block.content}</code>
                </pre>
              );
            
            case 'callout':
              const calloutStyles = {
                info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200',
                warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200',
                success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200',
                error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200',
              };
              return (
                <div key={block.id} className={cn("border rounded-lg p-4 my-4", calloutStyles[block.calloutType || 'info'])}>
                  {block.content}
                </div>
              );
            
            case 'video':
              return (
                <div key={block.id} className="my-4">
                  {block.videoUrl && (
                    <div className="aspect-video">
                      <iframe 
                        src={block.videoUrl} 
                        className="w-full h-full rounded-lg" 
                        allowFullScreen 
                      />
                    </div>
                  )}
                  {block.imageCaption && (
                    <p className="text-sm text-muted-foreground text-center mt-2">{block.imageCaption}</p>
                  )}
                </div>
              );
            
            case 'divider':
              return <Separator key={block.id} className="my-6" />;
            
            default:
              return null;
          }
        })}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="content" className="gap-2">
            <FileText className="h-4 w-4 hidden sm:inline" />
            Content
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <LayoutTemplate className="h-4 w-4 hidden sm:inline" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4 hidden sm:inline" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-0">
          {/* Blog Title */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Blog Title</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter an engaging title..."
                className="text-lg font-semibold"
                required
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">URL Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true); }}
                    placeholder="blog-url-slug"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hero Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Hero Image</CardTitle>
              <CardDescription>Featured image displayed at the top of your blog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-3 items-center">
                <Label className="text-xs">Position:</Label>
                <Select value={heroImagePosition} onValueChange={(v) => setHeroImagePosition(v as ImagePosition)}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above Title</SelectItem>
                    <SelectItem value="below">Below Title</SelectItem>
                    <SelectItem value="background">Background</SelectItem>
                    <SelectItem value="full">Full Width</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {heroImage ? (
                <div className="relative">
                  <img src={heroImage} alt="Hero" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => setHeroImage('')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <ImageUploadDialog
                  onImageUploaded={(url) => setHeroImage(url)}
                  title="Upload Hero Image"
                  description="Add a featured image for your blog"
                  buttonText="Add Hero Image"
                />
              )}
            </CardContent>
          </Card>

          {/* Content Blocks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">Content Blocks</CardTitle>
                  <CardDescription>Build your blog content with various block types</CardDescription>
                </div>
                <Badge variant="secondary">{blocks.length} blocks</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Block Type Selector */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">Add Content Block</Label>
                <BlockTypeSelector onSelect={addBlock} />
              </div>

              {/* Blocks List */}
              {blocks.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <div>
                      {blocks.map((block, index) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          onUpdate={(updates) => updateBlock(block.id, updates)}
                          onRemove={() => removeBlock(block.id)}
                          onMoveUp={() => moveBlock(block.id, 'up')}
                          onMoveDown={() => moveBlock(block.id, 'down')}
                          isFirst={index === 0}
                          isLast={index === blocks.length - 1}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Type className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No content blocks yet</p>
                  <p className="text-sm text-muted-foreground">Click a block type above to start building your blog</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description/Excerpt */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Summary/Excerpt</CardTitle>
              <CardDescription>Brief description shown in blog listings and SEO</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief summary of your blog post..."
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-0">
          {/* Author Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Author Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Author Name</Label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author Image</Label>
                  <div className="flex gap-2">
                    {authorImage ? (
                      <div className="relative">
                        <img src={authorImage} alt="Author" className="h-10 w-10 rounded-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-1 -right-1 h-5 w-5"
                          onClick={() => setAuthorImage('')}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <ImageUploadDialog
                        onImageUploaded={(url) => setAuthorImage(url)}
                        title="Upload Author Image"
                        description="Add your profile picture"
                        buttonText="Add Photo"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category & Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Category & Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="tutorial">Tutorial</SelectItem>
                      <SelectItem value="tips">Tips & Tricks</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Read Time</Label>
                  <Input value={readTime} readOnly className="bg-muted" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="news, tutorial, tips"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SEO Keywords</Label>
                  <Input
                    value={seoTags}
                    onChange={(e) => setSeoTags(e.target.value)}
                    placeholder="seo, keywords"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Display Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Table of Contents</Label>
                  <p className="text-sm text-muted-foreground">Auto-generate from headings</p>
                </div>
                <Switch checked={showTableOfContents} onCheckedChange={setShowTableOfContents} />
              </div>
            </CardContent>
          </Card>

          {/* Publish Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Publish Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {isDisabled ? 'Draft - not visible' : 'Published - visible to all'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={isDisabled ? "secondary" : "default"}>
                    {isDisabled ? "Draft" : "Published"}
                  </Badge>
                  <Switch checked={!isDisabled} onCheckedChange={(c) => setIsDisabled(!c)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>See how your blog will look when published</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] sm:h-[70vh] pr-4">
                {renderPreview()}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Save Button */}
      <div className="sticky bottom-4 flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={saving} size="lg" className="shadow-lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {blog ? 'Update Blog' : 'Create Blog'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}