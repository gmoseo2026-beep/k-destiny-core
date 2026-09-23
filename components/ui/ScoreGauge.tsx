import React from 'react';

export interface ScoreGaugeProps {
  score: number;
  label?: string;
  color?: string; // e.g. '#E0245A'
}

export function ScoreGauge({ score, label, color = '#E0245A' }: ScoreGaugeProps) {
  // Simple SVG semi-circle gauge
  const radius = 40;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-14 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
          {/* Background Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 text-center flex flex-col items-center">
          <span className="text-xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      {label && <span className="mt-1 text-sm font-semibold text-gray-600">{label}</span>}
    </div>
  );
}
