import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('sb-auth-token') || cookieStore.get('supabase-auth-token');
  
  // For local development with Mock Supabase, we might not have a cookie.
  // We'll allow a bypass if in dev mode to test the UI.
  const isDev = process.env.NODE_ENV === 'development';
  let userId = '';
  
  if (tokenCookie) {
    let accessToken = tokenCookie.value;
    try {
      const parsed = JSON.parse(tokenCookie.value);
      if (parsed.access_token) accessToken = parsed.access_token;
      else if (Array.isArray(parsed) && parsed[0]) accessToken = parsed[0];
    } catch (e) {
      // Not JSON
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (user) {
      userId = user.id;
    }
  } else if (isDev) {
    userId = 'mock-user-12345';
  } else {
    redirect(`/${locale}`);
  }

  if (!userId) {
    redirect(`/${locale}`);
  }

  // Check Prisma for ADMIN role
  let dbUser = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!dbUser) {
    if (isDev) {
      // Auto-create mock admin for local testing
      dbUser = await prisma.user.create({
        data: {
          id: userId,
          email: 'admin@kdestiny.local',
          role: 'ADMIN',
          tier: 'PREMIUM'
        }
      });
    } else {
      redirect(`/${locale}`);
    }
  } else if (dbUser.role !== 'ADMIN') {
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
