/**
 * Decision Preview API Service
 * Handles API calls for loan application decision preview
 */

import { elegantAPI } from './elegant-api';

export interface DecisionPreviewRequest {
    formData: Record<string, any>;
    applicationId?: number;
}

export interface DecisionPreviewResponse {
    approvalLikelihood: number; // 0-100 percentage
    riskBand: 'Low' | 'Medium' | 'High';
    matchedNBFCScheme: string;
    strengths: string[]; // 2-3 items
    risks: string[]; // 2-3 items
}

/**
 * Sanitizes form data by removing sensitive fields like file uploads and signatures
 */
function sanitizeFormData(formData: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(formData)) {
        // Skip file uploads (base64 data)
        if (typeof value === 'string' && value.startsWith('data:')) {
            continue;
        }
        // Skip vault URLs
        if (typeof value === 'string' && value.includes('/vault/')) {
            continue;
        }
        // Skip common sensitive field names
        const lowerKey = key.toLowerCase();
        if (
            lowerKey.includes('signature') ||
            lowerKey.includes('file') ||
            lowerKey.includes('upload') ||
            lowerKey.includes('attachment') ||
            lowerKey.includes('document')
        ) {
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

/**
 * Fetches decision preview from the backend API
 */
export async function getDecisionPreview(
    request: DecisionPreviewRequest,
    clerkUserId: string,
    apiEndpoint: string = '/decision-preview'
): Promise<DecisionPreviewResponse> {
    const sanitizedData = sanitizeFormData(request.formData);

    const payload = {
        formData: sanitizedData,
        applicationId: request.applicationId,
    };

    try {
        const response = await elegantAPI.post<DecisionPreviewResponse>(
            apiEndpoint,
            payload,
            clerkUserId
        );
        return response;
    } catch (error) {
        console.error('Decision preview API error:', error);
        // Return mock data for development/testing if API fails
        return getMockDecisionPreview();
    }
}

/**
 * Mock decision preview data for testing when API is unavailable
 */
function getMockDecisionPreview(): DecisionPreviewResponse {
    return {
        approvalLikelihood: 78,
        riskBand: 'Medium',
        matchedNBFCScheme: 'MSME Business Loan - Tier 2',
        strengths: [
            'Strong business vintage of 5+ years',
            'Healthy cash flow patterns',
            'Good credit history with no defaults',
        ],
        risks: [
            'High debt-to-income ratio (45%)',
            'Limited collateral coverage',
        ],
    };
}
