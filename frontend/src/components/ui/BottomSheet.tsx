/**
 * Bottom Sheet Modal Component for Mobile
 * Slides up from bottom on mobile, centered modal on desktop
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const { isMobile } = useMobile();

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  if (isMobile) {
    // Mobile: Bottom sheet
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Bottom Sheet */}
        <div
          className={`fixed inset-x-0 bottom-0 bg-bg-secondary rounded-t-2xl shadow-2xl z-50 max-h-[90vh] flex flex-col animate-slide-up ${className}`}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-border-default rounded-full" />
          </div>
          
          {/* Header */}
          {title && (
            <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary touch-manipulation"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </>
    );
  }

  // Desktop: Centered modal
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in flex items-center justify-center p-4"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className={`bg-bg-secondary rounded-xl shadow-2xl z-50 max-w-2xl w-full max-h-[90vh] flex flex-col animate-scale-in ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
            <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary touch-manipulation"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
};

