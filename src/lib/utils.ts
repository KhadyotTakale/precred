import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Replace placeholders in content with actual values
 * Supports form field values and system placeholders (date/time)
 */
export function replacePlaceholders(
  content: string,
  formData: Record<string, string | boolean>,
  fallbackText: string = 'N/A'
): string {
  if (!content) return '';

  const now = new Date();

  // System placeholders
  const systemValues: Record<string, string> = {
    current_date: format(now, 'MMMM d, yyyy'),
    current_time: format(now, 'h:mm a'),
    current_day: format(now, 'EEEE'),
    current_datetime: format(now, 'MMMM d, yyyy h:mm a'),
  };

  // Replace all {{placeholder}} patterns
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    // Check system placeholders first
    if (key in systemValues) {
      return systemValues[key];
    }
    // Check form data
    if (key in formData) {
      const value = formData[key];
      // Return fallback text for null, undefined, or empty values
      if (value === undefined || value === null || value === '') {
        return fallbackText;
      }
      return typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
    }
    // Return fallback text if field not found in form data
    return fallbackText;
  });
}

/**
 * Generate canonical URL for the current page
 * @param path - The path of the current page (e.g., '/events', '/classes/some-slug')
 * @param customDomain - Optional custom domain from shop settings
 * @returns The canonical URL for SEO
 */
export function getCanonicalUrl(path: string, customDomain?: string): string {
  const baseUrl = customDomain 
    ? `https://${customDomain}` 
    : window.location.origin;
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${normalizedPath}`;
}
