import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI, Item } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormFieldBuilder, FormField, WizardConfig } from '@/components/FormFieldBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FileText, Loader2, Target } from 'lucide-react';
import { PricingConfigBuilder } from '@/components/PricingConfigBuilder';
import { PricingConfig, migratePricingConfig } from '@/lib/pricing-utils';
import { Checkbox } from '@/components/ui/checkbox';
export type { PricingConfig } from '@/lib/pricing-utils';
interface ApplicationFormProps {
  application?: Item | null;
  onSuccess: () => void;
}
export function ApplicationForm({
  application,
  onSuccess
}: ApplicationFormProps) {
  const {
    user
  } = useUser();
  const {
    toast
  } = useToast();
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  // Basic fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [seoTags, setSeoTags] = useState('');
  const [isDisabled, setIsDisabled] = useState(false);

  // Application-specific fields
  const [applicationType, setApplicationType] = useState('vendor');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');

  // Dynamic form fields
  const [formFields, setFormFields] = useState<FormField[]>([]);

  // Wizard configuration
  const [wizardConfig, setWizardConfig] = useState<WizardConfig>({
    enabled: false,
    steps: []
  });

  // Pricing configuration
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    enabled: false,
    basePrice: 0,
    items: []
  });

  // Campaign assignment configuration
  const [campaignAssignmentEnabled, setCampaignAssignmentEnabled] = useState(false);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<number[]>([]);

  // Fetch active campaigns for selection (same as Marketing section)
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns-for-assignment', user?.id],
    queryFn: async () => {
      const response = await adminAPI.getItems(user?.id || '', 1, 100, 'Campaign');
      // Response structure: { items: [...], curPage, pageTotal, itemsTotal }
      const items = response?.items || [];
      return items.filter((c: Item) => !c.Is_disabled);
    },
    enabled: !!user?.id,
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);
  useEffect(() => {
    if (application) {
      setTitle(application.title);
      setSlug(application.slug || '');
      setSlugManuallyEdited(true);
      setDescription(application.description);
      setTags(application.tags || '');
      setSeoTags(application.SEO_Tags || '');
      setIsDisabled(application.Is_disabled);

      // Parse item_info
      if (application.item_info) {
        const info = application.item_info;
        setApplicationType(info.applicationType || 'vendor');
        setStatus(info.status || 'pending');
        setNotes(info.notes || '');
        setFormFields(info.formFields || []);
        setWizardConfig(info.wizardConfig || {
          enabled: false,
          steps: []
        });
        setPricingConfig(migratePricingConfig(info.pricingConfig));
        
        // Load campaign assignment config
        setCampaignAssignmentEnabled(info.campaignAssignmentEnabled || false);
        setSelectedCampaignIds(info.selectedCampaignIds || []);
      }

      // Mark initial load complete after a brief delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 500);
    } else {
      isInitialLoadRef.current = false;
    }
  }, [application]);
  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  };

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!user?.id || !application) return;
    setAutoSaveStatus('saving');
    try {
      const applicationData = {
        applicationType,
        status,
        notes,
        formFields,
        wizardConfig,
        pricingConfig,
        campaignAssignmentEnabled,
        selectedCampaignIds,
        submittedAt: application?.item_info?.submittedAt || new Date().toISOString()
      };
      const itemData = {
        item_type: 'Application',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(title),
        item_info: applicationData
      };
      await adminAPI.updateItem(application.id, itemData, user.id);
      setAutoSaveStatus('saved');

      // Reset to idle after showing "saved" for 2 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('idle');
    }
  }, [user?.id, application, applicationType, status, notes, formFields, wizardConfig, pricingConfig, campaignAssignmentEnabled, selectedCampaignIds, isDisabled, title, description, seoTags, tags, slug]);

  // Trigger auto-save on form changes (debounced)
  useEffect(() => {
    // Skip auto-save during initial load or for new applications
    if (isInitialLoadRef.current || !application) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (1.5 second debounce)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 1500);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, description, tags, seoTags, isDisabled, applicationType, status, notes, formFields, wizardConfig, pricingConfig, campaignAssignmentEnabled, selectedCampaignIds, performAutoSave, application]);

  const handleCampaignToggle = (campaignId: number) => {
    setSelectedCampaignIds(prev => 
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      const applicationData = {
        applicationType,
        status,
        notes,
        formFields,
        wizardConfig,
        pricingConfig,
        campaignAssignmentEnabled,
        selectedCampaignIds,
        submittedAt: application?.item_info?.submittedAt || new Date().toISOString()
      };
      const itemData = {
        item_type: 'Application',
        Is_disabled: isDisabled,
        title,
        description,
        SEO_Tags: seoTags,
        tags,
        slug: slug || generateSlug(title),
        item_info: applicationData
      };
      if (application) {
        await adminAPI.updateItem(application.id, itemData, user.id);
      } else {
        await adminAPI.createItem(itemData, user.id);
      }
      toast({
        title: "Success",
        description: `Application ${application ? 'updated' : 'created'} successfully`
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to save application:', error);
      toast({
        title: "Error",
        description: `Failed to ${application ? 'update' : 'create'} application`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  return <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="form-builder">Form Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Application Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicationType">Application Type *</Label>
                <Select value={applicationType} onValueChange={setApplicationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Default Status *</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Application Title *</Label>
              <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="2024 Vendor Application" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input id="slug" value={slug} onChange={e => {
              setSlug(e.target.value);
              setSlugManuallyEdited(true);
            }} placeholder="2024-vendor-application" required />
              <p className="text-sm text-muted-foreground">
                URL-friendly identifier (auto-generated from title)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of the application..." />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Admin Notes</h3>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Internal notes about this application type..." />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="form-builder" className="space-y-6 mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Form Workflow Builder</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Define the fields that applicants will fill out when submitting this application.
              </p>
            </div>
            
            <FormFieldBuilder fields={formFields} onChange={setFormFields} wizardConfig={wizardConfig} onWizardConfigChange={setWizardConfig} />
          </div>

          <Separator />

          {/* Pricing Configuration Section */}
          <PricingConfigBuilder pricingConfig={pricingConfig} onPricingConfigChange={setPricingConfig} formFields={formFields} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Visibility & SEO</h3>
            
            <div className="flex items-center space-x-2">
              <Switch id="disabled" checked={isDisabled} onCheckedChange={setIsDisabled} />
              <Label htmlFor="disabled">Disable this application</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input id="tags" value={tags} onChange={e => setTags(e.target.value)} placeholder="vendor, 2024, minerals" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoTags">SEO Tags</Label>
                <Input id="seoTags" value={seoTags} onChange={e => setSeoTags(e.target.value)} placeholder="SEO keywords..." />
              </div>
            </div>
          </div>

          <Separator />

          {/* PDF Filename Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">PDF Download Settings</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure the filename format for downloaded PDF documents. Use placeholders to include dynamic values.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="pdfFilename">PDF Filename Template</Label>
              <Input 
                id="pdfFilename" 
                value={wizardConfig.pdfFilenameTemplate || ''} 
                onChange={e => setWizardConfig({...wizardConfig, pdfFilenameTemplate: e.target.value})}
                placeholder="{{applicant_name}}-{{booking_slug}}-{{date_mm_dd_yyyy}}"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default application title.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Available Placeholders</CardTitle>
                <CardDescription>
                  Click a placeholder to insert it into the filename template.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">System</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: '{{booking_slug}}', label: 'Application Slug' },
                      { value: '{{date_mm_dd_yyyy}}', label: 'Date (MM-DD-YYYY)' },
                      { value: '{{date_dd_mm_yyyy}}', label: 'Date (DD-MM-YYYY)' },
                      { value: '{{datetime}}', label: 'Date & Time' },
                      { value: '{{status}}', label: 'Status' },
                    ].map(placeholder => (
                      <Button
                        key={placeholder.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const currentValue = wizardConfig.pdfFilenameTemplate || '';
                          setWizardConfig({...wizardConfig, pdfFilenameTemplate: currentValue + placeholder.value});
                        }}
                      >
                        {placeholder.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {formFields.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase">Form Fields</p>
                    <div className="flex flex-wrap gap-2">
                      {formFields.filter(f => ['text', 'email', 'select', 'radio'].includes(f.type)).slice(0, 10).map(field => (
                        <Button
                          key={field.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => {
                            const currentValue = wizardConfig.pdfFilenameTemplate || '';
                            const fieldKey = field.name?.toLowerCase().replace(/\s+/g, '_') || field.id;
                            setWizardConfig({...wizardConfig, pdfFilenameTemplate: currentValue + `{{${fieldKey}}}`});
                          }}
                        >
                          {field.label || field.name || field.id}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {wizardConfig.pdfFilenameTemplate && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Preview</p>
                    <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {wizardConfig.pdfFilenameTemplate.replace(/\{\{booking_slug\}\}/g, 'abc123xyz')
                        .replace(/\{\{date_mm_dd_yyyy\}\}/g, new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '-'))
                        .replace(/\{\{date_dd_mm_yyyy\}\}/g, new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'))
                        .replace(/\{\{datetime\}\}/g, new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19))
                        .replace(/\{\{status\}\}/g, 'pending')
                        .replace(/\{\{[^}]+\}\}/g, 'value')}.pdf
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Campaign Assignment Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Campaign Assignment</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically add applicants to marketing campaigns when they submit this application.
            </p>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="campaignAssignment" 
                checked={campaignAssignmentEnabled} 
                onCheckedChange={setCampaignAssignmentEnabled} 
              />
              <Label htmlFor="campaignAssignment">Enable campaign assignment on submission</Label>
            </div>

            {campaignAssignmentEnabled && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Campaigns</CardTitle>
                  <CardDescription>
                    Choose which campaigns to add leads to when applications are submitted.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loadingCampaigns ? (
                    <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading campaigns...
                    </div>
                  ) : campaignsData && campaignsData.length > 0 ? (
                    campaignsData.map((campaign: Item) => (
                      <div key={campaign.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50">
                        <Checkbox
                          id={`campaign-${campaign.id}`}
                          checked={selectedCampaignIds.includes(campaign.id)}
                          onCheckedChange={() => handleCampaignToggle(campaign.id)}
                        />
                        <Label 
                          htmlFor={`campaign-${campaign.id}`} 
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {campaign.title}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No active campaigns available. Create a campaign in the Marketing section first.
                    </p>
                  )}
                  {selectedCampaignIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedCampaignIds.length} campaign{selectedCampaignIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center gap-4 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {autoSaveStatus === 'saving' && <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>}
          {autoSaveStatus === 'saved' && <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Saved</span>
            </>}
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : application ? 'Update Application' : 'Create Application'}
        </Button>
      </div>
    </form>;
}