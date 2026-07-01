"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { getExpiryStatus, isPremium } from "@/lib/userStateManager";

export default function ExpiryWarningModal() {
  const t = useTranslations("Modal");
  const [isOpen, setIsOpen] = useState(false);
  const [remainingDays, setRemainingDays] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Check if user is premium and has expiry
    if (!isPremium()) return;

    const status = getExpiryStatus();
    
    // 2. Only show if remaining days is between 0 and 10
    if (status.expiryDate && status.remainingDays >= 0 && status.remainingDays <= 10) {
      setRemainingDays(status.remainingDays);

      // 3. Check "Don't show today" flag
      const hiddenUntil = localStorage.getItem("kdestiny_expiry_hidden_until");
      if (hiddenUntil) {
        const hideUntilDate = new Date(hiddenUntil);
        if (new Date() < hideUntilDate) {
          return; // Still hidden today
        }
      }

      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleHideToday = () => {
    // Set hidden until tomorrow
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0); // Midnight tonight
    localStorage.setItem("kdestiny_expiry_hidden_until", tomorrow.toISOString());
    setIsOpen(false);
  };

  if (!mounted || !isOpen || remainingDays === null) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0a0a0f] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] overflow-hidden"
        >
          {/* Accent glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-red-500/20 blur-[50px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white mb-2">
              {t("expiry_title")}
            </h2>
            <p className="text-gray-400 text-sm font-sans mb-6">
              {t("expiry_desc").replace("{days}", remainingDays.toString())}
            </p>

            <Link href="/pricing" className="w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClose} // close modal when navigating
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-sans font-semibold shadow-lg shadow-red-900/50 flex items-center justify-center gap-2 mb-4"
              >
                {t("btn_upgrade")}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </Link>

            <button
              onClick={handleHideToday}
              className="text-xs text-gray-500 hover:text-gray-300 font-sans underline underline-offset-2 transition-colors"
            >
              {t("btn_hide_today")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
