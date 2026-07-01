"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { MASTERS } from "@/lib/masters";
import { getMaster, saveMaster, getProfile } from "@/lib/userStateManager";

const TOTAL = MASTERS.length;

function getOffset(index: number, active: number): number {
  const normalizedActive = ((active % TOTAL) + TOTAL) % TOTAL;
  let offset = (index - normalizedActive + TOTAL) % TOTAL;
  if (offset > Math.floor(TOTAL / 2)) {
    offset -= TOTAL;
  }
  return offset;
}

export default function SelectMasterPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const t = useTranslations('SelectMaster');
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const isChangeMode = searchParams.get("change") === "true";

  // On mount: if master is already saved and not in change mode, auto-redirect
  useEffect(() => {
    const savedMaster = getMaster();
    if (savedMaster && !isChangeMode) {
      // Master already selected → skip carousel
      if (mode === "chat") {
        router.push(`/chat?masterId=${savedMaster}`);
      } else {
        // If profile exists, go directly to result; otherwise to input
        const profile = getProfile();
        if (profile) {
          router.push(`/result?masterId=${savedMaster}`);
        } else {
          router.push(`/input-destiny?masterId=${savedMaster}`);
        }
      }
      return;
    }
    // Pre-select the saved master in the carousel if in change mode
    if (savedMaster && isChangeMode) {
      const idx = MASTERS.findIndex((m) => m.id === savedMaster);
      if (idx !== -1) {
        setActiveIndex(idx);
        setSelectedMasterId(savedMaster);
      }
    }
    setReady(true);
  }, [isChangeMode, mode, router]);

  const handleNext = () => {
    setActiveIndex((prev) => prev + 1);
    setSelectedMasterId(null);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => prev - 1);
    setSelectedMasterId(null);
  };

  const handleCardClick = (index: number, isCenter: boolean) => {
    if (isCenter) {
      const masterId = MASTERS[index].id;
      setSelectedMasterId((prev) => prev === masterId ? null : masterId);
    } else {
      const offset = getOffset(index, activeIndex);
      setActiveIndex((prev) => prev + offset);
      setSelectedMasterId(null);
    }
  };

  const handleConsult = () => {
    if (!selectedMasterId) return;
    // Save master selection to localStorage
    saveMaster(selectedMasterId);
    if (isChangeMode) {
      // Return to profile page after changing master
      router.push("/dashboard/profile");
      return;
    }
    if (mode === "chat") {
      router.push(`/chat?masterId=${selectedMasterId}`);
    } else {
      router.push(`/input-destiny?masterId=${selectedMasterId}`);
    }
  };

  const selectedMaster = useMemo(
    () => MASTERS.find(m => m.id === selectedMasterId),
    [selectedMasterId]
  );

  // Show loading while checking redirect
  if (!ready) {
    return (
      <main className="min-h-[100dvh] w-full bg-background flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-gold animate-pulse" />
      </main>
    );
  }

  return (
    <main className="relative min-h-[100dvh] w-full bg-background overflow-hidden flex flex-col justify-center">
      {/* Background Ambient Effect */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-[20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[120px]" />
        <div className="absolute bottom-0 right-[20%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-6 sm:mb-8 w-full"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-sm font-sans tracking-widest text-gold/90 uppercase">
              {t('badge')}
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 text-balance">
            <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
              {t('headline')}
            </span>
          </h1>
          <p className="font-sans text-gray-400 max-w-xl mx-auto leading-relaxed text-sm sm:text-base text-balance">
            {t('description_1')}<br className="hidden sm:block" /> 
            {t('description_2')}
          </p>
        </motion.div>

        {/* 3D Infinite Carousel Section */}
        <div className="relative w-full max-w-6xl h-[55vh] sm:h-[65vh] min-h-[380px] sm:min-h-[450px] flex items-center justify-center" style={{ perspective: "1200px" }}>
          
          {/* Navigation Buttons */}
          <button 
            onClick={handlePrev}
            aria-label="Previous master"
            className="absolute left-1 sm:left-12 z-50 p-2 sm:p-3 rounded-full bg-black/60 border border-gold/40 text-gold backdrop-blur-md transition-all hover:bg-gold/20 hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            <ChevronLeft className="w-5 h-5 sm:w-8 sm:h-8" />
          </button>

          <button 
            onClick={handleNext}
            aria-label="Next master"
            className="absolute right-1 sm:right-12 z-50 p-2 sm:p-3 rounded-full bg-black/60 border border-gold/40 text-gold backdrop-blur-md transition-all hover:bg-gold/20 hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
          >
            <ChevronRight className="w-5 h-5 sm:w-8 sm:h-8" />
          </button>

          {/* Cards */}
          <div className="relative flex items-center justify-center w-full h-full transform-style-3d">
            <AnimatePresence initial={false}>
              {MASTERS.map((master, index) => {
                const offset = getOffset(index, activeIndex);
                const absOffset = Math.abs(offset);
                const isCenter = offset === 0;
                const isChecked = selectedMasterId === master.id;
                
                const isVisible = absOffset <= 2;
                if (!isVisible) return null;

                const translateX = offset * 110; 
                const scale = 1 - absOffset * 0.15;
                const rotateY = offset * -25;
                const zIndex = 20 - absOffset;
                const opacity = isCenter ? 1 : 1 - absOffset * 0.4;

                return (
                  <motion.div
                    key={master.id}
                    onClick={() => handleCardClick(index, isCenter)}
                    animate={{
                      x: `${translateX}%`,
                      scale,
                      rotateY,
                      z: isCenter ? 100 : -absOffset * 100,
                      opacity,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.8,
                      transition: { duration: 0.3 },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 25,
                    }}
                    className={`absolute w-[65vw] sm:w-[300px] md:w-[340px] lg:w-[380px] aspect-[3/4] cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-300
                      ${
                        isChecked
                          ? "ring-2 ring-gold shadow-[0_0_50px_rgba(212,175,55,0.6)]"
                          : isCenter 
                            ? "ring-1 ring-gold/50 shadow-[0_0_30px_rgba(0,0,0,0.8)] hover:ring-gold" 
                            : "ring-1 ring-white/10 shadow-xl"
                      }
                    `}
                    style={{ zIndex }}
                  >
                    <div className="relative w-full h-full bg-black/80">
                      {/* Base Image (Calm) */}
                      <Image
                        src={master.image}
                        alt={master.name}
                        fill
                        priority={absOffset <= 1}
                        sizes="(max-width: 640px) 65vw, (max-width: 768px) 300px, (max-width: 1024px) 340px, 380px"
                        className="object-cover"
                      />

                      {/* Checked Image (Joy) - Fades in */}
                      <motion.div
                        initial={false}
                        animate={{ opacity: isChecked ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={master.imageChecked}
                          alt={`${master.name} Checked`}
                          fill
                          sizes="(max-width: 640px) 65vw, (max-width: 768px) 300px, (max-width: 1024px) 340px, 380px"
                          className="object-cover"
                        />
                      </motion.div>
                      
                      {/* Gradient Overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10" />
                      {!isCenter && (
                        <div className="absolute inset-0 bg-black/50 z-10 transition-opacity duration-300" />
                      )}

                      {/* Selection Indicator (Checkmark) */}
                      <div className="absolute top-4 right-4 z-30">
                        <motion.div
                          initial={false}
                          animate={{ scale: isChecked ? 1 : 0, opacity: isChecked ? 1 : 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="bg-background/80 backdrop-blur-sm rounded-full p-1"
                        >
                          <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 z-20 flex flex-col justify-end">
                        <motion.div 
                          animate={{ opacity: isCenter ? 1 : 0.4, y: isCenter ? 0 : 10 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="flex flex-col items-center text-center"
                        >
                          <div className={`inline-block px-3 sm:px-4 py-1 sm:py-1.5 mb-2 sm:mb-3 rounded-full bg-black/60 border backdrop-blur-md transition-colors duration-300 ${isChecked ? 'border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]' : 'border-gold/30'}`}>
                            <span className="text-[10px] sm:text-sm font-sans font-medium text-gold tracking-widest uppercase">
                              {master.specialty}
                            </span>
                          </div>
                          <h3 className="font-serif text-2xl sm:text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {master.name}
                          </h3>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Floating CTA Bottom Bar */}
      <AnimatePresence>
        {selectedMasterId && selectedMaster && (
          <motion.div
            key="cta-bar"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className="fixed bottom-0 left-0 w-full z-50 p-3 sm:p-6"
          >
            <div className="max-w-3xl mx-auto bg-black/80 backdrop-blur-md border border-yellow-900/50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-gold shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                  <Image
                    src={selectedMaster.imageChecked}
                    alt={selectedMaster.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-[10px] sm:text-sm text-gold/70 font-sans tracking-widest uppercase mb-0.5">{t('selected_label')}</p>
                  <p className="font-serif text-lg sm:text-2xl text-white font-bold">{selectedMaster.name}</p>
                </div>
              </div>

              <motion.button
                onClick={handleConsult}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto relative flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-sans text-background bg-gradient-to-r from-[#D4AF37] via-[#FFF5C3] to-[#D4AF37] font-semibold tracking-wide overflow-hidden transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
              >
                <span className="relative z-10 text-base sm:text-lg">{t('cta_button')} {selectedMaster.name}</span>
                <ChevronRight className="relative z-10 w-5 h-5 sm:w-6 sm:h-6" />
                {/* Shimmer */}
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent z-0 w-1/2"
                />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
