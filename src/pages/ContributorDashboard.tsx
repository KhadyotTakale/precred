import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { elegantAPI, ElegantCustomer, CustomerResponse } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const ContributorDashboard = () => {
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
        
        if (role !== 'contributor') {
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
            <h1 className="text-4xl font-bold mb-2">Contributor Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {customer?.Full_name}</p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2 bg-green-600">CONTRIBUTOR</Badge>
        </div>

        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submit Articles</CardTitle>
                <CardDescription>Share your knowledge with the community</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Submit articles about minerals, lapidary techniques, and geological discoveries.
                </p>
                <Button>Create New Article</Button>
                <div className="mt-4 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Your Submissions</h4>
                  <p className="text-sm text-muted-foreground">No articles submitted yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Photo Gallery</CardTitle>
                <CardDescription>Upload photos of specimens and club activities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Share your collection photos and event pictures with the club.
                </p>
                <Button>Upload Photos</Button>
                <div className="mt-4 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Your Uploads</h4>
                  <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Educational Resources</CardTitle>
                <CardDescription>Submit tutorials and guides</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Create educational content to help other members learn.
                </p>
                <Button>Submit Resource</Button>
                <div className="mt-4 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Your Resources</h4>
                  <p className="text-sm text-muted-foreground">No resources submitted yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contributor Profile</CardTitle>
                <CardDescription>Manage your contributor information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {customer?.Full_name}</p>
                  <p><strong>Email:</strong> {customer?.email}</p>
                  <p><strong>Contributor Since:</strong> {new Date(customer?.created_at || "").toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContributorDashboard;
