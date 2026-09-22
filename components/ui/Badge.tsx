import React from 'react';

export type BadgeVariant = 'popular' | 'new' | 'default';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
}

export function Badge({ className = '', variant = 'default', icon, children, ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider';
  
  const variants = {
    popular: 'bg-coral text-white shadow-sm',
    new: 'bg-gold text-white shadow-sm',
    default: 'bg-gray-100 text-gray-600',
  };

  const classes = [
    baseStyles,
    variants[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="mr-1">{icon}</span>}
      {children}
    </span>
  );
}
