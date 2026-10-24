import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: 'default' | 'soft';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hoverable = false, variant = 'default', children, ...props }, ref) => {
    const baseStyles = variant === 'soft' 
      ? 'bg-[#1B1022] rounded-2xl border border-white/[0.08] p-5 sm:p-6 text-[#F6EEF3]'
      : 'bg-[#22142A] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-xs text-[#F6EEF3]';
    const hoverStyles = hoverable ? 'transition-all duration-150 hover:border-white/20 active:scale-[0.98]' : '';

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
