import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, DollarSign } from 'lucide-react';
import { PricingConfig, PriceBreakdown, calculatePriceBreakdown } from '@/lib/pricing-utils';

interface PriceSummaryCardProps {
  pricingConfig: PricingConfig;
  formData: Record<string, string | boolean | number>;
  formFields: { id: string; name: string; label?: string; type: string; options?: string[] }[];
  className?: string;
  userOptedForPartialPayment?: boolean;
  onUserOptedForPartialPaymentChange?: (checked: boolean) => void;
}

export function PriceSummaryCard({ 
  pricingConfig, 
  formData, 
  formFields,
  className = '',
  userOptedForPartialPayment,
  onUserOptedForPartialPaymentChange
}: PriceSummaryCardProps) {
  const breakdown = useMemo(() => {
    return calculatePriceBreakdown(pricingConfig, formData, formFields, userOptedForPartialPayment);
  }, [pricingConfig, formData, formFields, userOptedForPartialPayment]);

  if (!pricingConfig.enabled) {
    return null;
  }

  const isUserSelectedType = pricingConfig.partialPayment?.enabled && 
    pricingConfig.partialPayment.type === 'user_selected';

  const getPartialPaymentLabel = () => {
    if (!pricingConfig.partialPayment) return '';
    const partial = pricingConfig.partialPayment;
    const effectiveType = partial.type === 'user_selected' ? partial.userSelectedType : partial.type;
    const value = partial.value || 0;
    
    if (effectiveType === 'fixed') {
      return `Pay deposit only ($${value.toFixed(2)})`;
    }
    return `Pay deposit only (${value}%)`;
  };

  return (
    <Card className={`bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Price Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Base Price */}
        {breakdown.basePrice > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Base Fee</span>
            <span className="font-medium">${breakdown.basePrice.toFixed(2)}</span>
          </div>
        )}

        {/* Line Items */}
        {breakdown.items.map((item) => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">{item.label}</span>
              {item.quantity > 1 && (
                <span className="text-xs text-muted-foreground/70">
                  ${item.unitPrice.toFixed(2)} × {item.quantity}
                </span>
              )}
            </div>
            <span className="font-medium">${item.subtotal.toFixed(2)}</span>
          </div>
        ))}

        {/* Total */}
        {(breakdown.basePrice > 0 || breakdown.items.length > 0) && (
          <>
            <Separator className="my-2" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-semibold">Total</span>
              </div>
              <span className={`text-lg font-bold ${breakdown.balanceRemaining > 0 ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                ${breakdown.total.toFixed(2)}
              </span>
            </div>

            {/* User Selected Partial Payment Checkbox */}
            {isUserSelectedType && onUserOptedForPartialPaymentChange && (
              <div className="flex items-start space-x-3 bg-amber-50 dark:bg-amber-950/30 -mx-4 px-4 py-3 mt-2 border-y border-amber-200 dark:border-amber-800">
                <Checkbox
                  id="partial-payment-opt-in"
                  checked={userOptedForPartialPayment ?? false}
                  onCheckedChange={(checked) => onUserOptedForPartialPaymentChange(checked === true)}
                  className="mt-0.5"
                />
                <label 
                  htmlFor="partial-payment-opt-in" 
                  className="text-sm text-amber-700 dark:text-amber-400 cursor-pointer leading-snug"
                >
                  {getPartialPaymentLabel()}
                  <span className="block text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                    Pay a deposit now and the remaining balance later
                  </span>
                </label>
              </div>
            )}

            {/* Partial Payment Info (for fixed/percentage types or when user opted in) */}
            {breakdown.balanceRemaining > 0 && (
              <>
                <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/30 -mx-4 px-4 py-2 mt-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Due Today</span>
                    <span className="text-xs text-amber-600 dark:text-amber-500">
                      {breakdown.partialPayment?.type === 'user_selected'
                        ? (breakdown.partialPayment.userSelectedType === 'percentage' 
                            ? `${breakdown.partialPayment.value}% deposit`
                            : 'Fixed deposit')
                        : (breakdown.partialPayment?.type === 'percentage' 
                            ? `${breakdown.partialPayment?.value}% deposit`
                            : 'Fixed deposit')
                      }
                    </span>
                  </div>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    ${breakdown.amountDue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Balance Remaining</span>
                  <span className="font-medium">${breakdown.balanceRemaining.toFixed(2)}</span>
                </div>
              </>
            )}
          </>
        )}

        {breakdown.total === 0 && breakdown.items.length === 0 && breakdown.basePrice === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Fill out the form to see pricing
          </p>
        )}
      </CardContent>
    </Card>
  );
}
