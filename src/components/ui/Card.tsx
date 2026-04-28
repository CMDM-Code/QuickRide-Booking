'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
}

/**
 * Card Component
 * 
 * Huashu-design inspired: high whitespace, subtle shadows, minimal borders
 */
export function Card({ 
  children, 
  className,
  variant = 'default',
  padding = 'md',
  hover = false
}: CardProps) {
  const variants = {
    default: 'bg-[var(--bg-secondary)] shadow-sm border border-[var(--border-subtle)]',
    elevated: 'bg-[var(--bg-secondary)] shadow-md border-0',
    outlined: 'bg-transparent border border-[var(--border-default)] shadow-none',
    ghost: 'bg-[var(--bg-tertiary)] border-0 shadow-none'
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8'
  };

  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        variants[variant],
        paddings[padding],
        hover && 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

// Card Header - for titles and actions
export function CardHeader({ 
  children, 
  className,
  title,
  subtitle,
  action
}: { 
  children?: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// Card Content - main content area
export function CardContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  );
}

// Card Footer - for actions at bottom
export function CardFooter({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-3 mt-5 pt-5 border-t border-[var(--border-subtle)]', className)}>
      {children}
    </div>
  );
}

// Stat Card - specialized for dashboard stats
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  loading?: boolean;
}

export function StatCard({ 
  label, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  trend,
  loading = false
}: StatCardProps) {
  const changeColors = {
    positive: 'text-[var(--color-success)]',
    negative: 'text-[var(--color-error)]',
    neutral: 'text-[var(--text-tertiary)]'
  };

  if (loading) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-[var(--border-subtle)] rounded mb-3" />
          <div className="h-8 w-32 bg-[var(--border-subtle)] rounded mb-2" />
          <div className="h-3 w-24 bg-[var(--border-subtle)] rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg" hover>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)] tracking-wide">
            {label}
          </p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">
            {value}
          </p>
          {change && (
            <div className="flex items-center gap-1.5 mt-2">
              {trend && (
                <span className={cn(
                  'text-xs',
                  trend === 'up' ? 'text-[var(--color-success)]' :
                  trend === 'down' ? 'text-[var(--color-error)]' :
                  'text-[var(--text-tertiary)]'
                )}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
                </span>
              )}
              <span className={cn('text-sm font-medium', changeColors[changeType])}>
                {change}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--color-primary-600)]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// Info Card - for alerts, info boxes
interface InfoCardProps {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
  className?: string;
}

export function InfoCard({ 
  children, 
  type = 'info',
  icon,
  className 
}: InfoCardProps) {
  const typeStyles = {
    info: 'bg-[var(--color-info-light)] border-[var(--color-info)]/20',
    success: 'bg-[var(--color-success-light)] border-[var(--color-success)]/20',
    warning: 'bg-[var(--color-warning-light)] border-[var(--color-warning)]/20',
    error: 'bg-[var(--color-error-light)] border-[var(--color-error)]/20'
  };

  const iconColors = {
    info: 'text-[var(--color-info)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    error: 'text-[var(--color-error)]'
  };

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 flex items-start gap-3',
      typeStyles[type],
      className
    )}>
      {icon && (
        <div className={cn('flex-shrink-0 mt-0.5', iconColors[type])}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-sm text-[var(--text-secondary)]">
        {children}
      </div>
    </div>
  );
}
