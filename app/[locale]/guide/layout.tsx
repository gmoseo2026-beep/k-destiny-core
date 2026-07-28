import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/guide');

export default function GuideLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
