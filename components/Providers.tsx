'use client';

import { SessionProvider } from 'next-auth/react';
import MarketingConsentSync from './MarketingConsentSync';
import CampaignSignupSync from './CampaignSignupSync';
import PwaTracker from './PwaTracker';
import MetaPixel from './MetaPixel';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MarketingConsentSync />
      <CampaignSignupSync />
      <PwaTracker />
      <MetaPixel />
      {children}
    </SessionProvider>
  );
}
