/**
 * Hook for pull-to-refresh functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  enabled = true,
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return;
    
    const element = elementRef.current;
    if (!element) return;

    // Only trigger if at the top of the scrollable area
    if (element.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || !startY.current || isRefreshing) return;

    const element = elementRef.current;
    if (!element || element.scrollTop > 0) {
      startY.current = null;
      return;
    }

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, threshold * 1.5));
      e.preventDefault(); // Prevent default scroll
    }
  }, [enabled, threshold, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !startY.current || isRefreshing) return;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setIsPulling(false);
      setPullDistance(0);
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }

    startY.current = null;
  }, [enabled, pullDistance, threshold, onRefresh, isRefreshing]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    elementRef,
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
};

