'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Copy, Check } from 'lucide-react';
import { useLocale } from 'next-intl';

interface InAppBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MESSAGES: Record<string, {
  title: string;
  step1: string;
  step1Highlight: string;
  step2: string;
  btnCopy: string;
  btnCopied: string;
  btnClose: string;
}> = {
  ko: {
    title: '인앱 브라우저 감지됨',
    step1: '① 메뉴(⋮)를 눌러',
    step1Highlight: '다른 브라우저로 열기',
    step2: '② 또는 아래 링크를 복사하여 Safari/Chrome에 붙여넣어 주세요.',
    btnCopy: '현재 주소 링크 복사하기',
    btnCopied: '복사 완료! Chrome/Safari에 붙여넣기',
    btnClose: '닫기',
  },
  en: {
    title: 'In-App Browser Detected',
    step1: '① Tap the menu (⋮) and select',
    step1Highlight: 'Open in External Browser',
    step2: '② Or copy the link below and paste it into Chrome/Safari.',
    btnCopy: 'Copy Current Link',
    btnCopied: 'Copied! Paste in Chrome/Safari',
    btnClose: 'Close',
  },
  ja: {
    title: 'アプリ内ブラウザ検出',
    step1: '① メニュー(⋮)をタップして',
    step1Highlight: '別のブラウザで開く',
    step2: '② または以下のリンクをコピーしてChrome/Safariに貼り付けてください。',
    btnCopy: '現在のリンクをコピー',
    btnCopied: 'コピー完了！Chrome/Safariに貼り付け',
    btnClose: '閉じる',
  },
  es: {
    title: 'Navegador integrado detectado',
    step1: '① Toque el menú (⋮) y seleccione',
    step1Highlight: 'Abrir en navegador externo',
    step2: '② O copie el enlace y péguelo en Chrome/Safari.',
    btnCopy: 'Copiar enlace actual',
    btnCopied: '¡Copiado! Pegar en Chrome/Safari',
    btnClose: 'Cerrar',
  },
  de: {
    title: 'In-App-Browser erkannt',
    step1: '① Tippen Sie auf das Menü (⋮) und wählen Sie',
    step1Highlight: 'In externem Browser öffnen',
    step2: '② Oder kopieren Sie den Link und fügen Sie ihn in Chrome/Safari ein.',
    btnCopy: 'Aktuellen Link kopieren',
    btnCopied: 'Kopiert! In Chrome/Safari einfügen',
    btnClose: 'Schließen',
  },
  fr: {
    title: 'Navigateur intégré détecté',
    step1: '① Appuyez sur le menu (⋮) et sélectionnez',
    step1Highlight: 'Ouvrir dans un navigateur externe',
    step2: '② Ou copiez le lien ci-dessous et collez-le dans Chrome/Safari.',
    btnCopy: 'Copier le lien actuel',
    btnCopied: 'Copié ! Coller dans Chrome/Safari',
    btnClose: 'Fermer',
  },
};

export default function InAppBrowserModal({ isOpen, onClose }: InAppBrowserModalProps) {
  const locale = useLocale();
  const msg = MESSAGES[locale] || MESSAGES.en;
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        {/* Backdrop — click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full max-w-[90vw] sm:max-w-md max-h-[80vh] overflow-y-auto rounded-xl border border-white/10 bg-gradient-to-b from-[#0d0d18] via-[#0a0a14] to-[#050510] p-5 sm:p-7 shadow-[0_0_60px_rgba(75,0,130,0.3),0_0_120px_rgba(212,175,55,0.1)]"
        >
          {/* Background glow effects */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-32 w-32 rounded-full bg-red-500/10 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-gold/10 blur-[60px]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-20 rounded-full border border-white/10 bg-black/40 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative z-10">
            {/* Shield Icon with animated pulse */}
            <div className="mb-4 flex justify-center">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 16px rgba(239,68,68,0.3)',
                    '0 0 32px rgba(239,68,68,0.5)',
                    '0 0 16px rgba(239,68,68,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-gradient-to-br from-red-500/20 to-red-900/20"
              >
                <ShieldAlert className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
              </motion.div>
            </div>

            {/* Title */}
            <h2 className="mb-4 text-center font-serif text-lg font-bold tracking-tight sm:text-xl">
              <span className="bg-gradient-to-b from-white via-gray-200 to-gray-500 bg-clip-text text-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                {msg.title}
              </span>
            </h2>

            {/* Guidance steps */}
            <div className="mb-5 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              {/* Step 1 */}
              <div>
                <p className="font-sans text-sm leading-relaxed text-gray-300">
                  {msg.step1}{' '}
                  <span className="font-bold text-gold">
                    [{msg.step1Highlight}]
                  </span>
                  {locale === 'ko' ? '를 선택하거나,' : locale === 'ja' ? 'を選択するか、' : ','}
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.06]" />
                <span className="text-xs font-sans text-gray-500 uppercase tracking-wider">
                  {locale === 'ko' ? '또는' : locale === 'ja' ? 'または' : locale === 'es' ? 'o' : locale === 'de' ? 'oder' : locale === 'fr' ? 'ou' : 'or'}
                </span>
                <div className="h-px flex-1 bg-white/[0.06]" />
              </div>

              {/* Step 2 */}
              <p className="font-sans text-sm leading-relaxed text-gray-300">
                {msg.step2}
              </p>
            </div>

            {/* Copy Link button */}
            <motion.button
              onClick={handleCopyLink}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 font-sans text-sm font-bold tracking-wide transition-all duration-300 ${
                copied
                  ? 'border border-green-500/40 bg-green-500/10 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                  : 'border border-gold/30 bg-gold/10 text-gold shadow-[0_0_20px_rgba(212,175,55,0.1)] hover:bg-gold/20'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  {msg.btnCopied}
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  {msg.btnCopy}
                </>
              )}
            </motion.button>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-sans text-sm font-medium tracking-wide text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {msg.btnClose}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
