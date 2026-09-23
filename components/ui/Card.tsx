import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'soft';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hoverable = false, variant = 'default', children, ...props }, ref) => {
    const baseStyles = variant === 'soft' 
      ? 'bg-surface-soft rounded-2xl border border-line p-5 sm:p-6'
      : 'bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-xs';
    const hoverStyles = hoverable ? 'transition-all duration-150 hover:bg-surface-soft hover:border-line/80 active:scale-[0.98]' : '';

    const classes = [
      baseStyles,
      hoverStyles,
      className,
    ].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
