import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner = () => (
  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
);

export const FullPageSpinner = () => (
  <div className="fixed inset-0 bg-gray-100 bg-opacity-75 flex items-center justify-center z-50">
    <div className="flex flex-col items-center">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      <p className="mt-2 text-lg font-medium text-gray-700">
        Initializing TalentFlow...
      </p>
    </div>
  </div>
);