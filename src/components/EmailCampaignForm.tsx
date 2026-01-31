import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { adminAPI, type PostmarkTemplate, type PostmarkTemplateDetail, type Item, type RelatedItem, type ItemImage } from "@/lib/admin-api";
import { Mail, Send, Users, FileText, Loader2, ChevronLeft, RefreshCw, CheckCircle2, AlertCircle, Eye, Link2, Save, ExternalLink, Clock, Image as ImageIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getThumbnailImage } from "@/lib/image-utils";
import { FieldMappingPicker, type MappingField } from "@/components/FieldMappingPicker";
import { 
  STATIC_TEXT_PREFIX, 
  getFieldValue as getFieldValueUtil, 
  buildTemplateModelFromMappings,
  type EmailLeadRecipient,
  type FieldResolutionContext 
} from "@/lib/email-utils";
interface CampaignLeadRecipient {
  id: string;
  leads_id: number;
  status: string;
  last_contact_date: string | null;
  _leads: {
    lead_payload: {
      email: string;
      first_name: string;
      last_name: string;
      mobile_number?: string;
      property_address?: string;
      notes?: string;
    };
    email: string;
  };
}

// Available lead fields for mapping - grouped by category
const LEAD_FIELDS = [
  { key: 'first_name', label: 'First Name', category: 'Lead Info', icon: 'user' },
  { key: 'last_name', label: 'Last Name', category: 'Lead Info', icon: 'user' },
  { key: 'full_name', label: 'Full Name', category: 'Lead Info', icon: 'user' },
  { key: 'email', label: 'Email', category: 'Lead Info', icon: 'mail' },
  { key: 'mobile_number', label: 'Mobile Number', category: 'Lead Info', icon: 'phone' },
  { key: 'property_address', label: 'Address', category: 'Lead Info', icon: 'mappin' },
  { key: 'notes', label: 'Notes', category: 'Lead Info', icon: 'message' },
];

// Campaign item fields for mapping
const CAMPAIGN_ITEM_FIELDS = [
  { key: 'campaign_title', label: 'Campaign Title', category: 'Campaign', icon: 'tag' },
  { key: 'campaign_description', label: 'Campaign Description', category: 'Campaign', icon: 'filetext' },
  { key: 'campaign_price', label: 'Campaign Price', category: 'Campaign', icon: 'dollar' },
  { key: 'campaign_sku', label: 'Campaign SKU', category: 'Campaign', icon: 'hash' },
  { key: 'campaign_url', label: 'Campaign URL', category: 'Campaign Links', icon: 'globe' },
  { key: 'campaign_share_facebook', label: 'Facebook Share Link', category: 'Campaign Links', icon: 'link' },
  { key: 'campaign_share_twitter', label: 'Twitter Share Link', category: 'Campaign Links', icon: 'link' },
  { key: 'campaign_share_linkedin', label: 'LinkedIn Share Link', category: 'Campaign Links', icon: 'link' },
  { key: 'campaign_share_whatsapp', label: 'WhatsApp Share Link', category: 'Campaign Links', icon: 'link' },
  { key: 'campaign_share_email', label: 'Email Share Link', category: 'Campaign Links', icon: 'mail' },
  { key: 'campaign_share_copy', label: 'Copy Link', category: 'Campaign Links', icon: 'link' },
];

// Helper: Determine icon based on key name
const getIconForKey = (key: string): string => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey.includes('start') || lowerKey.includes('end')) return 'calendar';
  if (lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('fee') || lowerKey.includes('amount')) return 'dollar';
  if (lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('logo') || lowerKey.includes('thumbnail')) return 'image';
  if (lowerKey.includes('url') || lowerKey.includes('link') || lowerKey.includes('website') || lowerKey.includes('href')) return 'globe';
  if (lowerKey.includes('name') || lowerKey.includes('instructor') || lowerKey.includes('author') || lowerKey.includes('organizer')) return 'user';
  if (lowerKey.includes('location') || lowerKey.includes('address') || lowerKey.includes('venue') || lowerKey.includes('place')) return 'mappin';
  if (lowerKey.includes('description') || lowerKey.includes('about') || lowerKey.includes('summary') || lowerKey.includes('text')) return 'filetext';
  if (lowerKey.includes('duration') || lowerKey.includes('length')) return 'calendar';
  if (lowerKey.includes('email') || lowerKey.includes('mail')) return 'mail';
  if (lowerKey.includes('phone') || lowerKey.includes('mobile') || lowerKey.includes('tel')) return 'phone';
  if (lowerKey.includes('type') || lowerKey.includes('category') || lowerKey.includes('kind')) return 'bookmark';
  return 'info';
};

// Helper: Format nested key path into readable label
const formatNestedLabel = (path: string[]): string => {
  return path.map(part => 
    part.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  ).join(' → ');
};

// Recursive function to extract all nested fields from an object
const extractNestedFields = (
  obj: Record<string, any>,
  basePath: string[] = [],
  baseKey: string = '',
  category: string = 'Details',
  maxDepth: number = 4
): { key: string; label: string; category: string; icon: string }[] => {
  if (!obj || typeof obj !== 'object' || maxDepth <= 0) return [];
  
  const fields: { key: string; label: string; category: string; icon: string }[] = [];
  const excludeKeys = ['@type', '@context', '@id'];
  
  Object.entries(obj).forEach(([key, value]) => {
    if (excludeKeys.includes(key)) return;
    
    const currentPath = [...basePath, key];
    const fieldKey = baseKey ? `${baseKey}.${key}` : key;
    const icon = getIconForKey(key);
    
    if (value === null || value === undefined) {
      // Still add the field, it might have value in other items
      fields.push({
        key: fieldKey,
        label: formatNestedLabel(currentPath),
        category,
        icon
      });
    } else if (Array.isArray(value)) {
      // For arrays, add the array field itself
      fields.push({
        key: fieldKey,
        label: formatNestedLabel(currentPath),
        category,
        icon: value.length > 0 && typeof value[0] === 'object' ? 'list' : icon
      });
      
      // If array has objects, extract fields from first element as representative
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        const nestedCategory = `${category} → ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
        // Add indexed access for first few items
        value.slice(0, 3).forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const indexedFields = extractNestedFields(
              item,
              [...currentPath, `[${index}]`],
              `${fieldKey}[${index}]`,
              nestedCategory,
              maxDepth - 1
            );
            fields.push(...indexedFields);
          }
        });
      }
    } else if (typeof value === 'object') {
      // For nested objects, add the object itself and recurse
      fields.push({
        key: fieldKey,
        label: formatNestedLabel(currentPath),
        category,
        icon: 'folder'
      });
      
      const nestedCategory = `${category} → ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
      const nestedFields = extractNestedFields(
        value,
        currentPath,
        fieldKey,
        nestedCategory,
        maxDepth - 1
      );
      fields.push(...nestedFields);
    } else {
      // Primitive value
      fields.push({
        key: fieldKey,
        label: formatNestedLabel(currentPath),
        category,
        icon
      });
    }
  });
  
  return fields;
};

// Campaign item_info dynamic fields (will be populated from actual item) - now with nested support
const getItemInfoFields = (itemInfo: Record<string, any> | null | undefined): { key: string; label: string; category: string; icon: string }[] => {
  if (!itemInfo) return [];
  
  return extractNestedFields(itemInfo, [], 'item_info', 'Campaign Details');
};

// Helper: Format ISO duration (e.g., "PT4H30M") to readable string (e.g., "4 hours 30 minutes")
const formatDuration = (duration: string): string => {
  if (!duration || typeof duration !== 'string') return duration;
  
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return duration;
  
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  return parts.length > 0 ? parts.join(' ') : duration;
};

// Helper: Convert date/time to US Eastern Time format
const formatToEST = (dateStr: string): string => {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    // Format to US Eastern Time
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' EST';
  } catch {
    return dateStr;
  }
};

// Helper: Check if a value looks like a date/time
const isDateTimeValue = (key: string, value: any): boolean => {
  if (typeof value !== 'string') return false;
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey.includes('start') || lowerKey.includes('end')) {
    // Check if it looks like an ISO date
    return /^\d{4}-\d{2}-\d{2}/.test(value);
  }
  return false;
};

// Helper: Check if a value looks like a duration
const isDurationValue = (key: string, value: any): boolean => {
  if (typeof value !== 'string') return false;
  const lowerKey = key.toLowerCase();
  return lowerKey.includes('duration') || /^PT\d+[HMS]/i.test(value);
};

// Helper: Process item_info values (handle arrays, dates, durations, objects)
const processItemInfoValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return '';
  
  // Handle arrays - return first element or join
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    // For image arrays, return first URL string
    if (typeof value[0] === 'string') return value[0];
    return value.map(v => typeof v === 'object' ? v?.name || JSON.stringify(v) : String(v)).join(', ');
  }
  
  // Handle objects
  if (typeof value === 'object') {
    return value?.name || value?.url || JSON.stringify(value);
  }
  
  const strValue = String(value);
  
  // Handle durations
  if (isDurationValue(key, strValue)) {
    return formatDuration(strValue);
  }
  
  // Handle date/time values
  if (isDateTimeValue(key, strValue)) {
    return formatToEST(strValue);
  }
  
  return strValue;
};

// Helper: Resolve nested path from object (e.g., "item_info.offers[0].price")
const resolveNestedPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  
  // Parse path with support for dot notation and bracket notation
  const parts = path.match(/[^.\[\]]+|\[\d+\]/g) || [];
  
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    // Handle array index notation [0], [1], etc.
    if (part.startsWith('[') && part.endsWith(']')) {
      const index = parseInt(part.slice(1, -1), 10);
      if (Array.isArray(current) && !isNaN(index)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }
  
  return current;
};

// Related item fields for mapping (up to 5 related items supported) - now with nested support
const getRelatedItemFields = (
  relatedItems: RelatedItem[], 
  relatedItemDetails: Map<number, Item>,
  relatedItemMedia?: Map<number, ItemImage[]>
): { key: string; label: string; category: string; icon: string; imageUrl?: string }[] => {
  const fields: { key: string; label: string; category: string; icon: string; imageUrl?: string }[] = [];
  
  relatedItems.slice(0, 5).forEach((ri, index) => {
    const item = relatedItemDetails.get(ri.related_items_id);
    const media = relatedItemMedia?.get(ri.related_items_id) || [];
    const itemLabel = item?.title || `Related Item ${index + 1}`;
    const itemType = item?.item_type || 'Item';
    const categoryName = `${itemType}: ${itemLabel.slice(0, 25)}${itemLabel.length > 25 ? '...' : ''}`;
    
    // Add basic item fields
    fields.push(
      { key: `related_${index}_title`, label: 'Title', category: categoryName, icon: 'tag' },
      { key: `related_${index}_description`, label: 'Description', category: categoryName, icon: 'filetext' },
      { key: `related_${index}_price`, label: 'Price', category: categoryName, icon: 'dollar' },
      { key: `related_${index}_sku`, label: 'SKU', category: categoryName, icon: 'hash' },
      { key: `related_${index}_item_type`, label: 'Item Type', category: categoryName, icon: 'bookmark' },
      { key: `related_${index}_url`, label: 'URL', category: categoryName, icon: 'globe' },
    );
    
    // Add media image URLs for each related item
    const imageMedia = media.filter(m => m.image_type === 'Image' && m.display_image);
    imageMedia.forEach((mediaItem, mediaIndex) => {
      fields.push({
        key: `related_${index}_media_${mediaIndex}`,
        label: `Image ${mediaIndex + 1}`,
        category: `${categoryName} Images`,
        icon: 'image',
        imageUrl: mediaItem.display_image
      });
    });
    
    // Add item_info fields with full nested support for each related item
    if (item?.item_info) {
      const nestedFields = extractNestedFields(
        item.item_info, 
        [], 
        `related_${index}_info`,
        categoryName
      );
      fields.push(...nestedFields.map(f => ({ ...f, imageUrl: undefined as string | undefined })));
    }
  });
  
  return fields;
};

// Linked booking interface for campaign bookings
export interface LinkedBooking {
  id: number;
  booking_slug: string;
  status: string;
  total_amount?: number;
  payment_status?: string;
  checkout_type?: string;
  booking_type?: string;
  quantity?: number;
  created_at?: number;
  booking_info?: Record<string, any>;
  _leads?: {
    email?: string;
    name?: string;
    lead_payload?: Record<string, any>;
  };
  _items?: {
    id?: number;
    slug?: string;
    title?: string;
    item_type?: string;
    item_info?: Record<string, any>;
  };
  _booking_items?: {
    items?: Array<{
      id?: number;
      price?: number;
      quantity?: number;
      item_type?: string;
      booking_items_info?: Record<string, any>;
      _items?: {
        id?: number;
        slug?: string;
        title?: string;
        item_type?: string;
      };
    }>;
  };
}

// Booking fields for mapping
// When useAsReferenceBooking=true, all fields use booking_0_* prefix since at send time each application becomes booking_0
const getBookingFields = (
  linkedBookings: LinkedBooking[],
  useAsReferenceBooking: boolean = false
): { key: string; label: string; category: string; icon: string; imageUrl?: string }[] => {
  const fields: { key: string; label: string; category: string; icon: string; imageUrl?: string }[] = [];
  
  // When using as reference, we only process the first booking but it defines the schema
  const bookingsToProcess = useAsReferenceBooking ? linkedBookings.slice(0, 1) : linkedBookings.slice(0, 5);
  
  bookingsToProcess.forEach((booking, actualIndex) => {
    // For reference booking, always use index 0 since at runtime each application becomes booking_0
    const index = useAsReferenceBooking ? 0 : actualIndex;
    const bookingLabel = booking._items?.title || booking.booking_slug || `Reference Booking`;
    const categoryPrefix = useAsReferenceBooking ? '📋 Application' : `Booking: ${bookingLabel.slice(0, 25)}${bookingLabel.length > 25 ? '...' : ''}`;
    const categoryName = useAsReferenceBooking ? `${categoryPrefix} Fields` : categoryPrefix;
    
    // Add core booking fields
    fields.push(
      { key: `booking_${index}_slug`, label: 'Booking Slug', category: categoryName, icon: 'hash' },
      { key: `booking_${index}_status`, label: 'Status', category: categoryName, icon: 'info' },
      { key: `booking_${index}_total_amount`, label: 'Total Amount', category: categoryName, icon: 'dollar' },
      { key: `booking_${index}_payment_status`, label: 'Payment Status', category: categoryName, icon: 'dollar' },
      { key: `booking_${index}_checkout_type`, label: 'Checkout Type', category: categoryName, icon: 'info' },
      { key: `booking_${index}_booking_type`, label: 'Booking Type', category: categoryName, icon: 'bookmark' },
      { key: `booking_${index}_quantity`, label: 'Quantity', category: categoryName, icon: 'hash' },
      { key: `booking_${index}_created_at`, label: 'Created Date', category: categoryName, icon: 'calendar' },
    );
    
    // Add lead/customer info from booking
    if (booking._leads) {
      fields.push(
        { key: `booking_${index}_lead_email`, label: 'Lead Email', category: categoryName, icon: 'mail' },
        { key: `booking_${index}_lead_name`, label: 'Lead Name', category: categoryName, icon: 'user' },
      );
      
      // Add lead_payload fields
      if (booking._leads.lead_payload) {
        const leadFields = extractNestedFields(
          booking._leads.lead_payload,
          [],
          `booking_${index}_lead`,
          useAsReferenceBooking ? `${categoryPrefix} → Lead Info` : `${categoryName} → Lead Info`
        );
        fields.push(...leadFields.map(f => ({ ...f, imageUrl: undefined as string | undefined })));
      }
    }
    
    // Add linked item info from booking
    if (booking._items) {
      const itemCategory = useAsReferenceBooking ? `${categoryPrefix} → Item` : categoryName;
      fields.push(
        { key: `booking_${index}_item_title`, label: 'Item Title', category: itemCategory, icon: 'tag' },
        { key: `booking_${index}_item_slug`, label: 'Item Slug', category: itemCategory, icon: 'link' },
        { key: `booking_${index}_item_type`, label: 'Item Type', category: itemCategory, icon: 'bookmark' },
      );
      
      // Add item_info fields
      if (booking._items.item_info) {
        const itemInfoFields = extractNestedFields(
          booking._items.item_info,
          [],
          `booking_${index}_item_info`,
          useAsReferenceBooking ? `${categoryPrefix} → Item Details` : `${categoryName} → Item Details`
        );
        fields.push(...itemInfoFields.map(f => ({ ...f, imageUrl: undefined as string | undefined })));
      }
    }
    
    // Add booking_info fields (form data)
    if (booking.booking_info) {
      const bookingInfoFields = extractNestedFields(
        booking.booking_info,
        [],
        `booking_${index}_info`,
        useAsReferenceBooking ? `${categoryPrefix} → Form Data` : `${categoryName} → Form Data`
      );
      fields.push(...bookingInfoFields.map(f => ({ ...f, imageUrl: undefined as string | undefined })));
    }
    
    // Add booking items if available
    const bookingItems = booking._booking_items?.items || [];
    bookingItems.slice(0, 3).forEach((bookingItem, itemIndex) => {
      const itemCategory = useAsReferenceBooking 
        ? `${categoryPrefix} → Line Item ${itemIndex + 1}` 
        : `${categoryName} → Item ${itemIndex + 1}`;
      
      fields.push(
        { key: `booking_${index}_items_${itemIndex}_price`, label: 'Price', category: itemCategory, icon: 'dollar' },
        { key: `booking_${index}_items_${itemIndex}_quantity`, label: 'Quantity', category: itemCategory, icon: 'hash' },
        { key: `booking_${index}_items_${itemIndex}_item_type`, label: 'Type', category: itemCategory, icon: 'bookmark' },
      );
      
      if (bookingItem._items) {
        fields.push(
          { key: `booking_${index}_items_${itemIndex}_title`, label: 'Item Title', category: itemCategory, icon: 'tag' },
        );
      }
      
      // Add booking_items_info fields (detailed form data per item)
      if (bookingItem.booking_items_info) {
        const itemInfoFields = extractNestedFields(
          bookingItem.booking_items_info,
          [],
          `booking_${index}_items_${itemIndex}_info`,
          itemCategory
        );
        fields.push(...itemInfoFields.map(f => ({ ...f, imageUrl: undefined as string | undefined })));
      }
    });
  });
  
  return fields;
};

interface EmailCampaignFormProps {
  campaignId: string;
  campaignTitle: string;
  campaignItem?: Item;
  sharableLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    whatsapp?: string;
    email?: string;
    copylink?: string;
  };
  relatedItems?: RelatedItem[];
  relatedItemDetails?: Map<number, Item>;
  relatedItemMedia?: Map<number, ItemImage[]>;
  linkedBookings?: LinkedBooking[];
  /** When true, linked booking acts as a reference for field schema discovery (for application emails) */
  useBookingAsReference?: boolean;
  onBack: () => void;
  onSuccess?: () => void;
}

export function EmailCampaignForm({
  campaignId,
  campaignTitle,
  campaignItem,
  sharableLinks,
  relatedItems = [],
  relatedItemDetails = new Map(),
  relatedItemMedia = new Map(),
  linkedBookings = [],
  useBookingAsReference = false,
  onBack,
  onSuccess
}: EmailCampaignFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<PostmarkTemplate[]>([]);
  const [maxEmailsPerDay, setMaxEmailsPerDay] = useState<number>(0);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [recipients, setRecipients] = useState<CampaignLeadRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PostmarkTemplate | null>(null);
  const [templateDetail, setTemplateDetail] = useState<PostmarkTemplateDetail | null>(null);
  const [loadingTemplateDetail, setLoadingTemplateDetail] = useState(false);
  const [templateKeys, setTemplateKeys] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sendResults, setSendResults] = useState<{ success: number; failed: number } | null>(null);
  const [activeTab, setActiveTab] = useState("compose");
  
  // Refs for auto-save debounce
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedMappings = useRef(false);
  // Track latest item_info to prevent stale closure issues during auto-save
  const latestItemInfoRef = useRef(campaignItem?.item_info || {});
  const [sendingProgress, setSendingProgress] = useState<{
    current: number;
    total: number;
    currentEmail: string;
    delayRemaining: number;
  } | null>(null);

  // Keep latestItemInfoRef in sync with prop
  useEffect(() => {
    if (campaignItem?.item_info) {
      latestItemInfoRef.current = campaignItem.item_info;
    }
  }, [campaignItem?.item_info]);

  // Build all available fields for mapping
  // When useBookingAsReference is true, the linked booking defines the field schema for application emails
  const allMappingFields = [
    ...LEAD_FIELDS.map(f => ({ ...f, imageUrl: undefined as string | undefined })),
    ...CAMPAIGN_ITEM_FIELDS.map(f => ({ ...f, imageUrl: undefined as string | undefined })),
    ...getItemInfoFields(campaignItem?.item_info).map(f => ({ ...f, imageUrl: undefined as string | undefined })),
    ...getRelatedItemFields(relatedItems, relatedItemDetails, relatedItemMedia),
    ...getBookingFields(linkedBookings, useBookingAsReference),
  ];

  // Group fields by category for better UI organization
  const groupedFields = allMappingFields.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, typeof allMappingFields>);

  // Extract {{keys}} from template content (HtmlBody, Subject, TextBody)
  const extractTemplateKeys = (detail: PostmarkTemplateDetail): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const keys = new Set<string>();
    
    // Extract from all template parts
    const sources = [detail.HtmlBody || '', detail.Subject || '', detail.TextBody || ''];
    
    sources.forEach(source => {
      let match;
      while ((match = regex.exec(source)) !== null) {
        keys.add(match[1].trim());
      }
    });
    
    return Array.from(keys);
  };

  // Fetch template detail when template is selected
  const fetchTemplateDetail = async (alias: string) => {
    setLoadingTemplateDetail(true);
    try {
      const detail = await adminAPI.getPostmarkTemplateByAlias(alias);
      setTemplateDetail(detail);
      
      // Extract keys from HtmlBody, Subject, and TextBody
      const keys = extractTemplateKeys(detail);
      setTemplateKeys(keys);
      
      // Check if we have saved mappings for this template
      const savedAlias = campaignItem?.item_info?.email_template_alias;
      const savedMappings = campaignItem?.item_info?.email_template_mappings;
      
      if (savedAlias === alias && savedMappings && Object.keys(savedMappings).length > 0) {
        // Use saved mappings
        setFieldMappings(savedMappings);
      } else {
        // Initialize field mappings with smart defaults
        const defaultMappings: Record<string, string> = {};
        keys.forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('first') && lowerKey.includes('name')) {
            defaultMappings[key] = 'first_name';
          } else if (lowerKey.includes('last') && lowerKey.includes('name')) {
            defaultMappings[key] = 'last_name';
          } else if (lowerKey === 'name' || lowerKey === 'full_name' || lowerKey === 'fullname') {
            defaultMappings[key] = 'full_name';
          } else if (lowerKey.includes('email')) {
            defaultMappings[key] = 'email';
          } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
            defaultMappings[key] = 'mobile_number';
          } else if (lowerKey.includes('address')) {
            defaultMappings[key] = 'property_address';
          }
        });
        setFieldMappings(defaultMappings);
      }
    } catch (error) {
      console.error('Failed to fetch template detail:', error);
      toast({
        title: "Error",
        description: "Failed to load template details",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplateDetail(false);
    }
  };

  // Fetch campaign leads recipients
  const fetchRecipients = async () => {
    if (!user?.id || !campaignId) return;
    
    setLoadingRecipients(true);
    try {
      const response = await adminAPI.getCampaignLeadsRecipients(user.id, campaignId);
      setRecipients(response.items || []);
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
      toast({
        title: "Error",
        description: "Failed to load campaign recipients",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  // Fetch Postmark templates
  const fetchTemplates = async () => {
    if (!user?.id) return;
    
    setLoadingTemplates(true);
    try {
      const response = await adminAPI.getPostmarkTemplates(user.id);
      // Filter to only show Standard templates (not Layout templates)
      const standardTemplates = response.Templates.filter(t => t.TemplateType === 'Standard' && t.Active);
      setTemplates(standardTemplates);
      setMaxEmailsPerDay(response.max_email_per_day || 0);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchRecipients();
  }, [user?.id, campaignId]);

  // Auto-select saved template when templates load
  useEffect(() => {
    if (templates.length > 0 && campaignItem?.item_info?.email_template_alias && !selectedTemplate) {
      const savedAlias = campaignItem.item_info.email_template_alias;
      const savedTemplate = templates.find(t => t.Alias === savedAlias);
      if (savedTemplate) {
        setSelectedTemplate(savedTemplate);
      }
    }
  }, [templates, campaignItem?.item_info?.email_template_alias]);

  // Fetch template detail when selection changes
  useEffect(() => {
    if (selectedTemplate?.Alias) {
      fetchTemplateDetail(selectedTemplate.Alias);
    }
  }, [selectedTemplate?.Alias]);

  // Get valid leads with email
  const validRecipients = recipients.filter(r => r._leads?.email || r._leads?.lead_payload?.email);

  // Handle select all recipients
  useEffect(() => {
    if (selectAll) {
      const allEmails = new Set(
        validRecipients.map(r => r._leads?.email || r._leads?.lead_payload?.email)
      );
      setSelectedRecipients(allEmails);
    } else if (selectedRecipients.size === validRecipients.length) {
      setSelectedRecipients(new Set());
    }
  }, [selectAll]);

  // Update selectAll state based on individual selections
  useEffect(() => {
    setSelectAll(selectedRecipients.size === validRecipients.length && validRecipients.length > 0);
  }, [selectedRecipients, validRecipients.length]);

  const toggleRecipient = (email: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedRecipients(newSelected);
  };

  const updateFieldMapping = (templateKey: string, leadField: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [templateKey]: leadField
    }));
    // Mark that user has made changes (for auto-save)
    hasInitializedMappings.current = true;
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!user?.id || !campaignItem?.id || !selectedTemplate?.Alias) return;
    
    setAutoSaveStatus('saving');
    try {
      // Use ref to get latest item_info to avoid stale closure
      const updatedItemInfo = {
        ...latestItemInfoRef.current,
        email_template_mappings: fieldMappings,
        email_template_alias: selectedTemplate.Alias,
      };
      await adminAPI.updateItem(campaignItem.id, { item_info: updatedItemInfo }, user.id);
      // Update ref with latest saved data to prevent overwrites on next save
      latestItemInfoRef.current = updatedItemInfo;
      setAutoSaveStatus('saved');
      // Reset to idle after 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  }, [user?.id, campaignItem?.id, fieldMappings, selectedTemplate?.Alias]);

  // Auto-save effect with debounce (1.5 second delay)
  useEffect(() => {
    // Don't auto-save if we haven't initialized mappings yet (prevents saving on initial load)
    if (!hasInitializedMappings.current) return;
    if (!selectedTemplate?.Alias || Object.keys(fieldMappings).length === 0) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [fieldMappings, selectedTemplate?.Alias, performAutoSave]);

  // Build field resolution context for the shared utility
  const fieldContext: FieldResolutionContext = {
    campaignItem,
    relatedItems,
    relatedItemDetails,
    relatedItemMedia,
    sharableLinks,
  };

  // Get field value based on field key - wrapper that uses the shared utility
  const getFieldValue = (fieldKey: string, recipient?: CampaignLeadRecipient): string => {
    // Convert recipient to EmailLeadRecipient format
    const emailRecipient: EmailLeadRecipient | undefined = recipient ? {
      id: recipient.id,
      leads_id: recipient.leads_id,
      status: recipient.status,
      last_contact_date: recipient.last_contact_date,
      _leads: recipient._leads,
    } : undefined;
    
    return getFieldValueUtil(fieldKey, emailRecipient, fieldContext);
  };

  // Build template model from campaign item's email_template_mappings
  const buildTemplateModel = (recipient: CampaignLeadRecipient): Record<string, any> => {
    // Convert recipient to EmailLeadRecipient format
    const emailRecipient: EmailLeadRecipient = {
      id: recipient.id,
      leads_id: recipient.leads_id,
      status: recipient.status,
      last_contact_date: recipient.last_contact_date,
      _leads: recipient._leads,
    };

    // Get template mappings from campaignItem.item_info
    const templateMappings = campaignItem?.item_info?.email_template_mappings as Record<string, string> | undefined;
    
    // Use shared utility to build base model
    const model = buildTemplateModelFromMappings(templateMappings, emailRecipient, fieldContext, customMessage);

    // Also include any current fieldMappings from the form (that haven't been saved yet)
    Object.entries(fieldMappings).forEach(([templateKey, fieldKey]) => {
      if (fieldKey && !model[templateKey]) {
        model[templateKey] = getFieldValue(fieldKey, recipient);
      }
    });

    return model;
  };

  // Save field mappings to campaign item's item_info
  const handleSaveMappings = async () => {
    if (!user?.id || !campaignItem?.id) {
      toast({
        title: "Error",
        description: "Campaign item not available",
        variant: "destructive",
      });
      return;
    }

    setSavingMappings(true);
    try {
      // Use ref to get latest item_info to avoid stale data
      const updatedItemInfo = {
        ...latestItemInfoRef.current,
        email_template_mappings: fieldMappings,
        email_template_alias: selectedTemplate?.Alias,
      };

      await adminAPI.updateItem(campaignItem.id, { item_info: updatedItemInfo }, user.id);
      // Update ref with latest saved data
      latestItemInfoRef.current = updatedItemInfo;
      
      toast({
        title: "Mappings Saved",
        description: "Field mappings have been saved to the campaign",
      });
    } catch (error) {
      console.error('Failed to save mappings:', error);
      toast({
        title: "Error",
        description: "Failed to save field mappings",
        variant: "destructive",
      });
    } finally {
      setSavingMappings(false);
    }
  };

  const handleSendEmails = async () => {
    if (!user?.id || !selectedTemplate || selectedRecipients.size === 0) {
      toast({
        title: "Missing Information",
        description: "Please select a template and at least one recipient",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setSendResults(null);
    
    let successCount = 0;
    let failedCount = 0;

    // Random delay options: 2, 4, or 5 minutes in seconds
    const delayOptions = [120, 240, 300];
    const getRandomDelay = () => delayOptions[Math.floor(Math.random() * delayOptions.length)];

    // Helper function to wait with countdown
    const waitWithCountdown = async (seconds: number, currentEmail: string, current: number, total: number) => {
      for (let remaining = seconds; remaining > 0; remaining--) {
        setSendingProgress({
          current,
          total,
          currentEmail,
          delayRemaining: remaining
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };

    try {
      const recipientList = validRecipients.filter(r => {
        const email = r._leads?.email || r._leads?.lead_payload?.email;
        return email && selectedRecipients.has(email);
      });

      const totalRecipients = recipientList.length;

      for (let i = 0; i < recipientList.length; i++) {
        const recipient = recipientList[i];
        const email = recipient._leads?.email || recipient._leads?.lead_payload?.email;
        const templateModel = buildTemplateModel(recipient);
        
        setSendingProgress({
          current: i + 1,
          total: totalRecipients,
          currentEmail: email || '',
          delayRemaining: 0
        });
        
        try {
          await adminAPI.sendTemplateEmail(user.id, {
            campaigns_id: recipient.id,
            template_id: selectedTemplate.TemplateId,
            to: email || '',
            template_model: templateModel,
            tag: "",
            metadata: {}
          });
          successCount++;
          
          // Refresh recipients after each successful send
          await fetchRecipients();
          
          // Add delay before next email if there are more recipients
          if (i < recipientList.length - 1) {
            const delaySeconds = getRandomDelay();
            await waitWithCountdown(delaySeconds, recipientList[i + 1]._leads?.email || recipientList[i + 1]._leads?.lead_payload?.email || '', i + 2, totalRecipients);
          }
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          failedCount++;
        }
      }

      setSendingProgress(null);
      setSendResults({ success: successCount, failed: failedCount });

      if (successCount > 0) {
        toast({
          title: "Emails Sent",
          description: `Successfully sent ${successCount} email${successCount !== 1 ? 's' : ''}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Send Failed",
          description: "Failed to send any emails",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to send emails:', error);
      toast({
        title: "Error",
        description: "An error occurred while sending emails",
        variant: "destructive",
      });
    } finally {
      setSending(false);
      setSendingProgress(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Send Email Campaign
          </h2>
          <p className="text-muted-foreground">Campaign: {campaignTitle}</p>
        </div>
      </div>

      {/* Daily Email Limit */}
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/30">
        <Mail className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          <span className="font-semibold">Daily Email Limit:</span>{" "}
          <span className="font-bold text-blue-900 dark:text-blue-300">{maxEmailsPerDay}</span>
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!selectedTemplate}>
            <Link2 className="h-4 w-4 mr-1" />
            Field Mapping
          </TabsTrigger>
        </TabsList>

        {/* Send Results */}
        {sendResults && (
          <Card className={`mt-4 ${sendResults.failed > 0 ? 'border-orange-300' : 'border-green-300'}`}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                {sendResults.failed === 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-orange-500" />
                )}
                <div>
                  <p className="font-medium">
                    {sendResults.success} email{sendResults.success !== 1 ? 's' : ''} sent successfully
                  </p>
                  {sendResults.failed > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {sendResults.failed} failed to send
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Email Template
                    </CardTitle>
                    <CardDescription>Select a Postmark template</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={fetchTemplates}
                    disabled={loadingTemplates}
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingTemplates ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTemplates ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No templates available</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <div
                          key={template.TemplateId}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedTemplate?.TemplateId === template.TemplateId
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{template.Name}</p>
                              <p className="text-sm text-muted-foreground">
                                Alias: {template.Alias}
                              </p>
                            </div>
                            {selectedTemplate?.TemplateId === template.TemplateId && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

              </CardContent>
            </Card>

            {/* Recipient Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recipients
                </CardTitle>
                <CardDescription>
                  {selectedRecipients.size} of {validRecipients.length} selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingRecipients ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 pb-3 border-b">
                      <Checkbox
                        id="selectAll"
                        checked={selectAll}
                        onCheckedChange={(checked) => setSelectAll(!!checked)}
                      />
                      <Label htmlFor="selectAll" className="cursor-pointer">
                        Select All ({validRecipients.length})
                      </Label>
                    </div>

                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {validRecipients.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No leads with valid emails</p>
                          </div>
                        ) : (
                          validRecipients.map((recipient) => {
                            const email = recipient._leads?.email || recipient._leads?.lead_payload?.email;
                            const fullName = `${recipient._leads?.lead_payload?.first_name || ''} ${recipient._leads?.lead_payload?.last_name || ''}`.trim() || 'Unknown';
                            return (
                              <div
                                key={recipient.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedRecipients.has(email)
                                    ? 'border-primary bg-primary/5'
                                    : 'hover:border-muted-foreground/50'
                                }`}
                                onClick={() => toggleRecipient(email)}
                              >
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedRecipients.has(email)}
                                    onCheckedChange={() => toggleRecipient(email)}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{fullName}</p>
                                    <p className="text-sm text-muted-foreground truncate">{email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Last Contact: {formatDate(recipient.last_contact_date)}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {recipient.status}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Field Mapping Tab - Combined with Preview */}
        <TabsContent value="mapping" className="space-y-4">
          {/* Auto-save Status Header */}
          {templateKeys.length > 0 && (
            <div className="flex items-center justify-between">
              <CardDescription>
                Found {templateKeys.length} template variable{templateKeys.length !== 1 ? 's' : ''}
              </CardDescription>
              <div className="flex items-center gap-2">
                {/* Auto-save status indicator */}
                {autoSaveStatus === 'saving' && (
                  <Badge variant="outline" className="flex items-center gap-1.5 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Auto-saving...
                  </Badge>
                )}
                {autoSaveStatus === 'saved' && (
                  <Badge variant="outline" className="flex items-center gap-1.5 text-green-600 border-green-200 bg-green-50">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </Badge>
                )}
                {autoSaveStatus === 'idle' && campaignItem && (
                  <Badge variant="outline" className="flex items-center gap-1.5 text-muted-foreground">
                    <Save className="h-3 w-3" />
                    Auto-save enabled
                  </Badge>
                )}
              </div>
            </div>
          )}

          {loadingTemplateDetail ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent><Skeleton className="h-[500px] w-full" /></CardContent>
              </Card>
              <Card>
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent><Skeleton className="h-[500px] w-full" /></CardContent>
              </Card>
            </div>
          ) : templateKeys.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Link2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No template variables to map</p>
                  <p className="text-sm">Template variables use the format: {`{{variable_name}}`}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Field Mapping (Left Side) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Link2 className="h-5 w-5" />
                    Field Mapping
                  </CardTitle>
                  <CardDescription>
                    Map template variables to data fields. Use the search to find fields quickly.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="grid gap-4 pr-4">
                      {templateKeys.map((key) => {
                        const mappedFieldKey = fieldMappings[key];
                        const previewValue = mappedFieldKey ? getFieldValue(mappedFieldKey, validRecipients[0]) : '';
                        
                        return (
                          <div key={key} className="space-y-2 p-3 border rounded-lg bg-card">
                            {/* Template Variable */}
                            <div className="flex items-center justify-between">
                              <code className="text-sm text-primary bg-primary/10 px-2 py-1 rounded font-mono font-medium">
                                {`{{${key}}}`}
                              </code>
                              {previewValue && (
                                <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={previewValue}>
                                  → {previewValue.length > 20 ? previewValue.slice(0, 20) + '...' : previewValue}
                                </span>
                              )}
                            </div>
                            
                            {/* Field Picker */}
                            <FieldMappingPicker
                              templateKey={key}
                              value={fieldMappings[key] || ''}
                              groupedFields={groupedFields as Record<string, MappingField[]>}
                              onValueChange={(value) => updateFieldMapping(key, value)}
                              previewValue={previewValue}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Live HTML Preview (Right Side) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5" />
                    Live Preview
                  </CardTitle>
                  <CardDescription>
                    {validRecipients.length > 0 
                      ? `Preview for: ${validRecipients[0]._leads?.lead_payload?.first_name || ''} ${validRecipients[0]._leads?.lead_payload?.last_name || ''}`.trim() || 'First recipient'
                      : 'Sample data preview'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] border rounded-lg bg-background">
                    <div 
                      className="p-4"
                      dangerouslySetInnerHTML={{ 
                        __html: templateDetail?.HtmlBody 
                          ? templateKeys.reduce((html, key) => {
                              const fieldKey = fieldMappings[key];
                              const value = fieldKey ? getFieldValue(fieldKey, validRecipients[0]) : `{{${key}}}`;
                              return html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
                            }, templateDetail.HtmlBody)
                          : '<p class="text-muted-foreground">Select a template to preview</p>'
                      }}
                    />
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Text-Only Live Preview at Bottom */}
          {templateKeys.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  Field Mapping Preview (Text Only)
                </CardTitle>
                <CardDescription>
                  {validRecipients.length > 0 
                    ? `Using: ${validRecipients[0]._leads?.lead_payload?.first_name || ''} ${validRecipients[0]._leads?.lead_payload?.last_name || ''}`.trim()
                    : 'Sample values'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 max-h-[250px] overflow-y-auto">
                  {templateKeys.map((key) => {
                    const fieldKey = fieldMappings[key];
                    const value = fieldKey ? getFieldValue(fieldKey, validRecipients[0]) : '';
                    
                    return (
                      <div key={key} className="flex items-start gap-3 text-sm py-1 border-b border-border/50 last:border-0">
                        <code className="font-mono text-xs text-muted-foreground bg-background px-2 py-0.5 rounded shrink-0">
                          {`{{${key}}}`}
                        </code>
                        <span className="text-muted-foreground shrink-0">→</span>
                        <span className={`font-medium break-all ${!value ? 'text-muted-foreground italic' : ''}`}>
                          {value || '(not mapped)'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Sending Progress Indicator */}
      {sendingProgress && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Sending email {sendingProgress.current} of {sendingProgress.total}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((sendingProgress.current / sendingProgress.total) * 100)}%
                </span>
              </div>
              <Progress value={(sendingProgress.current / sendingProgress.total) * 100} className="h-2" />
              
              {sendingProgress.delayRemaining > 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span>
                    Waiting {Math.floor(sendingProgress.delayRemaining / 60)}:{(sendingProgress.delayRemaining % 60).toString().padStart(2, '0')} before next email...
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    Next: {sendingProgress.currentEmail}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending to {sendingProgress.currentEmail}...</span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Please keep this page open. Random delays (2-5 min) between emails help ensure delivery.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Send Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={handleSendEmails}
          disabled={!selectedTemplate || selectedRecipients.size === 0 || sending}
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedRecipients.size} Recipient{selectedRecipients.size !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
