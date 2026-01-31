import { useEffect, useRef, useCallback } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

interface SidebarSwipeHandlerProps {
  threshold?: number;
  edgeWidth?: number;
}

export function SidebarSwipeHandler({ 
  threshold = 50, 
  edgeWidth = 40 
}: SidebarSwipeHandlerProps) {
  const { isMobile, setOpenMobile, openMobile } = useSidebar();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || touchStartX.current === null || touchEndX.current === null) return;

    const deltaX = touchEndX.current - touchStartX.current;
    const isSwipeRight = deltaX > threshold;
    const isSwipeLeft = deltaX < -threshold;
    const startedFromEdge = touchStartX.current < edgeWidth;

    if (isSwipeRight && startedFromEdge && !openMobile) {
      setOpenMobile(true);
    } else if (isSwipeLeft && openMobile) {
      setOpenMobile(false);
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [isMobile, threshold, edgeWidth, openMobile, setOpenMobile]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return null;
}
