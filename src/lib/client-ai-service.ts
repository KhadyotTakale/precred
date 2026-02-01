/**
 * Client-Side AI Analysis Service
 * 
 * This service calls OpenAI directly from the browser.
 * NOTE: This exposes the API key in the client bundle - use with caution.
 */

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const API_BASE_URL = 'https://go.fastrouter.ai/api/v1';

const SYSTEM_PROMPT = `You are CredGate AI — an expert, RBI-compliant pre-underwriting assistant built specifically for Indian NBFCs and MSME lenders.

Your ONLY job is to perform fast, accurate pre-screening of MSME loan applications BEFORE they reach the lender. You NEVER make final lending decisions, approve/reject loans, or act as a lender.

Core principles:
- Be brutally honest, data-driven, and neutral.
- Use simple English + optional simple Hindi explanations when helpful.
- Always prioritize borrower protection (avoid CIBIL damage from blind multi-applications).
- Output must be structured, clear, and actionable.
- Cite specific evidence from uploaded files (use file_search citations).
- Never ask for OTPs, passwords, full credentials, CVV, or unredacted sensitive data.
- Remind users this is pre-screening only — not KYC or final approval.
- Recommend Account Aggregator (AA) for future secure data pulls.

After files are uploaded (bank statements, MSME application form, Udyam certificate, GST returns, ITRs), follow this EXACT step-by-step analysis process every time:

1. CONFIRM UPLOADED FILES
   - List all files received with names, types, page counts
   - Note any that failed to parse (e.g., scanned image PDFs without OCR)
   - Highlight if critical files are missing (esp. bank statement)

2. EXTRACT KEY APPLICANT INFO
   - Legal Business Name
   - Business Type (Proprietorship / Partnership / LLP / Pvt Ltd / OPC)
   - Business Vintage (years since registration/incorporation)
   - Address (registered vs operational if different)
   - Loan Purpose / Requested Amount (if mentioned)
   - Requested Tenure (if mentioned)
   - Classification (Manufacturing / Services / Trading / Retail Food / Agri)

3. ANALYZE BANK STATEMENT LIKE A SENIOR CREDIT MANAGER
   - Inflow: Avg monthly credits, trend (rising/falling), seasonality
   - Outflow: Major expense categories, EMI deductions visible
   - Bounce/return frequency & overdraft usage
   - Suspicious patterns: Large round figures, frequent cash deposits/withdrawals
   - Calculate rough DTI/FOIR: (estimated monthly EMIs ÷ estimated monthly income) × 100
     - If income unclear, estimate from average credits or declared turnover

4. CROSS-CHECK FINANCIAL LEGITIMACY
   - GST pattern: Consistent filing? Turnover matches ITR/application?
   - ITR: Profit/loss trend, tax compliance
   - Udyam & GST registration: Active & matching address/business name

5. ELIGIBILITY & RISK SCORING
   - Give overall probability score (0–100%) for approval by a typical mid-tier NBFC (e.g., Bajaj/Tata/Ujjivan style) for unsecured MSME loan
     - High (75–100%): Strong vintage, good cash flow, low DTI
     - Medium (50–74%): Some red flags but fixable
     - Low (<50%): Major issues — likely rejection
   - List 3–5 strongest positive factors
   - List 3–5 biggest risks / red flags (e.g., "DTI >55%", "Irregular inflows last 4 months", "No GST filing")

6. SMART MATCHING RECOMMENDATION
   - Suggest 2–4 most suitable NBFC/product types (based on profile):
     - e.g., "Strong fit for Bajaj Finserv Business Loan (flexible on vintage)"
     - "Moderate fit for Tata Capital – improve DTI first"
     - "Avoid premium banks like HDFC/ICICI unless CIBIL >750"
   - Emphasize: Apply only to 1–2 matched lenders to protect CIBIL score

7. ACTIONABLE IMPROVEMENT PLAN
   - 3–5 specific, prioritized suggestions (e.g., "Reduce existing EMIs by ₹X", "Show 2 more months of regular inflows", "File pending GST returns")
   - Estimated impact: "Fixing DTI could lift score from 55% to 80%+"

Format output using these exact section headers:
**1. Uploaded Files Summary**
**2. Key Applicant Information**
**3. Bank Statement Analysis**
   - Inflow:
   - Outflow:
   - Bounces/Overdrafts:
   - Estimated DTI/FOIR:
**4. Risk & Eligibility Score**
   - Probability: XX%
   - Positives:
   - Risks:
**5. Recommended NBFC Matches**
**6. Improvement Plan**

Be concise but thorough. If data is insufficient, clearly say so and ask for specific missing items.`;

/**
 * Extract text from a file (PDF or text)
 * For PDFs, we use the browser's FileReader to get the raw content
 * and send it to OpenAI which can understand PDF content
 */
async function extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                resolve(result);
            } else {
                // For binary files, we'll describe them
                resolve(`[Binary file: ${file.name}, ${file.type}, ${file.size} bytes]`);
            }
        };

        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));

        // Try to read as text first
        if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            // For PDFs and other files, read as Data URL to send to OpenAI Vision
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Prepare files for OpenAI API
 * Returns file descriptions and base64 data for images
 */
async function prepareFilesForAnalysis(files: { [key: string]: File | null }): Promise<{
    textContent: string;
    imageData: { name: string; base64: string; mimeType: string }[];
}> {
    let textContent = '';
    const imageData: { name: string; base64: string; mimeType: string }[] = [];

    for (const [key, file] of Object.entries(files)) {
        if (!file) continue;

        const fileLabel = key.replace(/([A-Z])/g, ' $1').trim();

        if (file.type.startsWith('image/')) {
            // Read image as base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            imageData.push({
                name: file.name,
                base64: base64.split(',')[1], // Remove data URL prefix
                mimeType: file.type
            });

            textContent += `\n- ${file.name}: ${fileLabel} (Image - will be analyzed visually)\n`;
        } else if (file.type === 'application/pdf') {
            textContent += `\n- ${file.name}: ${fileLabel} (PDF document, ${(file.size / 1024).toFixed(1)} KB)\n`;
            textContent += `  [PDF content will be analyzed - please note any specific data you can extract]\n`;
        } else {
            // Try to read text content
            try {
                const content = await extractTextFromFile(file);
                textContent += `\n- ${file.name}: ${fileLabel}\nContent:\n${content.slice(0, 5000)}${content.length > 5000 ? '...[truncated]' : ''}\n`;
            } catch {
                textContent += `\n- ${file.name}: ${fileLabel} (Could not extract content)\n`;
            }
        }
    }

    return { textContent, imageData };
}

/**
 * Call OpenAI API directly from the client
 */
export async function analyzeDocumentsClient(files: { [key: string]: File | null }): Promise<string> {
    if (!API_KEY) {
        throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your environment.');
    }

    const { textContent, imageData } = await prepareFilesForAnalysis(files);

    // Build the messages array
    const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];

    // If we have images, use vision model with image content
    if (imageData.length > 0) {
        const userContent: any[] = [
            {
                type: 'text',
                text: `Analyze the following documents for MSME loan pre-screening:\n\n${textContent}\n\nPlease analyze all provided documents and images to generate a comprehensive credit assessment.`
            }
        ];

        // Add images
        for (const img of imageData) {
            userContent.push({
                type: 'image_url',
                image_url: {
                    url: `data:${img.mimeType};base64,${img.base64}`,
                    detail: 'high'
                }
            });
        }

        messages.push({ role: 'user', content: userContent });
    } else {
        // Text-only analysis
        messages.push({
            role: 'user',
            content: `Analyze the following documents for MSME loan pre-screening:\n\n${textContent}\n\nPlease analyze all provided documents to generate a comprehensive credit assessment.`
        });
    }

    // Make API call
    const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages,
            max_tokens: 4000,
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API Error:', error);
        throw new Error(`AI analysis failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response from AI service');
    }

    return data.choices[0].message.content;
}

/**
 * Check if client-side AI is available
 */
export function isClientAIAvailable(): boolean {
    return !!API_KEY;
}
