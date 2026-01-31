import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { adminAPI } from '@/lib/admin-api';
import { Loader2, Edit } from 'lucide-react';
import { type CustomStatusesConfig } from '@/components/StatusConfigurationManager';

// Default payment statuses
const DEFAULT_PAYMENT_STATUSES = ['pending', 'paid', 'partial', 'failed', 'refunded', 'cancelled'];

// Default payment methods
const DEFAULT_PAYMENT_METHODS = ['Stripe', 'Cash', 'Check', 'Cash/Check', 'PayPal', 'Bank Transfer', 'Other'];

interface BookingPayment {
  id?: number; // Optional - if not provided, this is a new payment
  payment_id?: string;
  payment_response?: any;
  paid_amount?: number;
  payment_status?: string;
  payment_method?: string;
}

interface PaymentEditDialogProps {
  bookingsSlug: string;
  bookingsId: number; // Required for creating new payments
  payment?: BookingPayment; // Optional - if not provided, creating new payment
  customStatusesConfig?: CustomStatusesConfig;
  onPaymentUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function PaymentEditDialog({
  bookingsSlug,
  bookingsId,
  payment,
  customStatusesConfig = {},
  onPaymentUpdated,
  trigger,
}: PaymentEditDialogProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const isNewPayment = !payment?.id;
  
  // Form state
  const [paymentId, setPaymentId] = useState(payment?.payment_id || '');
  const [paymentResponse, setPaymentResponse] = useState(
    payment?.payment_response ? JSON.stringify(payment.payment_response, null, 2) : ''
  );
  const [paidAmount, setPaidAmount] = useState(payment?.paid_amount?.toString() || '');
  const [paymentStatus, setPaymentStatus] = useState(payment?.payment_status || '');
  const [paymentMethod, setPaymentMethod] = useState(payment?.payment_method || '');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');

  // Get available payment statuses (defaults + custom from Membership type as payment statuses share similar concept)
  const getPaymentStatuses = (): string[] => {
    const customStatuses = customStatusesConfig['Membership'] || [];
    return [...DEFAULT_PAYMENT_STATUSES, ...customStatuses];
  };

  // Get available payment methods (defaults + custom)
  const getPaymentMethods = (): string[] => {
    // Use custom statuses from a dedicated payment methods config if available
    const customMethods = customStatusesConfig['PaymentMethod'] || [];
    return [...DEFAULT_PAYMENT_METHODS, ...customMethods];
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPaymentId(payment?.payment_id || '');
      setPaymentResponse(
        payment?.payment_response ? JSON.stringify(payment.payment_response, null, 2) : ''
      );
      setPaidAmount(payment?.paid_amount?.toString() || '');
      setPaymentStatus(payment?.payment_status || '');
      setPaymentMethod(payment?.payment_method || '');
      setCustomPaymentMethod('');
    }
  }, [open, payment]);

  const handleSave = async () => {
    if (!user?.id) return;

    // Validate payment response JSON if provided
    let parsedPaymentResponse: any = undefined;
    if (paymentResponse.trim()) {
      try {
        parsedPaymentResponse = JSON.parse(paymentResponse);
      } catch (e) {
        toast({
          title: 'Invalid JSON',
          description: 'Payment response must be valid JSON',
          variant: 'destructive',
        });
        return;
      }
    }

    // Build the payload
    const payload: any = {};
    
    // For existing payments, include the booking_payments_id
    // For new payments, include the bookings_id
    if (payment?.id) {
      payload.booking_payments_id = payment.id;
    } else {
      payload.bookings_id = bookingsId;
    }

    if (paymentId.trim()) {
      payload.payment_id = paymentId.trim();
    }

    if (parsedPaymentResponse !== undefined) {
      payload.payment_response = parsedPaymentResponse;
    }

    if (paidAmount.trim()) {
      const numAmount = parseFloat(paidAmount);
      if (isNaN(numAmount) || numAmount < 0) {
        toast({
          title: 'Invalid Amount',
          description: 'Paid amount must be a valid positive number',
          variant: 'destructive',
        });
        return;
      }
      payload.paid_amount = numAmount;
    }

    if (paymentStatus.trim()) {
      payload.payment_status = paymentStatus.trim();
    }

    // Use custom payment method if "other" is selected
    const finalPaymentMethod = paymentMethod === '_custom' ? customPaymentMethod.trim() : paymentMethod.trim();
    if (finalPaymentMethod) {
      payload.payment_method = finalPaymentMethod;
    }

    try {
      setIsSaving(true);
      await adminAPI.updateApplicationPayment(bookingsSlug, payload, user.id);
      
      toast({
        title: isNewPayment ? 'Payment Created' : 'Payment Updated',
        description: 'Payment information has been saved successfully',
      });
      
      setOpen(false);
      onPaymentUpdated?.();
    } catch (error) {
      console.error('Failed to save payment:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isNewPayment ? 'create' : 'update'} payment information`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const paymentStatuses = getPaymentStatuses();
  const paymentMethods = getPaymentMethods();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7" title={isNewPayment ? "Add Payment" : "Edit Payment"}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNewPayment ? 'Add Payment Information' : 'Edit Payment Information'}</DialogTitle>
          <DialogDescription>
            {isNewPayment 
              ? 'Create a new payment record for this application.' 
              : 'Update payment details for this application. Only fill in the fields you want to change.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Payment ID */}
          <div className="space-y-2">
            <Label htmlFor="payment-id">Payment ID</Label>
            <Input
              id="payment-id"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="e.g., pi_xxx or txn_xxx"
            />
            <p className="text-xs text-muted-foreground">External payment reference (Stripe, PayPal, etc.)</p>
          </div>

          {/* Paid Amount */}
          <div className="space-y-2">
            <Label htmlFor="paid-amount">Paid Amount ($)</Label>
            <Input
              id="paid-amount"
              type="number"
              step="0.01"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Payment Status */}
          <div className="space-y-2">
            <Label htmlFor="payment-status">Payment Status</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger id="payment-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {paymentStatuses.map((status) => (
                  <SelectItem key={status} value={status} className="capitalize">
                    {status.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
                <SelectItem value="_custom">Other (enter custom)</SelectItem>
              </SelectContent>
            </Select>
            {paymentMethod === '_custom' && (
              <Input
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                placeholder="Enter custom payment method"
                className="mt-2"
              />
            )}
          </div>

          {/* Payment Response JSON */}
          <div className="space-y-2">
            <Label htmlFor="payment-response">Payment Response (JSON)</Label>
            <Textarea
              id="payment-response"
              value={paymentResponse}
              onChange={(e) => setPaymentResponse(e.target.value)}
              placeholder='{"status": "success", "transaction_id": "..."}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Optional: Store raw payment gateway response</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
