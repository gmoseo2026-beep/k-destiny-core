"use client";

import { motion } from "framer-motion";

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

const ELEMENT_NAMES: Record<string, { ko: string; en: string }> = {
  '甲': { ko: '갑목', en: 'Wood+' }, '乙': { ko: '을목', en: 'Wood-' },
  '丙': { ko: '병화', en: 'Fire+' }, '丁': { ko: '정화', en: 'Fire-' },
  '戊': { ko: '무토', en: 'Earth+' }, '己': { ko: '기토', en: 'Earth-' },
  '庚': { ko: '경금', en: 'Metal+' }, '辛': { ko: '신금', en: 'Metal-' },
  '壬': { ko: '임수', en: 'Water+' }, '癸': { ko: '계수', en: 'Water-' },
};

const PILLAR_LABELS = [
  { ko: '시주', en: 'Hour' },
  { ko: '일주', en: 'Day' },
  { ko: '월주', en: 'Month' },
  { ko: '년주', en: 'Year' },
];

function PillarColumn({ label, pillar, isDay, delay }: { 
  label: { ko: string; en: string }; 
  pillar: string | null; 
  isDay: boolean;
  delay: number;
}) {
  if (!pillar) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-sans tracking-widest text-gray-500 uppercase">{label.en}</span>
        <div className="w-16 sm:w-20 flex flex-col gap-1">
          <div className="h-16 sm:h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-xs">?</div>
          <div className="h-16 sm:h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-600 text-xs">?</div>
        </div>
        <span className="text-[9px] text-gray-600">{label.ko}</span>
      </motion.div>
    );
  }

  // 柱는 2글자: 천간 + 지지
  const gan = pillar[0]; // 천간 (Heavenly Stem)
  const zhi = pillar[1]; // 지지 (Earthly Branch)
  const ganColor = ELEMENT_COLORS[gan] || '#d4af37';
  const zhiColor = ELEMENT_COLORS[zhi] || '#d4af37';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center gap-2"
    >
      <span className="text-[10px] font-sans tracking-widest text-gray-500 uppercase">{label.en}</span>
      <div className={`w-16 sm:w-20 flex flex-col gap-1 ${isDay ? 'ring-2 ring-gold/40 rounded-2xl p-0.5' : ''}`}>
        {/* 천간 */}
        <div
          className="h-16 sm:h-20 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm border border-white/10"
          style={{ backgroundColor: `${ganColor}15`, borderColor: `${ganColor}40` }}
        >
          <span className="font-serif text-2xl sm:text-3xl font-bold" style={{ color: ganColor }}>{gan}</span>
          <span className="text-[9px] font-sans mt-0.5" style={{ color: `${ganColor}cc` }}>
            {ELEMENT_NAMES[gan]?.en || ''}
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
      <span className="text-[9px] text-gray-500">{label.ko}</span>
      {isDay && <span className="text-[8px] text-gold tracking-wider">DAY MASTER</span>}
    </motion.div>
  );
}

export default function SajuChart({ fourPillars, dayMaster, elementsScore }: SajuChartProps) {
  const pillars = [fourPillars.time, fourPillars.day, fourPillars.month, fourPillars.year];

  // 오행 도넛 차트 데이터
  const elements = [
    { key: 'wood', label: '木', color: '#4ade80', value: elementsScore.wood || 0 },
    { key: 'fire', label: '火', color: '#f87171', value: elementsScore.fire || 0 },
    { key: 'earth', label: '土', color: '#fbbf24', value: elementsScore.earth || 0 },
    { key: 'metal', label: '金', color: '#e2e8f0', value: elementsScore.metal || 0 },
    { key: 'water', label: '水', color: '#60a5fa', value: elementsScore.water || 0 },
  ];
  const total = elements.reduce((s, e) => s + e.value, 0) || 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-serif text-xl text-white">四柱命式</h2>
        <span className="text-[10px] font-sans tracking-widest text-gold/60 uppercase">Four Pillars Chart</span>
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
          />
        ))}
      </div>

      {/* 오행 비율 바 */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-sans tracking-widest text-gray-500 uppercase mb-2">Five Elements Balance</h3>
        {elements.map((el) => {
          const pct = Math.round((el.value / total) * 100);
          return (
            <div key={el.key} className="flex items-center gap-3">
              <span className="w-6 font-serif text-lg" style={{ color: el.color }}>{el.label}</span>
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
