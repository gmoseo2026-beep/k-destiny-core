import React from 'react';

export type TagCategory = 'fortune' | 'compat' | 'wealth' | 'reunion' | 'career' | 'default';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  category?: TagCategory;
}

export function Tag({ className = '', category = 'default', children, ...props }: TagProps) {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border';
  
  // Uses tailwind variables defined in globals.css
  const categoryStyles = {
    fortune: 'text-cat-fortune border-cat-fortune/30 bg-cat-fortune/5',
    compat: 'text-cat-compat border-cat-compat/30 bg-cat-compat/5',
    wealth: 'text-cat-wealth border-cat-wealth/30 bg-cat-wealth/5',
    reunion: 'text-cat-reunion border-cat-reunion/30 bg-cat-reunion/5',
    career: 'text-cat-career border-cat-career/30 bg-cat-career/5',
    default: 'text-gray-600 border-gray-200 bg-gray-50',
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
