import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Receipt, 
  Download, 
  Printer, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Building2,
  User,
  Mail,
  FileText,
  AlertCircle
} from "lucide-react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import clubLogo from "@/assets/club-logo-new.png";
import { adminAPI } from "@/lib/admin-api";
import { elegantAPI } from "@/lib/elegant-api";

// Company branding configuration
const COMPANY_BRANDING = {
  name: "Tampa Bay Mineral & Science Club",
  logo: clubLogo,
  tagline: "Promoting the study and appreciation of Earth Sciences",
};

// Booking payment from _booking_payments array
interface BookingPayment {
  id?: number;
  paid_amount?: number; // In dollars (not cents)
  payment_status?: string;
  payment_method?: string;
}

// Stripe payment response interface
interface StripePaymentResponse {
  id?: number;
  created_at?: number;
  shops_id?: string;
  bookings_id?: number;
  payment_id?: string;
  paid_amount?: number; // In cents
  payment_status?: string;
  payment_response?: {
    id?: string;
    amount_total?: number;
    currency?: string;
    payment_status?: string;
    payment_method_types?: string[];
    status?: string;
    customer_email?: string;
    customer_details?: {
      email?: string;
      name?: string;
    };
    created?: number;
    metadata?: Record<string, unknown>;
  };
}

// Item details response interface
interface ItemDetailsResponse {
  id: number;
  title?: string;
  name?: string;
  slug?: string;
}

interface BookingItem {
  id?: number;
  items_id?: number; // Reference to the item
  items_slug?: string; // Slug for member portal lookup
  title?: string;
  name?: string; // Alternative field name for title
  price?: number | string;
  quantity?: number | string;
  unit?: string;
  subtotal?: number;
  _items?: {
    title?: string;
    slug?: string;
  };
}

interface PaymentInfo {
  basePrice?: number;
  total?: number;
  amountDue?: number;
  amountPaid?: number;
  balanceRemaining?: number;
  items?: Array<{
    id?: string;
    items_id?: number;
    items_slug?: string;
    label: string;
    unitPrice?: number;
    quantity?: number;
    unit?: string;
    subtotal: number;
  }>;
  partialPayment?: {
    enabled?: boolean;
    type?: string;
    value?: number;
  };
  // Stripe payment info
  stripePayment?: {
    amountTotal: number;
    currency: string;
    paymentStatus: string;
    paymentMethodTypes: string[];
    transactionId: string;
    created?: Date;
  };
}

interface ApplicationData {
  id: number;
  created_at: string | number;
  status: string;
  checkout_type?: string;
  payment_status?: string | Record<string, unknown>;
  total_amount?: number;
  booking_slug?: string;
  booking_type?: string;
  booking_info?: Record<string, unknown>;
  _leads?: {
    name?: string;
    email?: string;
  };
  _items?: {
    title?: string;
    slug?: string;
  };
  _customers?: {
    Full_name?: string;
    email?: string;
  };
  _booking_items_info?: Record<string, unknown>;
  // Can be either an array of BookingItem directly OR an object with items property
  _booking_items_of_bookings?: BookingItem[] | { items?: BookingItem[] };
  // Admin endpoint uses _booking_items
  _booking_items?: BookingItem[] | { items?: BookingItem[] };
  // New: _booking_payments array with payment info
  _booking_payments?: BookingPayment[];
  payment_id?: string | number; // If present, fetch Stripe payment details
}

interface PaymentReceiptViewProps {
  application: ApplicationData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  isAdmin?: boolean; // If true, fetch from admin endpoint
  clerkUserId?: string; // Required for admin API calls
}

// Helper to safely format dates
const formatDateSafe = (value: string | number | Date | null | undefined): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'MMMM d, yyyy');
  } catch {
    return 'N/A';
  }
};

const formatDateTimeSafe = (value: string | number | Date | null | undefined): string => {
  if (!value) return 'N/A';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'N/A';
    return format(date, 'MMMM d, yyyy h:mm a');
  } catch {
    return 'N/A';
  }
};

// Extract payment status from various formats
const extractPaymentStatus = (val: unknown): string => {
  if (typeof val === 'string' && val) return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.status === 'string') return obj.status;
    if (typeof obj.payment_status === 'string') return obj.payment_status;
    if (typeof obj.state === 'string') return obj.state;
  }
  return 'Pending';
};

// Extract pricing breakdown from booking_info and _booking_items/_booking_items_of_bookings
const extractPaymentInfo = (application: ApplicationData): PaymentInfo => {
  const bookingInfo = application.booking_info || {};
  const bookingItemsInfo = application._booking_items_info || {};
  const bookingItemsOfBookings = application._booking_items_of_bookings;
  const bookingItemsAdmin = application._booking_items; // Admin endpoint uses this
  const merged = { ...bookingInfo, ...bookingItemsInfo };
  
  // Extract line items - check multiple possible sources
  // Priority: _booking_items (admin), _booking_items_of_bookings (member portal)
  const items: PaymentInfo['items'] = [];
  let calculatedTotal = 0;
  
  // Helper to get items array from various possible formats
  const getItemsArray = (source: BookingItem[] | { items?: BookingItem[] } | undefined): BookingItem[] | null => {
    if (!source) return null;
    if (Array.isArray(source)) return source;
    if (source.items && Array.isArray(source.items)) return source.items;
    return null;
  };
  
  // Try admin source first, then member portal source
  const bookingItems = getItemsArray(bookingItemsAdmin) || getItemsArray(bookingItemsOfBookings);
  
  if (bookingItems && bookingItems.length > 0) {
    for (const item of bookingItems) {
      const price = typeof item.price === 'number' ? item.price : (parseFloat(String(item.price)) || 0);
      const quantity = typeof item.quantity === 'number' ? item.quantity : (parseInt(String(item.quantity)) || 1);
      const subtotal = price * quantity;
      calculatedTotal += subtotal;
      
      // Try to get title from nested _items first, then from item itself
      const itemTitle = item._items?.title || item.title || item.name || 'Item';
      
      items.push({
        id: item.id?.toString(),
        items_id: item.items_id || item.id,
        items_slug: item.items_slug || item._items?.slug,
        label: itemTitle,
        unitPrice: price,
        quantity: quantity,
        unit: item.unit || 'each',
        subtotal: subtotal
      });
    }
  }
  
  // Fallback: Try to extract from booking_info if no items found
  if (items.length === 0) {
    if (Array.isArray(merged.items)) {
      for (const item of merged.items as BookingItem[]) {
        const price = typeof item.price === 'number' ? item.price : 0;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
        const subtotal = item.subtotal || (price * quantity);
        calculatedTotal += subtotal;
        items.push({
          id: item.id?.toString(),
          items_id: item.items_id || item.id,
          items_slug: item.items_slug,
          label: item.title || 'Item',
          unitPrice: price,
          quantity: quantity,
          unit: item.unit || 'each',
          subtotal: subtotal
        });
      }
    } else if (Array.isArray(merged.lineItems)) {
      items.push(...(merged.lineItems as PaymentInfo['items'] || []));
    } else if (Array.isArray(merged.line_items)) {
      items.push(...(merged.line_items as PaymentInfo['items'] || []));
    }
  }
  
  // Use calculated total from items, or fallback to stored values
  const total = calculatedTotal > 0 ? calculatedTotal : 
    (application.total_amount || 
    (typeof merged.total === 'number' ? merged.total : 0) ||
    (typeof merged.total_amount === 'number' ? merged.total_amount : 0));
    
  const amountPaid = typeof merged.amountPaid === 'number' ? merged.amountPaid : 
    (typeof merged.amount_paid === 'number' ? merged.amount_paid : 0);
    
  const amountDue = typeof merged.amountDue === 'number' ? merged.amountDue : 
    (typeof merged.amount_due === 'number' ? merged.amount_due : total);
    
  const balanceRemaining = typeof merged.balanceRemaining === 'number' ? merged.balanceRemaining :
    (typeof merged.balance_remaining === 'number' ? merged.balance_remaining : 
    (amountPaid > 0 ? total - amountPaid : 0));
    
  const basePrice = typeof merged.basePrice === 'number' ? merged.basePrice :
    (typeof merged.base_price === 'number' ? merged.base_price : 0);
  
  // Extract partial payment config
  const partialPayment = merged.partialPayment as PaymentInfo['partialPayment'] || 
    merged.partial_payment as PaymentInfo['partialPayment'];
  
  return {
    basePrice,
    total,
    amountDue,
    amountPaid,
    balanceRemaining,
    items,
    partialPayment
  };
};

export function PaymentReceiptView({ 
  application, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  trigger,
  isAdmin = false,
  clerkUserId
}: PaymentReceiptViewProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [stripePayment, setStripePayment] = useState<StripePaymentResponse | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [enrichedItems, setEnrichedItems] = useState<PaymentInfo['items']>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const onOpenChange = controlledOnOpenChange || setInternalOpen;
  
  const paymentInfo = extractPaymentInfo(application);
  
  // Fetch item details to get proper titles
  const fetchItemDetails = useCallback(async () => {
    if (!open || !paymentInfo.items || paymentInfo.items.length === 0) {
      setEnrichedItems(paymentInfo.items || []);
      return;
    }
    
    // Check if items already have proper titles (not just "Item")
    const needsEnrichment = paymentInfo.items.some(item => 
      item.label === 'Item' && (item.items_id || item.items_slug)
    );
    
    if (!needsEnrichment) {
      setEnrichedItems(paymentInfo.items);
      return;
    }
    
    setItemsLoading(true);
    
    try {
      const enrichedItemPromises = paymentInfo.items.map(async (item) => {
        // Only fetch if label is generic "Item" and we have an ID or slug
        if (item.label !== 'Item') {
          return item;
        }
        
        try {
          let title = item.label;
          
          if (isAdmin && item.items_id && clerkUserId) {
            // Admin: GET /items/{items_id}
            const itemDetails = await adminAPI.get<ItemDetailsResponse>(
              `/items/${item.items_id}`,
              clerkUserId
            );
            title = itemDetails.title || itemDetails.name || item.label;
          } else if (!isAdmin && item.items_slug) {
            // Member portal: GET /items_details/{slug}
            const itemDetails = await elegantAPI.getItemDetails(item.items_slug);
            title = itemDetails.title || item.label;
          } else if (!isAdmin && item.items_id) {
            // Member portal fallback: GET /items_details/{id}
            const itemDetails = await elegantAPI.getItemDetailsById(item.items_id);
            title = itemDetails.title || item.label;
          }
          
          return { ...item, label: title };
        } catch (error) {
          console.error(`Failed to fetch item details for ${item.items_id || item.items_slug}:`, error);
          return item;
        }
      });
      
      const results = await Promise.all(enrichedItemPromises);
      setEnrichedItems(results);
    } catch (error) {
      console.error('Failed to enrich item details:', error);
      setEnrichedItems(paymentInfo.items);
    } finally {
      setItemsLoading(false);
    }
  }, [open, paymentInfo.items, isAdmin, clerkUserId]);
  
  // Fetch Stripe payment details when dialog opens (admin and member portal)
  useEffect(() => {
    const fetchStripePayment = async () => {
      if (!open || !application.booking_slug) {
        return;
      }
      
      // Admin requires clerkUserId
      if (isAdmin && !clerkUserId) {
        return;
      }
      
      setStripeLoading(true);
      setStripeError(null);
      
      try {
        let response: StripePaymentResponse;
        
        if (isAdmin && clerkUserId) {
          // Admin: GET /applications/payments/{booking_slug}
          response = await adminAPI.get<StripePaymentResponse>(
            `/applications/payments/${application.booking_slug}`,
            clerkUserId
          );
        } else {
          // Member Portal: GET /application/payments/{booking_slug} (no 's')
          response = await elegantAPI.get<StripePaymentResponse>(
            `/application/payments/${application.booking_slug}`
          );
        }
        
        setStripePayment(response);
      } catch (error: any) {
        console.error('Failed to fetch Stripe payment:', error);
        setStripeError('Failed to load payment details');
      } finally {
        setStripeLoading(false);
      }
    };
    
    fetchStripePayment();
  }, [open, isAdmin, application.booking_slug, clerkUserId]);
  
  // Fetch item details when dialog opens
  useEffect(() => {
    fetchItemDetails();
  }, [fetchItemDetails]);
  
  const total = paymentInfo.total || application.total_amount || 0;
  
  // Extract payment info from _booking_payments array if available
  const bookingPayments = application._booking_payments || [];
  const primaryBookingPayment = bookingPayments.length > 0 ? bookingPayments[0] : null;
  
  // Calculate total paid from all booking payments
  const totalFromBookingPayments = bookingPayments.reduce(
    (sum, payment) => sum + (payment.paid_amount || 0), 
    0
  );
  
  // Override payment info with _booking_payments data first, then Stripe data as fallback
  // _booking_payments.paid_amount is in dollars, stripePayment.paid_amount is in cents
  const actualAmountPaid = totalFromBookingPayments > 0 
    ? totalFromBookingPayments
    : stripePayment 
      ? (stripePayment.paid_amount || 0) / 100 // Convert from cents
      : (paymentInfo.amountPaid || 0);
  
  // Calculate balance owed (grand total - actual payment)
  const balanceOwed = total - actualAmountPaid;
  
  // Get payment status from _booking_payments first, then Stripe, then application
  const actualPaymentStatus = primaryBookingPayment?.payment_status 
    || stripePayment?.payment_status 
    || extractPaymentStatus(application.payment_status);
  
  // Get payment method from _booking_payments first, then Stripe
  const bookingPaymentMethod = primaryBookingPayment?.payment_method;
  const actualPaymentMethods = stripePayment?.payment_response?.payment_method_types || [];
  const checkoutType = bookingPaymentMethod 
    || (actualPaymentMethods.length > 0 
      ? actualPaymentMethods.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')
      : (application.checkout_type || 'Cash/Check'));
  
  const customerName = application._customers?.Full_name || 
    application._leads?.name || 
    (application.booking_info?.name as string) ||
    (application.booking_info?.full_name as string) ||
    (application.booking_info?.Full_name as string) ||
    'Customer';
    
  const customerEmail = application._customers?.email ||
    application._leads?.email ||
    (application.booking_info?.email as string) ||
    '';
    
  const applicationTitle = application._items?.title || 
    application.booking_type?.replace(/_/g, ' ') || 
    'Application';

  const getPaymentStatusIcon = () => {
    const status = actualPaymentStatus.toLowerCase();
    if (status === 'paid' || status === 'complete' || status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (status === 'failed' || status === 'declined' || status === 'refunded') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    return <Clock className="h-5 w-5 text-amber-600" />;
  };

  const getPaymentStatusColor = () => {
    const status = actualPaymentStatus.toLowerCase();
    if (status === 'paid' || status === 'complete' || status === 'completed') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (status === 'failed' || status === 'declined' || status === 'refunded') {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 15;
    
    // Try to add logo
    try {
      // Load image as base64
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = COMPANY_BRANDING.logo;
      });
      
      // Create canvas to get base64
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const logoBase64 = canvas.toDataURL('image/png');
        
        // Add logo (centered, 30mm width)
        const logoWidth = 30;
        const logoHeight = (img.height / img.width) * logoWidth;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
        y += logoHeight + 5;
      }
    } catch (error) {
      // If logo fails, just continue without it
      console.warn('Could not add logo to PDF:', error);
    }
    
    // Company name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text(COMPANY_BRANDING.name, pageWidth / 2, y, { align: 'center' });
    y += 6;
    
    // Tagline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(COMPANY_BRANDING.tagline, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Receipt number
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Receipt #: ${application.booking_slug?.toUpperCase() || application.id}`, pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text(`Date: ${formatDateTimeSafe(application.created_at)}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    // Customer Info Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('Bill To:', margin, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(customerName, margin, y);
    y += 6;
    if (customerEmail) {
      doc.setTextColor(100, 100, 100);
      doc.text(customerEmail, margin, y);
      y += 6;
    }
    y += 8;
    
    // Application Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('Description:', margin, y);
    y += 7;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(applicationTitle, margin, y);
    y += 10;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    // Payment Details Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text('Payment Details', margin, y);
    y += 10;
    
    // Table header with columns: Item, Price, Qty, Subtotal
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const col1 = margin + 2;
    const col2 = margin + 85;
    const col3 = margin + 115;
    const col4 = pageWidth - margin - 2;
    doc.text('Item', col1, y);
    doc.text('Price', col2, y);
    doc.text('Qty', col3, y);
    doc.text('Subtotal', col4, y, { align: 'right' });
    y += 10;
    
    doc.setFont('helvetica', 'normal');
    
    // Line items with full breakdown (use enriched items with proper titles)
    const itemsToRender = enrichedItems.length > 0 ? enrichedItems : paymentInfo.items;
    if (itemsToRender && itemsToRender.length > 0) {
      for (const item of itemsToRender) {
        const label = item.label || 'Item';
        const price = item.unitPrice || 0;
        const qty = item.quantity || 1;
        const unit = item.unit || '';
        const subtotal = item.subtotal || 0;
        
        doc.text(label.substring(0, 40), col1, y); // Truncate long labels
        doc.text(`$${price.toFixed(2)}`, col2, y);
        doc.text(`${qty} ${unit}`.trim(), col3, y);
        doc.text(`$${subtotal.toFixed(2)}`, col4, y, { align: 'right' });
        y += 7;
      }
    }
    
    // Base price (if no items but has base price)
    if (paymentInfo.basePrice && paymentInfo.basePrice > 0 && (!itemsToRender || itemsToRender.length === 0)) {
      doc.text('Base Fee', col1, y);
      doc.text(`$${paymentInfo.basePrice.toFixed(2)}`, col4, y, { align: 'right' });
      y += 7;
    }
    
    // If no breakdown, just show total as single line
    if (!paymentInfo.basePrice && (!itemsToRender || itemsToRender.length === 0)) {
      doc.text(applicationTitle.substring(0, 50), col1, y);
      doc.text(`$${(paymentInfo.total || application.total_amount || 0).toFixed(2)}`, col4, y, { align: 'right' });
      y += 7;
    }
    
    y += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    
    // Grand Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(33, 33, 33);
    const total = paymentInfo.total || application.total_amount || 0;
    doc.text('Grand Total:', margin + 2, y);
    doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 2, y, { align: 'right' });
    y += 10;
    
    // Partial payment info
    if (paymentInfo.partialPayment?.enabled) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const partialText = paymentInfo.partialPayment.type === 'percentage' 
        ? `Partial Payment: ${paymentInfo.partialPayment.value}% deposit`
        : `Partial Payment: $${paymentInfo.partialPayment.value?.toFixed(2)} deposit`;
      doc.text(partialText, margin + 2, y);
      y += 8;
    }
    
    // Amount Paid (use _booking_payments data first, then Stripe data)
    if (actualAmountPaid && actualAmountPaid > 0) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 10, 2, 2, 'F');
      doc.setTextColor(22, 101, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const paymentLabel = primaryBookingPayment ? 'Payment Received:' : (stripePayment ? 'Payment Received:' : 'Amount Paid:');
      doc.text(paymentLabel, margin + 2, y + 2);
      doc.text(`$${actualAmountPaid.toFixed(2)}`, pageWidth - margin - 2, y + 2, { align: 'right' });
      y += 14;
      
      // Add verification note based on source
      if (primaryBookingPayment || stripePayment) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(22, 101, 52);
        doc.text('✓ Verified Payment', margin + 2, y - 2);
        y += 6;
      }
    }
    
    // Balance Owed (Grand Total - Actual Payment) - only show if > 0
    if (balanceOwed > 0 && actualAmountPaid > 0) {
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 10, 2, 2, 'F');
      doc.setTextColor(161, 98, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Balance Owed:', margin + 2, y + 2);
      doc.text(`$${balanceOwed.toFixed(2)}`, pageWidth - margin - 2, y + 2, { align: 'right' });
      y += 14;
    }
    
    y += 5;
    
    // Payment Status Box
    const statusBoxY = y;
    const statusHeight = 20;
    const statusLower = actualPaymentStatus.toLowerCase();
    
    if (statusLower === 'paid' || statusLower === 'complete' || statusLower === 'completed') {
      doc.setFillColor(220, 252, 231);
      doc.setTextColor(22, 101, 52);
    } else if (statusLower === 'failed' || statusLower === 'declined') {
      doc.setFillColor(254, 226, 226);
      doc.setTextColor(153, 27, 27);
    } else {
      doc.setFillColor(254, 243, 199);
      doc.setTextColor(161, 98, 7);
    }
    
    doc.roundedRect(margin, statusBoxY, pageWidth - margin * 2, statusHeight, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Payment Status: ${actualPaymentStatus.toUpperCase()}`, pageWidth / 2, statusBoxY + 12, { align: 'center' });
    y += statusHeight + 10;
    
    // Payment method
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${checkoutType}`, pageWidth / 2, y, { align: 'center' });
    y += 15;
    
    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, pageWidth / 2, y, { align: 'center' });
    
    // Save PDF
    const filename = `receipt-${application.booking_slug || application.id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
  };

  // total already calculated above

  const receiptContent = (
    <div className="space-y-6 print:space-y-4">
      {/* Receipt Header with Branding */}
      <div className="text-center border-b pb-6 print:pb-4">
        {/* Company Logo */}
        <div className="flex justify-center mb-3">
          <img 
            src={COMPANY_BRANDING.logo} 
            alt={COMPANY_BRANDING.name} 
            className="h-16 w-auto object-contain print:h-12"
          />
        </div>
        {/* Company Name */}
        <h1 className="text-lg font-bold text-foreground mb-1 print:text-base">
          {COMPANY_BRANDING.name}
        </h1>
        <p className="text-xs text-muted-foreground mb-4 print:mb-2">
          {COMPANY_BRANDING.tagline}
        </p>
        
        {/* Receipt Title */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Receipt className="h-6 w-6 text-primary print:text-black" />
          <h2 className="text-xl font-bold print:text-lg">Payment Receipt</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Receipt #: <span className="font-mono font-medium">{application.booking_slug?.toUpperCase() || application.id}</span>
        </p>
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
          <Calendar className="h-3 w-3" />
          {formatDateTimeSafe(application.created_at)}
        </p>
      </div>

      {/* Customer & Application Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        <Card className="print:shadow-none print:border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{customerName}</p>
            {customerEmail && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <Mail className="h-3 w-3" />
                {customerEmail}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-medium">{applicationTitle}</p>
            <p className="text-muted-foreground capitalize mt-1">
              Status: {application.status}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details */}
      <Card className="print:shadow-none print:border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Loading state for item details */}
          {itemsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          
          {/* Items Table Header */}
          {!itemsLoading && (enrichedItems.length > 0 || (paymentInfo.items && paymentInfo.items.length > 0)) && (
            <>
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                <div className="col-span-5">Item</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3 text-right">Subtotal</div>
              </div>
              
              {/* Line Items (use enriched items with proper titles) */}
              {(enrichedItems.length > 0 ? enrichedItems : paymentInfo.items || []).map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                  <div className="col-span-5">
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="col-span-2 text-right text-muted-foreground">
                    ${(item.unitPrice || 0).toFixed(2)}
                  </div>
                  <div className="col-span-2 text-center text-muted-foreground">
                    {item.quantity || 1} {item.unit || ''}
                  </div>
                  <div className="col-span-3 text-right font-medium">
                    ${(item.subtotal || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Base Price (if no items but has base price) */}
          {!itemsLoading && paymentInfo.basePrice !== undefined && paymentInfo.basePrice > 0 && 
           enrichedItems.length === 0 && (!paymentInfo.items || paymentInfo.items.length === 0) && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Base Fee</span>
              <span className="font-medium">${paymentInfo.basePrice.toFixed(2)}</span>
            </div>
          )}

          {/* If no breakdown available, show as single line */}
          {!itemsLoading && (!paymentInfo.basePrice || paymentInfo.basePrice === 0) && 
           enrichedItems.length === 0 && (!paymentInfo.items || paymentInfo.items.length === 0) && 
           total > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{applicationTitle}</span>
              <span className="font-medium">${total.toFixed(2)}</span>
            </div>
          )}

          <Separator className="my-2" />

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-2">
            <span className="font-semibold text-base">Grand Total</span>
            <span className={`text-xl font-bold ${paymentInfo.balanceRemaining && paymentInfo.balanceRemaining > 0 ? 'text-muted-foreground line-through' : 'text-primary print:text-foreground'}`}>
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Partial Payment Section */}
          {paymentInfo.partialPayment?.enabled && (
            <div className="bg-muted/50 -mx-4 px-4 py-2 mt-2 rounded text-sm">
              <span className="text-muted-foreground">Partial Payment: </span>
              <span className="font-medium">
                {paymentInfo.partialPayment.type === 'percentage' 
                  ? `${paymentInfo.partialPayment.value}% deposit` 
                  : `$${paymentInfo.partialPayment.value?.toFixed(2)} deposit`}
              </span>
            </div>
          )}

          {/* Stripe Payment Info (when available) */}
          {stripeLoading && (
            <div className="bg-muted/50 -mx-4 px-4 py-3 mt-2 rounded">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          )}
          
          {stripeError && (
            <div className="bg-red-50 dark:bg-red-950/30 -mx-4 px-4 py-3 mt-2 rounded text-sm">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {stripeError}
              </div>
            </div>
          )}

          {/* Amount Due (from pricing config) */}
          {paymentInfo.amountDue !== undefined && paymentInfo.amountDue > 0 && paymentInfo.amountDue !== total && (
            <div className="flex justify-between items-center text-sm py-1">
              <span className="text-muted-foreground">Amount Due</span>
              <span className="font-medium">${paymentInfo.amountDue.toFixed(2)}</span>
            </div>
          )}

          {/* Amount Paid from _booking_payments, Stripe, or fallback */}
          {(actualAmountPaid > 0) && (
            <div className="bg-green-50 dark:bg-green-950/30 -mx-4 px-4 py-3 mt-2 rounded print:bg-green-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700 dark:text-green-400 print:text-green-700">
                  {primaryBookingPayment || stripePayment ? 'Payment Received' : 'Amount Paid'}
                </span>
                <span className="text-lg font-bold text-green-700 dark:text-green-400 print:text-green-700">
                  ${actualAmountPaid.toFixed(2)}
                </span>
              </div>
              {(primaryBookingPayment || stripePayment) && (
                <div className="text-xs text-green-600 dark:text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified Payment
                </div>
              )}
            </div>
          )}

          {/* Balance Owed (Grand Total - Actual Payment) - only show if > 0 */}
          {balanceOwed > 0 && actualAmountPaid > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 -mx-4 px-4 py-3 rounded print:bg-amber-50">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-amber-700 dark:text-amber-400 print:text-amber-700">Balance Owed</span>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-400 print:text-amber-700">
                  ${balanceOwed.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status */}
      <Card className={`print:shadow-none print:border ${getPaymentStatusColor()}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-3">
            {getPaymentStatusIcon()}
            <div className="text-center">
              <p className="font-semibold text-lg">Payment Status: {actualPaymentStatus.toUpperCase()}</p>
              <p className="text-sm opacity-80 flex items-center justify-center gap-1 mt-1">
                <CreditCard className="h-3 w-3" />
                Payment Method: {checkoutType}
              </p>
              {stripePayment && (
                <p className="text-xs opacity-70 mt-1">
                  Transaction ID: {stripePayment.id}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions - Hidden in print */}
      <div className="flex gap-3 justify-center print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
        <Button onClick={handleDownloadPDF}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t pt-4 print:pt-2">
        <p>Thank you for your business!</p>
        <p className="mt-1">Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
      </div>
    </div>
  );

  // If no trigger provided, render inline
  if (!trigger && controlledOpen === undefined) {
    return receiptContent;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] print:max-w-none print:max-h-none print:h-auto">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment Receipt
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] pr-4 print:max-h-none print:overflow-visible">
          {receiptContent}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
