'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/**
 * Button Component
 * 
 * Huashu-design inspired: subtle transitions, consistent spacing,
 * clear hierarchy with primary (forest) + accent (amber) distinction
 */
export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-[var(--color-primary-700)] text-white hover:bg-[var(--color-primary-800)] focus:ring-[var(--color-primary-500)] shadow-sm hover:shadow-md',
    secondary: 'bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-600)] focus:ring-[var(--color-accent-400)] shadow-sm hover:shadow-md',
    outline: 'border-2 border-[var(--border-strong)] text-[var(--text-primary)] bg-transparent hover:bg-[var(--bg-tertiary)] focus:ring-[var(--border-strong)]',
    ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] focus:ring-[var(--border-subtle)]',
    danger: 'bg-[var(--color-error)] text-white hover:bg-red-700 focus:ring-red-300 shadow-sm'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        loading && 'opacity-70 cursor-wait',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className={cn("animate-spin", iconSizes[size])} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" cy="12" r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && leftIcon && (
        <span className={iconSizes[size]}>{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && (
        <span className={iconSizes[size]}>{rightIcon}</span>
      )}
    </button>
  );
}

// Icon Button - circular button for actions
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  className,
  ...props
}: IconButtonProps) {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <Button
      variant={variant}
      className={cn('rounded-lg', sizes[size], className)}
      {...props}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </Button>
  );
}

// Action Group - button cluster for related actions
export function ActionGroup({ 
  children,
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
}
