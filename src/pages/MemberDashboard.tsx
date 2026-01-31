import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { elegantAPI, ElegantCustomer } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { FileText, Calendar } from "lucide-react";

interface ApplicationItem {
  id: number;
  created_at: number;
  booking_slug: string;
  booking_type: string;
  status: string;
  booking_info: Record<string, unknown> | null;
}

interface ApplicationsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  itemsTotal: number;
  pageTotal: number;
  items: ApplicationItem[];
}

const MemberDashboard = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

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
        
        if (role !== 'member') {
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

  useEffect(() => {
    const fetchApplications = async () => {
      if (!user) return;
      
      try {
        setApplicationsLoading(true);
        const response = await elegantAPI.get<ApplicationsResponse>('/application');
        // Filter to only show application types
        const applicationItems = response.items.filter(item => 
          item.booking_type.toLowerCase().includes('application')
        );
        setApplications(applicationItems);
      } catch (error) {
        console.error("Error fetching applications:", error);
      } finally {
        setApplicationsLoading(false);
      }
    };

    if (user) {
      fetchApplications();
    }
  }, [user]);

  const getStatusBadgeVariant = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'approved' || statusLower === 'accepted') return 'default';
    if (statusLower === 'pending' || statusLower === 'waiting') return 'secondary';
    if (statusLower === 'rejected' || statusLower === 'declined') return 'destructive';
    return 'outline';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Member Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {customer?.Full_name}</p>
          </div>
          <Badge variant="default" className="text-lg px-4 py-2">MEMBER</Badge>
        </div>

        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Applications</CardTitle>
                <CardDescription>View your submitted applications and their status</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No applications submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {app.booking_type.replace(/_/g, ' ')}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(app.created_at)}</span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="uppercase text-xs">{app.booking_slug}</span>
                            </div>
                            {app.booking_info && Object.keys(app.booking_info).length > 0 && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {Object.entries(app.booking_info)
                                  .slice(0, 2)
                                  .map(([key, value]) => `${key}: ${value}`)
                                  .join(' | ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(app.status)}>
                          {app.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Events</CardTitle>
                <CardDescription>View and register for club events</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Event registration coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Classes</CardTitle>
                <CardDescription>Enroll in lapidary and mineral classes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Class enrollment coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Donation History</CardTitle>
                <CardDescription>View your contribution history</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Donation history coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Update your member information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {customer?.Full_name}</p>
                  <p><strong>Email:</strong> {customer?.email}</p>
                  <p><strong>Member Since:</strong> {new Date(customer?.created_at || "").toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MemberDashboard;
