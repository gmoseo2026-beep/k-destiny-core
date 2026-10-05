'use client';

import { SessionProvider } from 'next-auth/react';
import MarketingConsentSync from './MarketingConsentSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MarketingConsentSync />
      {children}
    </SessionProvider>
  );
}
