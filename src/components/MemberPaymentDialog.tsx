import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { elegantAPI } from '@/lib/elegant-api';

interface BookingPaymentData {
  id: number;
  payment_id?: string;
  paid_amount: number;
  payment_status: string;
  payment_method: string;
}

interface BookingItemData {
  id: number;
  price: number;
  quantity: number;
}

interface MemberPaymentDialogProps {
  bookingSlug: string;
  bookingsId: number;
  bookingType: string;
  totalOwed: number;
  totalPaid: number;
  trigger?: React.ReactNode;
  onPaymentComplete?: () => void;
}

export function MemberPaymentDialog({
  bookingSlug,
  bookingsId,
  bookingType,
  totalOwed,
  totalPaid,
  trigger,
  onPaymentComplete,
}: MemberPaymentDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const balanceDue = Math.max(0, totalOwed - totalPaid);
  const [paymentAmount, setPaymentAmount] = useState(balanceDue);
  
  // Reset payment amount when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentAmount(balanceDue);
    }
  }, [open, balanceDue]);

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    // Clamp between 1 and balance due
    setPaymentAmount(Math.min(Math.max(numValue, 0), balanceDue));
  };

  const handleSliderChange = (values: number[]) => {
    setPaymentAmount(values[0]);
  };

  const handlePayNow = async () => {
    if (!user?.id || paymentAmount <= 0) return;

    try {
      setLoading(true);
      
      // Create Stripe checkout session with the chosen amount
      const lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment for ${bookingType.replace(/_/g, ' ')}`,
              description: `Booking: ${bookingSlug.toUpperCase()}`,
            },
            unit_amount: Math.round(paymentAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ];

      const successUrl = `${window.location.origin}/checkout/success?booking=${bookingSlug}`;
      const cancelUrl = `${window.location.origin}/member-portal/applications`;

      const session = await elegantAPI.createStripeCheckoutSession(
        lineItems,
        successUrl,
        cancelUrl,
        user.id,
        'payment',
        bookingsId
      );

      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  // Don't show if no balance due
  if (balanceDue <= 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pay Online
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Online
          </DialogTitle>
          <DialogDescription>
            Make a payment for your {bookingType.replace(/_/g, ' ').toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Balance Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">${totalOwed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Already Paid</span>
              <span className="font-medium text-green-600">${totalPaid.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-medium">Balance Due</span>
              <span className="font-bold text-primary">${balanceDue.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Amount Selection */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Choose Payment Amount</Label>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="number"
                  min={1}
                  max={balanceDue}
                  step={0.01}
                  value={paymentAmount.toFixed(2)}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="text-lg font-semibold"
                />
              </div>
              
              {balanceDue > 1 && (
                <Slider
                  value={[paymentAmount]}
                  onValueChange={handleSliderChange}
                  min={1}
                  max={balanceDue}
                  step={0.01}
                  className="w-full"
                />
              )}
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$1.00</span>
                <span>${balanceDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2">
              {balanceDue >= 25 && (
                <Button
                  variant={paymentAmount === 25 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentAmount(25)}
                >
                  $25
                </Button>
              )}
              {balanceDue >= 50 && (
                <Button
                  variant={paymentAmount === 50 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentAmount(50)}
                >
                  $50
                </Button>
              )}
              {balanceDue >= 100 && (
                <Button
                  variant={paymentAmount === 100 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentAmount(100)}
                >
                  $100
                </Button>
              )}
              <Button
                variant={paymentAmount === balanceDue ? "default" : "outline"}
                size="sm"
                onClick={() => setPaymentAmount(balanceDue)}
              >
                Pay Full Balance
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handlePayNow} 
            disabled={loading || paymentAmount <= 0}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pay ${paymentAmount.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
