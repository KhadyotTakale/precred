import { FormField, WizardConfig, FormStep, StepCondition } from '@/components/FormFieldBuilder';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIFormRequest {
    description: string;
}

export interface AIFormResponse {
    fields: FormField[];
    wizardConfig?: WizardConfig;
    confidence: number;
    suggestions: string[];
}

const FIELD_TYPES = [
    'text', 'email', 'phone', 'textarea', 'select', 'checkbox',
    'number', 'date', 'url', 'readonly_text', 'html_content',
    'terms_agreement', 'signature', 'file_upload'
];

const STEP_TYPES = ['fields', 'stripe_checkout', 'confirmation', 'lead_capture', 'submission', 'send_email'];

/**
 * Build comprehensive prompt for Gemini API
 */
function buildFormPrompt(description: string): string {
    return `You are an expert form builder AI. Convert the following natural language description into a structured form configuration.

AVAILABLE FIELD TYPES:
${FIELD_TYPES.map(type => `- ${type}`).join('\n')}

AVAILABLE STEP TYPES (for multi-step forms):
${STEP_TYPES.map(type => `- ${type}: ${getStepTypeDescription(type)}`).join('\n')}

FORM STRUCTURE REQUIREMENTS:
1. Each field MUST have: id (unique UUID), name (lowercase_snake_case), label, type, required (boolean)
2. Each field CAN have: placeholder, options (for select), validation, conditions, stepId
3. For wizard/multi-step forms: Create WizardConfig with enabled:true and steps array
4. Steps MUST have: id, title, type, sequence (starting at 1)
5. Assign fields to steps using stepId

EXAMPLE 1 - Simple Contact Form:
User: "Create a contact form with name, email, and message"
{
  "fields": [
    {
      "id": "f1",
      "name": "full_name",
      "label": "Full Name",
      "type": "text",
      "required": true,
      "placeholder": "Enter your full name"
    },
    {
      "id": "f2",
      "name": "email",
      "label": "Email Address",
      "type": "email",
      "required": true,
      "placeholder": "you@example.com"
    },
    {
      "id": "f3",
      "name": "message",
      "label": "Message",
      "type": "textarea",
      "required": true,
      "placeholder": "Enter your message..."
    }
  ]
}

EXAMPLE 2 - Multi-Step Registration with Payment:
User: "Create a registration form with personal details, course selection, payment, and confirmation"
{
  "fields": [
    {
      "id": "f1",
      "name": "name",
      "label": "Your Name",
      "type": "text",
      "required": true,
      "stepId": "step1"
    },
    {
      "id": "f2",
      "name": "email",
      "label": "Email",
      "type": "email",
      "required": true,
      "stepId": "step1"
    },
    {
      "id": "f3",
      "name": "course",
      "label": "Select Course",
      "type": "select",
      "required": true,
      "options": ["Web Development", "Data Science", "Mobile App Development"],
      "stepId": "step2"
    }
  ],
  "wizardConfig": {
    "enabled": true,
    "steps": [
      {
        "id": "step1",
        "title": "Personal Details",
        "type": "fields",
        "sequence": 1
      },
      {
        "id": "step2",
        "title": "Course Selection",
        "type": "fields",
        "sequence": 2
      },
      {
        "id": "step3",
        "title": "Payment",
        "type": "stripe_checkout",
        "sequence": 3,
        "stripeConfig": {
          "productName": "Course Registration",
          "productDescription": "Registration fee for selected course",
          "priceAmount": 99,
          "currency": "usd",
          "mode": "payment"
        }
      },
      {
        "id": "step4",
        "title": "Confirmation",
        "type": "confirmation",
        "sequence": 4,
        "confirmationConfig": {
          "actionButtonText": "View Dashboard",
          "actionButtonUrl": "/dashboard"
        }
      }
    ]
  }
}

USER DESCRIPTION:
"${description}"

Generate ONLY valid JSON without any markdown code blocks or explanations. Return form fields and wizard config if it's a multi-step form.`;
}

function getStepTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
        'fields': 'Regular form fields step',
        'stripe_checkout': 'Payment processing with Stripe',
        'confirmation': 'Final confirmation/thank you page',
        'lead_capture': 'Capture lead information',
        'submission': 'Submit form data',
        'send_email': 'Send email notification'
    };
    return descriptions[type] || type;
}

/**
 * Call Gemini API to generate form
 */
async function callGeminiAPI(prompt: string): Promise<any> {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response generated from AI');
    }

    return text;
}

/**
 * Extract clean JSON from AI response
 */
function extractJSON(text: string): any {
    // Remove markdown code blocks
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Failed to parse JSON:', cleaned);
        throw new Error('AI generated invalid JSON response');
    }
}

/**
 * Validate and clean the AI-generated form data
 */
function validateAIResponse(response: any): { fields: FormField[], wizardConfig?: WizardConfig } {
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
    }

    const fields = response.fields;
    if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error('No form fields generated');
    }

    // Validate each field
    const validatedFields: FormField[] = fields.map((field: any, index: number) => {
        // Generate IDs if missing
        const id = field.id || `field_${Date.now()}_${index}`;

        // Ensure required properties
        if (!field.type || !FIELD_TYPES.includes(field.type)) {
            throw new Error(`Invalid field type: ${field.type}`);
        }

        if (!field.name || !field.label) {
            throw new Error(`Field missing name or label`);
        }

        return {
            id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required ?? false,
            placeholder: field.placeholder,
            options: field.options,
            content: field.content,
            checkboxLabel: field.checkboxLabel,
            acceptedFileTypes: field.acceptedFileTypes,
            maxFileSize: field.maxFileSize,
            validation: field.validation,
            stepId: field.stepId,
            conditions: field.conditions,
            conditionLogic: field.conditionLogic
        };
    });

    // Validate wizard config if present
    let wizardConfig: WizardConfig | undefined;
    if (response.wizardConfig && response.wizardConfig.enabled) {
        const steps = response.wizardConfig.steps;
        if (!Array.isArray(steps) || steps.length === 0) {
            throw new Error('Wizard enabled but no steps defined');
        }

        const validatedSteps: FormStep[] = steps.map((step: any, index: number) => {
            const id = step.id || `step_${Date.now()}_${index}`;

            if (!step.type || !STEP_TYPES.includes(step.type)) {
                throw new Error(`Invalid step type: ${step.type}`);
            }

            return {
                id,
                title: step.title || `Step ${step.sequence || index + 1}`,
                description: step.description,
                type: step.type,
                sequence: step.sequence || index + 1,
                conditions: step.conditions,
                conditionLogic: step.conditionLogic,
                showPriceSummary: step.showPriceSummary,
                stripeConfig: step.stripeConfig,
                leadConfig: step.leadConfig,
                emailConfig: step.emailConfig,
                confirmationConfig: step.confirmationConfig
            };
        });

        wizardConfig = {
            enabled: true,
            steps: validatedSteps,
            placeholderFallback: response.wizardConfig.placeholderFallback,
            pdfFilenameTemplate: response.wizardConfig.pdfFilenameTemplate
        };
    }

    return {
        fields: validatedFields,
        wizardConfig
    };
}

/**
 * Main function: Parse natural language to form configuration
 */
export async function parseNaturalLanguageToForm(request: AIFormRequest): Promise<AIFormResponse> {
    try {
        const prompt = buildFormPrompt(request.description);
        const aiResponse = await callGeminiAPI(prompt);
        const formJSON = extractJSON(aiResponse);
        const validated = validateAIResponse(formJSON);

        return {
            fields: validated.fields,
            wizardConfig: validated.wizardConfig,
            confidence: 0.85,
            suggestions: []
        };
    } catch (error: any) {
        console.error('AI form parsing error:', error);
        throw error;
    }
}

/**
 * Get example prompts for users
 */
export function getExampleFormPrompts(): string[] {
    return [
        "Create a contact form with name, email, phone, and message",
        "Build a job application form with personal info, resume upload, and cover letter",
        "Make an event registration form with multi-step wizard: personal details, ticket selection, payment, and confirmation",
        "Create a survey form with multiple choice questions about customer satisfaction",
        "Build a booking form with date selection, time slots, and payment",
        "Make a membership signup form with terms agreement and signature"
    ];
}
