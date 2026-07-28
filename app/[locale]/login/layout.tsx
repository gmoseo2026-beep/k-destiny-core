import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

export const generateMetadata = createPageMetadata('/login');

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
