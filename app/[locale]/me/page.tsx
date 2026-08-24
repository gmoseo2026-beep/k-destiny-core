import { Metadata } from "next";
import MeClient from "@/components/MeClient";

// ⚠️ 이 페이지의 본문은 아직 하드코딩된 자리표시자다(MeClient). 누가 들어와도 동일한
// 문구가 나오므로 실제 개인화 리딩이 아니다. 구현 전까지 색인에서 제외한다.
// 어디에서도 링크되지 않지만 URL 로는 접근 가능하므로 noindex 가 필요하다.
export const metadata: Metadata = {
  title: "내 사주 요약 — 콩닥",
  description: "사주로 보는 나의 타고난 본질 에너지와 매력",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function MePage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] px-4 py-8 flex flex-col items-center justify-between">
      <header className="w-full max-w-md flex items-center justify-between mb-8">
        <a href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">kongdak</span>
          </span>
        </a>
      </header>

      <MeClient locale={locale} />

      <footer className="w-full max-w-md text-center text-xs text-[#8A8291] mt-8">
        오락 및 자기이해 목적의 서비스입니다.
      </footer>
    </main>
  );
}
