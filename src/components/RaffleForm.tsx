import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Separator } from '@/components/ui/separator';
import { SortableMediaItem } from '@/components/SortableMediaItem';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Loader2, Ticket, CalendarIcon, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RaffleItem {
  id: number;
  title: string;
  description: string;
  slug?: string;
  tags?: string;
  SEO_Tags?: string;
  Is_disabled: boolean;
  price?: number;
  item_info?: {
    'end-date'?: string;
    prize_description?: string;
    ticket_price?: number;
    max_tickets?: number;
  };
  _item_images_of_items?: {
    items: Array<{
      id: number;
      display_image: string;
      image_type: 'Image' | 'Video' | 'YouTube';
      seq: number;
    }>;
  };
}

interface RaffleFormProps {
  raffle?: RaffleItem | null;
  onSuccess: () => void;
}

export function RaffleForm({ raffle, onSuccess }: RaffleFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('raffle,giveaway');
  const [isDisabled, setIsDisabled] = useState(false);

  // Raffle specific fields
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [prizeDescription, setPrizeDescription] = useState('');
  const [ticketPrice, setTicketPrice] = useState<number>(0);
  const [maxTickets, setMaxTickets] = useState<number>(0);

  // Image
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (raffle) {
      setTitle(raffle.title);
      setSlug(raffle.slug || '');
      setSlugManuallyEdited(true);
      setDescription(raffle.description);
      setTags(raffle.tags || '');
      setSeoTags(raffle.SEO_Tags || 'raffle,giveaway');
      setIsDisabled(raffle.Is_disabled);

      // Parse item_info for raffle data
      if (raffle.item_info) {
        const info = raffle.item_info;
        if (info['end-date']) {
          setEndDate(new Date(info['end-date']));
        }
        setPrizeDescription(info.prize_description || '');
        setTicketPrice(info.ticket_price || raffle.price || 0);
        setMaxTickets(info.max_tickets || 0);
      }

      // Load existing media items
      if (raffle._item_images_of_items?.items) {
        const mediaItems = raffle._item_images_of_items.items.map((item) => ({
          url: item.display_image,
          type: item.image_type || 'Image',
          id: item.id,
          seq: item.seq || 0,
        }));
        setImageUrls(mediaItems.sort((a, b) => a.seq - b.seq));
      }
    }
  }, [raffle]);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const handleImageUploaded = async (imageUrl: string, itemId: number, seq: number) => {
    if (!user?.id) return;

    try {
      const mediaItem = imageUrls.find(item => item.url === imageUrl);
      const mediaType = mediaItem?.type || 'Image';

      const response = await adminAPI.createItemImage({
        items_id: itemId,
        display_image: imageUrl,
        seq,
        image_type: mediaType,
        Is_disabled: false,
      }, user.id);

      return response;
    } catch (error) {
      console.error('Failed to associate image:', error);
      throw error;
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = imageUrls.findIndex((_, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((_, idx) => idx === over.id);

      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      
      setImageUrls(newImageUrls);

      if (raffle && user?.id) {
        try {
          for (const [index, mediaItem] of newImageUrls.entries()) {
            if (mediaItem.id) {
              await adminAPI.updateItemImage(mediaItem.id, { seq: index + 1 }, user.id);
            }
          }
          toast({
            title: "Success",
            description: "Media order updated",
          });
        } catch (error) {
          console.error('Failed to update order:', error);
          toast({
            title: "Error",
            description: "Failed to update media order",
            variant: "destructive",
          });
        }
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSaving(true);
    try {
      // Build raffle item_info object
      const raffleInfo: Record<string, any> = {
        'end-date': endDate ? format(endDate, 'yyyy-MM-dd') : null,
        prize_description: prizeDescription,
        ticket_price: ticketPrice,
        max_tickets: maxTickets,
      };

      let savedItemId: number;

      if (raffle) {
        // For updates, don't include item_type
        const updateData = {
          Is_disabled: isDisabled,
          title,
          description,
          SEO_Tags: seoTags || 'raffle,giveaway',
          tags,
          slug: slug || generateSlug(title),
          price: ticketPrice,
          item_info: raffleInfo,
        };
        await adminAPI.updateItem(raffle.id, updateData, user.id);
        savedItemId = raffle.id;
      } else {
        // For create, include item_type
        const createData = {
          item_type: 'Raffle',
          Is_disabled: isDisabled,
          title,
          description,
          SEO_Tags: seoTags || 'raffle,giveaway',
          tags,
          slug: slug || generateSlug(title),
          price: ticketPrice,
          item_info: raffleInfo,
        };
        const response = await adminAPI.createItem(createData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!mediaItem.id) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }

      toast({
        title: "Success",
        description: `Raffle ${raffle ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save raffle:', error);
      toast({
        title: "Error",
        description: `Failed to ${raffle ? 'update' : 'create'} raffle`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if raffle has ended
  const isRaffleEnded = endDate && new Date() > endDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">Raffle Name *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Holiday Raffle 2024"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }}
            placeholder="holiday-raffle-2024"
            required
          />
          <p className="text-sm text-muted-foreground">
            URL-friendly identifier (auto-generated from title)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe this raffle and what participants can win..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="disabled"
            checked={isDisabled}
            onCheckedChange={setIsDisabled}
          />
          <Label htmlFor="disabled">Disable this raffle</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Ticket className="h-5 w-5" />
          Raffle Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'PPP') : 'Select end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              When the raffle drawing will take place
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticketPrice">Ticket Price ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="ticketPrice"
                type="number"
                min="0"
                step="0.01"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(parseFloat(e.target.value) || 0)}
                className="pl-9"
                placeholder="5.00"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Price per raffle ticket (0 for free)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="maxTickets">Maximum Tickets</Label>
            <Input
              id="maxTickets"
              type="number"
              min="0"
              value={maxTickets}
              onChange={(e) => setMaxTickets(parseInt(e.target.value) || 0)}
              placeholder="100"
            />
            <p className="text-sm text-muted-foreground">
              Max tickets available (0 for unlimited)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prizeDescription">Prize Description</Label>
            <Input
              id="prizeDescription"
              value={prizeDescription}
              onChange={(e) => setPrizeDescription(e.target.value)}
              placeholder="$500 Gift Card"
            />
          </div>
        </div>

        {/* Status Preview */}
        {endDate && (
          <div className={cn(
            "p-4 rounded-lg",
            isRaffleEnded ? "bg-destructive/10" : "bg-primary/10"
          )}>
            <div className="flex items-center gap-2">
              <Ticket className={cn(
                "h-5 w-5",
                isRaffleEnded ? "text-destructive" : "text-primary"
              )} />
              <span className="font-medium">
                {isRaffleEnded ? 'Raffle Ended' : 'Raffle Active'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isRaffleEnded 
                ? `Ended on ${format(endDate, 'PPP')}`
                : `Ends on ${format(endDate, 'PPP')}`
              }
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Raffle Media</h3>
        
        <ImageUploadDialog
          onImageUploaded={(url, type) => {
            const newSeq = imageUrls.length + 1;
            setImageUrls([...imageUrls, { url, type: type || 'Image', seq: newSeq }]);
          }}
        />

        {imageUrls.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={imageUrls.map((_, idx) => idx)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {imageUrls.map((media, index) => (
                  <SortableMediaItem
                    key={index}
                    id={index}
                    mediaItem={media}
                    index={index}
                    onRemove={() => {
                      setImageUrls(imageUrls.filter((_, i) => i !== index));
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SEO & Tags</h3>
        
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="raffle, giveaway, prize"
          />
          <p className="text-sm text-muted-foreground">
            Comma-separated tags for categorization
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoTags">SEO Tags</Label>
          <Input
            id="seoTags"
            value={seoTags}
            onChange={(e) => setSeoTags(e.target.value)}
            placeholder="raffle, giveaway, contest"
          />
          <p className="text-sm text-muted-foreground">
            Tags for search engine optimization
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {raffle ? 'Update Raffle' : 'Create Raffle'}
        </Button>
      </div>
    </form>
  );
}