import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const CheckoutCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Checkout Cancelled - Tampa Bay Minerals & Science Club</title>
        <meta name="description" content="Your checkout was cancelled. Your cart items are still saved." />
        <link rel="canonical" href={`${window.location.origin}/checkout/cancel`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Checkout Cancelled - Tampa Bay Minerals & Science Club" />
        <meta property="og:description" content="Your checkout was cancelled. Your cart items are still saved." />
        <meta property="og:url" content={`${window.location.origin}/checkout/cancel`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Checkout Cancelled - Tampa Bay Minerals & Science Club" />
        <meta name="twitter:description" content="Your checkout was cancelled. Your cart items are still saved." />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      <div className="container mx-auto px-4 py-20 mt-20">
        <Card className="max-w-2xl mx-auto p-12 text-center">
          <CardHeader>
            <div className="mx-auto mb-6">
              <XCircle className="h-24 w-24 text-orange-500" />
            </div>
            <CardTitle className="text-3xl font-bold mb-4">
              Payment Cancelled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-8 text-lg">
              Your payment was cancelled. Your cart items are still saved and you can complete your purchase anytime.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/cart")}>
                Return to Cart
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/classes")}>
                Continue Shopping
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutCancel;
