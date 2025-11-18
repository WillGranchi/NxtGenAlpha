/**
 * Reusable Button component with variants
 */

import React from 'react';
import { clsx } from 'clsx';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white hover:from-primary-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-primary-500/50 focus:ring-primary-500',
    secondary: 'bg-bg-tertiary text-text-primary border border-border-default hover:bg-bg-elevated hover:border-primary-500/50 focus:ring-primary-500',
    ghost: 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary focus:ring-primary-500',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 hover:shadow-lg hover:shadow-danger-500/50 focus:ring-danger-500',
  };
  
  const sizes = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2.5 px-6 text-base',
    lg: 'py-3 px-8 text-lg',
  };
  
  return (
    <button
      className={clsx(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <span className="spinner w-4 h-4 border-2"></span>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

