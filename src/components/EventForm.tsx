import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { adminAPI, Item } from '@/lib/admin-api';
import { elegantAPI, type ElegantCustomer } from '@/lib/elegant-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ImageUploadDialog } from '@/components/ImageUploadDialog';
import { Separator } from '@/components/ui/separator';
import { SortableMediaItem } from '@/components/SortableMediaItem';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

interface EventFormProps {
  event?: Item | null;
  onSuccess: () => void;
}

export function EventForm({ event, onSuccess }: EventFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);

  // Schema.org Event fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventStatus, setEventStatus] = useState('https://schema.org/EventScheduled');
  const [eventAttendanceMode, setEventAttendanceMode] = useState('https://schema.org/OfflineEventAttendanceMode');
  
  // Location
  const [locationName, setLocationName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [addressLocality, setAddressLocality] = useState('');
  const [addressRegion, setAddressRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('US');
  
  // Image
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);
  
  // Offers
  const [offerUrl, setOfferUrl] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('USD');
  
  // Performer & Organizer
  const [performerName, setPerformerName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerUrl, setOrganizerUrl] = useState('');
  const [useShopDefaults, setUseShopDefaults] = useState(true);
  
  // Audience
  const [audienceType, setAudienceType] = useState('');
  
  // Keywords
  const [keywords, setKeywords] = useState('');

  // Fetch customer data for defaults
  useEffect(() => {
    const fetchCustomer = async () => {
      if (user?.id) {
        try {
          const customerData = await elegantAPI.getCustomer(user.id);
          setCustomer(customerData.customer);
          
          // Set defaults only for new events
          if (!event) {
            const shopName = customerData.customer._shops.name;
            const customDomain = customerData.customer._shops.custom_domain;
            
            setPerformerName(shopName);
            setOrganizerName(shopName);
            setOrganizerUrl(customDomain ? `https://${customDomain}` : '');
          }
        } catch (error) {
          console.error('Failed to fetch customer data:', error);
        }
      }
    };

    fetchCustomer();
  }, [user?.id, event]);

  // Update organizer/performer when toggle changes
  useEffect(() => {
    if (customer && useShopDefaults) {
      const shopName = customer._shops.name;
      const customDomain = customer._shops.custom_domain;
      
      setPerformerName(shopName);
      setOrganizerName(shopName);
      setOrganizerUrl(customDomain ? `https://${customDomain}` : '');
    }
  }, [useShopDefaults, customer]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setSlug(event.slug || '');
      setSlugManuallyEdited(true); // Prevent auto-update for existing events
      setDescription(event.description);
      setTags(event.tags || '');
      setSeoTags(event.SEO_Tags || '');
      setIsDisabled(event.Is_disabled);

      // Parse item_info for schema.org data
      if (event.item_info) {
        const info = event.item_info;
        setStartDate(info.startDate || '');
        setEndDate(info.endDate || '');
        setEventStatus(info.eventStatus || 'https://schema.org/EventScheduled');
        setEventAttendanceMode(info.eventAttendanceMode || 'https://schema.org/OfflineEventAttendanceMode');
        
        if (info.location) {
          setLocationName(info.location.name || '');
          if (info.location.address) {
            setStreetAddress(info.location.address.streetAddress || '');
            setAddressLocality(info.location.address.addressLocality || '');
            setAddressRegion(info.location.address.addressRegion || '');
            setPostalCode(info.location.address.postalCode || '');
            setAddressCountry(info.location.address.addressCountry || 'US');
          }
        }
        
        if (info.image && Array.isArray(info.image)) {
          // Convert old string array format to new object format
          setImageUrls(info.image.map((url: string, index: number) => {
            // Detect type from URL
            let type: 'Image' | 'Video' | 'YouTube' = 'Image';
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              type = 'YouTube';
            } else if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
              type = 'Video';
            }
            return { url, type, seq: index };
          }));
        }
        
        if (info.offers) {
          setOfferUrl(info.offers.url || '');
          setOfferPrice(info.offers.price || '');
          setPriceCurrency(info.offers.priceCurrency || 'USD');
        }
        
        if (info.performer) {
          setPerformerName(info.performer.name || '');
          // Check if performer is using custom info
          if (customer && info.performer.name !== customer._shops.name) {
            setUseShopDefaults(false);
          }
        }
        
        if (info.organizer) {
          setOrganizerName(info.organizer.name || '');
          setOrganizerUrl(info.organizer.url || '');
          // Check if organizer is using custom info
          if (customer && (info.organizer.name !== customer._shops.name || 
              (customer._shops.custom_domain && info.organizer.url !== `https://${customer._shops.custom_domain}`))) {
            setUseShopDefaults(false);
          }
        }
        
        if (info.audience) {
          setAudienceType(info.audience.audienceType || '');
        }
        
        setKeywords(info.keywords || '');
      }
    }
  }, [event, customer]);

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  const handleImageUploaded = async (imageUrl: string, itemId: number, seq: number) => {
    if (!user?.id) return;

    try {
      // Get the media type from the imageUrls array
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
      const oldIndex = imageUrls.findIndex((item, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((item, idx) => idx === over.id);

      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      
      setImageUrls(newImageUrls);

      // Update sequences in the backend if event exists
      if (event && user?.id) {
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
      // Build schema.org Event object
      const eventSchema: any = {
        "@context": "https://schema.org",
        "@type": "Event",
        name: title,
        description,
      };

      if (startDate) eventSchema.startDate = startDate;
      if (endDate) eventSchema.endDate = endDate;
      eventSchema.eventStatus = eventStatus;
      eventSchema.eventAttendanceMode = eventAttendanceMode;

      if (locationName || streetAddress) {
        eventSchema.location = {
          "@type": "Place",
          name: locationName,
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressLocality,
            addressRegion,
            postalCode,
            addressCountry,
          }
        };
      }

      if (imageUrls.length > 0) {
        // Only include Image types in schema.org for SEO
        const imageOnlyUrls = imageUrls
          .filter(item => item.type === 'Image')
          .map(item => item.url);
        
        if (imageOnlyUrls.length > 0) {
          eventSchema.image = imageOnlyUrls;
        }
      }

      if (offerUrl || offerPrice) {
        eventSchema.offers = {
          "@type": "Offer",
          url: offerUrl,
          price: offerPrice,
          priceCurrency,
          availability: "https://schema.org/InStock",
        };
      }

      if (performerName) {
        eventSchema.performer = {
          "@type": "Organization",
          name: performerName,
        };
      }

      if (organizerName) {
        eventSchema.organizer = {
          "@type": "Organization",
          name: organizerName,
          url: organizerUrl,
        };
      }

      if (audienceType) {
        eventSchema.audience = {
          "@type": "Audience",
          audienceType,
        };
      }

      if (keywords) {
        eventSchema.keywords = keywords;
      }

      const itemData = {
        item_type: 'Event',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(title),
        item_info: eventSchema,
      };

      let savedItemId: number;

      if (event) {
        await adminAPI.updateItem(event.id, itemData, user.id);
        savedItemId = event.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!event?.item_info?.image?.includes(mediaItem.url)) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }

      toast({
        title: "Success",
        description: `Event ${event ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast({
        title: "Error",
        description: `Failed to ${event ? 'update' : 'create'} event`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="title">Event Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Tampa Bay Gem & Mineral Show"
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
            placeholder="tampa-bay-gem-mineral-show"
            required
          />
          <p className="text-sm text-muted-foreground">
            URL-friendly identifier (auto-generated from title)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Join us for a dazzling day of gems, minerals, fossils..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date & Time</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date & Time</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="disabled"
            checked={isDisabled}
            onCheckedChange={setIsDisabled}
          />
          <Label htmlFor="disabled">Disable this event</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Location</h3>
        
        <div className="space-y-2">
          <Label htmlFor="locationName">Venue Name</Label>
          <Input
            id="locationName"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Florida State Fairgrounds"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="4800 US-301"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={addressLocality}
              onChange={(e) => setAddressLocality(e.target.value)}
              placeholder="Tampa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={addressRegion}
              onChange={(e) => setAddressRegion(e.target.value)}
              placeholder="FL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">Zip Code</Label>
            <Input
              id="zip"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="33610"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Images & Videos</h3>
          <ImageUploadDialog
            onImageUploaded={(url, mediaType) => {
              const nextSeq = imageUrls.length + 1;
              setImageUrls([...imageUrls, { url, type: mediaType || 'Image', seq: nextSeq }]);
            }}
            title="Add Event Media"
            description="Upload images, videos, or add YouTube/external URLs for this event"
            showTypeSelector={true}
            buttonText="Add Media"
            buttonVariant="outline"
          />
        </div>
        
        {imageUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Drag to reorder • Click star to set as default thumbnail
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={imageUrls.map((_, idx) => idx)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap gap-3">
                  {imageUrls.map((mediaItem, idx) => (
                    <SortableMediaItem
                      key={idx}
                      id={idx}
                      mediaItem={mediaItem}
                      index={idx}
                      onRemove={() => setImageUrls(imageUrls.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Ticket Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="offerUrl">Ticket URL</Label>
          <Input
            id="offerUrl"
            type="url"
            value={offerUrl}
            onChange={(e) => setOfferUrl(e.target.value)}
            placeholder="https://tampagemshow.com/tickets"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              placeholder="10.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
              placeholder="USD"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Organizer & Performer</h3>
          <div className="flex items-center space-x-2">
            <Switch
              id="useShopDefaults"
              checked={useShopDefaults}
              onCheckedChange={setUseShopDefaults}
            />
            <Label htmlFor="useShopDefaults" className="cursor-pointer">
              Use shop defaults
            </Label>
          </div>
        </div>
        
        {useShopDefaults && customer && (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            Using shop information: <span className="font-medium">{customer._shops.name}</span>
            {customer._shops.custom_domain && (
              <span> ({customer._shops.custom_domain})</span>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="performer">Performer/Host</Label>
          <Input
            id="performer"
            value={performerName}
            onChange={(e) => setPerformerName(e.target.value)}
            placeholder="Tampa Bay Mineral & Science Clubs"
            disabled={useShopDefaults}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizer">Organizer Name</Label>
          <Input
            id="organizer"
            value={organizerName}
            onChange={(e) => setOrganizerName(e.target.value)}
            placeholder="Premier Event Promotions"
            disabled={useShopDefaults}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="organizerUrl">Organizer URL</Label>
          <Input
            id="organizerUrl"
            type="url"
            value={organizerUrl}
            onChange={(e) => setOrganizerUrl(e.target.value)}
            placeholder="https://premierevents.com"
            disabled={useShopDefaults}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">SEO & Metadata</h3>
        
        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience</Label>
          <Input
            id="audience"
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value)}
            placeholder="Families, Collectors, Jewelers"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords</Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="gem show, mineral expo, jewelry fair, Tampa events"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="gems, minerals, family-friendly"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoTags">SEO Tags</Label>
          <Textarea
            id="seoTags"
            value={seoTags}
            onChange={(e) => setSeoTags(e.target.value)}
            rows={2}
            placeholder="Additional SEO metadata"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
      </Button>
    </form>
  );
}
