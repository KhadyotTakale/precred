import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";

interface VersionCheckProps {
  checkInterval?: number; // in milliseconds, default 60 seconds
}

export const VersionCheck = ({ checkInterval = 60000 }: VersionCheckProps) => {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const initialEtagRef = useRef<string | null>(null);
  const initialLastModifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Fetch index.html with cache-busting to check for changes
        const response = await fetch(`/index.html?_=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });

        const etag = response.headers.get("etag");
        const lastModified = response.headers.get("last-modified");

        // Store initial values on first check
        if (initialEtagRef.current === null && initialLastModifiedRef.current === null) {
          initialEtagRef.current = etag;
          initialLastModifiedRef.current = lastModified;
          return;
        }

        // Compare with initial values
        const etagChanged = etag && initialEtagRef.current && etag !== initialEtagRef.current;
        const lastModifiedChanged = lastModified && initialLastModifiedRef.current && lastModified !== initialLastModifiedRef.current;

        if (etagChanged || lastModifiedChanged) {
          setHasNewVersion(true);
        }
      } catch (error) {
        // Silently fail - network errors shouldn't disrupt the user
        console.debug("Version check failed:", error);
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkForUpdates, 5000);

    // Set up periodic checks
    const intervalId = setInterval(checkForUpdates, checkInterval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [checkInterval]);

  const handleRefresh = () => {
    // Force a hard refresh to bypass cache
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (!hasNewVersion || isDismissed) {
    return null;
  }

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/10">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>New Version Available</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 -mr-2"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between mt-2">
        <span>A new version of the application has been deployed.</span>
        <Button size="sm" onClick={handleRefresh} className="ml-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};
