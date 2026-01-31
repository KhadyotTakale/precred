import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, CreditCard, Loader2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { elegantAPI } from "@/lib/elegant-api";
import { toast } from "sonner";
import { useState } from "react";
import { useUser } from "@clerk/clerk-react";

const Cart = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number | null>(null);

  const installmentAmount = installmentCount ? totalPrice / installmentCount : 0;

  const handleCheckout = async (useInstallments: boolean = false) => {
    // Check if user is authenticated
    if (!isSignedIn) {
      toast.error("Please sign in to proceed to checkout");
      navigate('/sign-in', { state: { from: '/cart' } });
      return;
    }

    // If using installments, ensure one is selected
    if (useInstallments && !installmentCount) {
      toast.error("Please select the number of payments");
      return;
    }

    setIsProcessing(true);
    
    // Show loading toast
    const loadingToast = toast.loading("Preparing your checkout session...");

    try {
      console.log('Starting checkout process...', useInstallments ? `with ${installmentCount} installments` : 'one-time payment');

      // Prepare line items for Stripe Checkout
      const lineItems = items.map(item => {
        const itemTotal = item.price * item.quantity;
        const perPaymentAmount = useInstallments && installmentCount 
          ? itemTotal / installmentCount 
          : itemTotal;

        return {
          price_data: {
            currency: item.currency || 'usd',
            product_data: {
              name: useInstallments 
                ? `${item.title} (${installmentCount} payments)` 
                : item.title,
              description: item.description || '',
              images: item.image ? [item.image] : [],
            },
            unit_amount: Math.round(perPaymentAmount * 100), // Convert to cents
            ...(useInstallments && {
              recurring: {
                interval: 'month',
                interval_count: 1,
              }
            }),
          },
          quantity: item.quantity,
        };
      });

      console.log('Creating Stripe checkout session with items:', lineItems);
      toast.loading("Creating secure payment session...", { id: loadingToast });

      // Build success and cancel URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/checkout/success`;
      const cancelUrl = `${baseUrl}/checkout/cancel`;

      // Create checkout session with user authentication
      const response = await elegantAPI.createStripeCheckoutSession(
        lineItems,
        successUrl,
        cancelUrl,
        user?.id, // Pass Clerk user ID for authentication
        useInstallments ? 'subscription' : 'payment'
      );

      // Handle nested response structure
      const paymentData = response._payment || response;
      const bookingData = response._booking_info;

      if (!paymentData || !paymentData.url || !paymentData.id) {
        throw new Error("Invalid response from payment provider");
      }

      console.log('Stripe session response:', response);
      toast.loading("Finalizing your order...", { id: loadingToast });

      // Determine booking type from cart items
      const bookingType = items[0]?.itemType || 'Class';

      // Get the Stripe session ID from response
      console.log('Stripe session created with ID:', paymentData.id);

      // The Stripe call now creates the booking automatically
      // Extract booking ID from the response
      const bookingId = bookingData?.id;

      if (!bookingId) {
        throw new Error("Failed to create order record");
      }

      console.log('Booking created with ID:', bookingId);

      // Store booking ID in sessionStorage for the success page
      sessionStorage.setItem('booking_id', bookingId.toString());

      toast.success("Redirecting to secure checkout...", { id: loadingToast });

      // Track checkout in Microsoft Clarity
      if (typeof window !== 'undefined' && (window as any).clarity) {
        (window as any).clarity('identify', 'booking_id', bookingId.toString());
        (window as any).clarity('identify', 'checkout_total', totalPrice.toString());
        (window as any).clarity('identify', 'checkout_items', items.length.toString());
      }

      // Redirect to Stripe Checkout
      window.location.href = paymentData.url;
      
    } catch (error: any) {
      console.error("Checkout error details:", error);
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Provide specific error messages based on error type
      let errorMessage = "We couldn't process your checkout. Please try again.";
      
      if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("Invalid response")) {
        errorMessage = "Payment service is unavailable. Please try again in a moment.";
      } else if (error.message?.includes("Failed to create order")) {
        errorMessage = "Couldn't create your order. Please contact support if this persists.";
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = "Authentication error. Please sign out and sign in again.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Our team has been notified. Please try again later.";
      }
      
      toast.error(errorMessage, {
        description: "If the problem persists, please contact our support team.",
        duration: 5000,
      });
      
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 mt-20">
          <Card className="max-w-2xl mx-auto p-12 text-center">
            <CardContent>
              <ShoppingCart className="h-20 w-20 mx-auto mb-6 text-muted-foreground" />
              <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
              <p className="text-muted-foreground mb-8">
                Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
              </p>
               <Button size="lg" onClick={() => navigate("/classes")}>
                 Start Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Shopping Cart - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Review your cart and complete your purchase for classes, events, and memberships." />
        <link rel="canonical" href={`${window.location.origin}/cart`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Shopping Cart - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Review your cart and complete your purchase for classes, events, and memberships." />
        <meta property="og:url" content={`${window.location.origin}/cart`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Shopping Cart - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Review your cart and complete your purchase for classes, events, and memberships." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 mt-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
               <Button
                 variant="ghost"
                 onClick={() => navigate(-1)}
                 className="mb-4"
               >
                 <ArrowLeft className="h-4 w-4 mr-2" />
                 Continue Shopping
              </Button>
              <h1 className="text-4xl font-bold">Shopping Cart</h1>
              <p className="text-muted-foreground mt-2">
                {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
            <Button variant="destructive" onClick={clearCart}>
              Clear Cart
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      {/* Product Image */}
                      <div 
                        className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => {
                          if (item.itemType === 'Classes') {
                            navigate(`/classes/${item.slug}`);
                          } else if (item.itemType === 'Membership') {
                            navigate(`/memberships/${item.slug}`);
                          } else if (item.itemType === 'Event') {
                            navigate(`/event/${item.slug}`);
                          } else {
                            navigate(`/shop/${item.slug}`);
                          }
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ShoppingCart className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <div className="flex justify-between mb-2">
                          <h3 
                            className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              if (item.itemType === 'Classes') {
                                navigate(`/classes/${item.slug}`);
                              } else if (item.itemType === 'Membership') {
                                navigate(`/memberships/${item.slug}`);
                              } else if (item.itemType === 'Event') {
                                navigate(`/event/${item.slug}`);
                              } else {
                                navigate(`/shop/${item.slug}`);
                              }
                            }}
                          >
                            {item.title}
                          </h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-8 w-8"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val > 0) {
                                  updateQuantity(item.id, val);
                                }
                              }}
                              className="w-16 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </div>
                            <div className="text-xl font-bold text-primary">
                              ${(item.price * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">Calculated at checkout</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">${totalPrice.toFixed(2)}</span>
                  </div>

                  <Badge variant="secondary" className="w-full justify-center py-2">
                    {totalItems} {totalItems === 1 ? 'item' : 'items'}
                  </Badge>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => handleCheckout(false)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {isSignedIn ? "Proceed to Checkout" : "Sign In to Checkout"}
                      </>
                    )}
                  </Button>

                  {/* Pay in Stages Option */}
                  <div className="w-full">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      className="w-full"
                      onClick={() => setShowInstallments(!showInstallments)}
                      disabled={isProcessing}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Pay in Stages
                    </Button>

                    {showInstallments && (
                      <Card className="mt-3 border-dashed">
                        <CardContent className="pt-4 pb-3">
                          <p className="text-sm text-muted-foreground mb-3">
                            Split your payment into equal monthly installments
                          </p>
                          <RadioGroup 
                            value={installmentCount?.toString() || ''} 
                            onValueChange={(value) => setInstallmentCount(parseInt(value))}
                            className="space-y-2"
                          >
                            {[2, 4, 6].map((count) => (
                              <div key={count} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                                <div className="flex items-center space-x-3">
                                  <RadioGroupItem value={count.toString()} id={`installment-${count}`} />
                                  <Label htmlFor={`installment-${count}`} className="cursor-pointer font-medium">
                                    {count} Monthly Payments
                                  </Label>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  ${(totalPrice / count).toFixed(2)}/mo
                                </span>
                              </div>
                            ))}
                          </RadioGroup>

                          {installmentCount && (
                            <Button 
                              size="lg" 
                              className="w-full mt-4"
                              onClick={() => handleCheckout(true)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Pay ${installmentAmount.toFixed(2)}/mo for {installmentCount} months
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Button 
                    variant="ghost" 
                    size="lg" 
                    className="w-full"
                    onClick={() => navigate(-1)}
                  >
                    Continue Shopping
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
