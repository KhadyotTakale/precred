import { useEffect, useState, useCallback } from "react";
import { useUser, useAuth, useClerk } from "@clerk/clerk-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogIn, LogOut } from "lucide-react";

interface SessionMonitorProps {
  checkInterval?: number; // in milliseconds, default 30 seconds
}

export const SessionMonitor = ({ checkInterval = 30000 }: SessionMonitorProps) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const { signOut, openSignIn } = useClerk();
  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const [wasSignedIn, setWasSignedIn] = useState(false);

  // Track if user was previously signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setWasSignedIn(true);
    }
  }, [isLoaded, isSignedIn]);

  // Detect session expiration
  useEffect(() => {
    if (!isLoaded) return;

    // If user was signed in but now isn't, show the dialog
    if (wasSignedIn && !isSignedIn) {
      setShowSessionExpired(true);
    }
  }, [isLoaded, isSignedIn, wasSignedIn]);

  // Periodic token validation check
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const validateSession = async () => {
      try {
        // Attempt to get a fresh token - this will fail if session is invalid
        const token = await getToken();
        if (!token && wasSignedIn) {
          setShowSessionExpired(true);
        }
      } catch (error) {
        console.debug("Session validation failed:", error);
        if (wasSignedIn) {
          setShowSessionExpired(true);
        }
      }
    };

    // Check periodically
    const intervalId = setInterval(validateSession, checkInterval);

    // Also check when window regains focus (user returns after inactivity)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        validateSession();
      }
    };

    const handleFocus = () => {
      validateSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoaded, isSignedIn, wasSignedIn, getToken, checkInterval]);

  const handleSignIn = useCallback(() => {
    setShowSessionExpired(false);
    setWasSignedIn(false);
    openSignIn();
  }, [openSignIn]);

  const handleContinueAsGuest = useCallback(() => {
    setShowSessionExpired(false);
    setWasSignedIn(false);
    // Clear any stale auth state
    signOut();
  }, [signOut]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  if (!showSessionExpired) {
    return null;
  }

  return (
    <AlertDialog open={showSessionExpired} onOpenChange={setShowSessionExpired}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired due to inactivity. Please sign in again to continue 
            with your account, or continue browsing as a guest.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleContinueAsGuest} className="gap-2">
            <LogOut className="h-4 w-4" />
            Continue as Guest
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSignIn} className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
