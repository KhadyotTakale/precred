import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const SWIPE_HINT_SHOWN_KEY = 'member-portal-swipe-hint-shown';

export function SwipeHint() {
  const { isMobile } = useSidebar();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    
    const hasShown = localStorage.getItem(SWIPE_HINT_SHOWN_KEY);
    if (!hasShown) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(SWIPE_HINT_SHOWN_KEY, 'true');
  };

  if (!show || !isMobile) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={handleDismiss}
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 animate-swipe-hint">
        <div className="bg-primary/20 rounded-r-full py-8 px-4 flex items-center gap-2">
          <div className="flex items-center text-primary">
            <ChevronRight className="h-6 w-6 animate-pulse" />
            <ChevronRight className="h-6 w-6 -ml-3 animate-pulse delay-75" />
            <ChevronRight className="h-6 w-6 -ml-3 animate-pulse delay-150" />
          </div>
        </div>
        <span className="text-sm font-medium text-foreground bg-card px-3 py-2 rounded-lg shadow-lg">
          Swipe to open menu
        </span>
      </div>
      <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
        Tap anywhere to dismiss
      </p>
    </div>
  );
}
