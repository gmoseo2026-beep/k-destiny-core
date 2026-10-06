'use client';

import { SessionProvider } from 'next-auth/react';
import MarketingConsentSync from './MarketingConsentSync';
import CampaignSignupSync from './CampaignSignupSync';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MarketingConsentSync />
      <CampaignSignupSync />
      {children}
    </SessionProvider>
  );
}
