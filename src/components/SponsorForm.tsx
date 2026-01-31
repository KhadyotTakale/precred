import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI, Item } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Separator } from '@/components/ui/separator';
import { SortableMediaItem } from '@/components/SortableMediaItem';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { Link2, Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SponsorItem {
  id: number;
  title: string;
  description: string;
  slug?: string;
  tags?: string;
  SEO_Tags?: string;
  Is_disabled: boolean;
  item_info?: {
    reference_url?: string;
    expiration_date?: string;
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

interface SponsorFormProps {
  sponsor?: SponsorItem | null;
  onSuccess: () => void;
  customersId?: string;
}

// Item type to detail page URL mapping
const getItemDetailUrl = (itemType: string, slug: string): string => {
  const baseUrl = window.location.origin;
  switch (itemType) {
    case 'Event':
      return `${baseUrl}/event/${slug}`;
    case 'Classes':
      return `${baseUrl}/classes/${slug}`;
    case 'Vendors':
      return `${baseUrl}/vendors/${slug}`;
    case 'Product':
      return `${baseUrl}/shop/${slug}`;
    case 'Membership':
      return `${baseUrl}/memberships/${slug}`;
    case 'Blog':
      return `${baseUrl}/blog/${slug}`;
    case 'Campaign':
      return `${baseUrl}/donation/${slug}`;
    default:
      return `${baseUrl}/${slug}`;
  }
};

export function SponsorForm({ sponsor, onSuccess, customersId }: SponsorFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('sponsor');
  const [isDisabled, setIsDisabled] = useState(false);

  // Sponsor specific fields
  const [referenceUrl, setReferenceUrl] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  // Item selection state
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Image
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);

  // Fetch all items for selection
  useEffect(() => {
    const fetchAllItems = async () => {
      if (!user?.id) return;
      
      setLoadingItems(true);
      try {
        // Fetch different item types - pass customersId for non-admin access control
        const [eventsRes, classesRes, vendorsRes, productsRes, campaignsRes] = await Promise.all([
          adminAPI.getItems(user.id, 1, 100, 'Event', customersId),
          adminAPI.getItems(user.id, 1, 100, 'Classes', customersId),
          adminAPI.getItems(user.id, 1, 100, 'Vendors', customersId),
          adminAPI.getItems(user.id, 1, 100, 'Product', customersId),
          adminAPI.getItems(user.id, 1, 100, 'Campaign', customersId),
        ]);
        
        const items = [
          ...eventsRes.items,
          ...classesRes.items,
          ...vendorsRes.items,
          ...productsRes.items,
          ...campaignsRes.items,
        ];
        
        setAllItems(items);
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoadingItems(false);
      }
    };

    fetchAllItems();
  }, [user?.id, customersId]);

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    
    if (itemId === 'manual') {
      // Clear for manual entry
      return;
    }
    
    const selectedItem = allItems.find(item => item.id.toString() === itemId);
    if (selectedItem) {
      // Set reference URL to item's detail page
      const detailUrl = getItemDetailUrl(selectedItem.item_type, selectedItem.slug);
      setReferenceUrl(detailUrl);
      
      // Get display image from item
      const itemImages = (selectedItem as any)._item_images_of_items?.items;
      if (itemImages && itemImages.length > 0) {
        // Find first image type media
        const imageMedia = itemImages.find((img: any) => img.image_type === 'Image');
        if (imageMedia) {
          // Add the image if not already present
          const imageExists = imageUrls.some(img => img.url === imageMedia.display_image);
          if (!imageExists) {
            setImageUrls(prev => [...prev, { 
              url: imageMedia.display_image, 
              type: 'Image', 
              seq: prev.length + 1 
            }]);
          }
        }
      }
      
      toast({
        title: "Item Selected",
        description: `Reference URL and image populated from "${selectedItem.title}"`,
      });
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (sponsor) {
      setTitle(sponsor.title);
      setSlug(sponsor.slug || '');
      setSlugManuallyEdited(true);
      setDescription(sponsor.description);
      setTags(sponsor.tags || '');
      setSeoTags(sponsor.SEO_Tags || 'sponsor');
      setIsDisabled(sponsor.Is_disabled);

      // Parse item_info for sponsor data
      if (sponsor.item_info) {
        const info = sponsor.item_info;
        setReferenceUrl(info.reference_url || '');
        if (info.expiration_date) {
          setExpirationDate(new Date(info.expiration_date));
        }
      }

      // Load existing media items
      if (sponsor._item_images_of_items?.items) {
        const mediaItems = sponsor._item_images_of_items.items.map((item) => ({
          url: item.display_image,
          type: item.image_type || 'Image',
          id: item.id,
          seq: item.seq || 0,
        }));
        setImageUrls(mediaItems.sort((a, b) => a.seq - b.seq));
      }
    }
  }, [sponsor]);

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

      if (sponsor && user?.id) {
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
      // Build sponsor item_info object
      const sponsorInfo: Record<string, any> = {
        reference_url: referenceUrl,
        expiration_date: expirationDate ? format(expirationDate, 'yyyy-MM-dd') : null,
      };

      const itemData = {
        item_type: 'AD',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags || 'sponsor',
        tags,
        slug: slug || generateSlug(title),
        item_info: sponsorInfo,
      };

      let savedItemId: number;

      if (sponsor) {
        await adminAPI.updateItem(sponsor.id, itemData, user.id);
        savedItemId = sponsor.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
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
        description: `Sponsor ${sponsor ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save sponsor:', error);
      toast({
        title: "Error",
        description: `Failed to ${sponsor ? 'update' : 'create'} sponsor`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Group items by type for better organization in dropdown
  const groupedItems = allItems.reduce((acc, item) => {
    const type = item.item_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">Sponsor Name *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Acme Mining Company"
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
            placeholder="acme-mining-company"
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
            placeholder="Brief description of the sponsor..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="disabled"
            checked={isDisabled}
            onCheckedChange={setIsDisabled}
          />
          <Label htmlFor="disabled">Disable this sponsor</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Reference Link
        </h3>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link to Existing Item</Label>
            <Select value={selectedItemId} onValueChange={handleItemSelect}>
              <SelectTrigger>
                <SelectValue placeholder={loadingItems ? "Loading items..." : "Select an item or enter URL manually"} />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="manual">
                  <span className="text-muted-foreground">Enter URL manually</span>
                </SelectItem>
                
                {Object.entries(groupedItems).map(([type, items]) => (
                  <div key={type}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {type}s
                    </div>
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{item.title}</span>
                          <span className="text-xs text-muted-foreground">({item.slug})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select an existing item to auto-populate the reference URL and image
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceUrl">Reference URL</Label>
            <Input
              id="referenceUrl"
              type="url"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              placeholder="https://sponsor-website.com"
            />
            <p className="text-sm text-muted-foreground">
              The URL users will be directed to when clicking the sponsor ad
            </p>
          </div>

          <div className="space-y-2">
            <Label>Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expirationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expirationDate ? format(expirationDate, "PPP") : <span>Pick expiration date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              The sponsor ad will not be displayed after this date
            </p>
            {expirationDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpirationDate(undefined)}
                className="text-muted-foreground"
              >
                Clear expiration date
              </Button>
            )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Media</h3>
        
        <div className="space-y-2">
          <Label>Sponsor Images/Videos</Label>
          <ImageUploadDialog
            onImageUploaded={(url, type) => {
              setImageUrls(prev => [...prev, { url, type: type || 'Image', seq: prev.length + 1 }]);
            }}
          />
          
          {imageUrls.length > 0 && (
            <div className="mt-4">
              <Label className="mb-2 block">Media Gallery (drag to reorder)</Label>
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={imageUrls.map((_, idx) => idx)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {imageUrls.map((media, index) => (
                      <SortableMediaItem
                        key={index}
                        id={index}
                        mediaItem={{ url: media.url, type: media.type, seq: media.seq }}
                        index={index}
                        onRemove={() => {
                          setImageUrls(prev => prev.filter((_, i) => i !== index));
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SEO & Tags</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="sponsor, partner, supporter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="seoTags">SEO Tags</Label>
            <Input
              id="seoTags"
              value={seoTags}
              onChange={(e) => setSeoTags(e.target.value)}
              placeholder="sponsor"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            sponsor ? 'Update Sponsor' : 'Create Sponsor'
          )}
        </Button>
      </div>
    </form>
  );
}
