import React from 'react';

export type TagCategory = 'fortune' | 'compat' | 'wealth' | 'reunion' | 'career' | 'default';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  category?: TagCategory;
}

export function Tag({ className = '', category = 'default', children, ...props }: TagProps) {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border';
  
  const categoryStyles = {
    fortune: 'text-[#5B34D6] border-[#5B34D6]/20 bg-[#F4F0FF]',
    compat: 'text-coral-deep border-coral/20 bg-coral-soft',
    wealth: 'text-[#C98A0B] border-[#C98A0B]/20 bg-[#FFF8E6]',
    reunion: 'text-[#C9362F] border-[#C9362F]/20 bg-[#FFF0EF]',
    career: 'text-[#2A5FD0] border-[#2A5FD0]/20 bg-[#EFF5FF]',
    default: 'text-text-2 border-line bg-surface-soft',
  };

  const classes = [
    baseStyles,
    categoryStyles[category],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}
