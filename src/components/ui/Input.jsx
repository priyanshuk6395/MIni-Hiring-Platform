import React from 'react';

export const Input = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  icon: Icon,
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
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`block w-full rounded-md shadow-sm ${
          Icon ? 'pl-10' : 'pl-3'
        } ${
          error
            ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
        } sm:text-sm`}
        {...props}
      />
    </div>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);