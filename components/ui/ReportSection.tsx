import React from 'react';

export interface ReportSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
}

export const ReportSection = React.forwardRef<HTMLDivElement, ReportSectionProps>(
  ({ className = '', title, icon, children, ...props }, ref) => {
    return (
      <section ref={ref} className={`mb-8 ${className}`} {...props}>
        <div className="flex items-center mb-4">
          {icon && <div className="mr-2 text-coral">{icon}</div>}
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(181,71,96,0.08)] p-6 text-foreground leading-relaxed">
          {children}
        </div>
      </section>
    );
  }
);

ReportSection.displayName = 'ReportSection';
