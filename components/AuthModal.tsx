"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { isInAppBrowser } from "@/lib/inAppBrowser";
import InAppBrowserModal from "./InAppBrowserModal";

const INPUT_BASE = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 sm:py-4 text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold/50 transition-all font-sans text-base shadow-inner";
const LABEL_BASE = "text-xs sm:text-sm font-sans font-medium text-gray-300 tracking-wide uppercase flex items-center gap-2 mb-2";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [showInAppModal, setShowInAppModal] = useState(false);

  const handleGoogleLogin = async () => {
    if (isInAppBrowser()) {
      setShowInAppModal(true);
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("google", { callbackUrl: `/${locale}/dashboard` });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("error_general") });
      setIsLoading(false);
    }
  };

  if (!isOpen) return (
    <InAppBrowserModal
      isOpen={showInAppModal}
      onClose={() => setShowInAppModal(false)}
    />
  );

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-md bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] overflow-hidden"
        >
          {/* Decorative gradients */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-dark/20 via-transparent to-transparent blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent blur-[80px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-gold" />
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {t("modal_title")}
                </span>
              </h2>
            </div>

            {/* Loading Overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 rounded-3xl bg-background/80 backdrop-blur-md flex flex-col items-center justify-center border border-gold/30"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="mb-4 relative"
                  >
                    <div className="absolute inset-0 bg-gold/20 blur-xl rounded-full" />
                    <Loader2 className="w-10 h-10 text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
                  </motion.div>
                  <p className="font-sans text-sm text-gold/70 animate-pulse">{t("loading")}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`mb-6 p-3 rounded-xl text-sm font-sans ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/50 text-red-200' : 'bg-green-500/10 border border-green-500/50 text-green-200'}`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google OAuth — NextAuth */}
            <motion.button
              onClick={handleGoogleLogin}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-inner"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              <span className="font-sans font-medium text-white tracking-wide">{t("btn_google")}</span>
            </motion.button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    <InAppBrowserModal
      isOpen={showInAppModal}
      onClose={() => setShowInAppModal(false)}
    />
    </>
  );
}
