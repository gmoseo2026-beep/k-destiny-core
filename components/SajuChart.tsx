"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useLocale } from "next-intl";

/** 四柱 명식표 — 사주 시각화 컴포넌트 */

interface FourPillars {
  year: string;
  month: string;
  day: string;
  time: string | null;
}

interface SajuChartProps {
  fourPillars: FourPillars;
  dayMaster: string;
  elementsScore: Record<string, number>;
}

// 천간 → 오행 색상 매핑
const ELEMENT_COLORS: Record<string, string> = {
  '甲': '#4ade80', '乙': '#4ade80', // 木 green
  '丙': '#f87171', '丁': '#f87171', // 火 red
  '戊': '#fbbf24', '己': '#fbbf24', // 土 yellow
  '庚': '#e2e8f0', '辛': '#e2e8f0', // 金 white/silver
  '壬': '#60a5fa', '癸': '#60a5fa', // 水 blue
  '寅': '#4ade80', '卯': '#4ade80',
  '巳': '#f87171', '午': '#f87171',
  '辰': '#fbbf24', '戌': '#fbbf24', '丑': '#fbbf24', '未': '#fbbf24',
  '申': '#e2e8f0', '酉': '#e2e8f0',
  '亥': '#60a5fa', '子': '#60a5fa',
};

const ELEMENT_NAMES: Record<string, Record<string, string>> = {
  '甲': { ko: '갑목', en: 'Wood+', ja: '甲木' },
  '乙': { ko: '을목', en: 'Wood-', ja: '乙木' },
  '丙': { ko: '병화', en: 'Fire+', ja: '丙火' },
  '丁': { ko: '정화', en: 'Fire-', ja: '丁火' },
  '戊': { ko: '무토', en: 'Earth+', ja: '戊土' },
  '己': { ko: '기토', en: 'Earth-', ja: '己土' },
  '庚': { ko: '경금', en: 'Metal+', ja: '庚金' },
  '辛': { ko: '신금', en: 'Metal-', ja: '辛金' },
  '壬': { ko: '임수', en: 'Water+', ja: '壬水' },
  '癸': { ko: '계수', en: 'Water-', ja: '癸水' },
};

const PILLAR_LABELS: Record<string, string>[] = [
  { ko: '시주', en: 'HOUR', ja: '時柱' },
  { ko: '일주', en: 'DAY', ja: '日柱' },
  { ko: '월주', en: 'MONTH', ja: '月柱' },
  { ko: '년주', en: 'YEAR', ja: '年柱' },
];

// 오행 데이터 with images and localized names
const FIVE_ELEMENTS: { key: string; hanja: string; color: string; image: string; name: Record<string, string> }[] = [
  { key: 'wood', hanja: '木', color: '#4ade80', image: '/images/element_wood.webp.jpg',
    name: { ko: '나무 (木)', en: 'Wood (木)', ja: '木', es: 'Madera (木)', de: 'Holz (木)', fr: 'Bois (木)' } },
  { key: 'fire', hanja: '火', color: '#f87171', image: '/images/element_fire.webp.jpg',
    name: { ko: '불 (火)', en: 'Fire (火)', ja: '火', es: 'Fuego (火)', de: 'Feuer (火)', fr: 'Feu (火)' } },
  { key: 'earth', hanja: '土', color: '#fbbf24', image: '/images/element_earth.webp.jpg',
    name: { ko: '흙 (土)', en: 'Earth (土)', ja: '土', es: 'Tierra (土)', de: 'Erde (土)', fr: 'Terre (土)' } },
  { key: 'metal', hanja: '金', color: '#e2e8f0', image: '/images/element_metal.webp.jpg',
    name: { ko: '쇠 (金)', en: 'Metal (金)', ja: '金', es: 'Metal (金)', de: 'Metall (金)', fr: 'Métal (金)' } },
  { key: 'water', hanja: '水', color: '#60a5fa', image: '/images/element_water.webp.jpg',
    name: { ko: '물 (水)', en: 'Water (水)', ja: '水', es: 'Agua (水)', de: 'Wasser (水)', fr: 'Eau (水)' } },
];

function PillarColumn({ label, pillar, isDay, delay, locale }: { 
  label: Record<string, string>; 
  pillar: string | null; 
  isDay: boolean;
  delay: number;
  locale: string;
}) {
  const displayLabel = label[locale] || label.en;

  if (!pillar) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-sans tracking-widest text-gray-500 uppercase">{displayLabel}</span>
        <div className="w-16 sm:w-20 flex flex-col gap-1">
          <div className="h-16 sm:h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-xs">?</div>
          <div className="h-16 sm:h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-xs">?</div>
        </div>
      </motion.div>
    );
  }

  // 柱는 2글자: 천간 + 지지
  const gan = pillar[0]; // 천간 (Heavenly Stem)
  const zhi = pillar[1]; // 지지 (Earthly Branch)
  const ganColor = ELEMENT_COLORS[gan] || '#d4af37';
  const zhiColor = ELEMENT_COLORS[zhi] || '#d4af37';
  const ganName = ELEMENT_NAMES[gan]?.[locale] || ELEMENT_NAMES[gan]?.en || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-[10px] font-sans tracking-widest text-gray-500 uppercase">{displayLabel}</span>
      <div className={`w-16 sm:w-20 flex flex-col gap-1 ${isDay ? 'ring-2 ring-gold/40 rounded-2xl p-0.5' : ''}`}>
        {/* 천간 */}
        <div
          className="h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm border border-white/10"
          style={{ backgroundColor: `${ganColor}15`, borderColor: `${ganColor}40` }}
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: ganColor }}>{gan}</span>
          <span className="text-[9px] font-sans mt-0.5" style={{ color: `${ganColor}cc` }}>
            {ganName}
          </span>
        </div>
        {/* 지지 */}
        <div
          className="h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm border border-white/10"
          style={{ backgroundColor: `${zhiColor}15`, borderColor: `${zhiColor}40` }}
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: zhiColor }}>{zhi}</span>
        </div>
      </div>
      <span className="text-[9px] text-gray-500">{label.ko || label.en}</span>
      {isDay && <span className="text-[8px] text-gold tracking-wider">DAY MASTER</span>}
    </motion.div>
  );
}

export default function SajuChart({ fourPillars, dayMaster, elementsScore }: SajuChartProps) {
  const locale = useLocale();
  const pillars = [fourPillars.time, fourPillars.day, fourPillars.month, fourPillars.year];
  const total = FIVE_ELEMENTS.reduce((s, e) => s + (elementsScore[e.key] || 0), 0) || 1;

  const chartTitle: Record<string, string> = {
    ko: '四柱命式', en: 'Four Pillars Chart', ja: '四柱命式',
    es: 'Carta de Cuatro Pilares', de: 'Vier-Säulen-Diagramm', fr: 'Carte des Quatre Piliers',
  };

  const balanceTitle: Record<string, string> = {
    ko: '오행 균형 분석', en: 'Five Elements Balance', ja: '五行バランス分析',
    es: 'Equilibrio de Cinco Elementos', de: 'Fünf-Elemente-Balance', fr: 'Équilibre des Cinq Éléments',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-serif text-xl text-white">{chartTitle[locale] || chartTitle.en}</h2>
      </div>

      {/* 四柱 표 */}
      <div className="flex justify-center gap-3 sm:gap-4 mb-8">
        {pillars.map((p, i) => (
          <PillarColumn
            key={i}
            label={PILLAR_LABELS[i]}
            pillar={p}
            isDay={i === 1}
            delay={i * 0.1}
            locale={locale}
          />
        ))}
      </div>

      {/* 오행 이미지 카드 그리드 */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-6">
        {FIVE_ELEMENTS.map((el, i) => {
          const pct = Math.round(((elementsScore[el.key] || 0) / total) * 100);
          return (
            <motion.div
              key={el.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
              className="flex flex-col items-center"
            >
              <div className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 mb-1.5 ${pct > 0 ? 'opacity-100' : 'opacity-30'}`}
                style={{ borderColor: `${el.color}60` }}
              >
                <Image
                  src={el.image}
                  alt={el.name[locale] || el.name.en}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
                {pct > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-0.5">
                    <span className="text-[10px] font-bold" style={{ color: el.color }}>{pct}%</span>
                  </div>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-sans text-center leading-tight" style={{ color: el.color }}>
                {el.name[locale] || el.name.en}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* 오행 비율 바 */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-sans tracking-widest text-gray-500 uppercase mb-2">
          {balanceTitle[locale] || balanceTitle.en}
        </h3>
        {FIVE_ELEMENTS.map((el) => {
          const pct = Math.round(((elementsScore[el.key] || 0) / total) * 100);
          return (
            <div key={el.key} className="flex items-center gap-3">
              <span className="w-14 sm:w-16 font-sans text-xs truncate" style={{ color: el.color }}>
                {el.name[locale] || el.name.en}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: el.color }}
                />
              </div>
              <span className="text-xs font-mono w-10 text-right" style={{ color: el.color }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
