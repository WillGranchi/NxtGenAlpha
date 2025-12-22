/**
 * Hook for detecting swipe gestures
 */

import { useRef, useState, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeState {
  swiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

export const useSwipe = (handlers: SwipeHandlers, threshold: number = 50) => {
  const [swipeState, setSwipeState] = useState<SwipeState>({
    swiping: false,
    direction: null,
  });

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setSwipeState({ swiping: true, direction: null });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Only register swipe if it's quick enough (< 300ms) and far enough
    if (deltaTime < 300) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > threshold || absY > threshold) {
        if (absX > absY) {
          // Horizontal swipe
          if (deltaX > 0 && handlers.onSwipeRight) {
            handlers.onSwipeRight();
            setSwipeState({ swiping: false, direction: 'right' });
          } else if (deltaX < 0 && handlers.onSwipeLeft) {
            handlers.onSwipeLeft();
            setSwipeState({ swiping: false, direction: 'left' });
          }
        } else {
          // Vertical swipe
          if (deltaY > 0 && handlers.onSwipeDown) {
            handlers.onSwipeDown();
            setSwipeState({ swiping: false, direction: 'down' });
          } else if (deltaY < 0 && handlers.onSwipeUp) {
            handlers.onSwipeUp();
            setSwipeState({ swiping: false, direction: 'up' });
          }
        }
      }
    }

    touchStart.current = null;
    setTimeout(() => setSwipeState({ swiping: false, direction: null }), 100);
  }, [handlers, threshold]);

  return {
    swipeProps: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
    swipeState,
  };
};

