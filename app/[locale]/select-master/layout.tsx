import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/select-master');

export default function SelectMasterLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
