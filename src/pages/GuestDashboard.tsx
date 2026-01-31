import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { elegantAPI, ElegantCustomer, CustomerResponse } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const GuestDashboard = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!isLoaded) return;

      if (!user) {
        navigate("/sign-up");
        return;
      }

      try {
        const response = await elegantAPI.getCustomer(user.id);
        const role = response.customer._customer_role?.role;
        
        if (role !== 'guest') {
          navigate("/");
          return;
        }

        setCustomer(response.customer);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [user, isLoaded, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Guest Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {customer?.Full_name}</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">GUEST</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Become a Member</CardTitle>
              <CardDescription>Unlock full access to club features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                As a member, you'll get access to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Event registration and discounts</li>
                <li>Class enrollment</li>
                <li>Member-only resources</li>
                <li>Voting rights</li>
              </ul>
              <Button className="w-full">Apply for Membership</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>Public events you can attend</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Browse upcoming events...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public Resources</CardTitle>
              <CardDescription>Learn about minerals and lapidary</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Access educational materials...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
              <CardDescription>Get in touch with the club</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Contact information and form...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuestDashboard;
