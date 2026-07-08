'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MESSAGES: Record<string, { title: string; body: string; highlight: string; btnClose: string }> = {
  ko: {
    title: '인앱 브라우저 감지됨',
    body: '보안 정책으로 인해 인앱 브라우저에서는 구글 로그인이 제한됩니다. 화면 우측 하단/상단의 메뉴(⋮)를 눌러',
    highlight: '다른 브라우저로 열기 (Chrome/Safari)',
    btnClose: '닫기',
  },
  en: {
    title: 'In-App Browser Detected',
    body: 'For security reasons, Google login is restricted inside this app. Please tap the menu icon [ ⋮ ] and select',
    highlight: 'Open in External Browser (Chrome/Safari)',
    btnClose: 'Close',
  },
  ja: {
    title: 'アプリ内ブラウザが検出されました',
    body: 'セキュリティポリシーにより、アプリ内ブラウザではGoogleログインが制限されます。画面右下/右上のメニュー(⋮)をタップして',
    highlight: '別のブラウザで開く (Chrome/Safari)',
    btnClose: '閉じる',
  },
  es: {
    title: 'Navegador integrado detectado',
    body: 'Por razones de seguridad, el inicio de sesión con Google está restringido en esta aplicación. Toque el icono de menú [ ⋮ ] y seleccione',
    highlight: 'Abrir en navegador externo (Chrome/Safari)',
    btnClose: 'Cerrar',
  },
  de: {
    title: 'In-App-Browser erkannt',
    body: 'Aus Sicherheitsgründen ist die Google-Anmeldung in dieser App eingeschränkt. Tippen Sie auf das Menüsymbol [ ⋮ ] und wählen Sie',
    highlight: 'In externem Browser öffnen (Chrome/Safari)',
    btnClose: 'Schließen',
  },
  fr: {
    title: 'Navigateur intégré détecté',
    body: 'Pour des raisons de sécurité, la connexion Google est restreinte dans cette application. Appuyez sur l\'icône du menu [ ⋮ ] et sélectionnez',
    highlight: 'Ouvrir dans un navigateur externe (Chrome/Safari)',
    btnClose: 'Fermer',
  },
};

export default function InAppBrowserModal({ isOpen, onClose }: InAppBrowserModalProps) {
  const locale = useLocale();
  const msg = MESSAGES[locale] || MESSAGES.en;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0d0d18] via-[#0a0a14] to-[#050510] p-6 sm:p-8 shadow-[0_0_60px_rgba(75,0,130,0.3),0_0_120px_rgba(212,175,55,0.1)]"
        >
          {/* Background glow effects */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-40 w-40 rounded-full bg-red-500/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-40 w-40 rounded-full bg-gold/10 blur-[80px]" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-dark/15 blur-[60px]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-full border border-white/10 bg-black/40 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10">
            {/* Shield Icon with animated pulse */}
            <div className="mb-5 flex justify-center">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(239,68,68,0.3)',
                    '0 0 40px rgba(239,68,68,0.5)',
                    '0 0 20px rgba(239,68,68,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-900/20"
              >
                <ShieldAlert className="h-8 w-8 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              </motion.div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center font-serif text-xl font-bold tracking-tight sm:text-2xl">
              <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {msg.title}
              </span>
            </h2>

            {/* Message body */}
            <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
              <p className="font-sans text-sm leading-relaxed text-gray-300 sm:text-base">
                {msg.body}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3">
                <ExternalLink className="h-5 w-5 shrink-0 text-gold" />
                <span className="font-sans text-sm font-bold text-gold sm:text-base">
                  {msg.highlight}
                </span>
              </div>
              <p className="mt-3 font-sans text-sm leading-relaxed text-gray-300 sm:text-base">
                {locale === 'ko'
                  ? '를 선택해 주세요.'
                  : locale === 'ja'
                    ? 'を選択してください。'
                    : locale === 'es'
                      ? '.'
                      : locale === 'de'
                        ? '.'
                        : locale === 'fr'
                          ? '.'
                          : '.'}
              </p>
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 font-sans font-medium tracking-wide text-white transition-colors hover:bg-white/10"
            >
              {msg.btnClose}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
