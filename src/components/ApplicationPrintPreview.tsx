import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Printer, Mail, Phone, MapPin, User, Calendar, FileText, Building2 } from "lucide-react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";

interface ApplicationData {
  id: number;
  created_at: string;
  status: string;
  checkout_type?: string;
  payment_status?: string;
  total_amount?: number;
  booking_info?: Record<string, unknown>;
  lead_payload?: Record<string, unknown>;
  booking_slug?: string;
  _leads?: {
    name?: string;
    email?: string;
    lead_payload?: Record<string, unknown>;
  };
  _items?: {
    title?: string;
    slug?: string;
    item_info?: {
      formFields?: FormField[];
      form_fields?: FormField[];
      wizardConfig?: {
        enabled?: boolean;
        steps?: FormStep[];
        placeholderFallback?: string;
        pdfFilenameTemplate?: string;
      };
      wizard_config?: {
        enabled?: boolean;
        steps?: FormStep[];
        placeholderFallback?: string;
        pdfFilenameTemplate?: string;
      };
    };
  };
  _booking_items_of_bookings?: {
    items?: Array<{
      booking_items_info?: Record<string, unknown>;
      _items?: {
        slug?: string;
        title?: string;
        item_info?: {
          formFields?: FormField[];
          form_fields?: FormField[];
          wizardConfig?: {
            enabled?: boolean;
            steps?: FormStep[];
            placeholderFallback?: string;
            pdfFilenameTemplate?: string;
          };
          wizard_config?: {
            enabled?: boolean;
            steps?: FormStep[];
            placeholderFallback?: string;
            pdfFilenameTemplate?: string;
          };
        };
      };
    }>;
  };
  _booking_items_info?: Record<string, unknown>;
  _customers?: {
    Full_name?: string;
  };
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'url' | 'readonly_text' | 'html_content' | 'terms_agreement' | 'signature' | 'file_upload' | 'radio' | string;
  required?: boolean;
  stepId?: string;
  content?: string; // For readonly_text and html_content types
  checkboxLabel?: string; // For terms_agreement type
  options?: string[]; // For select/radio types
}

interface FormStep {
  id: string;
  title: string;
  description?: string;
  type: string;
  sequence: number;
}

interface ApplicationPrintPreviewProps {
  application: ApplicationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
}

export const ApplicationPrintPreview = ({ application, open, onOpenChange, inline = false }: ApplicationPrintPreviewProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!application) return null;

  const leads = application._leads;
  const leadPayload = leads?.lead_payload || application.lead_payload || {};
  const bookingInfo = application.booking_info || {};
  
  // Get booking items from nested structure
  const bookingItems = application._booking_items_of_bookings?.items || [];
  const firstBookingItem = bookingItems[0];
  const bookingItemsInfo = application._booking_items_info || firstBookingItem?.booking_items_info || {};
  
  // Get item_info from direct _items or from nested booking items
  const itemInfo = application._items?.item_info || firstBookingItem?._items?.item_info || {};
  
  // Also check for form fields directly in booking_items_info (form configuration stored with submission)
  const bookingItemsFormFields = (bookingItemsInfo as Record<string, unknown>)?.formFields || 
    (bookingItemsInfo as Record<string, unknown>)?.form_fields;
  const bookingItemsWizardConfig = (bookingItemsInfo as Record<string, unknown>)?.wizardConfig || 
    (bookingItemsInfo as Record<string, unknown>)?.wizard_config;
  
  // Get form fields - try multiple locations (formFields or form_fields naming)
  const formFields: FormField[] = (itemInfo.formFields || itemInfo.form_fields || bookingItemsFormFields || []) as FormField[];
  
  // Get wizard config - try multiple locations (wizardConfig or wizard_config naming)
  const wizardConfig = itemInfo.wizardConfig || itemInfo.wizard_config || bookingItemsWizardConfig;
  const steps = (wizardConfig as { enabled?: boolean; steps?: FormStep[] })?.enabled 
    ? ((wizardConfig as { steps?: FormStep[] }).steps?.filter((s: FormStep) => s.type === 'fields') || []) 
    : [];
  
  // Merge booking_info with booking_items_info (booking_items_info takes precedence for form data)
  const mergedBookingData = { ...bookingInfo, ...bookingItemsInfo };

  // Extract applicant info
  const leadEmail = leads?.email || (leadPayload as Record<string, unknown>).Email || (leadPayload as Record<string, unknown>).email || 'N/A';
  const leadFirstName = (leadPayload as Record<string, unknown>).first_name || (leadPayload as Record<string, unknown>).firstName || '';
  const leadLastName = (leadPayload as Record<string, unknown>).last_name || (leadPayload as Record<string, unknown>).lastName || '';
  const fullNameFromParts = [leadFirstName, leadLastName].filter(Boolean).join(' ');
  const leadName = leads?.name || fullNameFromParts ||
    (leadPayload as Record<string, unknown>).name || (leadPayload as Record<string, unknown>).full_name || (leadPayload as Record<string, unknown>).fullName ||
    (leadPayload as Record<string, unknown>).business_name || (leadPayload as Record<string, unknown>).company_name ||
    (bookingInfo as Record<string, unknown>).name || (bookingInfo as Record<string, unknown>).full_name ||
    (bookingInfo as Record<string, unknown>).business_name || (bookingInfo as Record<string, unknown>).company_name ||
    application._customers?.Full_name || 'Unknown Applicant';

  const applicationTitle = application._items?.title || application.booking_slug || `Application #${application.id}`;
  const phone = (leadPayload as Record<string, unknown>).phone || (leadPayload as Record<string, unknown>).mobile || 
    (bookingInfo as Record<string, unknown>).phone || (bookingInfo as Record<string, unknown>).mobile;
  const city = (leadPayload as Record<string, unknown>).city || (bookingInfo as Record<string, unknown>).city;
  const state = (leadPayload as Record<string, unknown>).state || (bookingInfo as Record<string, unknown>).state;
  const location = [city, state].filter(Boolean).join(', ');

  const formatFieldLabel = (key: string, fields: FormField[]) => {
    // First try to find the label from form_fields
    const field = fields.find(f => f.name === key);
    if (field?.label) return field.label;
    
    // Fallback to formatting the key
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Safe date formatting helper
  const formatDateSafe = (value: string | number | Date | undefined | null, formatStr: string = 'MMMM d, yyyy'): string => {
    if (!value) return 'N/A';
    try {
      const dateVal = new Date(value);
      if (isNaN(dateVal.getTime())) return 'N/A';
      return format(dateVal, formatStr);
    } catch {
      return 'N/A';
    }
  };

  const formatFieldValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const isImageData = (value: unknown): boolean => {
    return typeof value === 'string' && value.startsWith('data:image');
  };

  const isFileData = (value: unknown): boolean => {
    return typeof value === 'string' && value.startsWith('data:') && !isImageData(value);
  };

  // Check if a string value contains HTML content
  const isHtmlString = (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    // Check for common HTML tags
    return /<[a-z][\s\S]*>/i.test(value);
  };

  // Get fallback text from wizard config
  const placeholderFallback = (wizardConfig as { placeholderFallback?: string })?.placeholderFallback || 'N/A';

  // Replace {{placeholder}} fields with values from merged booking data
  const replacePlaceholders = (text: string): string => {
    if (!text) return '';
    
    // Format created_at date for special placeholders
    const createdAtDate = new Date(application.created_at);
    const formattedDay = format(createdAtDate, 'MMMM d, yyyy');
    const formattedDateTime = format(createdAtDate, 'MMMM d, yyyy h:mm a');
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      // Handle special date placeholders
      if (fieldName === 'current_day') return formattedDay;
      if (fieldName === 'current_datetime') return formattedDateTime;
      
      const value = mergedBookingData[fieldName];
      // Replace with fallback text if value is null, undefined, or empty
      if (value === undefined || value === null || value === '') {
        return placeholderFallback;
      }
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    });
  };

  // Generate PDF filename from template
  const generatePdfFilename = (): string => {
    const template = (wizardConfig as { pdfFilenameTemplate?: string })?.pdfFilenameTemplate;
    
    if (!template) {
      // Default filename
      return `application-${String(leadName).replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${application.id}.pdf`;
    }
    
    const now = new Date();
    const createdAt = new Date(application.created_at);
    
    // Replace system placeholders
    let filename = template
      .replace(/\{\{booking_slug\}\}/g, application.booking_slug || `app-${application.id}`)
      .replace(/\{\{date_mm_dd_yyyy\}\}/g, format(now, 'MM-dd-yyyy'))
      .replace(/\{\{date_dd_mm_yyyy\}\}/g, format(now, 'dd-MM-yyyy'))
      .replace(/\{\{datetime\}\}/g, format(now, 'yyyy-MM-dd-HHmmss'))
      .replace(/\{\{status\}\}/g, application.status || 'pending')
      .replace(/\{\{submission_date\}\}/g, format(createdAt, 'MM-dd-yyyy'))
      .replace(/\{\{application_id\}\}/g, String(application.id));
    
    // Replace form field placeholders
    filename = filename.replace(/\{\{(\w+)\}\}/g, (match, fieldName) => {
      const value = mergedBookingData[fieldName];
      if (value === undefined || value === null || value === '') {
        return '';
      }
      return String(value);
    });
    
    // Sanitize filename: remove invalid characters and clean up
    filename = filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single dash
      .replace(/^-|-$/g, '') // Remove leading/trailing dashes
      .trim();
    
    // Ensure .pdf extension
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }
    
    return filename || `application-${application.id}.pdf`;
  };

  // Get field definition by name
  const getFieldDefinition = (key: string): FormField | undefined => {
    return formFields.find(f => f.name === key);
  };

  // Keys to exclude from rendering (configuration/metadata fields)
  const excludedKeys = new Set([
    'formFields', 'form_fields', 'wizardConfig', 'wizard_config', 
    'builderConfig', 'builder_config', 'pricingConfig', 'pricing_config',
    'conditionalLogic', 'conditional_logic', 'fieldConditions', 'field_conditions',
    'stepConditions', 'step_conditions', 'confirmationConfig', 'confirmation_config',
    'leadCaptureConfig', 'lead_capture_config', 'stripeConfig', 'stripe_config',
    'emailConfig', 'email_config', 'sendEmailConfig', 'send_email_config',
    '_items', '_leads', '_customers', '_booking_items', 'item_info'
  ]);

  // Group fields by steps if wizard is enabled
  const getGroupedFields = () => {
    const dataKeys = Object.keys(mergedBookingData).filter(k => !excludedKeys.has(k));
    
    // Get all HTML content fields from form definition (regardless of step assignment)
    const allHtmlFields = formFields.filter(f => 
      ['html_content', 'html', 'readonly_text', 'terms_agreement'].includes(f.type) && f.content
    );
    
    if (steps.length > 0 && formFields.length > 0) {
      // Group by step - include ALL field types from form configuration
      const grouped: { title: string; fields: { key: string; value: unknown; label: string; fieldDef?: FormField }[] }[] = [];
      const includedFieldNames = new Set<string>();
      
      steps.forEach((step: FormStep) => {
        const stepFields = formFields
          .filter(f => f.stepId === step.id)
          .map(f => {
            // Field types that have static content (not user input)
            const isStaticContentField = ['html_content', 'html', 'readonly_text', 'terms_agreement'].includes(f.type);
            const hasDataValue = dataKeys.includes(f.name);
            
            // Include field if it has a value in merged data OR it's a static content field
            if (hasDataValue || (isStaticContentField && f.content)) {
              includedFieldNames.add(f.name);
              return {
                key: f.name,
                value: hasDataValue ? mergedBookingData[f.name] : (f.content || ''),
                label: f.label || formatFieldLabel(f.name, formFields),
                fieldDef: f // Pass the full field definition including content
              };
            }
            return null;
          })
          .filter((f): f is NonNullable<typeof f> => f !== null);
        
        if (stepFields.length > 0) {
          grouped.push({ title: step.title, fields: stepFields });
        }
      });

      // Include HTML fields that weren't assigned to any step
      const unassignedHtmlFields = allHtmlFields
        .filter(f => !includedFieldNames.has(f.name))
        .map(f => ({
          key: f.name,
          value: f.content || '',
          label: f.label || formatFieldLabel(f.name, formFields),
          fieldDef: f
        }));
      
      if (unassignedHtmlFields.length > 0) {
        // Add to first group or create new group
        if (grouped.length > 0) {
          grouped[0].fields.unshift(...unassignedHtmlFields);
        } else {
          grouped.push({ title: 'Application Details', fields: unassignedHtmlFields });
        }
      }

      return grouped;
    }

    // No wizard - combine merged data fields with any static content fields from form definition
    const staticContentFields = allHtmlFields
      .filter(f => !dataKeys.includes(f.name))
      .map(f => ({
        key: f.name,
        value: f.content || '',
        label: f.label || formatFieldLabel(f.name, formFields),
        fieldDef: f
      }));

    const dataFields = dataKeys.map(k => ({
      key: k,
      value: mergedBookingData[k],
      label: formatFieldLabel(k, formFields),
      fieldDef: getFieldDefinition(k)
    }));

    return [{
      title: 'Application Details',
      fields: [...staticContentFields, ...dataFields]
    }];
  };

  const groupedFields = getGroupedFields();

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2); // 180mm usable
      let y = margin;

      // Helper to wrap and fit text within content width
      const wrapText = (text: string, maxWidth: number, fontSize: number = 10): string[] => {
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(text, maxWidth);
      };

      // Helper to render HTML content with basic formatting
      const renderHtmlContent = (html: string, startY: number, maxWidth: number): number => {
        let currentY = startY;
        
        // Replace placeholders first
        const processedHtml = replacePlaceholders(html);
        
        // Parse HTML and render with formatting
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedHtml;
        
        const processNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim();
            if (text) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const lines = wrapText(text, maxWidth, 9);
              lines.forEach((line: string) => {
                if (currentY > pageHeight - 20) {
                  doc.addPage();
                  currentY = margin;
                }
                doc.text(line, margin + 2, currentY);
                currentY += 4;
              });
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tagName = el.tagName.toLowerCase();
            
            // Handle different HTML elements
            if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
              const fontSize = tagName === 'h1' ? 14 : tagName === 'h2' ? 12 : 11;
              doc.setFontSize(fontSize);
              doc.setFont('helvetica', 'bold');
              const text = el.textContent?.trim() || '';
              const lines = wrapText(text, maxWidth, fontSize);
              lines.forEach((line: string) => {
                if (currentY > pageHeight - 20) {
                  doc.addPage();
                  currentY = margin;
                }
                doc.text(line, margin + 2, currentY);
                currentY += fontSize * 0.5;
              });
              currentY += 2;
            } else if (tagName === 'p') {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              const text = el.textContent?.trim() || '';
              if (text) {
                const lines = wrapText(text, maxWidth, 9);
                lines.forEach((line: string) => {
                  if (currentY > pageHeight - 20) {
                    doc.addPage();
                    currentY = margin;
                  }
                  doc.text(line, margin + 2, currentY);
                  currentY += 4;
                });
                currentY += 2;
              }
            } else if (tagName === 'strong' || tagName === 'b') {
              doc.setFont('helvetica', 'bold');
              const text = el.textContent?.trim() || '';
              if (text) {
                const lines = wrapText(text, maxWidth, 9);
                lines.forEach((line: string) => {
                  if (currentY > pageHeight - 20) {
                    doc.addPage();
                    currentY = margin;
                  }
                  doc.text(line, margin + 2, currentY);
                  currentY += 4;
                });
              }
              doc.setFont('helvetica', 'normal');
            } else if (tagName === 'ul' || tagName === 'ol') {
              let listIndex = 1;
              el.querySelectorAll(':scope > li').forEach((li) => {
                const bullet = tagName === 'ul' ? '•' : `${listIndex}.`;
                const text = li.textContent?.trim() || '';
                if (text) {
                  doc.setFontSize(9);
                  const lines = wrapText(text, maxWidth - 8, 9);
                  lines.forEach((line: string, idx: number) => {
                    if (currentY > pageHeight - 20) {
                      doc.addPage();
                      currentY = margin;
                    }
                    if (idx === 0) {
                      doc.text(`${bullet} ${line}`, margin + 4, currentY);
                    } else {
                      doc.text(line, margin + 8, currentY);
                    }
                    currentY += 4;
                  });
                }
                listIndex++;
              });
              currentY += 2;
            } else if (tagName === 'br') {
              currentY += 3;
            } else {
              // Process children for other elements
              el.childNodes.forEach(child => processNode(child));
            }
          }
        };
        
        tempDiv.childNodes.forEach(child => processNode(child));
        return currentY;
      };

      // Header with title - wrap if needed
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Reference number prominently at top
      let titleY = 12;
      if (application.booking_slug) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text(`#${application.booking_slug.toUpperCase()}`, pageWidth / 2, titleY, { align: 'center' });
        titleY += 8;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      
      // Wrap title if too long
      const titleLines = wrapText(applicationTitle, contentWidth - 10, 16);
      titleLines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, titleY, { align: 'center' });
        titleY += 7;
      });
      
      // Status, checkout type, and payment info
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const statusText = typeof application.status === 'string' ? application.status.toUpperCase() : 'UNKNOWN';
      const checkoutText = typeof application.checkout_type === 'string' && application.checkout_type ? application.checkout_type : 'Cash/Check';
      const paymentText = typeof application.payment_status === 'string' && application.payment_status ? application.payment_status : 'Pending';
      const headerInfo = `Status: ${statusText} • Checkout: ${checkoutText} • Payment: ${paymentText} • Submitted: ${formatDateSafe(application.created_at)}`;
      doc.text(headerInfo, pageWidth / 2, titleY + 3, { align: 'center' });

      if (application.total_amount && application.total_amount > 0) {
        doc.text(`Amount: $${Number(application.total_amount).toFixed(2)}`, pageWidth / 2, titleY + 9, { align: 'center' });
        y = titleY + 18;
      } else {
        y = titleY + 12;
      }

      // Get all lead payload fields for comprehensive display
      const leadPayloadFields = Object.entries(leadPayload as Record<string, unknown>)
        .filter(([key, val]) => val !== null && val !== undefined && val !== '' && typeof val !== 'object')
        .map(([key, val]) => ({
          label: formatFieldLabel(key, formFields),
          value: String(val)
        }));

      // Calculate dynamic box height based on content
      const baseFields = 2; // Name and Email always shown
      const extraFields = leadPayloadFields.filter(f => 
        !f.label.toLowerCase().includes('name') && 
        !f.label.toLowerCase().includes('email')
      ).length;
      const totalRows = Math.ceil((baseFields + extraFields) / 2);
      const boxHeight = Math.max(24, 12 + (totalRows * 7));

      // Applicant Information Box
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('APPLICANT INFORMATION', margin + 4, y + 6);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      
      let infoY = y + 13;
      let colIndex = 0;
      
      // Name - wrap if needed
      doc.setFont('helvetica', 'bold');
      doc.text('Name:', margin + 4, infoY);
      doc.setFont('helvetica', 'normal');
      const nameText = String(leadName);
      const nameLines = wrapText(nameText, 60, 9);
      doc.text(nameLines[0], margin + 18, infoY);
      colIndex++;
      
      // Email - wrap if needed
      doc.setFont('helvetica', 'bold');
      doc.text('Email:', margin + contentWidth / 2, infoY);
      doc.setFont('helvetica', 'normal');
      const emailText = String(leadEmail);
      const emailMaxWidth = contentWidth / 2 - 20;
      const emailLines = wrapText(emailText, emailMaxWidth, 9);
      doc.text(emailLines[0], margin + contentWidth / 2 + 14, infoY);
      colIndex++;
      
      // Add remaining lead payload fields
      const remainingFields = leadPayloadFields.filter(f => 
        !f.label.toLowerCase().includes('name') && 
        !f.label.toLowerCase().includes('email')
      );
      
      for (const field of remainingFields) {
        if (colIndex % 2 === 0) {
          infoY += 7;
        }
        const xPos = colIndex % 2 === 0 ? margin + 4 : margin + contentWidth / 2;
        const labelWidth = Math.min(field.label.length * 2 + 2, 25);
        
        doc.setFont('helvetica', 'bold');
        const truncatedLabel = field.label.length > 12 ? field.label.substring(0, 12) + ':' : field.label + ':';
        doc.text(truncatedLabel, xPos, infoY);
        doc.setFont('helvetica', 'normal');
        const valueMaxWidth = contentWidth / 2 - labelWidth - 10;
        const valueLines = wrapText(field.value, valueMaxWidth, 9);
        doc.text(valueLines[0], xPos + labelWidth, infoY);
        colIndex++;
      }

      y += boxHeight + 8;

      // Form sections
      for (const group of groupedFields) {
        if (group.fields.length === 0) continue;

        // Check if we need a new page
        if (y > pageHeight - 50) {
          doc.addPage();
          y = margin;
        }

        // Section title
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        
        // Wrap section title if needed
        const sectionTitle = group.title.toUpperCase();
        const sectionTitleLines = wrapText(sectionTitle, contentWidth - 8, 9);
        doc.text(sectionTitleLines[0], margin + 4, y + 5.5);
        y += 12;

        // Fields
        for (let i = 0; i < group.fields.length; i++) {
          const field = group.fields[i];
          const fieldDef = field.fieldDef;
          const fieldType = fieldDef?.type || 'text';
          const value = field.value;
          const formattedValue = formatFieldValue(value);
          const isImage = isImageData(value);
          const isFile = isFileData(value);
          const isHtmlContentType = fieldType === 'html_content' || fieldType === 'html';
          const isReadonlyText = fieldType === 'readonly_text';
          const isCheckbox = fieldType === 'checkbox';
          const isTermsAgreement = fieldType === 'terms_agreement';
          // Check if the value itself contains HTML (for fields that store HTML content)
          const valueContainsHtml = !isHtmlContentType && !isTermsAgreement && !isReadonlyText && 
            !isImage && !isFile && !isCheckbox && isHtmlString(value);

          // Check for page break
          if (y > pageHeight - (isImage ? 45 : 20)) {
            doc.addPage();
            y = margin;
          }

          // Skip label for HTML content type fields
          if (!isHtmlContentType) {
            // Field label - wrap if needed
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(120, 120, 120);
            const labelLines = wrapText(field.label.toUpperCase(), contentWidth - 4, 7);
            doc.text(labelLines[0], margin + 2, y);
            y += 3;
          }

          // Field value
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);

          if (isHtmlContentType || isReadonlyText) {
            // Render HTML content with formatting
            const rawContent = fieldDef?.content || String(value || '');
            if (rawContent) {
              doc.setFillColor(248, 248, 248);
              const startY = y;
              y = renderHtmlContent(rawContent, y + 2, contentWidth - 8);
              y += 4;
            }
          } else if (isTermsAgreement) {
            // For terms agreement: render HTML content properly + checkbox state
            const termsContent = fieldDef?.content || '';
            if (termsContent) {
              doc.setFillColor(248, 248, 248);
              y = renderHtmlContent(termsContent, y + 2, contentWidth - 8);
              y += 2;
            }
            const isChecked = value === true || value === 'true' || value === 'Yes';
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(isChecked ? 34 : 180, isChecked ? 139 : 60, isChecked ? 34 : 60);
            const checkboxLabel = fieldDef?.checkboxLabel || (isChecked ? 'Agreed to terms' : 'Not agreed');
            doc.text(isChecked ? `✓ ${checkboxLabel}` : `✗ ${checkboxLabel}`, margin + 2, y + 3);
            doc.setTextColor(30, 30, 30);
            y += 8;
          } else if (isCheckbox) {
            const isChecked = value === true || value === 'true' || value === 'Yes';
            doc.text(isChecked ? '☑ Yes' : '☐ No', margin + 2, y + 3);
            y += 8;
          } else if (isImage) {
            try {
              const imgFormat = String(value).includes('image/png') ? 'PNG' : 'JPEG';
              doc.addImage(String(value), imgFormat, margin + 2, y, 45, 22);
              y += 26;
            } catch {
              doc.text('[Image could not be rendered]', margin + 2, y + 3);
              y += 6;
            }
          } else if (isFile) {
            doc.setTextColor(59, 130, 246);
            doc.text('[File uploaded]', margin + 2, y + 3);
            doc.setTextColor(30, 30, 30);
            y += 8;
          } else if (valueContainsHtml) {
            // Render HTML string values with formatting
            y = renderHtmlContent(String(value), y + 2, contentWidth - 8);
            y += 4;
          } else if (fieldType === 'date' && value) {
            doc.text(formatDateSafe(String(value)) !== 'N/A' ? formatDateSafe(String(value)) : (formattedValue || '-'), margin + 2, y + 3);
            y += 8;
          } else {
            // Wrap long text to fit within content width
            const lines = wrapText(formattedValue || '-', contentWidth - 6, 9);
            lines.forEach((line: string) => {
              if (y > pageHeight - 15) {
                doc.addPage();
                y = margin;
              }
              doc.text(line, margin + 2, y + 3);
              y += 4;
            });
            y += 3;
          }
        }

        y += 4; // Section spacing
      }

      // Footer
      const footerY = pageHeight - 10;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')} • Application ID: ${application.id}`, pageWidth / 2, footerY, { align: 'center' });

      // Save PDF
      const fileName = generatePdfFilename();
      doc.save(fileName);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Content to render (shared between inline and dialog modes)
  const previewContent = (
    <div className="print-application bg-background text-foreground print:bg-white print:text-black">
      <div className="max-w-[210mm] mx-auto p-6 md:p-8 space-y-6" style={{ minHeight: inline ? 'auto' : '297mm' }}>
        {/* Document Header - Print Optimized */}
        <div className="text-center pb-6 border-b-2 border-border print:border-gray-300">
          {/* Reference Number - Prominent */}
          {application.booking_slug && (
            <div className="mb-4">
              <span className="inline-block bg-primary/10 text-primary font-mono font-bold text-lg px-5 py-2 rounded-lg tracking-wider border border-primary/20 print:bg-gray-100 print:text-gray-900 print:border-gray-300">
                Reference: #{application.booking_slug.toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 mb-3">
            <FileText className="h-7 w-7 text-primary print:text-gray-700" />
            <h1 className="text-2xl md:text-3xl font-bold">{typeof leads?.name === 'string' ? leads.name : applicationTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Submitted: {formatDateSafe(application.created_at, 'MMMM d, yyyy \'at\' h:mm a')}
            </span>
            <Badge 
              variant={
                application.status === 'approved' ? 'default' :
                application.status === 'rejected' ? 'destructive' :
                application.status === 'pending' ? 'outline' :
                'secondary'
              }
              className={`capitalize text-sm px-3 py-1 ${application.status === 'approved' ? 'bg-green-600 print:bg-green-100 print:text-green-800 print:border-green-300' : ''}`}
            >
              Status: {typeof application.status === 'string' ? application.status : 'Unknown'}
            </Badge>
            <Badge 
              variant="outline"
              className="capitalize text-sm px-3 py-1"
            >
              Checkout: {typeof application.checkout_type === 'string' && application.checkout_type ? application.checkout_type : 'Cash/Check'}
            </Badge>
            <Badge 
              variant={
                application.payment_status === 'paid' ? 'default' :
                application.payment_status === 'failed' ? 'destructive' :
                'outline'
              }
              className={`capitalize text-sm px-3 py-1 ${application.payment_status === 'paid' ? 'bg-green-600 print:bg-green-100 print:text-green-800 print:border-green-300' : ''}`}
            >
              Payment: {typeof application.payment_status === 'string' && application.payment_status ? application.payment_status : 'Pending'}
            </Badge>
            {application.total_amount && application.total_amount > 0 && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                Total: ${Number(application.total_amount).toFixed(2)}
              </Badge>
            )}
          </div>
        </div>

        {/* Applicant Summary Card */}
        <div className="bg-muted/50 rounded-lg p-5 border border-border print:bg-gray-50 print:border-gray-200">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2 pb-2 border-b border-border/50">
            <User className="h-4 w-4 text-primary print:text-gray-600" />
            Applicant Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Always show Name */}
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Name</p>
                <p className="font-semibold text-foreground">{String(leadName)}</p>
              </div>
            </div>
            {/* Always show Email */}
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                <p className="font-medium text-foreground break-all">{String(leadEmail)}</p>
              </div>
            </div>
            {/* Dynamically render all lead_payload fields */}
            {Object.entries(leadPayload as Record<string, unknown>)
              .filter(([key, val]) => {
                // Skip name and email as they're already shown
                const keyLower = key.toLowerCase();
                if (keyLower.includes('name') || keyLower.includes('email')) return false;
                // Skip null, undefined, empty, or object values
                return val !== null && val !== undefined && val !== '' && typeof val !== 'object';
              })
              .map(([key, val]) => {
                const label = formatFieldLabel(key, formFields);
                const isPhone = key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile');
                const isLocation = key.toLowerCase().includes('address') || key.toLowerCase().includes('city') || key.toLowerCase().includes('location');
                
                return (
                  <div key={key} className="flex items-start gap-3">
                    {isPhone ? (
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    ) : isLocation ? (
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="font-medium text-foreground break-words">{String(val)}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Form Data Sections - All on One Page */}
        {groupedFields.length > 0 ? (
          <div className="space-y-6 print:space-y-4">
            {groupedFields.map((group, groupIndex) => (
              <div key={groupIndex} className="border border-border rounded-lg overflow-hidden print:break-inside-avoid print:border-gray-200">
                {/* Section Header */}
                <div className="bg-muted/70 px-5 py-3 border-b border-border print:bg-gray-100 print:border-gray-200">
                  <h3 className="font-bold text-foreground flex items-center gap-2 text-base">
                    <Building2 className="h-5 w-5 text-primary print:text-gray-600" />
                    <span className="uppercase tracking-wide">Section {groupIndex + 1}: {group.title}</span>
                  </h3>
                </div>
                {/* Section Content */}
                <div className="p-5 space-y-5 bg-background print:bg-white">
                  {group.fields.map((field, fieldIndex) => {
                    const value = field.value;
                    const fieldDef = field.fieldDef;
                    const isHtmlContentType = fieldDef?.type === 'html_content' || fieldDef?.type === 'html';
                    const isTermsAgreement = fieldDef?.type === 'terms_agreement';
                    const isSignature = fieldDef?.type === 'signature' || 
                      (field.key.toLowerCase().includes('signature') && isImageData(value));
                    const isImage = isImageData(value) && !isSignature;
                    const isFile = isFileData(value);
                    // Check if the value itself contains HTML (for fields that store HTML content)
                    const valueContainsHtml = !isHtmlContentType && !isTermsAgreement && !isSignature && !isImage && !isFile && isHtmlString(value);

                    // For HTML content type fields, render the actual HTML with placeholders replaced
                    if (isHtmlContentType && (fieldDef?.content || typeof value === 'string')) {
                      const htmlContent = fieldDef?.content || String(value);
                      return (
                        <div key={fieldIndex} className="border-b border-border/50 last:border-0 pb-5 last:pb-0 print:break-inside-avoid">
                          {fieldDef?.label && (
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                              {fieldDef.label}
                            </p>
                          )}
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border/50 print:bg-gray-50 print:border-gray-200"
                            dangerouslySetInnerHTML={{ __html: replacePlaceholders(htmlContent) }}
                          />
                        </div>
                      );
                    }

                    // For Terms Agreement, show the HTML content with placeholders replaced and whether it was accepted
                    if (isTermsAgreement) {
                      const isAccepted = value === true || value === 'true' || value === 'accepted';
                      return (
                        <div key={fieldIndex} className="border-b border-border/50 last:border-0 pb-5 last:pb-0 print:break-inside-avoid">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                            {field.label}
                          </p>
                          {fieldDef?.content && (
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border/50 max-h-64 overflow-y-auto mb-3 print:bg-gray-50 print:border-gray-200 print:max-h-none"
                              dangerouslySetInnerHTML={{ __html: replacePlaceholders(fieldDef.content) }}
                            />
                          )}
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold ${isAccepted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 print:bg-green-50 print:text-green-800' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 print:bg-red-50 print:text-red-800'}`}>
                            {isAccepted ? '✓ Terms Accepted' : '✗ Terms Not Accepted'}
                          </div>
                        </div>
                      );
                    }

                    // Helper to download image
                    const handleDownloadImage = (dataUrl: string, fileName: string) => {
                      const link = document.createElement('a');
                      link.href = dataUrl;
                      link.download = fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    };

                    // Helper to print image
                    const handlePrintImage = (dataUrl: string, title: string) => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head><title>${title}</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                              <img src="${dataUrl}" style="max-width:100%;max-height:100vh;" />
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.onload = () => {
                          printWindow.print();
                        };
                      }
                    };

                    return (
                      <div key={fieldIndex} className="border-b border-border/50 last:border-0 pb-4 last:pb-0 print:break-inside-avoid">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          {field.label}
                        </p>
                        {isSignature ? (
                          <div className="mt-2 space-y-3">
                            <div className="inline-block bg-white border-2 border-border rounded-lg p-3 print:border-gray-300">
                              <img 
                                src={String(value)} 
                                alt="Signature" 
                                className="max-h-24 w-auto"
                              />
                            </div>
                            <div className="flex gap-2 print:hidden">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadImage(String(value), `signature-${application.id}.png`)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePrintImage(String(value), 'Signature')}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Print
                              </Button>
                            </div>
                          </div>
                        ) : isImage ? (
                          <div className="mt-2 space-y-3">
                            <div className="inline-block border border-border rounded-lg overflow-hidden print:border-gray-300">
                              <img 
                                src={String(value)} 
                                alt={field.label}
                                className="max-h-64 w-auto object-contain"
                              />
                            </div>
                            <div className="flex gap-2 print:hidden">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDownloadImage(String(value), `${field.key}-${application.id}.png`)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handlePrintImage(String(value), field.label)}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Print
                              </Button>
                            </div>
                          </div>
                        ) : isFile ? (
                          <Badge variant="secondary" className="mt-1">
                            <FileText className="h-3 w-3 mr-1" />
                            File uploaded
                          </Badge>
                        ) : valueContainsHtml ? (
                          <div 
                            className="prose prose-sm max-w-none dark:prose-invert break-words overflow-hidden [&_table]:w-full [&_table]:table-fixed [&_table]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap mt-1"
                            dangerouslySetInnerHTML={{ __html: replacePlaceholders(String(value)) }}
                          />
                        ) : (
                          <p className="text-sm font-medium text-foreground whitespace-pre-wrap bg-muted/30 px-3 py-2 rounded-md inline-block print:bg-gray-50">
                            {formatFieldValue(value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No form data available</p>
            <p className="text-sm">The application data could not be retrieved</p>
          </div>
        )}

        {/* Document Footer */}
        <div className="pt-6 mt-6 border-t-2 border-border print:border-gray-300">
          <div className="flex flex-wrap justify-between items-center gap-4 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="font-medium">Application ID: <span className="font-mono">{application.id}</span></p>
              {application.booking_slug && (
                <p className="font-medium">Reference: <span className="font-mono">#{application.booking_slug.toUpperCase()}</span></p>
              )}
              {leads?.name && (
                <p className="font-medium">Lead Name: <span className="text-foreground">{leads.name}</span></p>
              )}
            </div>
            <div className="text-right space-y-1">
              <p>Document generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
              <p className="print:hidden">This is an official application document</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Inline mode - render content directly without Dialog wrapper
  if (inline) {
    return (
      <div className="bg-background rounded-lg">
        <div className="flex items-center justify-end gap-2 mb-4 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={generatePDF}
            disabled={isGeneratingPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
        {previewContent}
      </div>
    );
  }

  // Dialog mode - wrap content in Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">Application Preview</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={generatePDF}
                disabled={isGeneratingPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(95vh-80px)]">
          {previewContent}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
