import React from 'react';

export const Textarea = ({ label, name, value, onChange, rows = 3, error }) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <textarea
      name={name}
      id={name}
      rows={rows}
      value={value}
      onChange={onChange}
      className={`block w-full rounded-md shadow-sm ${
        error
          ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
      } sm:text-sm`}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);