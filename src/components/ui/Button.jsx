import React from 'react';
import { Spinner } from './Spinner';

export const Button = React.forwardRef(
  (
    {
      children,
      onClick,
      variant = 'primary',
      size = 'md',
      disabled = false,
      loading = false,
      icon: Icon,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyle =
      'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150';

    const variantStyles = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
      secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-indigo-500',
    };

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    };

    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
      icon: 'h-5 w-5',
    };

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && <Spinner />}
        {!loading && Icon && (
          <Icon
            className={`${iconSize[size]} ${children ? 'mr-2' : ''}`}
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';