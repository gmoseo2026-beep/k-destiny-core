import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { LogOut } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Fetch the NextAuth session on the server
  const session = await getServerSession(authOptions);

  // 관리자만 통과. 예외는 개발 모드에서 ADMIN_PREVIEW_BYPASS=1 을 명시한 목업 캡처뿐이다(운영에서는 항상 검사).
  const previewBypass =
    process.env.NODE_ENV !== 'production' && process.env.ADMIN_PREVIEW_BYPASS === '1';
  if (!previewBypass && (!session?.user || session.user.role !== 'ADMIN')) {
    redirect(`/${locale}`);
  }

  return (
    <div className="min-h-screen bg-[#FFF6F1] text-ink">
      <nav className="border-b border-[#2B2430]/10 bg-[#FFF6F1]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-serif font-bold text-ink tracking-wide">콩닥</span>
            <span className="text-[10px] font-sans px-2 py-0.5 bg-coral/10 border border-coral/30 text-coral rounded-full uppercase tracking-widest font-bold shadow-sm">
              관리자
            </span>
          </div>
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#2B2430]/10 text-ink text-sm font-semibold hover:bg-coral/[0.03] hover:border-coral/30 active:scale-95 transition-all shadow-sm group"
          >
            <LogOut className="w-4 h-4 text-ink/60 group-hover:text-coral" />
            <span className="group-hover:text-coral transition-colors">관리자 나가기</span>
          </Link>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
