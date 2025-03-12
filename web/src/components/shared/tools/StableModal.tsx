'use client';

import React, { useEffect, useRef } from 'react';
import { XIcon } from 'lucide-react';

interface StableModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * A modal component that doesn't automatically close when clicking inside or when tab content changes.
 * This is a workaround for the Radix UI Dialog component which has issues with tab changes.
 */
export default function StableModal({
  isOpen,
  onClose,
  children,
  title,
  className = 'max-w-4xl max-h-[90vh]'
}: StableModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Only add listeners if modal is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape key
  useEffect(() => {
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    // Only add listeners if modal is open
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`z-50 bg-background rounded-lg border p-6 shadow-lg overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        {/* Content */}
        {children}
      </div>
    </div>
  );
}
