'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { LogOut, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useLocale } from 'next-intl';
import { clearAllUserData } from '@/lib/userStateManager';
import AuthModal from './AuthModal';

export default function LoginButton() {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSignOut = async () => {
    // Nuclear cleanup: wipe ALL user-specific client state before destroying session
    clearAllUserData();
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return <div className="h-10 w-24 bg-[#2B2430]/5 animate-pulse rounded-full" />;
  }

  if (session && session.user) {
    return (
      <div className="flex items-center gap-4">
        {/* Admin Badge */}
        {(session.user as any).role === 'ADMIN' && (
          <span className="text-[10px] uppercase tracking-widest font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-full border border-red-200">
            Admin
          </span>
        )}
        
        <div className="flex items-center gap-1.5 sm:gap-3 bg-white border border-[#2B2430]/8 rounded-full pl-1.5 sm:pl-2 pr-2 sm:pr-4 py-1 sm:py-1.5 hover:bg-coral/[0.03] hover:border-coral/30 shadow-sm transition-all group">
          {session.user.image ? (
            <Image 
              src={session.user.image} 
              alt={session.user.name || 'User'} 
              width={28} 
              height={28} 
              className="rounded-full border border-[#2B2430]/10"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-coral/10 flex items-center justify-center border border-coral/20">
              <UserIcon className="w-4 h-4 text-coral" />
            </div>
          )}
          <span className="text-xs sm:text-sm font-sans font-medium text-ink hidden sm:block">
            {session.user.name?.split(' ')[0] || (locale === 'ko' ? '회원님' : 'Guest')}
          </span>
          <button 
            onClick={handleSignOut}
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-full border border-coral text-coral font-sans font-medium text-xs sm:text-sm hover:bg-coral/[0.04] active:scale-95 transition-all shadow-sm"
      >
        {locale === 'ko' ? '로그인' : 'Login'}
      </button>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => setIsModalOpen(false)} 
      />
    </>
  );
}
