'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { LogOut, User as UserIcon } from 'lucide-react';
import Image from 'next/image';

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="h-10 w-24 bg-white/5 animate-pulse rounded-full" />;
  }

  if (session && session.user) {
    return (
      <div className="flex items-center gap-4">
        {/* Admin Badge */}
        {(session.user as any).role === 'ADMIN' && (
          <span className="text-[10px] uppercase tracking-widest font-bold bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full border border-red-500/30">
            Admin
          </span>
        )}
        
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full pl-2 pr-4 py-1.5 hover:bg-white/10 transition-colors">
          {session.user.image ? (
            <Image 
              src={session.user.image} 
              alt={session.user.name || 'User'} 
              width={28} 
              height={28} 
              className="rounded-full border border-gold/30"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
              <UserIcon className="w-4 h-4 text-gold" />
            </div>
          )}
          <span className="text-sm font-sans text-gray-200">
            {session.user.name?.split(' ')[0] || 'Traveler'}
          </span>
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="ml-2 text-gray-500 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button 
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
      className="flex items-center gap-3 px-6 py-2.5 bg-white text-black font-sans font-bold text-sm rounded-full shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Sign in with Google
    </button>
  );
}
