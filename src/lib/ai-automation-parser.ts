import { Workflow, WorkflowNode, Connection, ITEM_TYPES, TRIGGER_EVENTS, ACTION_CATEGORIES } from '@/components/automation/types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface AIParseRequest {
    description: string;
    userId?: string;
}

export interface AIParseResponse {
    workflow: Workflow;
    confidence: number;
    suggestions?: string[];
}

/**
 * Build a comprehensive prompt for the AI to understand how to generate workflows
 */
function buildPrompt(description: string): string {
    const availableTriggers = ITEM_TYPES.map(item => `${item.value} (${item.label})`).join(', ');
    const availableEvents = TRIGGER_EVENTS.map(event => `${event.value} (${event.label})`).join(', ');

    const availableActions = ACTION_CATEGORIES.map(category => {
        const actions = category.actions.map(a => `  - ${a.value}: ${a.label}`).join('\n');
        return `${category.label}:\n${actions}`;
    }).join('\n\n');

    const exampleWorkflow = {
        id: 'example-1',
        name: 'Email on Event Purchase',
        description: 'Send email when someone purchases an event',
        nodes: [
            {
                id: 'start-node',
                type: 'start',
                position: { x: 100, y: 100 },
                data: {
                    label: 'Trigger',
                    triggerEvents: [
                        {
                            id: 'trigger-1',
                            itemType: 'event',
                            triggerEvent: 'purchase',
                            seq: 1
                        }
                    ]
                }
            },
            {
                id: 'activity-1',
                type: 'activity',
                position: { x: 100, y: 250 },
                data: {
                    label: 'Send Email',
                    actions: [
                        {
                            id: 'action-1',
                            type: 'send_email',
                            label: 'Send Email',
                            category: 'communication',
                            config: {
                                to: '{{user.email}}',
                                subject: 'Thanks for your purchase!',
                                body: 'Thank you for purchasing {{event.name}}'
                            }
                        }
                    ]
                }
            },
            {
                id: 'end-node',
                type: 'end',
                position: { x: 100, y: 400 },
                data: { label: 'End' }
            }
        ],
        connections: [
            {
                id: 'conn-1',
                sourceId: 'start-node',
                targetId: 'activity-1'
            },
            {
                id: 'conn-2',
                sourceId: 'activity-1',
                targetId: 'end-node'
            }
        ],
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    return `You are an automation workflow builder AI. Convert natural language descriptions into structured workflow JSON.

AVAILABLE ITEM TYPES (for triggers):
${availableTriggers}

AVAILABLE TRIGGER EVENTS:
${availableEvents}

AVAILABLE ACTIONS:
${availableActions}

WORKFLOW STRUCTURE RULES:
1. Every workflow must have exactly ONE start node (type: 'start')
2. Every workflow must have exactly ONE end node (type: 'end')
3. Between them, create activity nodes (type: 'activity') that contain actions
4. Start node must have triggerEvents array with at least one trigger
5. Each trigger must specify: itemType (from available item types) and triggerEvent (from available events)
6. Activity nodes contain an actions array
7. Each action must have: id, type (from available actions), label, category, and optional config object
8. All nodes must be connected with connections array
9. Position nodes vertically: start at y:100, activity at y:250, end at y:400 (x:100 for all)
10. Use template variables like {{user.email}}, {{event.name}}, {{class.name}}, etc. in action configs

EXAMPLE INPUT:
"Send email when someone purchases an event"

EXAMPLE OUTPUT:
${JSON.stringify(exampleWorkflow, null, 2)}

IMPORTANT:
- Only use item types and trigger events from the available lists
- Only use action types from the available actions
- Keep workflows simple - typically one trigger and one or two actions
- Generate unique IDs using format: start-node, activity-1, activity-2, action-1, action-2, etc.
- Always return valid JSON matching the example structure
- For email actions, use config: { to, subject, body }
- For SMS actions, use config: { to, message }
- For modal actions, use config: { title, content }

Now convert this description to a workflow JSON:
"${description}"

Return ONLY the JSON workflow object, no other text.`;
}

/**
 * Call Gemini API to generate workflow from natural language
 */
async function callGeminiAPI(prompt: string): Promise<any> {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_api_key_here') {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file. Get your free key from https://aistudio.google.com/app/apikey');
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
                temperature: 0.1, // Low temperature for more consistent, structured output
                maxOutputTokens: 2048,
            }
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
        throw new Error('No response from Gemini API');
    }

    return generatedText;
}

/**
 * Extract JSON from AI response (handles markdown code blocks)
 */
function extractJSON(text: string): any {
    // Remove markdown code blocks if present
    let cleanText = text.trim();

    // Remove ```json and ``` markers
    cleanText = cleanText.replace(/^```json?\s*/i, '').replace(/```\s*$/, '');

    // Try to find JSON object
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Could not find valid JSON in AI response');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * Validate and sanitize the AI-generated workflow
 */
function validateAIResponse(response: any): Workflow {
    // Basic validation
    if (!response.nodes || !Array.isArray(response.nodes)) {
        throw new Error('Invalid workflow: missing nodes array');
    }

    if (!response.connections || !Array.isArray(response.connections)) {
        throw new Error('Invalid workflow: missing connections array');
    }

    // Ensure we have start and end nodes
    const hasStart = response.nodes.some((n: WorkflowNode) => n.type === 'start');
    const hasEnd = response.nodes.some((n: WorkflowNode) => n.type === 'end');

    if (!hasStart || !hasEnd) {
        throw new Error('Invalid workflow: must have both start and end nodes');
    }

    // Generate unique ID if not present
    if (!response.id) {
        response.id = `workflow-${Date.now()}`;
    }

    // Ensure timestamps
    if (!response.createdAt) {
        response.createdAt = new Date().toISOString();
    }
    if (!response.updatedAt) {
        response.updatedAt = new Date().toISOString();
    }

    // Default to inactive
    if (typeof response.isActive === 'undefined') {
        response.isActive = false;
    }

    return response as Workflow;
}

/**
 * Main function: Parse natural language into workflow
 */
export async function parseNaturalLanguageToWorkflow(request: AIParseRequest): Promise<AIParseResponse> {
    try {
        // Build the prompt
        const prompt = buildPrompt(request.description);

        // Call Gemini API
        const aiResponse = await callGeminiAPI(prompt);

        // Extract and parse JSON
        const workflowJSON = extractJSON(aiResponse);

        // Validate the workflow
        const workflow = validateAIResponse(workflowJSON);

        return {
            workflow,
            confidence: 0.85, // Could be enhanced with actual confidence scoring
            suggestions: []
        };
    } catch (error) {
        console.error('AI parsing error:', error);
        throw error;
    }
}

/**
 * Utility: Get example prompts for users
 */
export function getExamplePrompts(): string[] {
    return [
        "Send an email to people who purchase an event",
        "When someone views a class, show them a discount modal",
        "Send SMS to members who register for a raffle",
        "Add 'interested' tag when someone adds a product to cart",
        "Notify admin when someone submits an application",
        "Send confirmation email and SMS when someone purchases a membership"
    ];
}
