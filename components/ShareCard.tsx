"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, ExternalLink, Globe, Link2, Check, MessageCircle } from "lucide-react";

interface ShareCardProps {
  title: string;
  description: string;
  url?: string;
  locale: string;
}

const LABELS: Record<string, { share: string; copied: string; shareTitle: string }> = {
  ko: { share: "내 운명 공유하기", copied: "링크 복사됨!", shareTitle: "나의 사주 분석 결과" },
  en: { share: "Share My Destiny", copied: "Link Copied!", shareTitle: "My Cosmic Blueprint" },
  ja: { share: "私の運命を共有", copied: "リンクコピー済み!", shareTitle: "私の四柱推命分析" },
  es: { share: "Compartir Mi Destino", copied: "¡Enlace copiado!", shareTitle: "Mi Plano Cósmico" },
  de: { share: "Mein Schicksal teilen", copied: "Link kopiert!", shareTitle: "Mein Kosmischer Plan" },
  fr: { share: "Partager Mon Destin", copied: "Lien copié!", shareTitle: "Mon Plan Cosmique" },
};

export default function ShareCard({ title, description, url, locale }: ShareCardProps) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const labels = LABELS[locale] || LABELS.en;
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.origin : 'https://thekdestiny.com');
  const shareText = `${title} — ${description}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n🔮 ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = `${shareText}\n\n🔮 ${shareUrl}`;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareChannels = [
    {
      name: "X / Twitter",
      icon: <ExternalLink className="w-4 h-4" />,
      color: "hover:bg-white/10 hover:text-white",
      onClick: () => window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        '_blank'
      ),
    },
    {
      name: "Facebook",
      icon: <Globe className="w-4 h-4" />,
      color: "hover:bg-blue-500/10 hover:text-blue-400",
      onClick: () => window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
        '_blank'
      ),
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-4 h-4" />,
      color: "hover:bg-green-500/10 hover:text-green-400",
      onClick: () => window.open(
        `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n🔮 ${shareUrl}`)}`,
        '_blank'
      ),
    },
    {
      name: "KakaoTalk",
      icon: <span className="text-sm font-bold">K</span>,
      color: "hover:bg-yellow-500/10 hover:text-yellow-400",
      onClick: () => {
        // Kakao share link (simplified — opens share URL)
        window.open(
          `https://story.kakao.com/share?url=${encodeURIComponent(shareUrl)}`,
          '_blank'
        );
      },
    },
    {
      name: copied ? labels.copied : "Copy Link",
      icon: copied ? <Check className="w-4 h-4 text-green-400" /> : <Link2 className="w-4 h-4" />,
      color: copied ? "bg-green-500/10 text-green-400" : "hover:bg-gold/10 hover:text-gold",
      onClick: handleCopy,
    },
  ];

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowShare(!showShare)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-gray-400 hover:text-gold hover:border-gold/30 transition-all font-sans text-sm"
      >
        <Share2 className="w-4 h-4" />
        {labels.share}
      </motion.button>

      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#0a0918]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[280px] z-50"
          >
            <p className="text-[10px] font-sans tracking-widest text-gray-500 uppercase mb-3 text-center">
              {labels.shareTitle}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {shareChannels.map((ch) => (
                <button
                  key={ch.name}
                  onClick={ch.onClick}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-gray-400 transition-all text-xs font-sans ${ch.color}`}
                >
                  {ch.icon}
                  {ch.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
