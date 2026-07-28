import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/sync');

export default function SyncLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
