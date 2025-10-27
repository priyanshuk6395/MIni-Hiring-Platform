import React from 'react';

export const Select = ({
  label,
  name,
  value,
  onChange,
  children,
  error,
  ...props
}) => (
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className={`block w-full rounded-md shadow-sm py-2 px-3 ${
        error
          ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
      } sm:text-sm`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);