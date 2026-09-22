import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hoverable = false, children, ...props }, ref) => {
    const baseStyles = 'bg-white rounded-2xl shadow-[0_6px_24px_rgba(181,71,96,0.08)] p-6';
    const hoverStyles = hoverable ? 'transition-all duration-300 hover:shadow-[0_12px_32px_rgba(181,71,96,0.12)] hover:-translate-y-1 cursor-pointer' : '';

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
