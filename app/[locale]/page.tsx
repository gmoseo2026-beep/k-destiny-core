"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/routing";
import { hasCompletedOnboarding } from "@/lib/userStateManager";

export default function Home() {
  const t = useTranslations('Index');
  const tDash = useTranslations('Dashboard');
  const [onboarded, setOnboarded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOnboarded(hasCompletedOnboarding());
  }, []);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-background">
      {/* Background Image with Overlays */}
      <div className="absolute inset-0 z-0 bg-background">
        <Image
          src="/images/master_karma_surprise.webp.jpg"
          alt="Cosmic Destiny Background"
          fill
          priority
          sizes="100vw"
          className="object-cover md:object-contain object-top md:object-center opacity-90"
        />
        {/* Subtle Animated Ambient Light Source */}
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[80vw] h-[80vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/30 via-gold/5 to-transparent blur-[100px] z-10 pointer-events-none"
        />
        
        {/* Dark Gradient Overlays for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/50 to-background/90 z-10 pointer-events-none" />
        
        {/* Horizontal gradients to blend sides on desktop */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 flex flex-col items-center justify-end pb-20 sm:pb-24 md:pb-32 min-h-[100dvh] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center pt-32">
        
        {/* Subtle top accent */}
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
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="inline-block bg-gradient-to-b from-[#FFF5C3] via-[#D4AF37] to-[#8B6508] bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            {t('headline_1')}
          </span>
          <br />
          <span className="inline-block bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent mt-2 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
            {t('headline_2')}
          </span>
        </motion.h1>

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
              whileTap={{ scale: 0.98, y: 2 }}
              className="group relative flex items-center gap-3 px-8 py-4 rounded-full font-sans text-gold font-medium tracking-wide overflow-hidden transition-all shadow-[0_8px_30px_-5px_rgba(212,175,55,0.3),inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-4px_8px_rgba(0,0,0,0.6)] bg-gradient-to-b from-[#1c180e] to-[#050505] border border-gold/40 border-t-gold/70"
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
    </main>
  );
}
