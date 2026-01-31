import { adminAPI, SendTemplateEmailRequest, Item, RelatedItem, ItemImage } from './admin-api';

// Static text prefix for field mappings
export const STATIC_TEXT_PREFIX = '__static__:';

export interface BatchEmailRecipient {
  campaigns_id: string;
  email: string;
  template_model: Record<string, any>;
  last_contact_date?: string | number | null;
}

export interface EmailThrottleSettings {
  maxEmailsPerDay?: number;
  emailContactDaysFreq?: number;
  fromEmail?: string;
}

export interface BatchEmailOptions {
  template_id: number;
  tag?: string;
  metadata?: Record<string, any>;
  delayRange?: { min: number; max: number }; // Delay range in seconds (default: 15-60)
  throttleSettings?: EmailThrottleSettings;
  onProgress?: (progress: BatchEmailProgress) => void;
  onEmailSent?: (recipient: BatchEmailRecipient, success: boolean, skipped?: boolean, skipReason?: string, is429Error?: boolean) => void;
  shouldCancel?: () => boolean; // Callback to check if operation should be cancelled
  isPaused?: () => boolean; // Callback to check if operation is paused
}

export interface BatchEmailProgress {
  current: number;
  total: number;
  currentEmail: string;
  delayRemaining: number;
  status: 'preparing' | 'sending' | 'waiting' | 'complete' | 'cancelled' | 'paused';
}

export interface BatchEmailResult {
  success: number;
  failed: number;
  skipped: number;
  rateLimited: number;
  errors: Array<{ email: string; error: string; is429?: boolean; campaignsId?: string }>;
  skippedEmails: Array<{ email: string; reason: string }>;
}

// Lead recipient interface for field resolution
export interface EmailLeadRecipient {
  id: string | number;
  leads_id?: number;
  status?: string;
  last_contact_date?: string | number | null;
  _leads?: {
    lead_payload?: {
      email?: string;
      first_name?: string;
      last_name?: string;
      mobile_number?: string;
      property_address?: string;
      notes?: string;
    };
    email?: string;
  };
}

// Context for resolving field values
export interface FieldResolutionContext {
  campaignItem?: Item | null;
  relatedItems?: RelatedItem[];
  relatedItemDetails?: Map<number, Item>;
  relatedItemMedia?: Map<number, ItemImage[]>;
  linkedBookings?: LinkedBooking[];
  sharableLinks?: {
    copylink?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    whatsapp?: string;
    email?: string;
  };
}

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

// ==================== Helper Functions ====================

// Helper: Format ISO duration (e.g., "PT4H30M") to readable string
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
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (typeof value[0] === 'string') return value[0];
    return value.map(v => typeof v === 'object' ? v?.name || JSON.stringify(v) : String(v)).join(', ');
  }
  
  if (typeof value === 'object') {
    return value?.name || value?.url || JSON.stringify(value);
  }
  
  const strValue = String(value);
  
  if (isDurationValue(key, strValue)) {
    return formatDuration(strValue);
  }
  
  if (isDateTimeValue(key, strValue)) {
    return formatToEST(strValue);
  }
  
  return strValue;
};

// Helper: Resolve nested path from object (e.g., "item_info.offers[0].price")
const resolveNestedPath = (obj: any, path: string): any => {
  if (!obj || !path) return undefined;
  
  const parts = path.match(/[^.\[\]]+|\[\d+\]/g) || [];
  
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
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

/**
 * Get field value based on field key and context
 * This is the main field resolution function used by both EmailCampaignForm and Admin.tsx
 */
export function getFieldValue(
  fieldKey: string, 
  recipient: EmailLeadRecipient | undefined,
  context: FieldResolutionContext
): string {
  const { campaignItem, relatedItems = [], relatedItemDetails = new Map(), relatedItemMedia = new Map(), linkedBookings = [], sharableLinks } = context;

  // Handle static text values - return the text directly
  if (fieldKey.startsWith(STATIC_TEXT_PREFIX)) {
    return fieldKey.slice(STATIC_TEXT_PREFIX.length);
  }
  
  const firstName = recipient?._leads?.lead_payload?.first_name || '';
  const lastName = recipient?._leads?.lead_payload?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || 'Valued Member';

  // Lead fields
  switch (fieldKey) {
    case 'first_name':
      return firstName;
    case 'last_name':
      return lastName;
    case 'full_name':
      return fullName;
    case 'email':
      return recipient?._leads?.email || recipient?._leads?.lead_payload?.email || '';
    case 'mobile_number':
      return recipient?._leads?.lead_payload?.mobile_number || '';
    case 'property_address':
      return recipient?._leads?.lead_payload?.property_address || '';
    case 'notes':
      return recipient?._leads?.lead_payload?.notes || '';
    
    // Campaign item fields
    case 'campaign_title':
      return campaignItem?.title || '';
    case 'campaign_description':
      return campaignItem?.description || '';
    case 'campaign_price':
      return campaignItem?.price?.toString() || '';
    case 'campaign_sku':
      return campaignItem?.sku || '';
    case 'campaign_url':
      return sharableLinks?.copylink || '';
    case 'campaign_share_facebook':
      return sharableLinks?.facebook || '';
    case 'campaign_share_twitter':
      return sharableLinks?.twitter || '';
    case 'campaign_share_linkedin':
      return sharableLinks?.linkedin || '';
    case 'campaign_share_whatsapp':
      return sharableLinks?.whatsapp || '';
    case 'campaign_share_email':
      return sharableLinks?.email || '';
    case 'campaign_share_copy':
      return sharableLinks?.copylink || '';
    
    default:
      // Handle item_info dynamic fields with nested path support
      if (fieldKey.startsWith('item_info.') || fieldKey.startsWith('item_info_')) {
        let path = fieldKey.startsWith('item_info.') 
          ? fieldKey.replace('item_info.', '') 
          : fieldKey.replace('item_info_', '');
        
        if (!path.includes('.') && !path.includes('[')) {
          const value = campaignItem?.item_info?.[path];
          return processItemInfoValue(path, value);
        }
        
        const value = resolveNestedPath(campaignItem?.item_info, path);
        return processItemInfoValue(path, value);
      }
      
      // Handle related item fields
      if (fieldKey.startsWith('related_')) {
        const match = fieldKey.match(/^related_(\d+)_(.+)$/);
        if (match) {
          const index = parseInt(match[1], 10);
          const field = match[2];
          
          if (!isNaN(index) && index < relatedItems.length) {
            const relatedItem = relatedItems[index];
            const itemDetail = relatedItemDetails.get(relatedItem.related_items_id);
            
            if (itemDetail) {
              switch (field) {
                case 'title':
                  return itemDetail.title || '';
                case 'description':
                  return itemDetail.description || '';
                case 'price':
                  return itemDetail.price?.toString() || '';
                case 'sku':
                  return itemDetail.sku || '';
                case 'item_type':
                  return itemDetail.item_type || '';
                case 'url':
                  const itemType = itemDetail.item_type?.toLowerCase() || '';
                  let basePath = '';
                  if (itemType === 'event') basePath = '/event';
                  else if (itemType === 'classes') basePath = '/classes';
                  else if (itemType === 'product') basePath = '/shop';
                  else if (itemType === 'membership') basePath = '/memberships';
                  else basePath = '/items';
                  return `${typeof window !== 'undefined' ? window.location.origin : ''}${basePath}/${itemDetail.slug}`;
                default:
                  // Handle media image URLs
                  if (field.startsWith('media_')) {
                    const mediaIndex = parseInt(field.replace('media_', ''), 10);
                    const media = relatedItemMedia.get(relatedItem.related_items_id) || [];
                    const imageMedia = media.filter(m => m.image_type === 'Image' && m.display_image);
                    if (!isNaN(mediaIndex) && mediaIndex < imageMedia.length) {
                      return imageMedia[mediaIndex].display_image || '';
                    }
                  }
                  // Handle item_info fields with nested path support
                  if (field.startsWith('info.') || field.startsWith('info_')) {
                    const infoPath = field.startsWith('info.') 
                      ? field.replace('info.', '') 
                      : field.replace('info_', '');
                    
                    if (!infoPath.includes('.') && !infoPath.includes('[')) {
                      const value = itemDetail.item_info?.[infoPath];
                      return processItemInfoValue(infoPath, value);
                    }
                    
                    const value = resolveNestedPath(itemDetail.item_info, infoPath);
                    return processItemInfoValue(infoPath, value);
                  }
              }
            }
          }
        }
      }
      
      // Handle linked booking fields (booking_0_slug, booking_0_total_amount, etc.)
      if (fieldKey.startsWith('booking_')) {
        const bookingMatch = fieldKey.match(/^booking_(\d+)_(.+)$/);
        if (bookingMatch) {
          const bookingIndex = parseInt(bookingMatch[1], 10);
          const bookingField = bookingMatch[2];
          
          if (!isNaN(bookingIndex) && bookingIndex < linkedBookings.length) {
            const booking = linkedBookings[bookingIndex];
            
            // Core booking fields
            switch (bookingField) {
              case 'slug':
                return booking.booking_slug || '';
              case 'status':
                return booking.status || '';
              case 'total_amount':
                return booking.total_amount?.toString() || '0';
              case 'payment_status':
                return booking.payment_status || 'Pending';
              case 'checkout_type':
                return booking.checkout_type || 'Cash/Check';
              case 'booking_type':
                return booking.booking_type || '';
              case 'quantity':
                return booking.quantity?.toString() || '1';
              case 'created_at':
                if (booking.created_at) {
                  const date = new Date(typeof booking.created_at === 'number' ? booking.created_at * 1000 : booking.created_at);
                  return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                }
                return '';
              case 'lead_email':
                return booking._leads?.email || '';
              case 'lead_name':
                return booking._leads?.name || '';
              case 'item_title':
                return booking._items?.title || '';
              case 'item_slug':
                return booking._items?.slug || '';
              case 'item_type':
                return booking._items?.item_type || '';
            }
            
            // Handle nested lead payload fields (booking_0_lead.first_name)
            if (bookingField.startsWith('lead.') || bookingField.startsWith('lead_')) {
              const leadPath = bookingField.startsWith('lead.') 
                ? bookingField.replace('lead.', '') 
                : bookingField.replace('lead_', '');
              
              if (booking._leads?.lead_payload) {
                if (!leadPath.includes('.') && !leadPath.includes('[')) {
                  const value = booking._leads.lead_payload[leadPath];
                  return processItemInfoValue(leadPath, value);
                }
                const value = resolveNestedPath(booking._leads.lead_payload, leadPath);
                return processItemInfoValue(leadPath, value);
              }
            }
            
            // Handle item_info fields from linked item (booking_0_item_info.field)
            if (bookingField.startsWith('item_info.') || bookingField.startsWith('item_info_')) {
              const itemInfoPath = bookingField.startsWith('item_info.') 
                ? bookingField.replace('item_info.', '') 
                : bookingField.replace('item_info_', '');
              
              if (booking._items?.item_info) {
                if (!itemInfoPath.includes('.') && !itemInfoPath.includes('[')) {
                  const value = booking._items.item_info[itemInfoPath];
                  return processItemInfoValue(itemInfoPath, value);
                }
                const value = resolveNestedPath(booking._items.item_info, itemInfoPath);
                return processItemInfoValue(itemInfoPath, value);
              }
            }
            
            // Handle booking_info fields (booking_0_info.field_name)
            if (bookingField.startsWith('info.') || bookingField.startsWith('info_')) {
              const infoPath = bookingField.startsWith('info.') 
                ? bookingField.replace('info.', '') 
                : bookingField.replace('info_', '');
              
              if (booking.booking_info) {
                if (!infoPath.includes('.') && !infoPath.includes('[')) {
                  const value = booking.booking_info[infoPath];
                  return processItemInfoValue(infoPath, value);
                }
                const value = resolveNestedPath(booking.booking_info, infoPath);
                return processItemInfoValue(infoPath, value);
              }
            }
            
            // Handle booking items fields (booking_0_items_0_price, booking_0_items_0_info.field)
            const itemsMatch = bookingField.match(/^items_(\d+)_(.+)$/);
            if (itemsMatch) {
              const itemIndex = parseInt(itemsMatch[1], 10);
              const itemField = itemsMatch[2];
              
              const bookingItems = booking._booking_items?.items || [];
              if (!isNaN(itemIndex) && itemIndex < bookingItems.length) {
                const bookingItem = bookingItems[itemIndex];
                
                switch (itemField) {
                  case 'price':
                    return bookingItem.price?.toString() || '0';
                  case 'quantity':
                    return bookingItem.quantity?.toString() || '1';
                  case 'item_type':
                    return bookingItem.item_type || '';
                  case 'title':
                    return bookingItem._items?.title || '';
                }
                
                // Handle booking_items_info fields
                if (itemField.startsWith('info.') || itemField.startsWith('info_')) {
                  const nestedPath = itemField.startsWith('info.') 
                    ? itemField.replace('info.', '') 
                    : itemField.replace('info_', '');
                  
                  if (bookingItem.booking_items_info) {
                    if (!nestedPath.includes('.') && !nestedPath.includes('[')) {
                      const value = bookingItem.booking_items_info[nestedPath];
                      return processItemInfoValue(nestedPath, value);
                    }
                    const value = resolveNestedPath(bookingItem.booking_items_info, nestedPath);
                    return processItemInfoValue(nestedPath, value);
                  }
                }
              }
            }
          }
        }
      }
      
      return '';
  }
}

/**
 * Build template model from email_template_mappings
 * This is the main function to build the template model for sending emails
 */
export function buildTemplateModelFromMappings(
  templateMappings: Record<string, string> | undefined,
  recipient: EmailLeadRecipient,
  context: FieldResolutionContext,
  customMessage?: string
): Record<string, any> {
  const model: Record<string, any> = {};
  
  if (templateMappings) {
    Object.entries(templateMappings).forEach(([templateKey, fieldKey]) => {
      if (fieldKey && typeof fieldKey === 'string') {
        model[templateKey] = getFieldValue(fieldKey, recipient, context);
      }
    });
  }

  // Add custom message if provided
  if (customMessage) {
    model.custom_message = customMessage;
  }

  // Add backwards compatibility for 'name' key
  if (!model.name) {
    const firstName = recipient._leads?.lead_payload?.first_name || '';
    const lastName = recipient._leads?.lead_payload?.last_name || '';
    model.name = `${firstName} ${lastName}`.trim() || 'Valued Member';
  }

  return model;
}

/**
 * Check if a lead was contacted too recently based on throttle settings
 */
export function shouldSkipDueToContactFrequency(
  lastContactDate: string | number | null | undefined,
  emailContactDaysFreq: number | undefined
): { skip: boolean; reason?: string } {
  if (!emailContactDaysFreq || emailContactDaysFreq <= 0) {
    return { skip: false };
  }

  if (!lastContactDate) {
    return { skip: false };
  }

  const lastContact = typeof lastContactDate === 'number' 
    ? new Date(lastContactDate * 1000) 
    : new Date(lastContactDate);
  
  if (isNaN(lastContact.getTime())) {
    return { skip: false };
  }

  const now = new Date();
  const daysSinceContact = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceContact < emailContactDaysFreq) {
    return { 
      skip: true, 
      reason: `Contacted ${daysSinceContact} day${daysSinceContact !== 1 ? 's' : ''} ago (minimum: ${emailContactDaysFreq} days)` 
    };
  }

  return { skip: false };
}

/**
 * Batch send emails to multiple recipients with configurable delays
 * 
 * @param clerkUserId - The Clerk user ID for authentication
 * @param recipients - Array of recipients with their campaign IDs and template models
 * @param options - Configuration options including template ID, delays, and callbacks
 * @returns BatchEmailResult with success/failure counts and error details
 */
export async function batchSendEmails(
  clerkUserId: string,
  recipients: BatchEmailRecipient[],
  options: BatchEmailOptions
): Promise<BatchEmailResult> {
  const {
    template_id,
    tag = '',
    metadata = {},
    delayRange = { min: 15, max: 60 }, // Default: 15-60 seconds
    throttleSettings,
    onProgress,
    onEmailSent,
    shouldCancel,
    isPaused,
  } = options;

  const result: BatchEmailResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    rateLimited: 0,
    errors: [],
    skippedEmails: [],
  };

  // Get random delay between min and max (inclusive)
  const getRandomDelay = () => 
    Math.floor(Math.random() * (delayRange.max - delayRange.min + 1)) + delayRange.min;

  // Wait for pause to be released
  const waitForUnpause = async (currentEmail: string, current: number, total: number): Promise<boolean> => {
    while (isPaused?.()) {
      // Check for cancellation while paused
      if (shouldCancel?.()) {
        return false;
      }
      onProgress?.({
        current,
        total,
        currentEmail,
        delayRemaining: 0,
        status: 'paused',
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return true;
  };

  const waitWithCountdown = async (
    seconds: number,
    currentEmail: string,
    current: number,
    total: number
  ): Promise<boolean> => {
    for (let remaining = seconds; remaining > 0; remaining--) {
      // Check for cancellation during wait
      if (shouldCancel?.()) {
        return false;
      }
      // Check for pause during wait
      if (isPaused?.()) {
        const shouldContinue = await waitForUnpause(currentEmail, current, total);
        if (!shouldContinue) return false;
      }
      onProgress?.({
        current,
        total,
        currentEmail,
        delayRemaining: remaining,
        status: 'waiting',
      });
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return true;
  };

  for (let i = 0; i < recipients.length; i++) {
    // Check for pause before processing
    if (isPaused?.()) {
      const shouldContinue = await waitForUnpause(recipients[i]?.email || '', i + 1, recipients.length);
      if (!shouldContinue) {
        onProgress?.({
          current: i,
          total: recipients.length,
          currentEmail: '',
          delayRemaining: 0,
          status: 'cancelled',
        });
        break;
      }
    }

    // Check for cancellation
    if (shouldCancel?.()) {
      onProgress?.({
        current: i,
        total: recipients.length,
        currentEmail: '',
        delayRemaining: 0,
        status: 'cancelled',
      });
      break;
    }

    const recipient = recipients[i];

    // Check if we should skip due to contact frequency
    const skipCheck = shouldSkipDueToContactFrequency(
      recipient.last_contact_date,
      throttleSettings?.emailContactDaysFreq
    );

    if (skipCheck.skip) {
      result.skipped++;
      result.skippedEmails.push({ email: recipient.email, reason: skipCheck.reason || 'Too recent' });
      onEmailSent?.(recipient, false, true, skipCheck.reason);
      continue;
    }

    // Update progress before sending
    onProgress?.({
      current: i + 1,
      total: recipients.length,
      currentEmail: recipient.email,
      delayRemaining: 0,
      status: 'sending',
    });

    try {
      const emailRequest: SendTemplateEmailRequest = {
        campaigns_id: recipient.campaigns_id,
        template_id,
        to: recipient.email,
        template_model: recipient.template_model,
        tag,
        metadata,
      };

      await adminAPI.sendTemplateEmail(clerkUserId, emailRequest);
      result.success++;
      onEmailSent?.(recipient, true);

      // Add random delay before next email if there are more recipients
      if (i < recipients.length - 1) {
        const delaySeconds = getRandomDelay();
        const nextRecipient = recipients[i + 1];
        const shouldContinue = await waitWithCountdown(
          delaySeconds,
          nextRecipient.email,
          i + 2,
          recipients.length
        );
        if (!shouldContinue) {
          onProgress?.({
            current: i + 1,
            total: recipients.length,
            currentEmail: '',
            delayRemaining: 0,
            status: 'cancelled',
          });
          break;
        }
      }
    } catch (error: any) {
      console.error(`Failed to send email to ${recipient.email}:`, error);
      
      // Check for 429 rate limit error
      const is429Error = error?.code === 'TOO_MANY_REQUESTS' || error?.message?.includes('Too many requests');
      
      if (is429Error) {
        result.rateLimited++;
      } else {
        result.failed++;
      }
      
      result.errors.push({
        email: recipient.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        is429: is429Error,
        campaignsId: recipient.campaigns_id,
      });
      onEmailSent?.(recipient, false, false, undefined, is429Error);
    }
  }

  // Clear progress at the end
  onProgress?.({
    current: recipients.length,
    total: recipients.length,
    currentEmail: '',
    delayRemaining: 0,
    status: shouldCancel?.() ? 'cancelled' : 'complete',
  });

  return result;
}

/**
 * Send a single template email (convenience wrapper)
 */
export async function sendSingleEmail(
  clerkUserId: string,
  recipient: BatchEmailRecipient,
  options: Omit<BatchEmailOptions, 'delayBetweenEmails' | 'onProgress' | 'onEmailSent'>
): Promise<boolean> {
  try {
    await adminAPI.sendTemplateEmail(clerkUserId, {
      campaigns_id: recipient.campaigns_id,
      template_id: options.template_id,
      to: recipient.email,
      template_model: recipient.template_model,
      tag: options.tag || '',
      metadata: options.metadata || {},
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${recipient.email}:`, error);
    return false;
  }
}
