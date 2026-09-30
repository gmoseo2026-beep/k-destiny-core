import { redirect } from "next/navigation";

// 로그인 후 도착지. 예전에는 대시보드만 있는 별도 화면이라 상품 목록·탐색이 없어 막다른 곳이었다.
// 홈(/ko)이 회원에게 대시보드 + 탐색 + 세트 + 프리미엄을 모두 보여 주므로 홈으로 보낸다.
export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
