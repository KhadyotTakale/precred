import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { elegantAPI, ElegantCustomer, MembershipBookingItem } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Calendar, CreditCard, Tag, Clock, RefreshCw } from "lucide-react";
import { format, differenceInDays, addYears } from "date-fns";

const Membership = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [membershipBooking, setMembershipBooking] = useState<MembershipBookingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [customerResponse, membershipResponse] = await Promise.all([
        elegantAPI.getCustomer(user.id),
        elegantAPI.getMembershipBookings(user.id)
      ]);
      setCustomer(customerResponse.customer);
      
      // Get the most recent membership booking
      if (membershipResponse.items && membershipResponse.items.length > 0) {
        // Sort by created_at to get the most recent
        const sortedItems = [...membershipResponse.items].sort((a, b) => b.created_at - a.created_at);
        setMembershipBooking(sortedItems[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate expiry date based on membership type (default 1 year)
  const getExpiryInfo = () => {
    if (!membershipBooking?.booking_items_info?.membership_paid_date) {
      return { expiryDate: null, daysRemaining: 0, isActive: false, status: 'Not Active' };
    }
    
    const paidDate = new Date(membershipBooking.booking_items_info.membership_paid_date);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    paidDate.setHours(0, 0, 0, 0);
    
    // Calculate expiry date (1 year from paid date)
    const expiryDate = addYears(paidDate, 1);
    const daysRemaining = differenceInDays(expiryDate, currentDate);
    const isActive = daysRemaining > 0;
    
    return { 
      expiryDate, 
      daysRemaining, 
      isActive, 
      status: isActive ? 'Active' : 'Expired' 
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { isActive, status: membershipStatus, expiryDate, daysRemaining } = getExpiryInfo();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Membership</h1>
        <p className="text-muted-foreground">Manage your club membership and benefits</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Membership Status</CardTitle>
              <CardDescription>Your current membership information</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant={isActive ? "default" : "destructive"} 
                className="text-lg px-4 py-2"
              >
                {isActive ? (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                {membershipStatus}
              </Badge>
              {expiryDate && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  {isActive ? (
                    <span className={daysRemaining <= 30 ? "text-orange-500 font-medium" : "text-muted-foreground"}>
                      {daysRemaining} days remaining
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">
                      Expired {Math.abs(daysRemaining)} days ago
                    </span>
                  )}
                </div>
              )}
              {(!isActive || daysRemaining <= 30) && (
                <Button 
                  size="sm" 
                  variant={isActive ? "outline" : "default"}
                  onClick={() => navigate('/memberships')}
                  className="mt-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renew Membership
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Member Since</span>
              </div>
              <p className="text-lg font-semibold">
                {customer?.created_at ? format(new Date(customer.created_at), 'MMMM dd, yyyy') : 'N/A'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Member Number</span>
              </div>
              <p className="text-lg font-semibold">#{customer?.customer_number || 'N/A'}</p>
            </div>

            {membershipBooking?.booking_items_info?.membership_paid_date && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Paid Date</span>
                </div>
                <p className="text-lg font-semibold">
                  {format(new Date(membershipBooking.booking_items_info.membership_paid_date), 'MMMM dd, yyyy')}
                </p>
              </div>
            )}

            {expiryDate && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expiry Date</span>
                </div>
                <p className={`text-lg font-semibold ${!isActive ? 'text-destructive' : daysRemaining <= 30 ? 'text-orange-500' : ''}`}>
                  {format(expiryDate, 'MMMM dd, yyyy')}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <h3 className="font-semibold mb-2">Membership Role</h3>
                <Badge variant="secondary" className="text-base uppercase px-3 py-1">
                  {customer?._customer_role?.role || 'Member'}
                </Badge>
              </div>
              
              {membershipBooking?.booking_items_info?.membership_type && (
                <div>
                  <h3 className="font-semibold mb-2">Membership Type</h3>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    <Tag className="h-3 w-3 mr-1" />
                    {membershipBooking.booking_items_info.membership_type}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {customer?._customer_role?.referral && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Referral</h3>
              <p className="text-sm">{customer._customer_role.referral}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Benefits</CardTitle>
          <CardDescription>What's included with your membership</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span className="text-sm">Access to all club events and meetings</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span className="text-sm">Discounted rates on classes and workshops</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span className="text-sm">Monthly newsletter and updates</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span className="text-sm">Access to club resources and equipment</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
              <span className="text-sm">Networking opportunities with fellow members</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact us for membership assistance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you have questions about your membership or need to make changes, please contact our membership team.
          </p>
          <Button variant="outline">Contact Support</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Membership;