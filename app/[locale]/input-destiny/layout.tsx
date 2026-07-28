import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/input-destiny');

export default function InputDestinyLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
