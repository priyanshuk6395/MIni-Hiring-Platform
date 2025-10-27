import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-hidden="true"
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl transform transition-all w-full ${sizeStyles[size]} max-h-[90vh] flex flex-col`}
        >
          <div className="flex items-start justify-between p-4 border-b rounded-t">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="-mt-2 -mr-2"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};