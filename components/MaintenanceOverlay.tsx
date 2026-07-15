"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";

/**
 * Global maintenance mode overlay.
 * Set MAINTENANCE_MODE = true to activate.
 * Set MAINTENANCE_MODE = false to deactivate after update.
 */
const MAINTENANCE_MODE = true;

const MESSAGES: Record<string, { title: string; subtitle: string; alert: string }> = {
  ko: {
    title: "🔧 금일 대규모 업데이트 진행 예정",
    subtitle: "더 나은 서비스를 위해 업데이트 중입니다.\n잠시 후 다시 방문해주세요.",
    alert: "업데이트 후 이용 가능합니다.",
  },
  en: {
    title: "🔧 Major Update Scheduled Today",
    subtitle: "We're upgrading for a better experience.\nPlease visit again shortly.",
    alert: "Available after the update is complete.",
  },
  ja: {
    title: "🔧 本日大規模アップデート予定",
    subtitle: "より良いサービスのためアップデート中です。\nしばらくしてから再度お越しください。",
    alert: "アップデート後にご利用いただけます。",
  },
  es: {
    title: "🔧 Gran actualización programada para hoy",
    subtitle: "Estamos mejorando para una mejor experiencia.\nPor favor, vuelva a visitarnos pronto.",
    alert: "Disponible después de la actualización.",
  },
  de: {
    title: "🔧 Großes Update für heute geplant",
    subtitle: "Wir aktualisieren für ein besseres Erlebnis.\nBitte besuchen Sie uns bald wieder.",
    alert: "Nach dem Update verfügbar.",
  },
  fr: {
    title: "🔧 Mise à jour majeure prévue aujourd'hui",
    subtitle: "Nous améliorons le service.\nVeuillez revenir bientôt.",
    alert: "Disponible après la mise à jour.",
  },
};

export default function MaintenanceOverlay() {
  const locale = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(MAINTENANCE_MODE);
  }, []);

  if (!show) return null;

  const msg = MESSAGES[locale] || MESSAGES.en;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert(msg.alert);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 5, 14, 0.97)",
        backdropFilter: "blur(20px)",
        cursor: "pointer",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "2px solid rgba(212,175,55,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 32,
          animation: "pulse 3s ease-in-out infinite",
        }}
      >
        <span style={{ fontSize: 36 }}>⚙️</span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: "clamp(1.2rem, 4vw, 2rem)",
          fontWeight: 700,
          color: "#d4af37",
          textAlign: "center",
          marginBottom: 16,
          letterSpacing: "0.05em",
          textShadow: "0 2px 10px rgba(212,175,55,0.3)",
        }}
      >
        {msg.title}
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
          color: "rgba(255,255,255,0.5)",
          textAlign: "center",
          lineHeight: 1.8,
          maxWidth: 400,
          whiteSpace: "pre-line",
        }}
      >
        {msg.subtitle}
      </p>

      {/* Divider */}
      <div
        style={{
          width: 60,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)",
          margin: "32px 0",
        }}
      />

      {/* K-Destiny branding */}
      <p
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 14,
          color: "rgba(212,175,55,0.3)",
          letterSpacing: "0.2em",
        }}
      >
        K-DESTINY
      </p>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
