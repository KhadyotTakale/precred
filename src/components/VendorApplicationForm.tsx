import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { elegantAPI } from '@/lib/elegant-api';
import { adminAPI } from '@/lib/admin-api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Copy, Check } from 'lucide-react';
import type { FormField } from '@/components/FormFieldBuilder';
interface ApplicationItem {
  id: number;
  slug: string;
  title: string;
  description?: string;
  Is_disabled?: boolean;
  item_info?: {
    formFields?: FormField[];
    applicationType?: string;
    status?: string;
  };
}
interface VendorApplicationFormProps {
  onBack?: () => void;
}
export function VendorApplicationForm({
  onBack
}: VendorApplicationFormProps) {
  const {
    user
  } = useUser();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationItem | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Fetch application items and filter out disabled ones
  const {
    data: applicationItems,
    isLoading: loadingApplications
  } = useQuery({
    queryKey: ['application-items'],
    queryFn: async () => {
      const response = await elegantAPI.getPublicItems(1, 100, 'Application');
      // Filter out disabled applications
      return (response.items as ApplicationItem[]).filter(app => !app.Is_disabled);
    }
  });
  const handleCopyLink = (e: React.MouseEvent, app: ApplicationItem) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/application/${app.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(app.id);
    toast({
      title: 'Link Copied!',
      description: 'Application link copied to clipboard.'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get form fields from selected application
  const formFields = selectedApplication?.item_info?.formFields || [];

  // Pre-fill email from Clerk user when application is selected
  useEffect(() => {
    if (user && selectedApplication) {
      const emailField = formFields.find(f => f.type === 'email');
      if (emailField) {
        setFormData(prev => ({
          ...prev,
          [emailField.name]: user.primaryEmailAddress?.emailAddress || ''
        }));
      }
    }
  }, [user, selectedApplication, formFields]);
  const resetForm = () => {
    setFormData({});
    setSelectedApplication(null);
  };
  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };
  const validateForm = (): boolean => {
    for (const field of formFields) {
      if (field.required) {
        const value = formData[field.name];
        if (value === undefined || value === '' || value === false) {
          toast({
            title: 'Validation Error',
            description: `${field.label} is required`,
            variant: 'destructive'
          });
          return false;
        }
      }

      // Additional validation
      if (field.validation) {
        const value = String(formData[field.name] || '');
        if (field.validation.minLength && value.length < field.validation.minLength) {
          toast({
            title: 'Validation Error',
            description: `${field.label} must be at least ${field.validation.minLength} characters`,
            variant: 'destructive'
          });
          return false;
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          toast({
            title: 'Validation Error',
            description: `${field.label} must be at most ${field.validation.maxLength} characters`,
            variant: 'destructive'
          });
          return false;
        }
      }
    }
    return true;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedApplication) {
      toast({
        title: 'Error',
        description: 'Please sign in to submit an application',
        variant: 'destructive'
      });
      return;
    }
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      // Build booking_info with form field values
      const bookingInfo: Record<string, string | boolean> = {};
      formFields.forEach(field => {
        bookingInfo[field.name] = formData[field.name] ?? '';
      });

      // Auto-capture lead if email field exists
      let leadsId: number | undefined;
      const emailField = formFields.find(f => f.type === 'email');
      if (emailField && user?.id) {
        const emailValue = formData[emailField.name] as string;
        if (emailValue) {
          try {
            const leadPayload: Record<string, any> = { email: emailValue };
            formFields.forEach(f => {
              if (!['readonly_text', 'html_content', 'signature', 'file_upload'].includes(f.type)) {
                const val = formData[f.name];
                if (val !== undefined && val !== '') {
                  leadPayload[f.name] = val;
                }
              }
            });
            const leadResponse = await adminAPI.createLead(
              { lead_payload: leadPayload, email: emailValue, status: 'new' },
              user.id
            );
            console.log('Lead auto-captured:', leadResponse);
            leadsId = leadResponse.id;
          } catch (leadError) {
            console.warn('Failed to auto-capture lead:', leadError);
          }
        }
      }

      // Create application using Elegant API POST /application
      const applicationPayload: Record<string, any> = {
        items_id: selectedApplication.id,
        booking_info: bookingInfo,
        application_type: 'vendor',
        price: 0,
        quantity: 1,
      };
      if (leadsId) {
        applicationPayload.leads_id = leadsId;
      }
      console.log('Creating application with payload:', applicationPayload);
      const applicationResponse = await elegantAPI.post('/application', applicationPayload, user?.id);
      console.log('Application created:', applicationResponse);
      toast({
        title: 'Application Submitted!',
        description: 'Thank you for your application. We will review it and get back to you soon.'
      });
      resetForm();
      // Redirect to home after short delay to show toast
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderField = (field: FormField) => {
    const value = formData[field.name];
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'number':
        return <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input id={field.name} type={field.type === 'phone' ? 'tel' : field.type} value={value as string || ''} onChange={e => handleFieldChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} />
          </div>;
      case 'date':
        return <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input id={field.name} type="date" value={value as string || ''} onChange={e => handleFieldChange(field.name, e.target.value)} required={field.required} />
          </div>;
      case 'textarea':
        return <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea id={field.name} value={value as string || ''} onChange={e => handleFieldChange(field.name, e.target.value)} placeholder={field.placeholder} required={field.required} rows={4} />
          </div>;
      case 'select':
        return <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select value={value as string || ''} onValueChange={val => handleFieldChange(field.name, val)}>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(opt => opt && opt.trim() !== '').map(option => <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>;
      case 'checkbox':
        return <div key={field.id} className="flex items-center space-x-2">
            <Checkbox id={field.name} checked={value as boolean || false} onCheckedChange={checked => handleFieldChange(field.name, checked as boolean)} />
            <Label htmlFor={field.name} className="cursor-pointer">
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>;
      default:
        return null;
    }
  };

  // Show application selection first
  if (!selectedApplication) {
    return <div className="space-y-6 px-4 md:px-8">
        <div className="flex items-center gap-4">
          {onBack && <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>}
          <div>
            <h2 className="text-2xl font-bold">Choose Application Type</h2>
            <p className="text-muted-foreground">Select the type of application you want to submit</p>
          </div>
        </div>

        {loadingApplications ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Card key={i} className="cursor-pointer">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
              </Card>)}
          </div> : applicationItems && applicationItems.length > 0 ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applicationItems.map(app => <Link key={app.id} to={`/application/${app.slug}`}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {app.title}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={e => handleCopyLink(e, app)}>
                        {copiedId === app.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </CardTitle>
                    {app.description && <CardDescription>{app.description}</CardDescription>}
                  </CardHeader>
                </Card>
              </Link>)}
          </div> : <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No application types available at this time.
            </CardContent>
          </Card>}
      </div>;
  }

  // Show form for selected application
  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSelectedApplication(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="px-[20px]">
          <h2 className="text-2xl font-bold">{selectedApplication.title}</h2>
          {selectedApplication.description && <p className="text-muted-foreground">{selectedApplication.description}</p>}
        </div>
      </div>

      {formFields.length === 0 ? <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            This application form has not been configured yet. Please contact an administrator.
          </CardContent>
        </Card> : <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
              <CardDescription>
                Please fill out all required fields below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formFields.map(field => renderField(field))}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setSelectedApplication(null)}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </form>}
    </div>;
}