"use client";

import { useTransition } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { Globe, LayoutDashboard, Shield } from "lucide-react";
import LoginButton from "./LoginButton";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

const languages = [
  { code: 'en', name: 'EN' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'ES' },
  { code: 'de', name: 'DE' },
  { code: 'fr', name: 'FR' },
  { code: 'ja', name: '日本語' },
];

export default function Navbar() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { data: session } = useSession();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  // Hide on dashboard (dashboard has its own layout)
  const isDashboard = pathname.includes('/dashboard');
  if (isDashboard) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] pointer-events-none">
      <div className="flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-4 pointer-events-auto max-w-7xl mx-auto">
        
        {/* Language Selector — always visible, compact */}
        {!isDashboard && (
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/10 pl-2.5 pr-1 py-1.5 rounded-full shadow-sm">
            <Globe className="w-3.5 h-3.5 text-gold/70 shrink-0" />
            <select
              defaultValue={locale}
              disabled={isPending}
              onChange={handleLanguageChange}
              className="bg-transparent text-xs font-sans text-gray-300 outline-none cursor-pointer appearance-none pr-4"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23D4AF37%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right .1em top 55%', backgroundSize: '.55em auto' }}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-background text-foreground">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Dashboard Link if logged in */}
        {session && (
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/50 border border-gold/30 hover:border-gold/60 hover:bg-gold/10 backdrop-blur-md shadow-sm group active:scale-95 active:bg-opacity-80 transition-all duration-150 ease-in-out transform-gpu"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-gold/80 group-hover:text-gold" />
              <span className="font-sans text-xs font-medium text-gray-200 group-hover:text-white tracking-wide hidden sm:block">
                {t("btn_dashboard")}
              </span>
            </motion.button>
          </Link>
        )}

        {/* Admin Dashboard — strictly visible to ADMIN role only */}
        {session && (session.user as any)?.role === 'ADMIN' && (
          <Link href="/admin">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-red-950/60 border border-red-500/40 hover:border-red-400/70 hover:bg-red-900/40 backdrop-blur-md shadow-[0_0_12px_rgba(239,68,68,0.15)] group active:scale-95 transition-all duration-150 ease-in-out transform-gpu"
            >
              <Shield className="w-3.5 h-3.5 text-red-400/90 group-hover:text-red-300" />
              <span className="font-sans text-xs font-medium text-red-300/90 group-hover:text-red-200 tracking-wide">
                Admin
              </span>
            </motion.button>
          </Link>
        )}

        {/* NextAuth Login Button */}
        <LoginButton />
      </div>
    </div>
  );
}
