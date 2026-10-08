import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

// 내 사주 정보 저장 화면은 검색에 올리지 않는다
export const generateMetadata = createPageMetadata('/onboarding');

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
