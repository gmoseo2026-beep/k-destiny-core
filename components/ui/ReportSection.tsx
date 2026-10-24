import React from 'react';

export interface ReportSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
}

export const ReportSection = React.forwardRef<HTMLDivElement, ReportSectionProps>(
  ({ className = '', title, icon, children, ...props }, ref) => {
    return (
      <section ref={ref} className={`mb-8 ${className}`} {...props}>
        <div className="flex items-center mb-3">
          {icon && <div className="mr-2 text-[#FF5C77]">{icon}</div>}
          <h3 className="text-lg sm:text-xl font-extrabold text-[#F6EEF3] tracking-tight">{title}</h3>
        </div>
        <div className="bg-[#22142A] rounded-2xl border border-white/[0.08] shadow-xs p-5 sm:p-6 text-[#F6EEF3] leading-[1.75]">
          {children}
        </div>
      </section>
    );
  }
);

ReportSection.displayName = 'ReportSection';
