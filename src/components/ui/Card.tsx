'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost' | 'glass' | 'frost';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
}

/**
 * Card Component
 * 
 * UI/UX Pro Max inspired: Premium depth, glassmorphism, and silky interactions
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
    ghost: 'bg-[var(--bg-tertiary)] border-0 shadow-none',
    glass: 'glass-panel',
    frost: 'frost-panel'
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8'
  };

  return (
    <motion.div
      whileHover={hover ? { 
        y: -4, 
        scale: 1.02,
        transition: { type: 'spring', stiffness: 400, damping: 25 } 
      } : undefined}
      className={cn(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        paddings[padding],
        hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
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
          <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight leading-tight">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-[var(--text-secondary)] mt-1 font-medium">
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

// Animated Counter for StatCard
function AnimatedCounter({ value }: { value: string | number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const target = typeof value === 'number' ? value : parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
  
  useEffect(() => {
    let start = 0;
    const end = target;
    if (start === end) {
      setDisplayValue(end);
      return;
    }

    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  // If it's a string like "$1,200", we need to preserve the format
  if (typeof value === 'string' && (value.includes('$') || value.includes(','))) {
    return <span>{value}</span>;
  }

  return <span>{displayValue.toLocaleString()}</span>;
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
      <Card variant="frost" padding="lg">
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-[var(--border-subtle)] rounded mb-3" />
          <div className="h-8 w-32 bg-[var(--border-subtle)] rounded mb-2" />
          <div className="h-3 w-24 bg-[var(--border-subtle)] rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="frost" padding="lg" hover className="group relative overflow-hidden">
      {/* Decorative Gradient Glow */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-[var(--color-primary-500)] opacity-[0.03] blur-2xl transition-all group-hover:opacity-[0.08]" />
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-sm font-bold text-[var(--text-secondary)] tracking-wider uppercase opacity-80">
            {label}
          </p>
          <div className="text-3xl font-black text-[var(--text-primary)] mt-2 tracking-tighter">
            <AnimatedCounter value={value} />
          </div>
          {change && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 mt-3 bg-white/40 dark:bg-black/20 w-fit px-2 py-0.5 rounded-lg border border-white/20 dark:border-white/10"
            >
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
              <span className={cn('text-xs font-bold', changeColors[changeType])}>
                {change}
              </span>
            </motion.div>
          )}
        </div>
        {icon && (
          <div className="p-3.5 rounded-2xl bg-[var(--color-primary-500)]/10 text-[var(--color-primary-700)] shadow-inner transition-transform group-hover:scale-110 group-hover:rotate-3 duration-300">
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
    info: 'frost-panel bg-[var(--color-info-light)]/40 border-[var(--color-info)]/20',
    success: 'frost-panel bg-[var(--color-success-light)]/40 border-[var(--color-success)]/20',
    warning: 'frost-panel bg-[var(--color-warning-light)]/40 border-[var(--color-warning)]/20',
    error: 'frost-panel bg-[var(--color-error-light)]/40 border-[var(--color-error)]/20'
  };

  const iconColors = {
    info: 'text-[var(--color-info)]',
    success: 'text-[var(--color-success)]',
    warning: 'text-[var(--color-warning)]',
    error: 'text-[var(--color-error)]'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-2xl border px-5 py-4 flex items-start gap-4 shadow-sm',
        typeStyles[type],
        className
      )}
    >
      {icon && (
        <div className={cn('flex-shrink-0 mt-0.5 p-2 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20 dark:border-white/5', iconColors[type])}>
          {icon}
        </div>
      )}
      <div className="flex-1 text-sm font-medium text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </motion.div>
  );
}

