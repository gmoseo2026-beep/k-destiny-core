import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/seo";

export const generateMetadata = createPageMetadata('/dashboard');

/**
 * 대시보드는 콩닥 공용 셸(Navbar/Footer)을 그대로 쓴다.
 * 개편 이전 대시보드는 사이드바·담당자·잔량 표시를 위한 별도 셸을 가지고
 * 있었지만 Phase A 에는 해당 개념이 없으므로 셸을 두지 않는다.
 * (Navbar 는 /dashboard 경로에서 스스로 숨는 로직이 있었으나 제거했다.)
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
