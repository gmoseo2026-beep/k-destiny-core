"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { signIn } from "next-auth/react";
import { isInAppBrowser } from "@/lib/inAppBrowser";
import KongdakMascot from "@/components/KongdakMascot";

export default function LoginPage() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const inApp = typeof window !== 'undefined' ? isInAppBrowser() : false;

  const handleGoogleLogin = async () => {
    if (isInAppBrowser()) {
      setMessage({ type: "error", text: locale === 'ko' 
        ? "인앱 브라우저에서는 구글 로그인을 사용할 수 없습니다. 아래 이메일 로그인을 이용해 주세요."
        : "Google login is not available in this in-app browser. Please use the email login below."
      });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("google", { callbackUrl: `/${locale}/dashboard` });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({ type: "error", text: err.message || t("error_general") });
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (isInAppBrowser()) {
      setMessage({ type: "error", text: locale === 'ko' 
        ? "인앱 브라우저에서는 소셜 로그인을 사용할 수 없습니다. 아래 이메일 로그인을 이용해 주세요."
        : "Social login is not available in this in-app browser. Please use the email login below."
      });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("kakao", { callbackUrl: `/${locale}/dashboard` });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({ type: "error", text: err.message || t("error_general") });
      setIsLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    if (isInAppBrowser()) {
      setMessage({ type: "error", text: locale === 'ko' 
        ? "인앱 브라우저에서는 소셜 로그인을 사용할 수 없습니다. 아래 이메일 로그인을 이용해 주세요."
        : "Social login is not available in this in-app browser. Please use the email login below."
      });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      await signIn("naver", { callbackUrl: `/${locale}/dashboard` });
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({ type: "error", text: err.message || t("error_general") });
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
        // Register first
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

      // Sign in with credentials
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
        window.location.href = `/${locale}/dashboard`;
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      setMessage({ type: "error", text: err.message || t("error_general") });
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100dvh] w-full bg-[#FFF8F0] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Brand Header with Mascot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="flex justify-center mb-2">
            <KongdakMascot size={72} animate="bounce" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2B2430] mb-2">
            {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8291] font-medium leading-relaxed max-w-xs mx-auto">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Kongdak Light Theme Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#FFD9E0]/70"
        >
          {/* Loading State Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 rounded-3xl bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center border border-[#FFD9E0]"
              >
                <div className="mb-3">
                  <Loader2 className="w-10 h-10 text-[#FF5C77] animate-spin" />
                </div>
                <p className="text-xs font-bold text-[#6A2C70] animate-pulse">{t("loading")}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error / Success Messages */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-5 p-3 rounded-2xl text-xs font-bold ${
                  message.type === 'error' 
                    ? 'bg-rose-50 border border-rose-200 text-rose-700' 
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}
              >
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Social Logins */}
          <div className="space-y-2.5">
            <motion.button
              onClick={handleKakaoLogin}
              whileHover={{ scale: inApp ? 1 : 1.01 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl transition-all shadow-sm ${
                inApp
                  ? 'bg-[#FEE500]/50 opacity-50 cursor-not-allowed text-black/50'
                  : 'bg-[#FEE500] hover:bg-[#FEE500]/90 text-black'
              }`}
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                <path d="M16 4.64C8.269 4.64 2 9.697 2 15.942c0 4.024 2.502 7.55 6.275 9.624l-1.579 5.86c-.116.425.353.754.73.522l6.815-4.51c.563.078 1.144.12 1.749.12 7.73 0 14-5.057 14-11.302S23.73 4.64 16 4.64z"/>
              </svg>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                {locale === 'ko' ? '카카오로 시작하기' : 'Continue with Kakao'}
              </span>
            </motion.button>

            <motion.button
              onClick={handleNaverLogin}
              whileHover={{ scale: inApp ? 1 : 1.01 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl transition-all shadow-sm ${
                inApp
                  ? 'bg-[#03C75A]/50 opacity-50 cursor-not-allowed text-white/50'
                  : 'bg-[#03C75A] hover:bg-[#03C75A]/90 text-white'
              }`}
            >
              <svg viewBox="0 0 32 32" className="w-5 h-5 fill-current">
                <path d="M19.689 9.878L12.01 20.31h-4.33V9.878h4.332v10.432l7.678-10.432h4.33v10.432h-4.331V9.878z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                {locale === 'ko' ? '네이버로 시작하기' : 'Continue with Naver'}
              </span>
            </motion.button>

            <motion.button
              onClick={handleGoogleLogin}
              whileHover={{ scale: inApp ? 1 : 1.01 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl transition-all shadow-sm ${
                inApp
                  ? 'bg-gray-100 border border-gray-200 opacity-50 cursor-not-allowed text-gray-400'
                  : 'bg-white hover:bg-gray-50 border border-[#E5E0DC] text-[#2B2430]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
              </svg>
              <span className="text-xs sm:text-sm font-bold tracking-tight">
                {t("btn_google")}
              </span>
            </motion.button>
          </div>

          {/* In-App Browser hint */}
          {inApp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-center text-xs font-semibold"
            >
              {locale === 'ko' 
                ? '⚠️ 인앱 브라우저 감지 — 아래 이메일 로그인을 이용해 주세요' 
                : '⚠️ In-app browser detected — use email login below'}
            </motion.div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#FFD9E0]" />
            <span className="text-[11px] text-[#8A8291] font-bold uppercase tracking-wider">{t("or")}</span>
            <div className="h-px flex-1 bg-[#FFD9E0]" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="text-xs font-bold text-[#6A5E72] flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5 text-[#FF5C77]" />
                  <span>{locale === 'ko' ? '이름 (선택)' : 'Name (optional)'}</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={locale === 'ko' ? '예: 콩닥이' : 'e.g. Kongdak'}
                  className="w-full bg-[#FFF6F1]/50 border border-[#F0E3D6] rounded-2xl px-4 py-3 text-[#2B2430] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77] text-xs sm:text-sm font-medium transition-all"
                />
              </motion.div>
            )}

            <div>
              <label className="text-xs font-bold text-[#6A5E72] flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5 text-[#FF5C77]" />
                <span>{t("label_email")}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("placeholder_email")}
                required
                className="w-full bg-[#FFF6F1]/50 border border-[#F0E3D6] rounded-2xl px-4 py-3 text-[#2B2430] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77] text-xs sm:text-sm font-medium transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#6A5E72] flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FF5C77]" />
                <span>{t("label_password")}</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("placeholder_password")}
                required
                minLength={6}
                className="w-full bg-[#FFF6F1]/50 border border-[#F0E3D6] rounded-2xl px-4 py-3 text-[#2B2430] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5C77]/40 focus:border-[#FF5C77] text-xs sm:text-sm font-medium transition-all"
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF8AA1] via-[#FF5C77] to-[#6A2C70] text-white font-bold text-xs sm:text-sm shadow-md hover:opacity-95 active:scale-[0.96] transition-all"
            >
              {isSignUp ? t("btn_signup") : t("btn_signin")}
            </motion.button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="w-full mt-4 text-center text-xs text-[#8A8291] hover:text-[#FF5C77] font-semibold transition-colors"
          >
            {isSignUp ? t("toggle_to_signin") : t("toggle_to_signup")}
          </button>
        </motion.div>
      </div>
    </main>
  );
}
