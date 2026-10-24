import { Metadata } from "next";
import MeClient from "@/components/MeClient";

export const metadata: Metadata = {
  title: "내 보관함 — 콩닥",
  description: "구매한 사주·궁합 리포트, 내 쿠폰함, 내 사주 정보를 한곳에서 확인하세요.",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#140B18] text-[#F6EEF3] px-4 pt-4 pb-28 sm:pb-16 flex flex-col items-center">
      <MeClient locale={locale} />
    </main>
  );
}
