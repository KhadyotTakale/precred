import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { elegantAPI, Booking } from "@/lib/elegant-api";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Package, Calendar, DollarSign } from "lucide-react";

const OrderHistory = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !user) {
      navigate('/sign-in');
      return;
    }

    if (isLoaded && user) {
      fetchBookings();
    }
  }, [isLoaded, user, navigate]);

  const fetchBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await elegantAPI.getBookings(user.id);
      setBookings(response.items);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'new':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const calculateOrderTotal = (booking: Booking) => {
    return (booking._booking_items_of_bookings?.items || []).reduce(
      (total, item) => total + (item.price * item.quantity),
      0
    );
  };

  if (loading) {
    return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Skeleton className="h-12 w-64 mb-8" />
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Order History - Tampa Bay Mineral and Science Club</title>
        <meta name="description" content="View your past purchases and order history" />
        <link rel="canonical" href={`${window.location.origin}/order-history`} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Order History - Tampa Bay Mineral and Science Club" />
        <meta property="og:description" content="View your past purchases and order history" />
        <meta property="og:url" content={`${window.location.origin}/order-history`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${window.location.origin}/club-logo-new.png`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Order History - Tampa Bay Mineral and Science Club" />
        <meta name="twitter:description" content="View your past purchases and order history" />
        <meta name="twitter:image" content={`${window.location.origin}/club-logo-new.png`} />
      </Helmet>
      
      <Navbar />
      
      <div className="min-h-screen bg-background pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Order History</h1>
            <p className="text-muted-foreground">View all your past purchases and bookings</p>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">No Orders Yet</h3>
                <p className="text-muted-foreground">
                  Your order history will appear here once you make a purchase.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-xl mb-1">
                          Order #{booking.booking_slug?.toUpperCase()}
                          {(booking._leads?.email || booking._customers?.Full_name) && (
                            <span className="text-muted-foreground font-normal text-base ml-2">
                              - {booking._leads?.lead_payload?.name || booking._leads?.lead_payload?.first_name || booking._customers?.Full_name || booking._leads?.email}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(booking.created_at), 'MMMM dd, yyyy')}
                          {booking._leads?.email && (
                            <span className="ml-2 text-xs">• {booking._leads.email}</span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-2xl font-bold text-foreground flex items-center gap-1">
                            <DollarSign className="h-5 w-5" />
                            {calculateOrderTotal(booking).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {(booking._booking_items_of_bookings?.items || []).map((item, index) => (
                        <div key={item.id}>
                          {index > 0 && <Separator className="my-4" />}
                          <div className="flex gap-4">
                            {item._items.item_info?.image?.[0] && (
                              <img
                                src={item._items.item_info.image[0]}
                                alt={item._items.title}
                                className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                              />
                            )}
                            <div className="flex-grow">
                              <h4 className="font-semibold text-foreground mb-1">
                                {item._items.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {item._items.item_type}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity}
                                </span>
                                <span className="font-semibold text-foreground">
                                  ${item.price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OrderHistory;
