/**
 * Hook for long-press detection
 */

import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  delay?: number;
  onPress?: (e: React.TouchEvent | React.MouseEvent) => void;
}

export const useLongPress = ({
  onLongPress,
  delay = 500,
  onPress,
}: UseLongPressOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    targetRef.current = e.target;
    timeoutRef.current = setTimeout(() => {
      if (targetRef.current === e.target) {
        onLongPress(e);
      }
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // If it wasn't a long press, trigger regular press
    if (targetRef.current === e.target && onPress) {
      onPress(e);
    }
    
    targetRef.current = null;
  }, [onPress]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  };
};

