// Pricing configuration types and utilities

export interface PriceItem {
  id: string;
  label: string;
  type: 'fixed' | 'field_price' | 'field_quantity';
  fieldId?: string; // Reference to form field
  fixedPrice?: number; // For fixed price items
  priceMapping?: { [optionValue: string]: number }; // For select field pricing
  quantityFieldId?: string; // Field used to multiply this item
  isMultiplied?: boolean; // Whether to multiply by quantity field
}

export interface PartialPayment {
  enabled: boolean;
  type: 'fixed' | 'percentage' | 'user_selected';
  value: number; // Fixed amount in dollars OR percentage (0-100)
  userSelectedType?: 'fixed' | 'percentage'; // For user_selected: the type to apply when checked
}

export interface PricingConfig {
  enabled: boolean;
  basePrice: number;
  items: PriceItem[]; // Array of pricing items/add-ons
  partialPayment?: PartialPayment; // Optional partial payment/deposit configuration
  // Legacy fields for backward compatibility
  priceFieldId?: string;
  quantityFieldId?: string;
  priceMapping?: { [optionValue: string]: number };
  quantityMultiplier?: boolean;
}

export interface PriceBreakdown {
  basePrice: number;
  items: {
    id: string;
    label: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }[];
  total: number;
  amountDue: number; // Amount to charge (after partial payment calculation)
  balanceRemaining: number; // Remaining balance if partial payment
  partialPayment?: {
    enabled: boolean;
    type: 'fixed' | 'percentage' | 'user_selected';
    value: number;
    userSelectedType?: 'fixed' | 'percentage';
    userOptedIn?: boolean; // Whether user checked the partial payment checkbox
  };
}

// Migrate legacy pricing config to new format
export function migratePricingConfig(config: any): PricingConfig {
  if (!config) {
    return { enabled: false, basePrice: 0, items: [] };
  }
  
  // Already new format
  if (Array.isArray(config.items)) {
    return config as PricingConfig;
  }
  
  // Migrate legacy format
  const items: PriceItem[] = [];
  
  if (config.priceFieldId) {
    items.push({
      id: `legacy-price-${Date.now()}`,
      label: 'Variable Price',
      type: 'field_price',
      fieldId: config.priceFieldId,
      priceMapping: config.priceMapping,
      quantityFieldId: config.quantityFieldId,
      isMultiplied: config.quantityMultiplier,
    });
  }
  
  return {
    enabled: config.enabled ?? false,
    basePrice: config.basePrice ?? 0,
    items,
  };
}

// Calculate total price based on form data and pricing config
export function calculatePriceBreakdown(
  pricingConfig: PricingConfig,
  formData: Record<string, string | boolean | number>,
  formFields: { id: string; name: string; label?: string; type: string; options?: string[] }[],
  userOptedForPartialPayment?: boolean
): PriceBreakdown {
  const basePrice = pricingConfig.basePrice || 0;
  const breakdown: PriceBreakdown = {
    basePrice,
    items: [],
    total: basePrice,
    amountDue: basePrice,
    balanceRemaining: 0,
  };

  if (!pricingConfig.enabled || !pricingConfig.items?.length) {
    return breakdown;
  }

  for (const item of pricingConfig.items) {
    let unitPrice = 0;
    let quantity = 1;

    if (item.type === 'fixed') {
      // Fixed price item
      unitPrice = item.fixedPrice || 0;
    } else if (item.type === 'field_price' && item.fieldId) {
      // Price from form field
      const field = formFields.find(f => f.id === item.fieldId);
      if (field) {
        const fieldValue = formData[field.name];
        
        if (field.type === 'select' && item.priceMapping) {
          // Use price mapping for select fields
          unitPrice = item.priceMapping[String(fieldValue)] || 0;
        } else if (field.type === 'number') {
          // Use number field value as price
          unitPrice = Number(fieldValue) || 0;
        }
      }
    } else if (item.type === 'field_quantity' && item.fieldId) {
      // Quantity field - get quantity from form
      const field = formFields.find(f => f.id === item.fieldId);
      if (field) {
        const fieldValue = formData[field.name];
        quantity = Number(fieldValue) || 0;
        unitPrice = item.fixedPrice || 0;
      }
    }

    // Apply quantity multiplier if configured
    if (item.isMultiplied && item.quantityFieldId) {
      const quantityField = formFields.find(f => f.id === item.quantityFieldId);
      if (quantityField) {
        const qtyValue = formData[quantityField.name];
        quantity = Number(qtyValue) || 1;
      }
    }

    const subtotal = unitPrice * quantity;
    
    if (unitPrice > 0 || quantity > 0) {
      breakdown.items.push({
        id: item.id,
        label: item.label,
        unitPrice,
        quantity,
        subtotal,
      });
    }

    breakdown.total += subtotal;
  }

  // Calculate partial payment if enabled
  if (pricingConfig.partialPayment?.enabled && breakdown.total > 0) {
    const partial = pricingConfig.partialPayment;
    
    // For user_selected type, only apply if user opted in
    const shouldApplyPartial = partial.type === 'user_selected' 
      ? userOptedForPartialPayment === true
      : true;
    
    if (shouldApplyPartial) {
      const effectiveType = partial.type === 'user_selected' 
        ? (partial.userSelectedType || 'percentage')
        : partial.type;
      
      breakdown.partialPayment = {
        ...partial,
        userOptedIn: partial.type === 'user_selected' ? userOptedForPartialPayment : undefined,
      };
      
      if (effectiveType === 'fixed') {
        // Fixed deposit amount (cap at total)
        breakdown.amountDue = Math.min(partial.value, breakdown.total);
      } else {
        // Percentage of total
        breakdown.amountDue = Math.round((breakdown.total * partial.value / 100) * 100) / 100;
      }
      breakdown.balanceRemaining = breakdown.total - breakdown.amountDue;
    } else {
      // User didn't opt in for partial payment - charge full amount
      breakdown.partialPayment = {
        ...partial,
        userOptedIn: false,
      };
      breakdown.amountDue = breakdown.total;
      breakdown.balanceRemaining = 0;
    }
  } else {
    breakdown.amountDue = breakdown.total;
    breakdown.balanceRemaining = 0;
  }

  return breakdown;
}

// Generate a unique ID for price items
export function generatePriceItemId(): string {
  return `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
