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

interface VendorFormProps {
  vendor?: Item | null;
  onSuccess: () => void;
}

export function VendorForm({ vendor, onSuccess }: VendorFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);

  // Basic fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);

  // Contact Information
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [url, setUrl] = useState('');
  
  // Address
  const [streetAddress, setStreetAddress] = useState('');
  const [addressLocality, setAddressLocality] = useState('');
  const [addressRegion, setAddressRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressCountry, setAddressCountry] = useState('US');
  
  // Image
  const [imageUrls, setImageUrls] = useState<Array<{ url: string; type: 'Image' | 'Video' | 'YouTube'; id?: number; seq: number }>>([]);
  
  // Business Details
  const [priceRange, setPriceRange] = useState('');
  const [paymentAccepted, setPaymentAccepted] = useState('');
  const [currenciesAccepted, setCurrenciesAccepted] = useState('USD');
  
  // GeoCoordinates
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  // Opening Hours
  const [openingHours, setOpeningHours] = useState('');
  
  // Keywords
  const [keywords, setKeywords] = useState('');

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      if (user?.id) {
        try {
          const customerData = await elegantAPI.getCustomer(user.id);
          setCustomer(customerData.customer);
        } catch (error) {
          console.error('Failed to fetch customer data:', error);
        }
      }
    };

    fetchCustomer();
  }, [user?.id, vendor]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugManuallyEdited]);

  useEffect(() => {
    if (vendor) {
      setName(vendor.title);
      setSlug(vendor.slug || '');
      setSlugManuallyEdited(true); // Prevent auto-update for existing vendors
      setDescription(vendor.description);
      setTags(vendor.tags || '');
      setSeoTags(vendor.SEO_Tags || '');
      setIsDisabled(vendor.Is_disabled);

      // Parse item_info for schema.org data
      if (vendor.item_info) {
        const info = vendor.item_info;
        
        setTelephone(info.telephone || '');
        setEmail(info.email || '');
        setUrl(info.url || '');
        
        if (info.address) {
          setStreetAddress(info.address.streetAddress || '');
          setAddressLocality(info.address.addressLocality || '');
          setAddressRegion(info.address.addressRegion || '');
          setPostalCode(info.address.postalCode || '');
          setAddressCountry(info.address.addressCountry || 'US');
        }
        
        if (info.image && Array.isArray(info.image)) {
          setImageUrls(info.image.map((url: string, index: number) => {
            let type: 'Image' | 'Video' | 'YouTube' = 'Image';
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              type = 'YouTube';
            } else if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
              type = 'Video';
            }
            return { url, type, seq: index };
          }));
        }
        
        setPriceRange(info.priceRange || '');
        setPaymentAccepted(info.paymentAccepted || '');
        setCurrenciesAccepted(info.currenciesAccepted || 'USD');
        
        if (info.geo) {
          setLatitude(info.geo.latitude?.toString() || '');
          setLongitude(info.geo.longitude?.toString() || '');
        }
        
        setOpeningHours(info.openingHoursSpecification || '');
        setKeywords(info.keywords || '');
      }
    }
  }, [vendor, customer]);

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
      const oldIndex = imageUrls.findIndex((item, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((item, idx) => idx === over.id);

      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      
      setImageUrls(newImageUrls);

      if (vendor && user?.id) {
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
      // Build schema.org LocalBusiness object
      const localBusinessSchema: any = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name,
        description,
      };

      if (telephone) localBusinessSchema.telephone = telephone;
      if (email) localBusinessSchema.email = email;
      if (url) localBusinessSchema.url = url;

      if (streetAddress || addressLocality) {
        localBusinessSchema.address = {
          "@type": "PostalAddress",
          streetAddress,
          addressLocality,
          addressRegion,
          postalCode,
          addressCountry,
        };
      }

      if (imageUrls.length > 0) {
        const imageOnlyUrls = imageUrls
          .filter(item => item.type === 'Image')
          .map(item => item.url);
        
        if (imageOnlyUrls.length > 0) {
          localBusinessSchema.image = imageOnlyUrls;
        }
      }

      if (priceRange) localBusinessSchema.priceRange = priceRange;
      if (paymentAccepted) localBusinessSchema.paymentAccepted = paymentAccepted;
      if (currenciesAccepted) localBusinessSchema.currenciesAccepted = currenciesAccepted;

      if (latitude && longitude) {
        localBusinessSchema.geo = {
          "@type": "GeoCoordinates",
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        };
      }

      if (openingHours) {
        localBusinessSchema.openingHoursSpecification = openingHours;
      }

      if (keywords) {
        localBusinessSchema.keywords = keywords;
      }

      const itemData = {
        item_type: 'Vendors',
        Is_disabled: isDisabled,
        title: name,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(name),
        item_info: localBusinessSchema,
      };

      let savedItemId: number;

      if (vendor) {
        await adminAPI.updateItem(vendor.id, itemData, user.id);
        savedItemId = vendor.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!vendor?.item_info?.image?.includes(mediaItem.url)) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }

      toast({
        title: "Success",
        description: `Vendor ${vendor ? 'updated' : 'created'} successfully`,
      });
      
      onSuccess();
    } catch (error) {
      console.error('Failed to save vendor:', error);
      toast({
        title: "Error",
        description: `Failed to ${vendor ? 'update' : 'create'} vendor`,
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
          <Label htmlFor="name">Business Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Crystal Emporium"
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
            placeholder="crystal-emporium"
            required
          />
          <p className="text-sm text-muted-foreground">
            URL-friendly identifier (auto-generated from name)
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
            placeholder="Premier supplier of rare minerals, gems, and fossils..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="disabled"
            checked={isDisabled}
            onCheckedChange={setIsDisabled}
          />
          <Label htmlFor="disabled">Disable this vendor</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telephone">Phone Number</Label>
            <Input
              id="telephone"
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+1-813-555-0100"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@vendor.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="url">Website URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.vendor.com"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Business Address</h3>
        
        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input
            id="streetAddress"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="123 Mineral Way"
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="27.9506"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="-82.4572"
            />
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Business Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priceRange">Price Range</Label>
            <Input
              id="priceRange"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="$$"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAccepted">Payment Methods</Label>
            <Input
              id="paymentAccepted"
              value={paymentAccepted}
              onChange={(e) => setPaymentAccepted(e.target.value)}
              placeholder="Cash, Credit Card, PayPal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currenciesAccepted">Currencies Accepted</Label>
            <Input
              id="currenciesAccepted"
              value={currenciesAccepted}
              onChange={(e) => setCurrenciesAccepted(e.target.value)}
              placeholder="USD"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openingHours">Opening Hours</Label>
          <Textarea
            id="openingHours"
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            rows={3}
            placeholder="Mon-Fri 9:00-18:00, Sat 10:00-16:00"
          />
          <p className="text-xs text-muted-foreground">
            Enter opening hours in a readable format
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Media Gallery</h3>
        
        <ImageUploadDialog
          onImageUploaded={(url, type) => {
            setImageUrls([...imageUrls, { url, type: type || 'Image', seq: imageUrls.length + 1 }]);
          }}
        />

        {imageUrls.length > 0 && (
          <div className="mt-4">
            <Label>Gallery Images (drag to reorder)</Label>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={imageUrls.map((_, idx) => idx)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {imageUrls.map((mediaItem, index) => (
                    <SortableMediaItem
                      key={index}
                      id={index}
                      mediaItem={mediaItem}
                      index={index}
                      onRemove={() => {
                        setImageUrls(imageUrls.filter((_, i) => i !== index));
                      }}
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
        <h3 className="text-lg font-semibold">SEO & Keywords</h3>
        
        <div className="space-y-2">
          <Label htmlFor="keywords">Keywords</Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="minerals, gems, crystals, rocks, fossils"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="wholesale, retail, custom-orders"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="seoTags">SEO Tags</Label>
          <Input
            id="seoTags"
            value={seoTags}
            onChange={(e) => setSeoTags(e.target.value)}
            placeholder="tampa vendors, florida gems"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
}
