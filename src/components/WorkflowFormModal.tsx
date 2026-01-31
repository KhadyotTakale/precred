import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { elegantAPI } from '@/lib/elegant-api';
import { adminAPI } from '@/lib/admin-api';
import type { 
  AutomationFormConfig, 
  AutomationFormField, 
  AutomationFormStep,
  StepCondition 
} from '@/components/automation/AutomationFormBuilder';
import type { WorkflowFormAction } from '@/hooks/useWorkflowExecution';

interface WorkflowFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  formConfig: AutomationFormConfig;
  triggerData?: Record<string, any>;
  onSubmit: (formData: Record<string, string | boolean>, bookingId?: number) => void;
  title?: string;
  // Workflow context for booking creation
  workflowItemsId?: number;
  itemId?: number;
  itemSlug?: string;
  itemType?: string;
  activityId?: number;
}

export function WorkflowFormModal({
  isOpen,
  onClose,
  formConfig,
  triggerData = {},
  onSubmit,
  title,
  workflowItemsId,
  itemId,
  itemSlug,
  itemType,
  activityId,
}: WorkflowFormModalProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Get form fields and wizard config
  const formFields = formConfig.fields || [];
  const wizardConfig = formConfig.wizardConfig;
  const isWizardMode = wizardConfig?.enabled && wizardConfig.steps.length > 0;
  const allSteps = wizardConfig?.steps?.sort((a, b) => a.sequence - b.sequence) || [];

  // Pre-fill email from user if there's an email field
  useEffect(() => {
    if (user && isOpen) {
      const emailField = formFields.find(f => f.type === 'email');
      if (emailField && !formData[emailField.name]) {
        setFormData(prev => ({
          ...prev,
          [emailField.name]: user.primaryEmailAddress?.emailAddress || ''
        }));
      }
    }
  }, [user, isOpen, formFields]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({});
      setCurrentStepIndex(0);
      setFieldErrors({});
      setTouchedFields({});
    }
  }, [isOpen]);

  // Generic condition evaluator
  const evaluateConditions = useCallback((
    conditions: StepCondition[] | undefined,
    logic: 'all' | 'any' = 'all'
  ): boolean => {
    if (!conditions || conditions.length === 0) return true;

    const evaluateCondition = (condition: StepCondition): boolean => {
      if (!condition.fieldName) return true;

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

    return logic === 'any' 
      ? conditions.some(evaluateCondition) 
      : conditions.every(evaluateCondition);
  }, [formData]);

  // Evaluate step conditions
  const evaluateStepConditions = useCallback((step: AutomationFormStep): boolean => {
    return evaluateConditions(step.conditions, step.conditionLogic || 'all');
  }, [evaluateConditions]);

  // Evaluate field conditions
  const evaluateFieldConditions = useCallback((field: AutomationFormField): boolean => {
    return evaluateConditions(field.conditions, field.conditionLogic || 'all');
  }, [evaluateConditions]);

  // Filter steps based on conditions
  const steps = allSteps.filter(evaluateStepConditions);
  const currentStep = steps[currentStepIndex];

  // Handle step index bounds
  useEffect(() => {
    if (steps.length > 0 && currentStepIndex >= steps.length) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [steps.length, currentStepIndex]);

  // Get visible fields for current step
  const getFieldsForStep = (stepId: string) => {
    return formFields.filter(f => f.stepId === stepId && evaluateFieldConditions(f));
  };

  // Get all visible fields (for simple form mode)
  const getVisibleFields = useCallback(() => {
    return formFields.filter(evaluateFieldConditions);
  }, [formFields, evaluateFieldConditions]);

  const handleFieldChange = useCallback((fieldName: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleFieldBlur = useCallback((fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Validate a single field
  const validateSingleField = useCallback((field: AutomationFormField): string | null => {
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
      if (field.type === 'number' && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          if (field.validation.min !== undefined && numValue < field.validation.min) {
            return `Value must be at least ${field.validation.min}`;
          }
          if (field.validation.max !== undefined && numValue > field.validation.max) {
            return `Value must be at most ${field.validation.max}`;
          }
        }
      }
    }

    return null;
  }, [formData]);

  // Validate fields and return success status
  const validateFields = (fieldsToValidate: AutomationFormField[]): boolean => {
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};

    for (const field of fieldsToValidate) {
      touched[field.name] = true;
      const error = validateSingleField(field);
      if (error) {
        errors[field.name] = error;
      }
    }

    setTouchedFields(prev => ({ ...prev, ...touched }));
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!currentStep) return;

    if (currentStep.type === 'fields') {
      const stepFields = getFieldsForStep(currentStep.id);
      if (!validateFields(stepFields)) return;
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all visible fields
    const visibleFields = getVisibleFields();
    if (!validateFields(visibleFields)) return;

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to submit this form.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build booking_info from form fields (excluding static fields)
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

      // Auto-capture lead if email field exists
      let leadsId: number | undefined;
      const emailField = formFields.find(f => f.type === 'email');
      if (emailField) {
        const emailValue = formData[emailField.name] as string;
        if (emailValue && emailValue.trim()) {
          try {
            // Build lead payload from form data (excluding file/signature fields)
            const excludedTypes = ['file_upload', 'signature', 'readonly_text', 'html_content'];
            const leadPayload: Record<string, any> = { email: emailValue };
            
            formFields.forEach(f => {
              if (!excludedTypes.includes(f.type)) {
                const val = formData[f.name];
                if (val !== undefined && val !== '') {
                  // Skip if value looks like file data
                  if (typeof val === 'string' && (val.startsWith('data:') || val.includes('/vault/'))) {
                    return;
                  }
                  leadPayload[f.name] = val;
                }
              }
            });

            console.log('[WorkflowFormModal] Creating lead with payload:', leadPayload);
            const leadResponse = await adminAPI.createLead(
              { lead_payload: leadPayload, email: emailValue, status: 'new' },
              user.id
            );
            console.log('[WorkflowFormModal] Lead created:', leadResponse);
            leadsId = leadResponse.id;
          } catch (leadError) {
            console.warn('[WorkflowFormModal] Failed to auto-capture lead:', leadError);
            // Continue with submission even if lead capture fails
          }
        }
      }

      // Build application/booking payload
      const applicationPayload: Record<string, any> = {
        booking_info: {
          ...bookingInfo,
          workflow_items_id: workflowItemsId,
          activity_id: activityId,
          source: 'workflow_form',
        },
        application_type: 'workflow_form',
        status: 'submitted',
        price: 0,
        quantity: 1,
      };

      // Include items_id if we have context from the trigger
      if (itemId) {
        applicationPayload.items_id = itemId;
      }

      // Include leads_id if a lead was captured
      if (leadsId) {
        applicationPayload.leads_id = leadsId;
      }

      console.log('[WorkflowFormModal] Creating booking with payload:', applicationPayload);
      const bookingResponse = await elegantAPI.post('/application', applicationPayload, user.id);
      console.log('[WorkflowFormModal] Booking created:', bookingResponse);

      const createdBookingId = (bookingResponse as { id?: number })?.id;

      // Call the onSubmit callback with form data and booking ID
      onSubmit(formData, createdBookingId);
      
      toast({
        title: 'Form Submitted',
        description: 'Your response has been recorded successfully.',
      });

      onClose();
    } catch (error) {
      console.error('[WorkflowFormModal] Form submission error:', error);
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting the form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replace placeholders in text with trigger data and form data
  const replacePlaceholders = useCallback((text: string): string => {
    if (!text) return '';
    return text.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
      // Check form data first
      if (formData[key] !== undefined) {
        return String(formData[key]);
      }
      // Check trigger data with dot notation support
      const parts = key.split('.');
      let value: any = triggerData;
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) break;
      }
      return value !== undefined ? String(value) : match;
    });
  }, [formData, triggerData]);

  // Render a single field
  const renderField = (field: AutomationFormField) => {
    const value = formData[field.name];
    const error = fieldErrors[field.name];
    const isTouched = touchedFields[field.name];

    const commonInputClasses = cn(
      "transition-colors",
      error && isTouched && "border-destructive focus-visible:ring-destructive"
    );

    switch (field.type) {
      case 'readonly_text':
        return (
          <div key={field.id} className="space-y-2">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {replacePlaceholders(field.content || field.label)}
            </p>
          </div>
        );

      case 'html_content':
        return (
          <div key={field.id} className="space-y-2">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: replacePlaceholders(field.content || '') }}
            />
          </div>
        );

      case 'text':
      case 'email':
      case 'phone':
      case 'url':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.type === 'phone' ? 'tel' : field.type}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              required={field.required}
              className={commonInputClasses}
            />
            {error && isTouched && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type="date"
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              required={field.required}
              className={commonInputClasses}
            />
            {error && isTouched && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              name={field.name}
              value={(value as string) || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              required={field.required}
              rows={4}
              className={commonInputClasses}
            />
            {error && isTouched && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(val) => handleFieldChange(field.name, val)}
            >
              <SelectTrigger className={commonInputClasses}>
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
            {error && isTouched && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-2">
            <Checkbox
              id={field.name}
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleFieldChange(field.name, checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor={field.name} className="cursor-pointer">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {error && isTouched && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate progress
  const progressPercentage = isWizardMode && steps.length > 0
    ? ((currentStepIndex + 1) / steps.length) * 100
    : 100;

  // Determine if we're on the last step
  const isLastStep = isWizardMode ? currentStepIndex === steps.length - 1 : true;

  // Get fields to display
  const displayFields = isWizardMode && currentStep?.type === 'fields'
    ? getFieldsForStep(currentStep.id)
    : getVisibleFields();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {title || formConfig.title || 'Complete Form'}
              </DialogTitle>
              {formConfig.description && (
                <DialogDescription className="mt-1">
                  {replacePlaceholders(formConfig.description)}
                </DialogDescription>
              )}
            </div>
          </div>

          {/* Progress bar for wizard mode */}
          {isWizardMode && steps.length > 1 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStepIndex + 1} of {steps.length}</span>
                <span>{currentStep?.title}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </DialogHeader>

        {/* Form Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-6">
            {/* Step title and description in wizard mode */}
            {isWizardMode && currentStep && (
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">{currentStep.title}</h3>
                {currentStep.description && (
                  <p className="text-muted-foreground text-sm">
                    {replacePlaceholders(currentStep.description)}
                  </p>
                )}
              </div>
            )}

            {/* Confirmation step */}
            {isWizardMode && currentStep?.type === 'confirmation' && (
              <Card>
                <CardContent className="py-8 flex flex-col items-center text-center">
                  <CheckCircle2 className="h-16 w-16 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                  <p className="text-muted-foreground">
                    {currentStep.description || 'Your submission has been received.'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Form fields */}
            {(!isWizardMode || currentStep?.type === 'fields') && displayFields.length > 0 && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {displayFields.map((field) => renderField(field))}
                </CardContent>
              </Card>
            )}

            {/* Empty state */}
            {displayFields.length === 0 && (!isWizardMode || currentStep?.type === 'fields') && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No fields configured for this form.
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Footer with navigation */}
        <div className="p-6 pt-4 border-t flex items-center justify-between gap-4">
          <div>
            {isWizardMode && currentStepIndex > 0 && currentStep?.type !== 'confirmation' && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            {currentStep?.type === 'confirmation' ? (
              <Button onClick={onClose}>
                Close
              </Button>
            ) : isLastStep || !isWizardMode ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  formConfig.submitButtonText || 'Submit'
                )}
              </Button>
            ) : (
              <Button onClick={handleNextStep} disabled={isSubmitting}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
