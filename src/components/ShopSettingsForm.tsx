import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { adminAPI, type AdminShopResponse } from "@/lib/admin-api";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ShopSettingsFormProps {
  onSaved?: () => void;
}

export function ShopSettingsForm({ onSaved }: ShopSettingsFormProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [shopData, setShopData] = useState<AdminShopResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [slug, setSlug] = useState("");
  const [allowAffiliate, setAllowAffiliate] = useState(false);
  const [testmode, setTestmode] = useState(false);
  
  // _shop_info fields
  const [title, setTitle] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  const [seoScriptText, setSeoScriptText] = useState("");
  
  // Email settings fields
  const [maxEmailsPerDay, setMaxEmailsPerDay] = useState<number>(2);
  const [emailContactDaysFreq, setEmailContactDaysFreq] = useState<number>(5);
  const [fromEmail, setFromEmail] = useState("");

  useEffect(() => {
    const fetchShopData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const data = await adminAPI.getShop(user.id);
        setShopData(data);
        
        // Populate form fields
        setName(data.name || "");
        setDescription(data.description || "");
        setLogo(data.logo || "");
        setCustomDomain(data.custom_domain || "");
        setIsVisible(data.Is_visible ?? true);
        setSlug(data.slug || "");
        setAllowAffiliate(data.allow_affiliate ?? false);
        setTestmode(data.testmode ?? false);
        
        // Populate _shop_info fields
        if (data._shop_info) {
          setTitle(data._shop_info.title || "");
          setShopDescription(data._shop_info.description || "");
          setShopLogo(data._shop_info.logo || "");
          setSeoScriptText(data._shop_info.seo_script_text || "");
          // Email settings
          setMaxEmailsPerDay(data._shop_info.max_emails_per_day ?? 2);
          setEmailContactDaysFreq(data._shop_info.email_contact_days_freq ?? 5);
          setFromEmail(data._shop_info.from_email || "");
        }
      } catch (error) {
        console.error("Failed to fetch shop data:", error);
        toast({
          title: "Error",
          description: "Failed to load shop settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, [user?.id, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !shopData) {
      toast({
        title: "Error",
        description: "Unable to save settings",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Build the update payload
      const updatePayload: any = {
        name,
        description,
        logo,
        custom_domain: customDomain,
        Is_visible: isVisible,
        slug,
        allow_affiliate: allowAffiliate,
        testmode,
        _shop_info: {
          ...shopData._shop_info,
          title,
          description: shopDescription,
          logo: shopLogo,
          seo_script_text: seoScriptText,
          max_emails_per_day: maxEmailsPerDay,
          email_contact_days_freq: emailContactDaysFreq,
          from_email: fromEmail,
        }
      };

      // Use PATCH to update shop settings
      await adminAPI.patch(`/shop/${shopData.id}`, updatePayload, user.id);

      toast({
        title: "Success",
        description: "Shop settings updated successfully",
      });

      if (onSaved) {
        onSaved();
      }
    } catch (error) {
      console.error("Failed to update shop settings:", error);
      toast({
        title: "Error",
        description: "Failed to update shop settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      {shopData && (
        <div className="mb-4">
          <Badge variant="outline" className="text-xs">
            Shop ID: {shopData.id}
          </Badge>
        </div>
      )}
      
      <Accordion type="multiple" defaultValue={["basic"]} className="w-full">
        <AccordionItem value="basic">
          <AccordionTrigger className="pl-4">Basic Information</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Shop Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tampa Bay Mineral and Science Club"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shop description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="tampa-bay-mineral-club"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="domain">
          <AccordionTrigger className="pl-4">Domain Settings</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="shops.tampabayrockclub.org"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="shopInfo">
          <AccordionTrigger className="pl-4">Shop Information</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Shop Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tampa Bay Mineral Science Club Show"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopDescription">Shop Description</Label>
              <Textarea
                id="shopDescription"
                value={shopDescription}
                onChange={(e) => setShopDescription(e.target.value)}
                placeholder="Welcome message and shop details"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopLogo">Shop Logo URL</Label>
              <Input
                id="shopLogo"
                value={shopLogo}
                onChange={(e) => setShopLogo(e.target.value)}
                placeholder="https://example.com/shop-logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="seoScriptText">SEO Script Text</Label>
              <Textarea
                id="seoScriptText"
                value={seoScriptText}
                onChange={(e) => setSeoScriptText(e.target.value)}
                placeholder="SEO meta tags and scripts"
                rows={4}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="email">
          <AccordionTrigger className="pl-4">Email Settings</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Default From Email</Label>
              <Input
                id="fromEmail"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="president@tampabayrockclub.org"
              />
              <p className="text-xs text-muted-foreground">
                Default sender email address for outgoing emails
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxEmailsPerDay">Max Emails Per Day</Label>
              <Input
                id="maxEmailsPerDay"
                type="number"
                min={1}
                max={100}
                value={maxEmailsPerDay}
                onChange={(e) => setMaxEmailsPerDay(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of emails to send per day per lead
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailContactDaysFreq">Contact Frequency (Days)</Label>
              <Input
                id="emailContactDaysFreq"
                type="number"
                min={0}
                max={365}
                value={emailContactDaysFreq}
                onChange={(e) => setEmailContactDaysFreq(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum days between contacting the same lead (0 = no limit)
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="settings">
          <AccordionTrigger className="pl-4">Shop Settings</AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="isVisible">Shop Visible</Label>
              <Switch
                id="isVisible"
                checked={isVisible}
                onCheckedChange={setIsVisible}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allowAffiliate">Allow Affiliate</Label>
              <Switch
                id="allowAffiliate"
                checked={allowAffiliate}
                onCheckedChange={setAllowAffiliate}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="testmode">Test Mode</Label>
              <Switch
                id="testmode"
                checked={testmode}
                onCheckedChange={setTestmode}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>
    </form>
  );
}
