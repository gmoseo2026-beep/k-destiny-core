import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo';

// 결제 결과 화면은 검색에 올리지 않는다(이전에는 색인 허용 + canonical 이 홈이었다)
export const generateMetadata = createPageMetadata('/pay/complete');

export default function PayCompleteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
