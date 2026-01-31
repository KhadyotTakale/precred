import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useCart } from "@/contexts/CartContext";
import { useUser } from "@clerk/clerk-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { elegantAPI } from "@/lib/elegant-api";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { user } = useUser();
  const [searchParams] = useSearchParams();
  const hasProcessed = useRef(false);

  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const processCheckout = async () => {
      // Prevent multiple executions
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      // Get booking ID from sessionStorage
      const storedBookingId = sessionStorage.getItem('booking_id');
      setBookingId(storedBookingId);
      
      if (storedBookingId && user?.id) {
        try {
          console.log('Updating booking status to Paid for booking ID:', storedBookingId);
          await elegantAPI.updateBookingStatus(user.id, parseInt(storedBookingId), "Paid");
          console.log('Booking status updated successfully');
          
          // Clear the booking ID from storage
          sessionStorage.removeItem('booking_id');
        } catch (error) {
          console.error('Error updating booking status:', error);
          toast.error('Payment successful but failed to update order status');
        }
      }

      // Clear the cart on successful payment
      clearCart();
      toast.success("Payment successful! Your cart has been cleared.");
    };

    processCheckout();
  }, [clearCart, user]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Order Confirmed - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Your order has been successfully confirmed. Thank you for your purchase!" />
        <link rel="canonical" href={`${window.location.origin}/checkout/success`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Order Confirmed - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Your order has been successfully confirmed. Thank you for your purchase!" />
        <meta property="og:url" content={`${window.location.origin}/checkout/success`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Order Confirmed - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Your order has been successfully confirmed. Thank you for your purchase!" />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-20 mt-20">
        <Card className="max-w-2xl mx-auto p-12 text-center">
          <CardHeader>
            <div className="mx-auto mb-6">
              <CheckCircle className="h-24 w-24 text-green-500" />
            </div>
            <CardTitle className="text-3xl font-bold mb-4">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 text-lg">
              Thank you for your purchase. Your order has been confirmed and you will receive an email confirmation shortly.
            </p>
            
            {bookingId && (
              <div className="bg-muted/50 rounded-lg p-4 mb-8 border border-border">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="text-sm text-muted-foreground">Order ID:</span>
                  <button 
                    onClick={() => navigate("/member-portal")}
                    className="font-mono font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {bookingId}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/member-portal/orders")}>
                View My Orders
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/classes")}>
                Browse More Classes
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/")}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
