/**
 * Reusable Card component
 */

import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated';
  hover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hover = true,
  className,
  children,
  ...props
}) => {
  const baseStyles = 'rounded-xl border p-6 transition-all duration-300';
  
  const variants = {
    default: 'bg-bg-tertiary border-border-default shadow-lg shadow-black/20',
    glass: 'bg-bg-tertiary/50 backdrop-blur-md border-border-light/50 shadow-lg shadow-black/20',
    elevated: 'bg-bg-elevated border-border-light shadow-xl shadow-black/30',
  };
  
  const hoverStyles = hover 
    ? 'hover:border-primary-500/30 hover:shadow-xl hover:shadow-primary-500/10' 
    : '';
  
  return (
    <div
      className={clsx(
        baseStyles,
        variants[variant],
        hoverStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={clsx('mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => (
  <h3 className={clsx('text-xl font-semibold text-text-primary', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => (
  <p className={clsx('text-sm text-text-secondary mt-1', className)} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={clsx('mt-4 pt-4 border-t border-border-default', className)} {...props}>
    {children}
  </div>
);

