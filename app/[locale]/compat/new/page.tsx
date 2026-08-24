import { Metadata } from "next";
import CompatNewClient from "@/components/CompatNewClient";
import { canonicalUrlFor } from "@/lib/seo";

const TITLE = "상대방 정보 입력 — 콩닥 궁합";
const DESCRIPTION = "두 사람의 생년월일시로 알아보는 진짜 사주 궁합과 타고난 에너지 케미";

// canonical 을 직접 선언한다. 선언하지 않으면 레이아웃의 canonical(로케일 홈)을
// 상속해 이 페이지가 "홈의 중복"으로 색인에서 제외된다. ?ref= 등 유입 파라미터는 canonical 에 넣지 않는다.
// 로케일과 무관하게 ko URL 로 통합한다 — 근거는 lib/seo.ts 의 canonicalUrlFor 주석 참조.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  await params;
  const canonical = canonicalUrlFor('/compat/new');

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical },
    openGraph: { title: TITLE, description: DESCRIPTION, url: canonical },
    twitter: { title: TITLE, description: DESCRIPTION },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export default async function CompatNewPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { ref } = await searchParams;

  return (
    <main className="min-h-screen bg-[#FFF6F1] text-[#2B2430] px-4 py-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <a href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF8AA1] to-[#FF5C77] flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-[#6A2C70]">
            콩닥 <span className="text-xs font-semibold text-[#8A8291]">kongdak</span>
          </span>
        </a>
      </header>

      {/* Hero Title */}
      <div className="w-full max-w-md text-center mb-6">
        <h1 className="text-2xl font-black text-[#2B2430] tracking-tight">
          우리, 얼마나 잘 맞을까?
        </h1>
        <p className="text-xs font-semibold text-[#8A8291] mt-1.5">
          두 사람의 생년월일만 넣으면 30초 만에 분석 완료 🔮
        </p>
      </div>

      {/* Form Component */}
      <CompatNewClient locale={locale} refToken={ref} />
    </main>
  );
}
