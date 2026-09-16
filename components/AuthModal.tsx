"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, X, Mail, Lock, User } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { isInAppBrowser, openInExternalBrowser } from "@/lib/inAppBrowser";
import InAppBrowserModal from "@/components/InAppBrowserModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /**
   * Where to land after a successful login. Defaults to the dashboard.
   * Pass the current page path (e.g. "/result") for in-context login so the
   * user returns to where they were — used by the paywall unlock flow so the
   * checkout can immediately prefill the now-known account email.
   */
  redirectTo?: string;
}

export default function AuthModal({ isOpen, onClose, onSuccess, redirectTo }: AuthModalProps) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const destination = `/${locale}${redirectTo || "/dashboard"}`;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showInAppModal, setShowInAppModal] = useState(false);
  const inApp = typeof window !== 'undefined' ? isInAppBrowser() : false;

  // Portal target is only available on the client.
  useEffect(() => { setMounted(true); }, []);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  const handleEscape = () => {
    const ok = openInExternalBrowser();
    if (!ok) setShowInAppModal(true);
  };

  const handleGoogleLogin = async () => {
    if (isInAppBrowser()) {
      handleEscape();
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("google", { callbackUrl: destination });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("error_general") });
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (isInAppBrowser()) {
      handleEscape();
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("kakao", { callbackUrl: destination });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("error_general") });
      setIsLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    if (isInAppBrowser()) {
      handleEscape();
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("naver", { callbackUrl: destination });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("error_general") });
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: "error", text: locale === 'ko' ? "이메일과 비밀번호를 입력해 주세요." : "Please enter email and password." });
      return;
    }

    if (isSignUp && password.length < 6) {
      setMessage({ type: "error", text: locale === 'ko' ? "비밀번호는 6자 이상이어야 합니다." : "Password must be at least 6 characters." });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || t("error_general") });
          setIsLoading(false);
          return;
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setMessage({ type: "error", text: locale === 'ko'
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : "Invalid email or password."
        });
        setIsLoading(false);
      } else {
        onSuccess();
        window.location.href = destination;
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || t("error_general") });
      setIsLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modal = (
    <>
      <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#2B2430]/50 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white border border-[#2B2430]/10 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(106,44,112,0.25)]"
        >
          {/* Decorative gradients (soft coral blush) */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF8AA1]/20 via-transparent to-transparent blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FFC24B]/15 via-transparent to-transparent blur-[80px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close login dialog"
            className="absolute top-4 right-4 p-2 rounded-full bg-[#FFF6F1] border border-[#2B2430]/10 text-[#8A8291] hover:text-[#2B2430] hover:bg-[#FFF0EA] transition-colors z-20"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="relative z-10">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-[#FF5C77]" />
              </div>
              <h2 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-[#2B2430]">
                {t("modal_title")}
              </h2>
            </div>

            {/* Loading Overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 rounded-3xl bg-white/90 backdrop-blur-md flex flex-col items-center justify-center border border-[#FF5C77]/20"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="mb-4 relative"
                  >
                    <Loader2 className="w-10 h-10 text-[#FF5C77]" />
                  </motion.div>
                  <p className="font-sans text-sm text-[#FF5C77]/80 animate-pulse">{t("loading")}</p>
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
                  className={`mb-6 p-3 rounded-xl text-sm font-sans ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}
                >
                  {message.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* In-App Browser Breakout Banner & Button */}
            {inApp && (
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleEscape}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF8AA1] to-[#6A2C70] text-white font-bold text-sm shadow-md active:scale-[0.97] transition-all"
                >
                  {locale === 'ko' ? '🔓 크롬/사파리로 열고 로그인하기' : '🔓 Open in Chrome/Safari to Login'}
                </button>
                <p className="mt-2 text-center text-[11px] text-[#8A8291] font-semibold leading-relaxed">
                  {locale === 'ko'
                    ? '카카오·구글·네이버 로그인은 앱 안 브라우저에서 막혀 있어요. 위 버튼을 눌러 주세요.'
                    : 'Social login is blocked inside app webviews. Tap above to open your browser.'}
                </p>
              </div>
            )}

            {/* Social Logins */}
            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={handleKakaoLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-transparent transition-colors bg-[#FEE500] hover:bg-[#FEE500]/90 text-black"
              >
                <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current">
                  <path d="M16 4.64C8.269 4.64 2 9.697 2 15.942c0 4.024 2.502 7.55 6.275 9.624l-1.579 5.86c-.116.425.353.754.73.522l6.815-4.51c.563.078 1.144.12 1.749.12 7.73 0 14-5.057 14-11.302S23.73 4.64 16 4.64z"/>
                </svg>
                <span className="font-sans font-bold tracking-wide">
                  {locale === 'ko' ? '카카오로 계속하기' : 'Continue with Kakao'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleNaverLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-transparent transition-colors bg-[#03C75A] hover:bg-[#03C75A]/90 text-white"
              >
                <svg viewBox="0 0 32 32" className="w-6 h-6 fill-current">
                  <path d="M19.689 9.878L12.01 20.31h-4.33V9.878h4.332v10.432l7.678-10.432h4.33v10.432h-4.331V9.878z" />
                </svg>
                <span className="font-sans font-bold tracking-wide">
                  {locale === 'ko' ? '네이버로 계속하기' : 'Continue with Naver'}
                </span>
              </motion.button>

              <motion.button
                type="button"
                onClick={handleGoogleLogin}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl border border-[#2B2430]/15 transition-colors bg-white hover:bg-[#FFF6F1]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <span className="font-sans font-medium text-[#2B2430] tracking-wide">{t("btn_google")}</span>
              </motion.button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="h-px flex-1 bg-[#2B2430]/10" />
              <span className="text-xs text-[#8A8291] font-sans uppercase tracking-widest">{t("or")}</span>
              <div className="h-px flex-1 bg-[#2B2430]/10" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="text-xs sm:text-sm font-sans font-medium text-[#2B2430] tracking-wide flex items-center gap-2 mb-2">
                    <User className="w-3.5 h-3.5" />
                    {locale === 'ko' ? '이름 (선택)' : 'Name (optional)'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={locale === 'ko' ? '예: 홍길동' : 'e.g. John'}
                    className="w-full bg-[#FFF6F1] border border-[#2B2430]/12 rounded-xl px-4 py-3 text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77]/50 transition-all font-sans text-sm placeholder:text-[#B8B2BC]"
                  />
                </motion.div>
              )}

              <div>
                <label className="text-xs sm:text-sm font-sans font-medium text-[#2B2430] tracking-wide flex items-center gap-2 mb-2">
                  <Mail className="w-3.5 h-3.5" />
                  {t("label_email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholder_email")}
                  required
                  className="w-full bg-[#FFF6F1] border border-[#2B2430]/12 rounded-xl px-4 py-3 text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77]/50 transition-all font-sans text-sm placeholder:text-[#B8B2BC]"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-sans font-medium text-[#2B2430] tracking-wide flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  {t("label_password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("placeholder_password")}
                  required
                  minLength={6}
                  className="w-full bg-[#FFF6F1] border border-[#2B2430]/12 rounded-xl px-4 py-3 text-[#2B2430] focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77]/50 transition-all font-sans text-sm placeholder:text-[#B8B2BC]"
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF8AA1] to-[#FF5C77] hover:from-[#FF7E9B] hover:to-[#FF4A69] text-white font-sans font-bold text-sm tracking-wide transition-all shadow-[0_8px_20px_rgba(255,92,119,0.3)]"
              >
                {isSignUp ? t("btn_signup") : t("btn_signin")}
              </motion.button>
            </form>

            {/* Toggle Sign In / Sign Up */}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
              className="w-full mt-4 text-center text-sm text-[#8A8291] hover:text-[#FF5C77] transition-colors font-sans"
            >
              {isSignUp ? t("toggle_to_signin") : t("toggle_to_signup")}
            </button>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    <InAppBrowserModal isOpen={showInAppModal} onClose={() => setShowInAppModal(false)} />
  </>
  );

  return createPortal(modal, document.body);
}
