import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

const toastIcons = {
  success: (
    <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />
  ),
  error: (
    <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
  ),
  info: (
    <AlertCircle className="h-5 w-5 text-blue-500" aria-hidden="true" />
  ),
};

const toastColors = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export const Toast = ({ id, message, type, onDismiss }) => {
  return (
    <div
      className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border ${toastColors[type]}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">{toastIcons[type]}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(id)}
              className={`inline-flex rounded-md p-1 ${toastColors[type]} hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};