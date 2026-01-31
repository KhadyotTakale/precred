import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { elegantAPI, ElegantCustomer } from "@/lib/elegant-api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Mail, Calendar, Shield, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const NOTIFICATION_CATEGORIES = [
  { id: 'silver-smithy', label: 'Silver Smithy' },
  { id: 'cabochon', label: 'Cabochon' },
  { id: 'shows', label: 'Shows' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'field-trips', label: 'Field Trips' },
  { id: 'beads', label: 'Beads' },
  { id: 'wire-wrapping', label: 'Wire Wrapping' },
  { id: 'specials', label: 'Specials' },
  { id: 'intarsia', label: 'Intarsia' },
  { id: 'casting', label: 'Casting' },
  { id: 'silver-clay', label: 'Silver Clay' },
  { id: 'lapidary', label: 'Lapidary' },
  { id: 'table-crafts', label: 'Table Crafts' },
  { id: 'open-shops', label: 'Open Shops' },
  { id: 'newsletters', label: 'Newsletters' },
  { id: 'blogs', label: 'Blogs' },
  { id: 'volunteer-work', label: 'Volunteer Work' },
];

const Profile = () => {
  const { user } = useUser();
  const [customer, setCustomer] = useState<ElegantCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification categories and email frequency state
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [emailFrequency, setEmailFrequency] = useState<string>('weekly');
  
  // Email/SMS toggle preferences state
  const [notifications, setNotifications] = useState({
    emailEvents: true,
    emailClasses: true,
    emailNewsletter: true,
    emailMarketing: false,
    smsEvents: false,
    smsClasses: false,
    smsReminders: false,
  });

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await elegantAPI.getCustomer(user.id);
      setCustomer(response.customer);
      
      // Load notification preferences from customer info if available
      const savedNotifications = response.customer.cust_info?.notifications;
      if (savedNotifications) {
        setSelectedNotifications(savedNotifications.categories || []);
        setEmailFrequency(savedNotifications.emailFrequency || 'weekly');
        if (savedNotifications.emailSms) {
          setNotifications(savedNotifications.emailSms);
        }
      } else {
        // Default: all categories selected
        setSelectedNotifications(NOTIFICATION_CATEGORIES.map(cat => cat.id));
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    toast.success("Profile updates coming soon!");
  };

  const handleSaveNotifications = async () => {
    if (!user || !customer) return;
    
    try {
      setSaving(true);
      
      const notificationsData = {
        categories: selectedNotifications,
        emailFrequency: emailFrequency,
        emailSms: notifications,
      };
      
      const updatedCustInfo = {
        ...(customer.cust_info || {}),
        notifications: notificationsData,
      };
      
      await elegantAPI.patchCustomer(user.id, customer.id, {
        cust_info: updatedCustInfo,
      });
      
      setCustomer({
        ...customer,
        cust_info: updatedCustInfo,
      });
      
      toast.success("Notification preferences saved!");
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedNotifications(NOTIFICATION_CATEGORIES.map(cat => cat.id));
  };

  const handleClearAll = () => {
    setSelectedNotifications([]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const initials = customer?.Full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">{customer?.Full_name || 'Member'}</h3>
              <p className="text-sm text-muted-foreground">Member #{customer?.customer_number}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <Input 
                  id="fullName" 
                  defaultValue={customer?.Full_name || ''} 
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email"
                  defaultValue={customer?.email || ''} 
                  placeholder="Enter your email"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email is managed through your authentication provider
              </p>
            </div>

            <div className="space-y-2">
              <Label>Member Since</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input 
                  value={customer?.created_at ? format(new Date(customer.created_at), 'MMMM dd, yyyy') : 'N/A'} 
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Input 
                  value={customer?._customer_role?.role || 'Member'} 
                  className="uppercase"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive updates and alerts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Frequency Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Email Frequency</Label>
            <RadioGroup value={emailFrequency} onValueChange={setEmailFrequency} className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="profile-weekly" />
                <Label htmlFor="profile-weekly" className="cursor-pointer">Once a Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="profile-monthly" />
                <Label htmlFor="profile-monthly" className="cursor-pointer">Once a Month</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="profile-none" />
                <Label htmlFor="profile-none" className="cursor-pointer">Do not notify</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Notification Categories Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Notification Categories</Label>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {NOTIFICATION_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className={cn(
                    "flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors",
                    selectedNotifications.includes(category.id)
                      ? "bg-primary/10 border-primary"
                      : "bg-background hover:bg-accent"
                  )}
                  onClick={() => handleCategoryToggle(category.id)}
                >
                  <Checkbox
                    id={`profile-${category.id}`}
                    checked={selectedNotifications.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <Label
                    htmlFor={`profile-${category.id}`}
                    className="text-sm font-medium cursor-pointer select-none"
                  >
                    {category.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedNotifications.length} of {NOTIFICATION_CATEGORIES.length} categories selected
            </div>
          </div>

          <Separator />

          {/* Email Notifications Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Email Notifications</h3>
            </div>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-events" className="font-medium">Event Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about upcoming events and changes
                  </p>
                </div>
                <Switch
                  id="email-events"
                  checked={notifications.emailEvents}
                  onCheckedChange={() => handleNotificationToggle('emailEvents')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-classes" className="font-medium">Class Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new classes and schedule changes
                  </p>
                </div>
                <Switch
                  id="email-classes"
                  checked={notifications.emailClasses}
                  onCheckedChange={() => handleNotificationToggle('emailClasses')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-newsletter" className="font-medium">Newsletter</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive our monthly newsletter with club updates
                  </p>
                </div>
                <Switch
                  id="email-newsletter"
                  checked={notifications.emailNewsletter}
                  onCheckedChange={() => handleNotificationToggle('emailNewsletter')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-marketing" className="font-medium">Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional offers and special announcements
                  </p>
                </div>
                <Switch
                  id="email-marketing"
                  checked={notifications.emailMarketing}
                  onCheckedChange={() => handleNotificationToggle('emailMarketing')}
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* SMS Notifications Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">SMS Alerts</h3>
            </div>
            <div className="space-y-4 pl-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-events" className="font-medium">Event Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get SMS reminders before events you've registered for
                  </p>
                </div>
                <Switch
                  id="sms-events"
                  checked={notifications.smsEvents}
                  onCheckedChange={() => handleNotificationToggle('smsEvents')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-classes" className="font-medium">Class Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive SMS reminders before scheduled classes
                  </p>
                </div>
                <Switch
                  id="sms-classes"
                  checked={notifications.smsClasses}
                  onCheckedChange={() => handleNotificationToggle('smsClasses')}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-reminders" className="font-medium">Important Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Urgent notifications about cancellations or changes
                  </p>
                </div>
                <Switch
                  id="sms-reminders"
                  checked={notifications.smsReminders}
                  onCheckedChange={() => handleNotificationToggle('smsReminders')}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveNotifications} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>Manage your data and privacy preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Data Visibility</p>
                <p className="text-sm text-muted-foreground">Control who can see your profile information</p>
              </div>
              <Button variant="outline" size="sm">Manage</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Download Your Data</p>
                <p className="text-sm text-muted-foreground">Request a copy of your personal data</p>
              </div>
              <Button variant="outline" size="sm">Request</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
