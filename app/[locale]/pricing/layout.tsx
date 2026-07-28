import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/pricing');

export default function PricingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
