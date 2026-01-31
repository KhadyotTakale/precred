import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { elegantAPI } from '@/lib/elegant-api';
import { adminAPI } from '@/lib/admin-api';
import { replacePlaceholders } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FileText, CheckCircle2, CreditCard, Upload, Loader2, Check, X, Image, Pen, UserPlus, Target, RotateCcw, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { SignaturePad } from '@/components/SignaturePad';
import { PriceSummaryCard } from '@/components/PriceSummaryCard';
import { migratePricingConfig, calculatePriceBreakdown } from '@/lib/pricing-utils';
import type { FormField, FormStep, WizardConfig, StepCondition, LeadConfig } from '@/components/FormFieldBuilder';
import { DecisionPreviewPanel } from '@/components/DecisionPreviewPanel';
import { getDecisionPreview, type DecisionPreviewResponse } from '@/lib/decision-preview-api';

interface ApplicationItem {
  id: number;
  slug: string;
  title: string;
  description?: string;
  item_info?: {
    formFields?: FormField[];
    wizardConfig?: WizardConfig;
    applicationType?: string;
    status?: string;
    pricingConfig?: any;
    campaignAssignmentEnabled?: boolean;
    selectedCampaignIds?: number[];
  };
}

export default function ApplicationDetails() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { isLoaded, isSignedIn } = useAuth();
  const { toast } = useToast();

  // ALL HOOKS MUST BE DECLARED BEFORE ANY EARLY RETURNS (React Rules of Hooks)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  // LocalStorage key for this application
  const getStorageKey = () => `application_progress_${slug}`;

  // Initialize step from URL if returning from payment, otherwise check localStorage
  const getInitialStepIndex = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const stepParam = urlParams.get('step');
    if (paymentStatus === 'success' && stepParam) {
      const stepIndex = parseInt(stepParam, 10);
      if (!isNaN(stepIndex)) {
        return stepIndex + 1; // Move to next step after payment
      }
    }
    // Check localStorage for saved progress
    try {
      const saved = localStorage.getItem(`application_progress_${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stepIndex !== undefined) {
          return parsed.stepIndex;
        }
      }
    } catch (e) {
      console.error('Error reading saved application progress:', e);
    }
    return 0;
  };
  const [currentStepIndex, setCurrentStepIndex] = useState(getInitialStepIndex);
  const paymentHandled = useRef(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingLead, setIsProcessingLead] = useState(false);
  const [capturedLeadId, setCapturedLeadId] = useState<number | null>(null);
  const [submittedApplicationId, setSubmittedApplicationId] = useState<number | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [userOptedForPartialPayment, setUserOptedForPartialPayment] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSentForSteps, setEmailSentForSteps] = useState<Set<string>>(new Set());
  const [dragOverFields, setDragOverFields] = useState<Record<string, boolean>>({});
  const [decisionPreview, setDecisionPreview] = useState<DecisionPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch application by slug
  const { data: application, isLoading, error } = useQuery({
    queryKey: ['application-details', slug],
    queryFn: async () => {
      const response = await elegantAPI.getItemDetails(slug!);
      return response as ApplicationItem;
    },
    enabled: !!slug && isLoaded,
  });

  // Redirect to sign-in if not authenticated, preserving the current application URL
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const currentPath = `/application/${slug}`;
      navigate(`/sign-in?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoaded, isSignedIn, navigate, slug]);

  // Get form fields and wizard config from application
  const formFields = application?.item_info?.formFields || [];
  const wizardConfig = application?.item_info?.wizardConfig;
  const isWizardMode = wizardConfig?.enabled && wizardConfig.steps.length > 0;
  const allSteps = wizardConfig?.steps?.sort((a, b) => a.sequence - b.sequence) || [];

  // Campaign assignment config
  const campaignAssignmentEnabled = application?.item_info?.campaignAssignmentEnabled || false;
  const selectedCampaignIds = application?.item_info?.selectedCampaignIds || [];

  // Fetch campaign details if assignment is enabled
  const { data: campaignsForDisplay } = useQuery({
    queryKey: ['campaigns-for-display', selectedCampaignIds],
    queryFn: async () => {
      if (!selectedCampaignIds.length) return [];
      const response = await adminAPI.getItems('Campaign', 1, 100);
      const items = (response as any)?.data || response || [];
      return Array.isArray(items)
        ? items.filter((c: any) => selectedCampaignIds.includes(c.id))
        : [];
    },
    enabled: campaignAssignmentEnabled && selectedCampaignIds.length > 0,
  });

  // Generic condition evaluator - shared between steps and fields
  const evaluateConditions = useCallback((
    conditions: StepCondition[] | undefined,
    logic: 'all' | 'any' = 'all'
  ): boolean => {
    if (!conditions || conditions.length === 0) {
      return true; // No conditions = always show
    }

    const evaluateCondition = (condition: StepCondition): boolean => {
      if (!condition.fieldName) return true; // Incomplete condition = pass

      const fieldValue = formData[condition.fieldName];
      const stringValue = typeof fieldValue === 'boolean'
        ? (fieldValue ? 'true' : 'false')
        : String(fieldValue || '');

      switch (condition.operator) {
        case 'equals':
          return stringValue === (condition.value || '');
        case 'not_equals':
          return stringValue !== (condition.value || '');
        case 'contains':
          return stringValue.toLowerCase().includes((condition.value || '').toLowerCase());
        case 'not_empty':
          return stringValue.trim() !== '';
        case 'is_empty':
          return stringValue.trim() === '';
        default:
          return true;
      }
    };

    if (logic === 'any') {
      return conditions.some(evaluateCondition);
    } else {
      return conditions.every(evaluateCondition);
    }
  }, [formData]);

  // Evaluate if a step's conditions are met
  const evaluateStepConditions = useCallback((step: FormStep): boolean => {
    return evaluateConditions(step.conditions, step.conditionLogic || 'all');
  }, [evaluateConditions]);

  // Evaluate if a field's conditions are met
  const evaluateFieldConditions = useCallback((field: FormField): boolean => {
    return evaluateConditions(field.conditions, field.conditionLogic || 'all');
  }, [evaluateConditions]);

  // Filter steps to only show those whose conditions are met
  const steps = allSteps.filter(evaluateStepConditions);
  const currentStep = steps[currentStepIndex];

  // Handle when current step index becomes out of bounds due to condition changes
  useEffect(() => {
    if (steps.length > 0 && currentStepIndex >= steps.length) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps.length, currentStepIndex]);

  // Get visible fields for current step (wizard mode) or all fields (non-wizard mode)
  const getFieldsForStep = (stepId: string) => {
    return formFields.filter(f => f.stepId === stepId && evaluateFieldConditions(f));
  };

  // Get all visible fields (for simple form mode)
  const getVisibleFields = useCallback(() => {
    return formFields.filter(evaluateFieldConditions);
  }, [formFields, evaluateFieldConditions]);

  // Note: Email field is NOT pre-filled from signed-in user
  // The lead capture uses the email entered by the applicant in the form

  const validateSingleFieldWithData = useCallback((field: FormField, data: Record<string, string | boolean>): string | null => {
    if (['readonly_text', 'html_content'].includes(field.type)) return null;

    const value = data[field.name];

    if (field.required) {
      if (value === undefined || value === '' || value === false) {
        return `${field.label} is required`;
      }
    }

    if (field.validation && typeof value === 'string') {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        return `Must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        return `Must be at most ${field.validation.maxLength} characters`;
      }
    }

    // Validation for number fields (min/max value)
    if (field.type === 'number' && field.validation && value !== undefined && value !== '') {
      const numValue = typeof value === 'string' ? parseFloat(value) : (typeof value === 'number' ? value : NaN);
      if (!isNaN(numValue)) {
        if (field.validation.min !== undefined && numValue < field.validation.min) {
          return `Value must be at least ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && numValue > field.validation.max) {
          return `Value must be at most ${field.validation.max}`;
        }
      }
    }

    return null;
  }, []);

  // Load saved form data from localStorage on mount
  useEffect(() => {
    if (!slug || isSubmitted) return;

    // Don't load if we're returning from payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment')) return;

    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && Object.keys(parsed.formData).length > 0) {
          setFormData(parsed.formData);
          setHasSavedProgress(true);
        }
        if (parsed.capturedLeadId) {
          setCapturedLeadId(parsed.capturedLeadId);
        }
        if (parsed.userOptedForPartialPayment !== undefined) {
          setUserOptedForPartialPayment(parsed.userOptedForPartialPayment);
        }
      }
    } catch (e) {
      console.error('Error loading saved application progress:', e);
    }
  }, [slug, isSubmitted]);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (!slug || isSubmitted) return;

    // Don't save if form is empty
    const hasData = Object.values(formData).some(v => v !== '' && v !== false);
    if (!hasData && !capturedLeadId) return;

    try {
      const dataToSave = {
        formData,
        stepIndex: currentStepIndex,
        capturedLeadId,
        userOptedForPartialPayment,
        savedAt: Date.now(),
      };
      localStorage.setItem(getStorageKey(), JSON.stringify(dataToSave));
      if (hasData) {
        setHasSavedProgress(true);
      }
    } catch (e) {
      console.error('Error saving application progress:', e);
    }
  }, [formData, currentStepIndex, capturedLeadId, userOptedForPartialPayment, slug, isSubmitted]);

  // Clear localStorage on successful submission
  const clearSavedProgress = useCallback(() => {
    try {
      localStorage.removeItem(getStorageKey());
      setHasSavedProgress(false);
    } catch (e) {
      console.error('Error clearing saved progress:', e);
    }
  }, [slug]);

  // Start over function - clears all form data and progress
  const handleStartOver = useCallback(() => {
    setFormData({});
    setCurrentStepIndex(0);
    setCapturedLeadId(null);
    setFieldErrors({});
    setTouchedFields({});
    setUserOptedForPartialPayment(false);
    clearSavedProgress();
    setShowStartOverDialog(false);
    toast({
      title: 'Form Cleared',
      description: 'You can now start a new application.',
    });
  }, [clearSavedProgress, toast]);

  const handleFieldChange = useCallback((fieldName: string, value: string | boolean | null) => {
    setFormData(prev => ({ ...prev, [fieldName]: value ?? '' }));
  }, []);

  // Real-time validation effect - validates fields that have been touched (only visible ones)
  useEffect(() => {
    setFieldErrors(prevErrors => {
      const newErrors: Record<string, string> = {};
      const visibleFields = formFields.filter(evaluateFieldConditions);

      for (const field of visibleFields) {
        // Only validate if field has been touched or already has an error
        if (touchedFields[field.name] || prevErrors[field.name]) {
          const error = validateSingleFieldWithData(field, formData);
          if (error) {
            newErrors[field.name] = error;
          }
        }
      }

      // Only update if errors actually changed
      const prevKeys = Object.keys(prevErrors).sort().join(',');
      const newKeys = Object.keys(newErrors).sort().join(',');
      const prevVals = Object.values(prevErrors).sort().join(',');
      const newVals = Object.values(newErrors).sort().join(',');

      if (prevKeys === newKeys && prevVals === newVals) {
        return prevErrors;
      }

      return newErrors;
    });
  }, [formData, formFields, touchedFields, validateSingleFieldWithData, evaluateFieldConditions]);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    // Validate single field on blur
    const field = formFields.find(f => f.name === fieldName);
    if (field) {
      const error = validateSingleField(field);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
      }
    }
  }, [formFields]);

  const validateSingleField = useCallback((field: FormField): string | null => {
    // Skip static fields from validation
    if (['readonly_text', 'html_content'].includes(field.type)) return null;

    const value = formData[field.name];

    if (field.required) {
      if (value === undefined || value === '' || value === false) {
        return `${field.label} is required`;
      }
    }

    if (field.validation && typeof value === 'string') {
      if (field.validation.minLength && value.length < field.validation.minLength) {
        return `Must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        return `Must be at most ${field.validation.maxLength} characters`;
      }
    }

    return null;
  }, [formData]);

  const handleFileUpload = async (fieldName: string, file: File, field: FormField) => {
    // Validate file type if specified
    if (field.fileConfig?.acceptedTypes) {
      const allowedTypes = field.fileConfig.acceptedTypes.split(',').map(t => t.trim());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const isAllowed = allowedTypes.some(t =>
        t === '*' ||
        file.type.startsWith(t.replace('/*', '/')) ||
        t.toLowerCase() === fileExtension
      );
      if (!isAllowed) {
        toast({
          title: 'Invalid File Type',
          description: `Please upload a file of type: ${field.fileConfig.acceptedTypes}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate file size if specified
    if (field.fileConfig?.maxSize) {
      const maxSizeBytes = field.fileConfig.maxSize * 1024 * 1024; // Convert MB to bytes
      if (file.size > maxSizeBytes) {
        toast({
          title: 'File Too Large',
          description: `Maximum file size is ${field.fileConfig.maxSize}MB`,
          variant: 'destructive',
        });
        return;
      }
    }

    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));

    try {
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleFieldChange(fieldName, base64);
        setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
        toast({
          title: 'File Uploaded',
          description: `${file.name} has been attached.`,
        });
      };
      reader.onerror = () => {
        setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
        toast({
          title: 'Upload Failed',
          description: 'Failed to read file. Please try again.',
          variant: 'destructive',
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
      toast({
        title: 'Upload Failed',
        description: 'An error occurred while uploading the file.',
        variant: 'destructive',
      });
    }
  };

  const handleStripeCheckout = async (step: FormStep) => {
    if (!user || !application) {
      toast({
        title: 'Error',
        description: 'Please sign in to proceed with payment',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const stripeConfig = step.stripeConfig;

      // Calculate dynamic price from pricing configuration
      const priceBreakdown = calculatePriceBreakdown(
        pricingConfig,
        formData as Record<string, string | boolean | number>,
        formFields,
        userOptedForPartialPayment
      );

      // Use dynamic pricing if enabled, otherwise fall back to stripeConfig
      const useDynamicPricing = pricingConfig.enabled && priceBreakdown.total > 0;
      // Use amountDue for partial payments, otherwise use total
      const chargeAmount = useDynamicPricing ? priceBreakdown.amountDue : (stripeConfig?.priceAmount || 0);
      const totalAmount = useDynamicPricing ? priceBreakdown.total : (stripeConfig?.priceAmount || 0);

      if (chargeAmount <= 0) {
        throw new Error('No payment amount configured');
      }

      // Build line items from price breakdown or use single item from stripeConfig
      let lineItems: Array<{
        price_data: {
          currency: string;
          product_data: { name: string; description?: string };
          unit_amount: number;
        };
        quantity: number;
      }> = [];

      if (useDynamicPricing) {
        // Check if partial payment is enabled
        const isPartialPayment = priceBreakdown.partialPayment?.enabled && priceBreakdown.balanceRemaining > 0;

        if (isPartialPayment) {
          // For partial payments, create a single line item for the deposit
          const partialType = priceBreakdown.partialPayment?.type;
          const effectiveType = partialType === 'user_selected'
            ? priceBreakdown.partialPayment?.userSelectedType
            : partialType;
          const depositLabel = effectiveType === 'percentage'
            ? `Deposit (${priceBreakdown.partialPayment?.value}%)`
            : 'Deposit';

          lineItems.push({
            price_data: {
              currency: stripeConfig?.currency || 'usd',
              product_data: {
                name: stripeConfig?.productName || application.title,
                description: `${depositLabel} - Total: $${totalAmount.toFixed(2)}, Balance Due: $${priceBreakdown.balanceRemaining.toFixed(2)}`,
              },
              unit_amount: Math.round(chargeAmount * 100),
            },
            quantity: 1,
          });
        } else {
          // Full payment - add individual line items
          if (priceBreakdown.basePrice > 0) {
            lineItems.push({
              price_data: {
                currency: stripeConfig?.currency || 'usd',
                product_data: {
                  name: stripeConfig?.productName || application.title,
                  description: 'Base Application Fee',
                },
                unit_amount: Math.round(priceBreakdown.basePrice * 100),
              },
              quantity: 1,
            });
          }

          for (const item of priceBreakdown.items) {
            if (item.subtotal > 0) {
              lineItems.push({
                price_data: {
                  currency: stripeConfig?.currency || 'usd',
                  product_data: {
                    name: item.label,
                    description: item.quantity > 1 ? `$${item.unitPrice.toFixed(2)} × ${item.quantity}` : undefined,
                  },
                  unit_amount: Math.round(item.unitPrice * 100),
                },
                quantity: item.quantity,
              });
            }
          }
        }
      } else {
        // Fallback to static stripeConfig pricing
        lineItems = [{
          price_data: {
            currency: stripeConfig?.currency || 'usd',
            product_data: {
              name: stripeConfig?.productName || application.title,
              description: stripeConfig?.productDescription || application.title,
            },
            unit_amount: Math.round(chargeAmount * 100),
          },
          quantity: 1,
        }];
      }

      // Store form data in sessionStorage for after payment
      sessionStorage.setItem('application_form_data', JSON.stringify(formData));
      sessionStorage.setItem('application_id', application.id.toString());
      sessionStorage.setItem('application_slug', slug || '');
      sessionStorage.setItem('application_step_index', currentStepIndex.toString());

      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/application/${slug}?payment=success&step=${currentStepIndex}`;
      const cancelUrl = `${baseUrl}/application/${slug}?payment=cancel&step=${currentStepIndex}`;

      // Use the submitted application ID (bookings_id) if available
      const bookingsId = submittedApplicationId || parseInt(sessionStorage.getItem('submitted_application_id') || '0', 10) || undefined;

      const response = await elegantAPI.createStripeCheckoutSession(
        lineItems,
        successUrl,
        cancelUrl,
        user.id,
        'payment',
        bookingsId  // Pass the actual submitted application ID as bookings_id
      );

      const paymentData = response._payment || response;

      if (!paymentData?.url) {
        throw new Error('Invalid payment response');
      }

      window.location.href = paymentData.url;
    } catch (error) {
      console.error('Payment error:', error);
      // If application was already submitted, show a friendlier message about contacting the club
      if (submittedApplicationId) {
        toast({
          title: 'Payment System Unavailable',
          description: 'Your application has been submitted successfully! However, we could not connect to the payment system. Please contact the club directly to complete your payment.',
          variant: 'default',
        });
        // Mark as complete since the application is submitted
        setIsSubmitted(true);
        clearSavedProgress();
      } else {
        toast({
          title: 'Payment Error',
          description: 'Failed to initialize payment. Please try again or contact the club for assistance.',
          variant: 'destructive',
        });
      }
      setIsProcessingPayment(false);
    }
  };

  // Handle lead capture step
  const handleLeadCapture = async (step: FormStep) => {
    if (!user || !application) {
      toast({
        title: 'Error',
        description: 'Please sign in to continue',
        variant: 'destructive',
      });
      return;
    }

    const leadConfig = step.leadConfig;
    if (!leadConfig?.emailField) {
      toast({
        title: 'Configuration Error',
        description: 'Lead capture is not properly configured. Please contact support.',
        variant: 'destructive',
      });
      return;
    }

    // Get email from form data
    const email = formData[leadConfig.emailField] as string;
    if (!email) {
      toast({
        title: 'Email Required',
        description: 'Please provide an email address to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingLead(true);

    try {
      // Build the lead payload ONLY from configured fields in the form builder
      // Do not add any extra fields - strictly use what's configured
      const excludedFieldTypes = ['file_upload', 'signature', 'readonly_text', 'html_content', 'file'];
      const excludedFieldNamePatterns = ['file', 'upload', 'signature', 'attachment', 'document', 'image'];
      const leadPayload: Record<string, any> = {};

      // Only add fields that are explicitly configured in payloadFields
      if (leadConfig.payloadFields && leadConfig.payloadFields.length > 0) {
        for (const fieldName of leadConfig.payloadFields) {
          // Find the field to check its type
          const field = formFields.find(f => f.name === fieldName);
          if (field && excludedFieldTypes.includes(field.type)) {
            continue; // Skip file uploads and signatures
          }
          // Also skip fields whose names suggest file/upload content
          const lowerFieldName = fieldName.toLowerCase();
          if (excludedFieldNamePatterns.some(pattern => lowerFieldName.includes(pattern))) {
            continue;
          }
          const value = formData[fieldName];
          // Skip if value looks like a file URL or base64 data
          if (typeof value === 'string' && (value.startsWith('data:') || value.includes('/vault/'))) {
            continue;
          }
          if (value !== undefined && value !== '') {
            leadPayload[fieldName] = value;
          }
        }
      }

      // Get name from form data if configured
      const name = leadConfig.nameField ? (formData[leadConfig.nameField] as string) : undefined;

      // Create the lead via admin API
      const leadRequest: Record<string, any> = {
        lead_payload: leadPayload,
        email: email,
        status: leadConfig.status || 'new',
      };
      if (name) {
        leadRequest.name = name;
      }
      const leadResponse = await adminAPI.createLead(
        leadRequest as any,
        user.id
      );

      console.log('Lead created:', leadResponse);

      // Store the lead ID for use in application submission
      setCapturedLeadId(leadResponse.id);

      toast({
        title: 'Information Saved',
        description: 'Your information has been recorded. Proceeding to the next step.',
      });

      // Move to next step
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Lead capture error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingLead(false);
    }
  };

  // Handle payment return
  useEffect(() => {
    // Prevent duplicate handling
    if (paymentHandled.current) return;

    // Wait for application to load before handling payment return
    if (!application || steps.length === 0) return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const stepParam = urlParams.get('step');

    if (paymentStatus === 'success' && stepParam) {
      paymentHandled.current = true;

      // Restore form data
      const savedFormData = sessionStorage.getItem('application_form_data');
      if (savedFormData) {
        setFormData(JSON.parse(savedFormData));
      }

      // The step index was already set in getInitialStepIndex, but ensure it's correct
      const stepIndex = parseInt(stepParam, 10);
      if (!isNaN(stepIndex) && stepIndex < steps.length - 1) {
        setCurrentStepIndex(stepIndex + 1);
      }

      // Clean URL
      window.history.replaceState({}, '', `/application/${slug}`);

      // Clean up sessionStorage
      sessionStorage.removeItem('application_form_data');
      sessionStorage.removeItem('application_id');
      sessionStorage.removeItem('application_slug');
      sessionStorage.removeItem('application_step_index');

      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed. Please continue with your application.',
      });
    } else if (paymentStatus === 'cancel') {
      paymentHandled.current = true;

      // Restore form data on cancel too
      const savedFormData = sessionStorage.getItem('application_form_data');
      if (savedFormData) {
        setFormData(JSON.parse(savedFormData));
      }
      const stepIndex = parseInt(stepParam || '0', 10);
      setCurrentStepIndex(stepIndex);

      window.history.replaceState({}, '', `/application/${slug}`);

      toast({
        title: 'Payment Cancelled',
        description: 'You can retry the payment when ready.',
        variant: 'destructive',
      });
    }
  }, [application, slug, steps.length, toast]);

  const validateFields = (fieldsToValidate: FormField[]): boolean => {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};
    const fieldNames = fieldsToValidate.map(f => f.name);
    let firstErrorFieldName: string | null = null;

    for (const field of fieldsToValidate) {
      touched[field.name] = true;
      const error = validateSingleField(field);
      if (error) {
        errors[field.name] = error;
        if (!firstErrorFieldName) {
          firstErrorFieldName = field.name;
        }
      }
    }

    setTouchedFields(prev => ({ ...prev, ...touched }));
    // Clear errors for validated fields first, then set new errors
    setFieldErrors(prev => {
      const cleared = { ...prev };
      fieldNames.forEach(name => delete cleared[name]);
      return { ...cleared, ...errors };
    });

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields before continuing.',
        variant: 'destructive',
      });

      // Focus on the first field with an error
      if (firstErrorFieldName) {
        setTimeout(() => {
          const errorElement = document.querySelector(`[name="${firstErrorFieldName}"]`) as HTMLElement;
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus();
          }
        }, 100);
      }

      return false;
    }

    return true;
  };

  const validateAllFields = (): boolean => {
    return validateFields(getVisibleFields());
  };

  const scrollToTopAndFocusFirstInput = useCallback(() => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focus on the first visible input field within the current step's form
      setTimeout(() => {
        const stepContainer = document.querySelector('[data-step-content="true"]') || document;
        const firstInput = stepContainer.querySelector(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [role="combobox"]:not([disabled]), button[data-state]:not([disabled])'
        ) as HTMLElement;
        if (firstInput) {
          firstInput.focus();
          firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }, 100);
  }, []);

  const handleNextStep = () => {
    if (!currentStep) return;

    // Validate current step fields
    if (currentStep.type === 'fields') {
      const stepFields = getFieldsForStep(currentStep.id);
      if (!validateFields(stepFields)) return;
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      scrollToTopAndFocusFirstInput();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      scrollToTopAndFocusFirstInput();
    }
  };

  // Function to replace placeholders in text with form data values
  const replacePlaceholdersInText = useCallback((text: string): string => {
    if (!text) return '';
    const fallbackText = wizardConfig?.placeholderFallback || 'N/A';
    return text.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      const value = formData[fieldName];
      // Replace with fallback text if value is null, undefined, or empty
      if (value === undefined || value === null || value === '') {
        return fallbackText;
      }
      return String(value);
    });
  }, [formData, wizardConfig?.placeholderFallback]);

  // Handle sending email for send_email step
  const handleSendEmail = useCallback(async (step: FormStep) => {
    const emailConfig = step.emailConfig;
    if (!emailConfig || emailSentForSteps.has(step.id) || isSendingEmail) return;

    setIsSendingEmail(true);

    // Mark as attempted immediately to prevent retries (only try once)
    setEmailSentForSteps(prev => new Set([...prev, step.id]));

    try {
      const fromEmail = replacePlaceholdersInText(emailConfig.from);
      const toEmailsRaw = replacePlaceholdersInText(emailConfig.to);
      const subject = replacePlaceholdersInText(emailConfig.subject);
      const htmlBody = replacePlaceholdersInText(emailConfig.htmlBody);
      const messageStream = emailConfig.messageStream || 'broadcast';

      // Split comma-separated emails and trim whitespace
      const toEmails = toEmailsRaw.split(',').map(email => email.trim()).filter(email => email.length > 0);

      console.log(`📧 Sending ${toEmails.length} email(s) to:`, toEmails);

      // Send individual email to each recipient
      const emailPromises = toEmails.map(toEmail => {
        const emailPayload = {
          From: fromEmail,
          To: toEmail,
          Subject: subject,
          HtmlBody: htmlBody,
          MessageStream: messageStream,
        };
        console.log('📧 Sending email to:', toEmail);
        return adminAPI.sendSimpleEmail(emailPayload);
      });

      await Promise.all(emailPromises);

      toast({
        title: 'Email Sent',
        description: toEmails.length > 1
          ? `Notification emails sent to ${toEmails.length} recipients.`
          : 'Notification email has been sent successfully.',
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: 'Email Failed',
        description: 'Failed to send notification email. Continuing with your application.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
      // Always auto-advance to next step after attempt (success or failure)
      setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
          scrollToTopAndFocusFirstInput();
        }
      }, 1500);
    }
  }, [emailSentForSteps, isSendingEmail, replacePlaceholdersInText, currentStepIndex, steps.length, toast]);

  // Auto-trigger email send when a send_email step is reached
  useEffect(() => {
    if (currentStep?.type === 'send_email' && !emailSentForSteps.has(currentStep.id) && !isSendingEmail) {
      handleSendEmail(currentStep);
    }
  }, [currentStep, emailSentForSteps, isSendingEmail, handleSendEmail]);

  // Auto-fetch decision preview when decision_preview step is reached
  useEffect(() => {
    const fetchDecisionPreview = async () => {
      if (currentStep?.type !== 'decision_preview' || !user || isLoadingPreview || decisionPreview) {
        return;
      }

      setIsLoadingPreview(true);
      try {
        const apiEndpoint = currentStep.decisionPreviewConfig?.apiEndpoint || '/decision-preview';
        const response = await getDecisionPreview(
          {
            formData: formData as Record<string, any>,
            applicationId: application?.id,
          },
          user.id,
          apiEndpoint
        );
        setDecisionPreview(response);
      } catch (error) {
        console.error('Failed to fetch decision preview:', error);
        toast({
          title: 'Preview Error',
          description: 'Could not load decision preview. Showing estimated results.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchDecisionPreview();
  }, [currentStep, user, formData, application?.id, isLoadingPreview, decisionPreview, toast]);

  // Show loading state while checking authentication (after all hooks are declared)
  if (!isLoaded) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center pt-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </div>
      </>
    );
  }

  const handleRequestSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!user || !application) {
      toast({
        title: 'Error',
        description: 'Please sign in to submit an application',
        variant: 'destructive',
      });
      return;
    }

    // Validate all fields before submission
    if (!validateAllFields()) return;

    // Submit directly
    setIsSubmitting(true);

    try {
      const bookingInfo: Record<string, string | boolean> = {};
      formFields.forEach((field) => {
        if (!['readonly_text', 'html_content'].includes(field.type)) {
          const value = formData[field.name];
          // For non-required fields with no value, set to 'N/A'
          if ((value === undefined || value === '' || value === null) && !field.required) {
            bookingInfo[field.name] = 'N/A';
          } else {
            bookingInfo[field.name] = value ?? '';
          }
        }
      });

      // Auto-capture lead if email field exists but no lead was captured
      let leadsId = capturedLeadId;
      if (!leadsId) {
        // Find the first email field in the form
        const emailField = formFields.find(f => f.type === 'email');
        if (emailField) {
          const emailValue = formData[emailField.name] as string;
          if (emailValue) {
            try {
              // Build lead payload from form data
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
              // Continue with application submission even if lead capture fails
            }
          }
        }
      }

      // Get application type and status from form designer
      const applicationType = application.item_info?.applicationType || 'vendor';
      const applicationStatus = application.item_info?.status || 'pending';

      // Calculate total price from pricing configuration
      const priceBreakdown = calculatePriceBreakdown(
        pricingConfig,
        formData as Record<string, string | boolean | number>,
        formFields,
        userOptedForPartialPayment
      );
      const totalPrice = priceBreakdown.total || 0;

      const applicationPayload: Record<string, any> = {
        items_id: application.id,
        booking_info: { ...bookingInfo, application_type: applicationType },
        application_type: applicationType,
        status: applicationStatus,
        price: totalPrice,
        quantity: 1,
      };

      // Include leads_id if a lead was captured
      if (leadsId) {
        applicationPayload.leads_id = leadsId;
      }

      console.log('Creating application with payload:', applicationPayload);
      const applicationResponse = await elegantAPI.post('/application', applicationPayload, user.id);
      console.log('Application created:', applicationResponse);

      // Store the submitted application ID for use in Stripe checkout
      const createdAppId = (applicationResponse as { id?: number })?.id;
      if (createdAppId) {
        setSubmittedApplicationId(createdAppId);
        sessionStorage.setItem('submitted_application_id', createdAppId.toString());
      }

      // Assign lead to selected campaigns if enabled
      if (leadsId && application.item_info?.campaignAssignmentEnabled && application.item_info?.selectedCampaignIds?.length) {
        const campaignIds = application.item_info.selectedCampaignIds;
        console.log('Assigning lead to campaigns:', campaignIds);

        for (const campaignId of campaignIds) {
          try {
            await adminAPI.assignLeadToCampaign(campaignId, leadsId, user.id);
            console.log(`Lead ${leadsId} assigned to campaign ${campaignId}`);
          } catch (campaignError) {
            console.warn(`Failed to assign lead to campaign ${campaignId}:`, campaignError);
            // Continue with other campaigns even if one fails
          }
        }
      }

      // Clear saved progress on successful submission
      clearSavedProgress();

      if (isWizardMode) {
        setIsSubmitted(true);
        // Move to next step after submission (could be stripe_checkout or confirmation)
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          // If no more steps, just show success
          toast({
            title: 'Application Submitted!',
            description: 'Thank you for your application. We will review it and get back to you soon.',
          });
          navigate('/vendors');
        }
      } else {
        toast({
          title: 'Application Submitted!',
          description: 'Thank you for your application. We will review it and get back to you soon.',
        });
        navigate('/vendors');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const renderField = (field: FormField) => {
    const value = formData[field.name];
    const error = fieldErrors[field.name];
    const isTouched = touchedFields[field.name];
    const showError = isTouched && error;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type === 'phone' ? 'tel' : field.type}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              className={showError ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={showError ? 'true' : 'false'}
              aria-describedby={showError ? `${field.name}-error` : undefined}
            />
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              className={showError ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={showError ? 'true' : 'false'}
              aria-describedby={showError ? `${field.name}-error` : undefined}
            />
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              rows={4}
              className={showError ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-invalid={showError ? 'true' : 'false'}
              aria-describedby={showError ? `${field.name}-error` : undefined}
            />
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(val) => {
                handleFieldChange(field.name, val);
                setTouchedFields(prev => ({ ...prev, [field.name]: true }));
              }}
            >
              <SelectTrigger
                className={showError ? 'border-destructive focus:ring-destructive' : ''}
                aria-invalid={showError ? 'true' : 'false'}
                aria-describedby={showError ? `${field.name}-error` : undefined}
              >
                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.filter(opt => opt && opt.trim() !== '').map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={(value as boolean) || false}
                onCheckedChange={(checked) => {
                  handleFieldChange(field.name, checked as boolean);
                  setTouchedFields(prev => ({ ...prev, [field.name]: true }));
                }}
                className={showError ? 'border-destructive data-[state=unchecked]:border-destructive' : ''}
                aria-invalid={showError ? 'true' : 'false'}
                aria-describedby={showError ? `${field.name}-error` : undefined}
              />
              <Label htmlFor={field.name} className={`cursor-pointer ${showError ? 'text-destructive' : ''}`}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'readonly_text':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && <Label>{field.label}</Label>}
            <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words overflow-hidden">
              {replacePlaceholders(field.content || '', formData)}
            </div>
          </div>
        );

      case 'html_content':
        return (
          <div key={field.id} className="space-y-2">
            {field.label && <Label>{field.label}</Label>}
            <div
              className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: replacePlaceholders(field.content || '', formData)
              }}
            />
          </div>
        );

      case 'terms_agreement':
        return (
          <div key={field.id} className="space-y-3">
            {field.content && (
              <div
                className={`prose prose-sm max-w-none dark:prose-invert border rounded-md p-3 sm:p-4 bg-muted/50 max-h-48 overflow-y-auto break-words [&_table]:w-full [&_table]:table-fixed [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap ${showError ? 'border-destructive' : ''}`}
                dangerouslySetInnerHTML={{
                  __html: replacePlaceholders(field.content, formData)
                }}
              />
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={(value as boolean) || false}
                onCheckedChange={(checked) => {
                  handleFieldChange(field.name, checked as boolean);
                  setTouchedFields(prev => ({ ...prev, [field.name]: true }));
                }}
                className={showError ? 'border-destructive data-[state=unchecked]:border-destructive' : ''}
                aria-invalid={showError ? 'true' : 'false'}
                aria-describedby={showError ? `${field.name}-error` : undefined}
              />
              <Label htmlFor={field.name} className={`cursor-pointer ${showError ? 'text-destructive' : ''}`}>
                {field.checkboxLabel || 'I agree to the terms and conditions'}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'signature':
        return (
          <div key={field.id} className="space-y-2">
            <Label className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div className={showError ? 'ring-1 ring-destructive rounded-md' : ''}>
              <SignaturePad
                id={field.name}
                onChange={(dataUrl) => {
                  handleFieldChange(field.name, dataUrl);
                  setTouchedFields(prev => ({ ...prev, [field.name]: true }));
                }}
              />
            </div>
            {value && (
              <p className="text-xs text-green-600">Signature captured</p>
            )}
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      case 'file_upload':
        const isUploading = uploadingFiles[field.name];
        const hasFile = !!value;
        const isDragOver = dragOverFields[field.name];
        const uploadButtonText = field.placeholder || 'Upload File';
        const fileInputId = `file-input-${field.name}`;

        const handleDragOver = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isUploading) {
            setDragOverFields(prev => ({ ...prev, [field.name]: true }));
          }
        };

        const handleDragLeave = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFields(prev => ({ ...prev, [field.name]: false }));
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFields(prev => ({ ...prev, [field.name]: false }));

          if (isUploading) return;

          const droppedFile = e.dataTransfer.files[0];
          if (droppedFile) {
            handleFileUpload(field.name, droppedFile, field);
            setTouchedFields(prev => ({ ...prev, [field.name]: true }));
          }
        };

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name} className={showError ? 'text-destructive' : ''}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer ${isDragOver
                ? 'border-primary bg-primary/10 scale-[1.02]'
                : showError
                  ? 'border-destructive bg-destructive/5'
                  : hasFile
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30'
                }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && document.getElementById(fileInputId)?.click()}
            >
              <input
                id={fileInputId}
                type="file"
                accept={field.fileConfig?.acceptedTypes || '*'}
                disabled={isUploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(field.name, file, field);
                    setTouchedFields(prev => ({ ...prev, [field.name]: true }));
                  }
                }}
                className="sr-only"
                aria-invalid={showError ? 'true' : 'false'}
                aria-describedby={showError ? `${field.name}-error` : undefined}
              />
              <div className="flex flex-col items-center justify-center gap-3 text-center pointer-events-none">
                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </>
                ) : isDragOver ? (
                  <>
                    <Upload className="h-10 w-10 text-primary animate-bounce" />
                    <p className="text-sm font-medium text-primary">Drop your file here</p>
                  </>
                ) : hasFile ? (
                  <>
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">File uploaded successfully</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        document.getElementById(fileInputId)?.click();
                      }}
                      className="pointer-events-auto"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace File
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {uploadButtonText}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click or drag and drop your file here
                      </p>
                    </div>
                  </>
                )}
              </div>
              {field.fileConfig?.maxSize && (
                <p className="text-xs text-muted-foreground text-center mt-3 pointer-events-none">
                  Max file size: {field.fileConfig.maxSize}MB
                  {field.fileConfig?.acceptedTypes && field.fileConfig.acceptedTypes !== '*' && (
                    <span> • Accepted: {field.fileConfig.acceptedTypes}</span>
                  )}
                </p>
              )}
            </div>
            {showError && (
              <p id={`${field.name}-error`} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderStepContent = (step: FormStep) => {
    switch (step.type) {
      case 'fields':
        const stepFields = getFieldsForStep(step.id);
        return (
          <div className="space-y-4" data-step-content="true">
            {stepFields.length > 0 ? (
              stepFields.map((field) => renderField(field))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No fields configured for this step.
              </p>
            )}
          </div>
        );

      case 'stripe_checkout':
        const stripeConfig = step.stripeConfig;
        // Calculate dynamic price for display
        const checkoutBreakdown = calculatePriceBreakdown(
          pricingConfig,
          formData as Record<string, string | boolean | number>,
          formFields,
          userOptedForPartialPayment
        );
        const useDynamicPricing = pricingConfig.enabled && checkoutBreakdown.total > 0;
        const displayTotal = useDynamicPricing ? checkoutBreakdown.total : (stripeConfig?.priceAmount || 0);
        const displayAmountDue = useDynamicPricing ? checkoutBreakdown.amountDue : displayTotal;
        const isPartialPayment = checkoutBreakdown.partialPayment?.enabled && checkoutBreakdown.balanceRemaining > 0;

        return (
          <div className="text-center py-8 space-y-4">
            <CreditCard className="h-16 w-16 mx-auto text-primary" />
            <h3 className="text-lg font-semibold">Payment Required</h3>

            {/* Show dynamic pricing breakdown if enabled */}
            {useDynamicPricing ? (
              <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto text-left">
                <p className="font-medium text-center mb-3">{stripeConfig?.productName || application?.title}</p>
                {stripeConfig?.productDescription && (
                  <p className="text-sm text-muted-foreground text-center mb-4">{stripeConfig.productDescription}</p>
                )}

                <div className="space-y-2 border-t pt-3">
                  {checkoutBreakdown.basePrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Fee</span>
                      <span>${checkoutBreakdown.basePrice.toFixed(2)}</span>
                    </div>
                  )}
                  {checkoutBreakdown.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div>
                        <span className="text-muted-foreground">{item.label}</span>
                        {item.quantity > 1 && (
                          <span className="text-xs text-muted-foreground/70 ml-1">
                            (${item.unitPrice.toFixed(2)} × {item.quantity})
                          </span>
                        )}
                      </div>
                      <span>${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className={`flex justify-between font-bold text-lg border-t pt-2 mt-2 ${isPartialPayment ? 'text-muted-foreground' : ''}`}>
                    <span>Total</span>
                    <span className={isPartialPayment ? 'line-through' : 'text-primary'}>${displayTotal.toFixed(2)}</span>
                  </div>

                  {/* Partial Payment Display */}
                  {isPartialPayment && (
                    <>
                      <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/30 -mx-4 px-4 py-3 mt-2 rounded-b-lg">
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-700 dark:text-amber-400">Due Today</span>
                          <span className="text-xs text-amber-600 dark:text-amber-500">
                            {checkoutBreakdown.partialPayment?.type === 'percentage'
                              ? `${checkoutBreakdown.partialPayment.value}% deposit`
                              : 'Fixed deposit'}
                          </span>
                        </div>
                        <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                          ${displayAmountDue.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm pt-2">
                        <span className="text-muted-foreground">Balance Remaining</span>
                        <span className="font-medium">${checkoutBreakdown.balanceRemaining.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : stripeConfig?.productName ? (
              <div className="bg-muted/50 rounded-lg p-4 max-w-sm mx-auto">
                <p className="font-medium">{stripeConfig.productName}</p>
                {stripeConfig.productDescription && (
                  <p className="text-sm text-muted-foreground">{stripeConfig.productDescription}</p>
                )}
                <p className="text-2xl font-bold text-primary mt-2">
                  ${displayTotal.toFixed(2)} {stripeConfig.currency?.toUpperCase() || 'USD'}
                </p>
              </div>
            ) : null}

            <p className="text-muted-foreground">
              {stripeConfig?.successMessage || 'Please complete payment to proceed with your application.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              {currentStepIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevStep}
                  disabled={isProcessingPayment}
                  size="lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                onClick={() => handleStripeCheckout(step)}
                disabled={isProcessingPayment || displayAmountDue <= 0}
                size="lg"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay ${displayAmountDue.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'lead_capture':
        const leadConfig = step.leadConfig;
        const emailFieldName = leadConfig?.emailField;
        const hasEmail = emailFieldName && formData[emailFieldName];
        const payloadFieldNames = leadConfig?.payloadFields || [];

        return (
          <div className="text-center py-8 space-y-4">
            <UserPlus className="h-16 w-16 mx-auto text-teal-600" />
            <h3 className="text-lg font-semibold">Save Your Information</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {step.description || 'Your contact information will be saved before proceeding.'}
            </p>

            {/* Show summary of captured fields */}
            <div className="bg-muted/50 rounded-lg p-4 max-w-md mx-auto text-left">
              <p className="text-sm font-medium mb-2">Information to be saved:</p>
              <div className="space-y-1 text-sm">
                {emailFieldName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {formFields.find(f => f.name === emailFieldName)?.label || 'Email'}
                    </span>
                    <span className="font-medium truncate max-w-[200px]">
                      {(formData[emailFieldName] as string) || <span className="text-amber-600">Not provided</span>}
                    </span>
                  </div>
                )}
                {payloadFieldNames.slice(0, 5).map((fieldName) => {
                  const field = formFields.find(f => f.name === fieldName);
                  const value = formData[fieldName];
                  return (
                    <div key={fieldName} className="flex justify-between">
                      <span className="text-muted-foreground">{field?.label || fieldName}</span>
                      <span className="font-medium truncate max-w-[200px]">
                        {value ? String(value).substring(0, 30) : <span className="text-muted-foreground/60">—</span>}
                      </span>
                    </div>
                  );
                })}
                {payloadFieldNames.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    + {payloadFieldNames.length - 5} more fields
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => handleLeadCapture(step)}
              disabled={isProcessingLead || !hasEmail}
              className="mt-4 bg-teal-600 hover:bg-teal-700"
              size="lg"
            >
              {isProcessingLead ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>

            {!hasEmail && (
              <p className="text-sm text-amber-600">
                Please provide an email address in the previous step to continue.
              </p>
            )}
          </div>
        );

      case 'submission':
        return (
          <div className="text-center py-8 space-y-4">
            <FileText className="h-16 w-16 mx-auto text-blue-600" />
            <h3 className="text-lg font-semibold">Ready to Submit</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {step.description || 'Please review your information and click submit to complete your application.'}
            </p>

            {/* Campaign Assignment Indicator */}
            {campaignAssignmentEnabled && campaignsForDisplay && campaignsForDisplay.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-primary mb-2">
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">You'll be added to:</span>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {campaignsForDisplay.map((campaign: any) => (
                    <span
                      key={campaign.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                    >
                      {campaign.title}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Stay updated with news and opportunities
                </p>
              </div>
            )}

            <Button
              onClick={() => handleRequestSubmit()}
              disabled={isSubmitting}
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        );

      case 'send_email':
        const emailConfig = step.emailConfig;
        const hasEmailSent = emailSentForSteps.has(step.id);

        return (
          <div className="text-center py-8 space-y-4">
            {isSendingEmail ? (
              <>
                <Loader2 className="h-16 w-16 mx-auto text-blue-600 animate-spin" />
                <h3 className="text-lg font-semibold">Sending Notification...</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {step.description || 'Sending email notification to the application processor.'}
                </p>
              </>
            ) : hasEmailSent ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <h3 className="text-lg font-semibold">Email Sent!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Notification has been sent. Proceeding to next step...
                </p>
              </>
            ) : (
              <>
                <Mail className="h-16 w-16 mx-auto text-blue-600" />
                <h3 className="text-lg font-semibold">Preparing Notification</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {step.description || 'An email notification will be sent automatically.'}
                </p>
              </>
            )}
          </div>
        );

      case 'confirmation':
        const actionButtonText = step.confirmationConfig?.actionButtonText;
        const actionButtonUrl = step.confirmationConfig?.actionButtonUrl;
        return (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-xl font-semibold">Application Submitted!</h3>
            <p className="text-muted-foreground">
              {step.description || 'Thank you for your application. We will review it and get back to you soon.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button onClick={handleStartOver} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Submit Another Application
              </Button>
              {actionButtonUrl && (
                <Button onClick={() => navigate(actionButtonUrl)}>
                  {actionButtonText || 'Continue'}
                </Button>
              )}
            </div>
          </div>
        );

      case 'decision_preview':
        const previewConfig = step.decisionPreviewConfig;
        return (
          <DecisionPreviewPanel
            data={decisionPreview}
            isLoading={isLoadingPreview}
            onProceed={() => {
              if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1);
              }
            }}
            ctaButtonText={previewConfig?.ctaButtonText || 'Send to Underwriting'}
          />
        );

      default:
        return null;
    }
  };

  const renderWizardForm = () => {
    if (!currentStep) return null;

    const progress = ((currentStepIndex + 1) / steps.length) * 100;
    // Check if this is the last step before confirmation (no more fields, stripe_checkout, lead_capture, or submission steps after this)
    const remainingSteps = steps.slice(currentStepIndex + 1);
    const hasMoreActionableSteps = remainingSteps.some(s => ['fields', 'stripe_checkout', 'lead_capture', 'submission', 'send_email'].includes(s.type));
    const hasSubmissionStep = steps.some(s => s.type === 'submission');
    // Only auto-submit on last fields step if there's no explicit submission step
    const isLastFieldsStep = currentStep.type === 'fields' && !hasMoreActionableSteps && !hasSubmissionStep;
    const isConfirmationStep = currentStep.type === 'confirmation';

    return (
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Step {currentStepIndex + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators - scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center justify-start sm:justify-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap pb-2 sm:pb-0">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${index === currentStepIndex
                  ? 'bg-primary text-primary-foreground'
                  : index < currentStepIndex || isSubmitted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-muted text-muted-foreground'
                  }`}
              >
                {index < currentStepIndex || (isSubmitted && index <= currentStepIndex) ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                ) : null}
                <span className="truncate max-w-[100px] sm:max-w-none">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
            {currentStep.description && (
              <CardDescription>{currentStep.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {renderStepContent(currentStep)}
          </CardContent>
        </Card>

        {/* Mobile: Show price summary below form content when step has showPriceSummary enabled */}
        {currentStep.showPriceSummary && (
          <div className="lg:hidden">
            <PriceSummaryCard
              pricingConfig={pricingConfig}
              formData={formData as Record<string, string | boolean | number>}
              formFields={formFields}
              userOptedForPartialPayment={userOptedForPartialPayment}
              onUserOptedForPartialPaymentChange={setUserOptedForPartialPayment}
            />
          </div>
        )}

        {/* Navigation buttons - responsive layout */}
        {!isConfirmationStep && (
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-4">
            {/* Left side - Back/Cancel and Start Over buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Back button - always show unless on first step or submitted */}
              {currentStepIndex > 0 && !isSubmitted ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              ) : currentStepIndex === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/vendors')}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              ) : null}

              {/* Start Over button - show if there's saved progress or data */}
              {hasSavedProgress && !isSubmitted && (
                <AlertDialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Start a new application?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all your current progress and form data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Working</AlertDialogCancel>
                      <AlertDialogAction onClick={handleStartOver} className="bg-destructive hover:bg-destructive/90">
                        Clear & Start Over
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Forward navigation - hide for stripe_checkout, lead_capture, and submission since they have their own buttons */}
            {currentStep.type !== 'stripe_checkout' && currentStep.type !== 'lead_capture' && currentStep.type !== 'submission' && (
              isLastFieldsStep ? (
                <Button
                  onClick={() => handleRequestSubmit()}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              ) : (
                <Button onClick={handleNextStep} className="w-full sm:w-auto">
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const pricingConfig = migratePricingConfig(application?.item_info?.pricingConfig);

  const renderSimpleForm = () => {
    return (
      <form onSubmit={handleRequestSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription>
              Please fill out all required fields below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {getVisibleFields().map((field) => renderField(field))}
          </CardContent>
        </Card>

        {/* Real-time Price Summary */}
        <PriceSummaryCard
          pricingConfig={pricingConfig}
          formData={formData as Record<string, string | boolean | number>}
          formFields={formFields}
          userOptedForPartialPayment={userOptedForPartialPayment}
          onUserOptedForPartialPaymentChange={setUserOptedForPartialPayment}
        />

        <div className="flex flex-wrap gap-3 sm:gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/vendors')}
          >
            Cancel
          </Button>

          {/* Start Over button for simple form */}
          {hasSavedProgress && (
            <AlertDialog open={showStartOverDialog} onOpenChange={setShowStartOverDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start a new application?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all your current progress and form data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Working</AlertDialogCancel>
                  <AlertDialogAction onClick={handleStartOver} className="bg-destructive hover:bg-destructive/90">
                    Clear & Start Over
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button type="submit" disabled={isSubmitting} className="ml-auto">
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 sm:pt-24 pb-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 sm:pt-24 pb-8">
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Application Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The application you're looking for doesn't exist or has been removed.
              </p>
              <Button asChild>
                <Link to="/vendors">Back to Vendors</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determine if the current step should show price summary (wizard mode only)
  const shouldShowPriceSummaryDesktop = isWizardMode && currentStep?.showPriceSummary && pricingConfig.enabled;

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-20 sm:pt-24 pb-8">
          {/* Responsive layout: side-by-side on desktop when price summary is shown */}
          <div className={`mx-auto ${shouldShowPriceSummaryDesktop ? 'max-w-5xl' : 'max-w-2xl'}`}>
            <div className={`${shouldShowPriceSummaryDesktop ? 'lg:flex lg:gap-8' : ''}`}>
              {/* Main form content */}
              <div className={`space-y-4 sm:space-y-6 ${shouldShowPriceSummaryDesktop ? 'lg:flex-1' : ''}`}>
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/vendors')} className="shrink-0 mt-1 sm:mt-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold leading-tight">{application.title}</h1>
                    {application.description && (
                      <p className="text-sm sm:text-base text-muted-foreground mt-1">{application.description}</p>
                    )}
                  </div>
                </div>

                {/* Saved progress indicator */}
                {hasSavedProgress && !isSubmitted && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Your progress has been saved and restored</span>
                  </div>
                )}

                {formFields.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      This application form has not been configured yet. Please contact an administrator.
                    </CardContent>
                  </Card>
                ) : isWizardMode ? (
                  renderWizardForm()
                ) : (
                  renderSimpleForm()
                )}
              </div>

              {/* Desktop: Sticky price summary on the right */}
              {shouldShowPriceSummaryDesktop && (
                <div className="hidden lg:block lg:w-80 lg:shrink-0">
                  <div className="sticky top-24">
                    <PriceSummaryCard
                      pricingConfig={pricingConfig}
                      formData={formData as Record<string, string | boolean | number>}
                      formFields={formFields}
                      userOptedForPartialPayment={userOptedForPartialPayment}
                      onUserOptedForPartialPaymentChange={setUserOptedForPartialPayment}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
