"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/routing";
import { hasCompletedOnboarding } from "@/lib/userStateManager";
import { useSession } from "next-auth/react";

/**
 * Client-side hero section with two-track CTA:
 * 1. Main CTA: "Discover Your Destiny" → /onboarding (new users)
 * 2. Sub link: "Log in" → /login (returning users)
 * 3. If onboarded → /dashboard
 */
export default function HeroClient() {
  const t = useTranslations('Index');
  const tDash = useTranslations('Dashboard');
  const [onboarded, setOnboarded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
    setOnboarded(hasCompletedOnboarding());
  }, []);

  // Determine CTA destination
  const ctaHref = mounted && onboarded
    ? "/dashboard"
    : mounted && session
      ? "/select-master"
      : "/onboarding";
  
  const ctaText = mounted && onboarded
    ? tDash("btn_go_dashboard")
    : t('cta_button');

  return (
    <>
      {/* Subtle Animated Ambient Light Source */}
      <motion.div
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[80vw] h-[80vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/30 via-gold/5 to-transparent blur-[100px] z-10 pointer-events-none"
      />

      {/* Main Content Area */}
      <div className="absolute bottom-10 sm:bottom-12 md:bottom-16 left-0 right-0 w-full z-20 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-gold/30 bg-background/50 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 text-gold" />
          <span className="text-xs sm:text-sm font-sans tracking-widest text-gold/90 uppercase">
            {t('badge')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 drop-shadow-2xl">
            {t('headline_1')}
          </span>
          <br />
          <span className="inline-block text-white drop-shadow-2xl mt-2">
            {t('headline_2')}
          </span>
        </motion.div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-sans text-base sm:text-lg md:text-xl text-gray-200 max-w-2xl mb-10 font-medium tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        >
          {t('sub_headline')}
        </motion.p>

        {/* Main CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <Link href={ctaHref} className="block w-fit">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              className="group relative flex items-center gap-3 px-10 py-5 rounded-full font-sans text-gold font-semibold text-lg tracking-wide overflow-hidden shadow-[0_8px_30px_-5px_rgba(212,175,55,0.4),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-4px_8px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1c180e] to-[#050505] border border-gold/50 border-t-gold/70 active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
            >
              {/* Breathing Glow Background */}
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/30 via-transparent to-transparent opacity-50 mix-blend-screen"
              />
              
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
              />

              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors duration-500 ease-out" />
              
              <span className="relative z-10 text-glow-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {ctaText}
              </span>
              <ArrowRight className="relative z-10 w-5 h-5 text-gold group-hover:translate-x-1 transition-transform duration-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
            </motion.button>
          </Link>

          {/* Sub link: Log in for returning users */}
          {mounted && !onboarded && !session && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              <Link 
                href="/login"
                className="text-sm font-sans text-gray-500 hover:text-gold/80 transition-colors tracking-wide"
              >
                {t('login_link') || 'Already have an account? Log in'}
              </Link>
            </motion.div>
          )}
        </motion.div>

      </div>
    </>
  );
}
