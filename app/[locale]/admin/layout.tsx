import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

  // If not logged in → redirect to home
  if (!session?.user) {
    redirect(`/${locale}`);
  }

  // If logged in but NOT ADMIN → redirect to home
  if (session.user.role !== 'ADMIN') {
    redirect(`/${locale}`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-serif font-bold text-white tracking-wide">K-Destiny</span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full uppercase tracking-widest font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              Admin
            </span>
          </div>
          <a href={`/${locale}/dashboard`} className="text-sm font-sans text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            Exit Admin
          </a>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
