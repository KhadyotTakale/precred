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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
interface ClassFormProps {
  classItem?: Item | null;
  onSuccess: () => void;
}
export function ClassForm({
  classItem,
  onSuccess
}: ClassFormProps) {
  const {
    user
  } = useUser();
  const {
    toast
  } = useToast();
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

  // Schema.org EducationEvent fields
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
  const [imageUrls, setImageUrls] = useState<Array<{
    url: string;
    type: 'Image' | 'Video' | 'YouTube';
    id?: number;
    seq: number;
  }>>([]);

  // Offers
  const [offerUrl, setOfferUrl] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('USD');

  // Instructor & Organizer
  const [instructorName, setInstructorName] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [organizerUrl, setOrganizerUrl] = useState('');
  const [useShopDefaults, setUseShopDefaults] = useState(true);

  // EducationEvent specific fields
  const [educationalLevel, setEducationalLevel] = useState('');
  const [teaches, setTeaches] = useState('');
  const [assesses, setAssesses] = useState('');
  const [duration, setDuration] = useState('');
  const [durationHours, setDurationHours] = useState(''); // Hours input
  const [maximumAttendeeCapacity, setMaximumAttendeeCapacity] = useState('');

  // Audience
  const [audienceType, setAudienceType] = useState('');

  // Keywords
  const [keywords, setKeywords] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'external' | ''>('');
  const [paymentLink, setPaymentLink] = useState('');

  // Fetch customer data for defaults
  useEffect(() => {
    const fetchCustomer = async () => {
      if (user?.id) {
        try {
          const customerData = await elegantAPI.getCustomer(user.id);
          setCustomer(customerData.customer);

          // Set defaults only for new classes
          if (!classItem) {
            const shopName = customerData.customer._shops.name;
            const customDomain = customerData.customer._shops.custom_domain;
            setInstructorName(shopName);
            setOrganizerName(shopName);
            setOrganizerUrl(customDomain ? `https://${customDomain}` : '');
          }
        } catch (error) {
          console.error('Failed to fetch customer data:', error);
        }
      }
    };
    fetchCustomer();
  }, [user?.id, classItem]);

  // Update organizer/instructor when toggle changes
  useEffect(() => {
    if (customer && useShopDefaults) {
      const shopName = customer._shops.name;
      const customDomain = customer._shops.custom_domain;
      setInstructorName(shopName);
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
    if (classItem) {
      setTitle(classItem.title);
      setSlug(classItem.slug || '');
      setSlugManuallyEdited(true); // Prevent auto-update for existing classes
      setDescription(classItem.description);
      setTags(classItem.tags || '');
      setSeoTags(classItem.SEO_Tags || '');
      setIsDisabled(classItem.Is_disabled);

      // Parse item_info for schema.org data
      if (classItem.item_info) {
        const info = classItem.item_info;
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
          setImageUrls(info.image.map((url: string, index: number) => {
            let type: 'Image' | 'Video' | 'YouTube' = 'Image';
            if (url.includes('youtube.com') || url.includes('youtu.be')) {
              type = 'YouTube';
            } else if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
              type = 'Video';
            }
            return {
              url,
              type,
              seq: index
            };
          }));
        }
        if (info.offers) {
          setOfferUrl(info.offers.url || '');
          setOfferPrice(info.offers.price || '');
          setPriceCurrency(info.offers.priceCurrency || 'USD');
        }
        if (info.instructor) {
          setInstructorName(info.instructor.name || '');
          if (customer && info.instructor.name !== customer._shops.name) {
            setUseShopDefaults(false);
          }
        }
        if (info.organizer) {
          setOrganizerName(info.organizer.name || '');
          setOrganizerUrl(info.organizer.url || '');
          if (customer && (info.organizer.name !== customer._shops.name || customer._shops.custom_domain && info.organizer.url !== `https://${customer._shops.custom_domain}`)) {
            setUseShopDefaults(false);
          }
        }

        // EducationEvent specific fields
        setEducationalLevel(info.educationalLevel || '');
        setTeaches(info.teaches || '');
        setAssesses(info.assesses || '');
        const isoDuration = info.duration || '';
        setDuration(isoDuration);
        setDurationHours(convertISO8601ToHours(isoDuration));
        setMaximumAttendeeCapacity(info.maximumAttendeeCapacity?.toString() || '');
        if (info.audience) {
          setAudienceType(info.audience.audienceType || '');
        }
        setKeywords(info.keywords || '');

        // Payment fields
        setPaymentMethod(info.paymentMethod || '');
        setPaymentLink(info.paymentLink || '');
      }
    }
  }, [classItem, customer]);
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')      // Replace spaces with single hyphen
      .replace(/[^a-z0-9-]/g, '') // Remove special characters (only keep lowercase letters, numbers, hyphens)
      .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '');    // Remove leading/trailing hyphens
  };

  // Convert hours to ISO 8601 duration format
  const convertHoursToISO8601 = (hours: string): string => {
    if (!hours || isNaN(parseFloat(hours))) return '';
    const hoursNum = parseFloat(hours);
    const wholeHours = Math.floor(hoursNum);
    const minutes = Math.round((hoursNum - wholeHours) * 60);
    if (minutes === 0) {
      return `PT${wholeHours}H`;
    } else {
      return `PT${wholeHours}H${minutes}M`;
    }
  };

  // Convert ISO 8601 duration to hours
  const convertISO8601ToHours = (iso: string): string => {
    if (!iso) return '';
    const hourMatch = iso.match(/(\d+)H/);
    const minuteMatch = iso.match(/(\d+)M/);
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    return (hours + minutes / 60).toString();
  };

  // Update duration when hours change
  useEffect(() => {
    if (durationHours) {
      setDuration(convertHoursToISO8601(durationHours));
    } else {
      setDuration('');
    }
  }, [durationHours]);
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
        Is_disabled: false
      }, user.id);
      return response;
    } catch (error) {
      console.error('Failed to associate image:', error);
      throw error;
    }
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    if (over && active.id !== over.id) {
      const oldIndex = imageUrls.findIndex((item, idx) => idx === active.id);
      const newIndex = imageUrls.findIndex((item, idx) => idx === over.id);
      const newImageUrls = arrayMove(imageUrls, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        seq: idx + 1
      }));
      setImageUrls(newImageUrls);
      if (classItem && user?.id) {
        try {
          for (const [index, mediaItem] of newImageUrls.entries()) {
            if (mediaItem.id) {
              await adminAPI.updateItemImage(mediaItem.id, {
                seq: index + 1
              }, user.id);
            }
          }
          toast({
            title: "Success",
            description: "Media order updated"
          });
        } catch (error) {
          console.error('Failed to update order:', error);
          toast({
            title: "Error",
            description: "Failed to update media order",
            variant: "destructive"
          });
        }
      }
    }
  };
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      // Build schema.org EducationEvent object
      const educationEventSchema: any = {
        "@context": "https://schema.org",
        "@type": "EducationEvent",
        name: title,
        description
      };
      if (startDate) educationEventSchema.startDate = startDate;
      if (endDate) educationEventSchema.endDate = endDate;
      educationEventSchema.eventStatus = eventStatus;
      educationEventSchema.eventAttendanceMode = eventAttendanceMode;
      if (locationName || streetAddress) {
        educationEventSchema.location = {
          "@type": "Place",
          name: locationName,
          address: {
            "@type": "PostalAddress",
            streetAddress,
            addressLocality,
            addressRegion,
            postalCode,
            addressCountry
          }
        };
      }
      if (imageUrls.length > 0) {
        const imageOnlyUrls = imageUrls.filter(item => item.type === 'Image').map(item => item.url);
        if (imageOnlyUrls.length > 0) {
          educationEventSchema.image = imageOnlyUrls;
        }
      }
      if (offerUrl || offerPrice) {
        educationEventSchema.offers = {
          "@type": "Offer",
          url: offerUrl,
          price: offerPrice,
          priceCurrency,
          availability: "https://schema.org/InStock"
        };
      }
      if (instructorName) {
        educationEventSchema.instructor = {
          "@type": "Person",
          name: instructorName
        };
      }
      if (organizerName) {
        educationEventSchema.organizer = {
          "@type": "Organization",
          name: organizerName,
          url: organizerUrl
        };
      }

      // EducationEvent specific fields
      if (educationalLevel) {
        educationEventSchema.educationalLevel = educationalLevel;
      }
      if (teaches) {
        educationEventSchema.teaches = teaches;
      }
      if (assesses) {
        educationEventSchema.assesses = assesses;
      }
      if (duration) {
        educationEventSchema.duration = duration;
      }
      if (maximumAttendeeCapacity) {
        educationEventSchema.maximumAttendeeCapacity = parseInt(maximumAttendeeCapacity);
      }
      if (audienceType) {
        educationEventSchema.audience = {
          "@type": "Audience",
          audienceType
        };
      }
      if (keywords) {
        educationEventSchema.keywords = keywords;
      }

      // Payment fields
      if (paymentMethod) {
        educationEventSchema.paymentMethod = paymentMethod;
      }
      if (paymentLink) {
        educationEventSchema.paymentLink = paymentLink;
      }
      const itemData: any = {
        item_type: 'Classes',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(title),
        price: offerPrice ? parseFloat(offerPrice) : (classItem?.price || 0),
        unit: classItem?.unit || '',
        currency: priceCurrency,
        sku: classItem?.sku || '',
        item_info: educationEventSchema,
        rank: classItem?.rank || 1,
        min_quantity: classItem?.min_quantity || 0,
        item_attributes: classItem?.item_attributes || {}
      };

      // For PATCH requests, include items_id and shops_id
      if (classItem) {
        itemData.items_id = classItem.id;
        itemData.shops_id = classItem.shops_id || customer?._shops.id || null;
      }

      let savedItemId: number;
      if (classItem) {
        await adminAPI.updateItem(classItem.id, itemData, user.id);
        savedItemId = classItem.id;
      } else {
        const response = await adminAPI.createItem(itemData, user.id);
        savedItemId = (response as any).id;
      }

      // Associate new images
      for (const [index, mediaItem] of imageUrls.entries()) {
        if (!classItem?.item_info?.image?.includes(mediaItem.url)) {
          await handleImageUploaded(mediaItem.url, savedItemId, index + 1);
        }
      }
      toast({
        title: "Success",
        description: `Class ${classItem ? 'updated' : 'created'} successfully`
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save class:', error);
      toast({
        title: "Error",
        description: `Failed to ${classItem ? 'update' : 'create'} class`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-6">
      <Accordion type="single" collapsible defaultValue="basic-info" className="w-full">
        <AccordionItem value="basic-info">
          <AccordionTrigger className="text-lg font-semibold pl-4">Basic Information</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Class Title *</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Introduction to Lapidary Art" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input id="slug" value={slug} onChange={e => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }} placeholder="introduction-to-lapidary-art" required />
                <p className="text-sm text-muted-foreground">
                  URL-friendly identifier (auto-generated from title)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} required rows={4} placeholder="Learn the fundamentals of lapidary art including cutting, polishing, and setting minerals..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date & Time *</Label>
                  <Input id="startDate" type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date & Time</Label>
                  <Input id="endDate" type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="disabled" checked={isDisabled} onCheckedChange={setIsDisabled} />
                <Label htmlFor="disabled">Mark as disabled</Label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="education">
          <AccordionTrigger className="text-lg font-semibold pl-4">Education Details</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="educationalLevel">Educational Level *</Label>
          <Select value={educationalLevel} onValueChange={setEducationalLevel}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced">Advanced</SelectItem>
              <SelectItem value="All Levels">All Levels</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teaches">What This Class Teaches *</Label>
          <Textarea id="teaches" value={teaches} onChange={e => setTeaches(e.target.value)} required rows={3} placeholder="Cutting techniques, polishing methods, safety procedures..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assesses">Skills/Knowledge Assessed</Label>
          <Textarea id="assesses" value={assesses} onChange={e => setAssesses(e.target.value)} rows={2} placeholder="Hands-on cutting proficiency, equipment safety knowledge..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="durationHours">Duration (hours) *</Label>
            <Input id="durationHours" type="number" step="0.5" value={durationHours} onChange={e => setDurationHours(e.target.value)} required min="0.5" placeholder="2" />
            <p className="text-xs text-muted-foreground">
              {duration && `ISO 8601: ${duration}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Maximum Attendee Capacity *</Label>
            <Input id="capacity" type="number" value={maximumAttendeeCapacity} onChange={e => setMaximumAttendeeCapacity(e.target.value)} required min="1" placeholder="12" />
          </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="location">
          <AccordionTrigger className="text-lg font-semibold pl-4">Location</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="locationName">Venue Name</Label>
          <Input id="locationName" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Club Workshop" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="streetAddress">Street Address</Label>
          <Input id="streetAddress" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main Street" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressLocality">City</Label>
            <Input id="addressLocality" value={addressLocality} onChange={e => setAddressLocality(e.target.value)} placeholder="Tampa" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressRegion">State</Label>
            <Input id="addressRegion" value={addressRegion} onChange={e => setAddressRegion(e.target.value)} placeholder="FL" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">ZIP Code</Label>
            <Input id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="33602" />
          </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="media">
          <AccordionTrigger className="text-lg font-semibold pl-4">Images & Videos</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
          <ImageUploadDialog onImageUploaded={(url, type) => {
                setImageUrls([...imageUrls, {
                  url,
                  type: type || 'Image',
                  seq: imageUrls.length + 1
                }]);
              }} />
              </div>
              
              {imageUrls.length > 0 && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={imageUrls.map((_, idx) => idx)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imageUrls.map((media, index) => <SortableMediaItem key={index} id={index} mediaItem={media} index={index} onRemove={() => {
                    setImageUrls(imageUrls.filter((_, i) => i !== index));
                  }} />)}
              </div>
                </SortableContext>
              </DndContext>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="registration">
          <AccordionTrigger className="text-lg font-semibold pl-4">Registration Information</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="offerUrl">Registration URL</Label>
                <Input id="offerUrl" type="url" value={offerUrl} onChange={e => setOfferUrl(e.target.value)} placeholder="https://example.com/register" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="offerPrice">Price</Label>
                  <Input id="offerPrice" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} placeholder="49.99" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priceCurrency">Currency</Label>
                  <Input id="priceCurrency" value={priceCurrency} onChange={e => setPriceCurrency(e.target.value)} placeholder="USD" />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payment">
          <AccordionTrigger className="text-lg font-semibold pl-4">Payment</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="space-y-2 px-[10px]">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(value: 'stripe' | 'external' | '') => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Use Stripe</SelectItem>
                    <SelectItem value="external">External Link (SignUp Genius, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'external' && <div className="space-y-2 px-[10px]">
                  <Label htmlFor="paymentLink">Payment/Registration Link</Label>
                  <Input id="paymentLink" type="url" value={paymentLink} onChange={e => setPaymentLink(e.target.value)} placeholder="https://signupgenius.com/..." />
                  <p className="text-sm text-muted-foreground">
                    Enter the external payment or registration URL
                  </p>
                </div>}

              {paymentMethod === 'stripe' && <div className="p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Stripe payment integration will be configured for this class
                  </p>
                </div>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="instructor">
          <AccordionTrigger className="text-lg font-semibold pl-4">Instructor & Organizer</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="flex items-center space-x-2 justify-end">
                <Switch id="useShopDefaults" checked={useShopDefaults} onCheckedChange={setUseShopDefaults} />
                <Label htmlFor="useShopDefaults">Use shop defaults</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructorName">Instructor Name</Label>
                <Input id="instructorName" value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="John Smith" disabled={useShopDefaults} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizerName">Organizer Name</Label>
                <Input id="organizerName" value={organizerName} onChange={e => setOrganizerName(e.target.value)} placeholder="Tampa Bay Gem & Mineral Society" disabled={useShopDefaults} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizerUrl">Organizer URL</Label>
                <Input id="organizerUrl" type="url" value={organizerUrl} onChange={e => setOrganizerUrl(e.target.value)} placeholder="https://example.com" disabled={useShopDefaults} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seo">
          <AccordionTrigger className="text-lg font-semibold pl-4">SEO & Metadata</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="audienceType">Target Audience</Label>
                <Input id="audienceType" value={audienceType} onChange={e => setAudienceType(e.target.value)} placeholder="Hobbyists, Students, Adults" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input id="keywords" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="lapidary, rockhounding, mineral cutting, gemstone polishing" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="education, workshop, hands-on" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoTags">SEO Tags</Label>
                <Input id="seoTags" value={seoTags} onChange={e => setSeoTags(e.target.value)} placeholder="lapidary-class-tampa, gem-cutting-workshop" />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Saving...' : classItem ? 'Update Class' : 'Create Class'}
      </Button>
    </form>;
}