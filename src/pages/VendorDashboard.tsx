import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { elegantAPI, ElegantCustomer, CustomerResponse } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";

const VendorDashboard = () => {
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
        
        if (role !== 'vendor') {
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
            <h1 className="text-4xl font-bold mb-2">Vendor Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {customer?.Full_name}</p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2 bg-purple-600">VENDOR</Badge>
        </div>

        <Tabs defaultValue="booth" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="booth">Booth Info</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="booth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Booth Registration</CardTitle>
                <CardDescription>Manage your vendor booth for shows</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Booth management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Shows</CardTitle>
                <CardDescription>Register for mineral and gem shows</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Show registration coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Management</CardTitle>
                <CardDescription>Manage your product listings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Inventory management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vendor Profile</CardTitle>
                <CardDescription>Update your business information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Business Name:</strong> {customer?.Full_name}</p>
                  <p><strong>Email:</strong> {customer?.email}</p>
                  <p><strong>Vendor Since:</strong> {new Date(customer?.created_at || "").toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorDashboard;
