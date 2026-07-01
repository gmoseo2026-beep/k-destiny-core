"use client";

import { Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowLeft, Star } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

const MASTER_MAP: Record<string, string> = {
  "1": "hana", "2": "ian", "3": "jay", "4": "jin", "5": "karma",
  "6": "muwi", "7": "rin", "8": "ryu", "9": "seoa", "10": "yura",
  "hana": "hana", "ian": "ian", "jay": "jay", "jin": "jin", "karma": "karma",
  "muwi": "muwi", "rin": "rin", "ryu": "ryu", "seoa": "seoa", "yura": "yura",
};

// Staggered entrance variants for premium feel
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

function BlueprintContent() {
  const router = useRouter();
  const t = useTranslations('Blueprint');
  const searchParams = useSearchParams();
  
  const rawMasterId = searchParams.get("masterId") || "karma";
  const masterKey = MASTER_MAP[rawMasterId.toLowerCase()] || "karma";

  // Load real element analysis from saved result (localStorage)
  const savedAnalysis = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("kdestiny_last_result");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed?.element_analysis || null;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  const elements = useMemo(() => {
    const base = [
      { id: "wood", name: t('wood'), image: "/images/element_wood.webp.jpg", color: "from-green-500 to-emerald-600", shadow: "shadow-green-500/20" },
      { id: "fire", name: t('fire'), image: "/images/element_fire.webp.jpg", color: "from-red-500 to-orange-600", shadow: "shadow-red-500/20" },
      { id: "earth", name: t('earth'), image: "/images/element_earth.webp.jpg", color: "from-yellow-500 to-amber-600", shadow: "shadow-yellow-500/20" },
      { id: "metal", name: t('metal'), image: "/images/element_metal.webp.jpg", color: "from-gray-300 to-gray-500", shadow: "shadow-gray-500/20" },
      { id: "water", name: t('water'), image: "/images/element_water.webp.jpg", color: "from-blue-500 to-cyan-600", shadow: "shadow-blue-500/20" },
    ];

    if (savedAnalysis) {
      // Convert raw scores (0-8) to percentage (0-100) for display
      const maxScore = Math.max(...Object.values(savedAnalysis as Record<string, number>), 1);
      return base.map(el => ({
        ...el,
        value: Math.round(((savedAnalysis[el.id] || 0) / maxScore) * 100),
      }));
    }

    // Fallback: balanced defaults when no data exists yet
    return base.map(el => ({ ...el, value: 50 }));
  }, [t, savedAnalysis]);

  const traits = useMemo(() => [
    { title: t('trait_1_title'), desc: t('trait_1_desc') },
    { title: t('trait_2_title'), desc: t('trait_2_desc') },
    { title: t('trait_3_title'), desc: t('trait_3_desc') },
    { title: t('trait_4_title'), desc: t('trait_4_desc') },
  ], [t]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative z-10 w-full max-w-4xl mx-auto pb-20"
    >
      
      {/* Header */}
      <motion.div variants={itemVariants} className="text-center mt-6 mb-10 sm:mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="text-sm font-sans tracking-widest text-gold/90 uppercase">
            {t('title')}
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 whitespace-pre-line leading-snug">
          <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-sm">
            {t('subtitle')}
          </span>
        </h1>
      </motion.div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
        
        {/* Section 1: Master's Insight */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-12 relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-center gap-5 sm:gap-8 overflow-hidden"
        >
          {/* Subtle glow */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-gold/10 rounded-full blur-[60px] pointer-events-none" />
          
          <div className="relative w-20 h-20 sm:w-32 sm:h-32 shrink-0 rounded-full border-2 border-gold/30 p-1 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <Image
                src={`/images/master_${masterKey}_calm.webp.jpg`}
                alt={`Master ${masterKey}`}
                fill
                sizes="(max-width: 640px) 80px, 128px"
                className="object-cover object-top"
              />
            </div>
          </div>
          
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg sm:text-2xl font-serif font-bold text-white mb-2 sm:mb-3 capitalize">
              {t('master_insight')} — {masterKey}
            </h2>
            <p className="font-sans text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              &ldquo;{t('master_msg')}&rdquo;
            </p>
          </div>
        </motion.div>

        {/* Section 2: Cosmic Energy Profile (Wu Xing List) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-7 relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-5 sm:mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold/70" />
            {t('energy_profile')}
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            {elements.map((el, idx) => (
              <motion.div 
                key={el.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 bg-black/35 border border-white/5 rounded-xl sm:rounded-2xl hover:border-gold/20 transition-all duration-300 group"
              >
                {/* Element Thumbnail */}
                <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover:border-gold/30 transition-colors shadow-md">
                  <Image 
                    src={el.image} 
                    alt={el.name} 
                    fill 
                    sizes="48px"
                    className="object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                </div>

                {/* Info and Progress Bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1 text-xs sm:text-sm font-sans">
                    <span className="text-white/90 font-bold font-serif truncate mr-2">{el.name}</span>
                    <span className="text-gold font-mono font-medium shrink-0">{el.value}%</span>
                  </div>
                  <div className="h-2 sm:h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${el.value}%` }}
                      transition={{ duration: 1.5, delay: 0.6 + idx * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`h-full rounded-full bg-gradient-to-r ${el.color} ${el.shadow} shadow-lg`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Section 3: Destiny Traits */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col"
        >
          <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-5 sm:mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold/70" />
            {t('destiny_traits')}
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 content-start">
            {traits.map((trait, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 + idx * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
                whileHover={{ scale: 1.03, borderColor: "rgba(212,175,55,0.3)" }}
                className="bg-black/30 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col justify-center gap-1 transition-colors shadow-inner cursor-default"
              >
                <span className="text-[10px] sm:text-xs font-sans text-gray-400 uppercase tracking-wider">{trait.title}</span>
                <span className="text-sm sm:text-base font-serif font-medium text-gold/90">{trait.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>

      {/* Action Buttons */}
      <motion.div
        variants={itemVariants}
        className="mt-10 sm:mt-12 flex justify-center"
      >
        <motion.button
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="group flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full border border-gold/40 text-gold/80 hover:bg-gold/10 hover:text-gold transition-all font-sans text-sm tracking-wide uppercase shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {t('btn_home')}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

export default function BlueprintPage() {
  return (
    <main className="relative min-h-[100dvh] w-full bg-background flex flex-col p-4 sm:p-8 overflow-x-hidden overflow-y-auto">
      {/* Mystical Background - local SVG pattern */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-stardust opacity-20 mix-blend-screen" />
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
      </div>

      <Suspense fallback={
        <div className="flex w-full h-screen items-center justify-center">
          <Sparkles className="w-8 h-8 text-gold animate-pulse" />
        </div>
      }>
        <BlueprintContent />
      </Suspense>
    </main>
  );
}
