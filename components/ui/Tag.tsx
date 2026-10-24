import React from 'react';

export type TagCategory = 'fortune' | 'compat' | 'wealth' | 'reunion' | 'career' | 'default';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  category?: TagCategory;
}

export function Tag({ className = '', category = 'default', children, ...props }: TagProps) {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border';
  
  const categoryStyles = {
    fortune: 'text-[#C4B5FD] border-[#8B5CF6]/35 bg-[#8B5CF6]/15',
    compat: 'text-[#FF8AA1] border-[#FF5C77]/35 bg-[#FF5C77]/15',
    wealth: 'text-[#FFC24B] border-[#FFC24B]/35 bg-[#FFC24B]/15',
    reunion: 'text-[#FF8AA1] border-[#FF5C77]/35 bg-[#FF5C77]/15',
    career: 'text-[#93C5FD] border-[#3B82F6]/35 bg-[#3B82F6]/15',
    default: 'text-[#B9A9BF] border-white/[0.08] bg-[#22142A]',
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
