import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/privacy');

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
