import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/terms');

export default function TermsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
