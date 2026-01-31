import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { setBackoffCallback } from '@/lib/api-rate-limiter';

/**
 * Component that displays toast notifications when the API rate limiter
 * enters backoff mode due to too many requests (429 errors).
 * 
 * Mount this component once at the app root level.
 */
export const RateLimitIndicator = () => {
  const toastIdRef = useRef<string | number | null>(null);
  const lastBackoffTime = useRef<number>(0);

  useEffect(() => {
    // Set up the callback to receive backoff notifications
    setBackoffCallback((isBackingOff, remainingMs) => {
      if (isBackingOff) {
        // Prevent spamming toasts - only show if last one was > 5s ago
        const now = Date.now();
        if (now - lastBackoffTime.current < 5000) {
          return;
        }
        lastBackoffTime.current = now;

        const seconds = Math.ceil(remainingMs / 1000);
        
        // Dismiss previous toast if still showing
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }

        // Show new toast with loading indicator
        toastIdRef.current = toast.warning('Slowing down requests...', {
          description: `High traffic detected. Retrying in ${seconds}s.`,
          duration: Math.min(remainingMs, 10000), // Show for backoff duration, max 10s
          id: 'rate-limit-backoff',
        });
      }
    });

    // Cleanup on unmount
    return () => {
      setBackoffCallback(null);
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};
