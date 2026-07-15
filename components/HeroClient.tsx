"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/routing";
import { hasCompletedOnboarding } from "@/lib/userStateManager";

/**
 * Client-side hero section with framer-motion animations and
 * onboarding-aware CTA routing. Extracted from page.tsx to allow
 * the main landing page to be a Server Component for SSR/SEO.
 */
export default function HeroClient() {
  const t = useTranslations('Index');
  const tDash = useTranslations('Dashboard');
  const [onboarded, setOnboarded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnboarded(hasCompletedOnboarding());
  }, []);

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
        
        {/* Subtle top accent */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-gold/30 bg-background/50 backdrop-blur-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gold"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
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
          className="font-sans text-base sm:text-lg md:text-xl text-gray-200 max-w-2xl mb-12 font-medium tracking-wide leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        >
          {t('sub_headline')}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link href={mounted && onboarded ? "/dashboard" : "/select-master"} className="block w-fit mx-auto">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-full font-sans text-gold font-medium tracking-wide overflow-hidden shadow-[0_8px_30px_-5px_rgba(212,175,55,0.3),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-4px_8px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1c180e] to-[#050505] border border-gold/40 border-t-gold/70 active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
            >
              {/* Breathing Glow Background */}
              <motion.div
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity,
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/30 via-transparent to-transparent opacity-50 mix-blend-screen"
              />
              
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors duration-500 ease-out" />
              
              {/* Button Content */}
              <span className="relative z-10 text-glow-gold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {mounted && onboarded ? tDash("btn_go_dashboard") : t('cta_button')}
              </span>
              <ArrowRight className="relative z-10 w-5 h-5 text-gold group-hover:translate-x-1 transition-transform duration-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" />
            </motion.button>
          </Link>
        </motion.div>

      </div>
    </>
  );
}
