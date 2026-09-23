import { Metadata } from "next";
import Link from "next/link";
import ReportViewClient from "@/components/report/ReportViewClient";

export const metadata: Metadata = {
  title: "심층 사주 리포트 | 콩닥",
  description: "두근이가 전하는 다정하고 구체적인 사주 분석 리포트",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ locale: string; reportId: string }>;
}

export default async function ReportViewPage({ params }: PageProps) {
  const { locale, reportId } = await params;

  return (
    <main className="min-h-screen bg-white text-ink px-4 py-8 flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between mb-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral-light to-coral flex items-center justify-center text-white text-xs font-black shadow-sm">
            콩
          </div>
          <span className="font-extrabold text-lg tracking-tight text-plum">
            콩닥 <span className="text-xs font-semibold text-muted">kongdak</span>
          </span>
        </Link>
      </header>

      <ReportViewClient locale={locale} reportId={reportId} />
    </main>
  );
}
