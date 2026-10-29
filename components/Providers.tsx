'use client';

import { SessionProvider } from 'next-auth/react';
import MarketingConsentSync from './MarketingConsentSync';
import CampaignSignupSync from './CampaignSignupSync';
import GuestOrderClaimSync from './GuestOrderClaimSync';
import PwaTracker from './PwaTracker';
import MetaPixel from './MetaPixel';
import TikTokPixel from './TikTokPixel';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <MarketingConsentSync />
      <CampaignSignupSync />
      <GuestOrderClaimSync />
      <PwaTracker />
      <MetaPixel />
      <TikTokPixel />
      {children}
    </SessionProvider>
  );
}
