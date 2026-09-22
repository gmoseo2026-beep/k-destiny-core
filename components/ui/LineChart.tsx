"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LineChartProps {
  data: {
    label: string; // e.g. "1월"
    value: number; // 0 to 100
  }[];
  color?: string;
  height?: number;
}

export function LineChart({ data, color = "#FF3E6C", height = 200 }: LineChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!data || data.length === 0) return null;

  const width = 1000; // SVG viewBox width, scaled via CSS
  const paddingX = 40;
  const paddingY = 30;
  
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const getCoordinates = (value: number, index: number) => {
    const x = paddingX + (index / (data.length - 1 || 1)) * innerWidth;
    const y = height - paddingY - (value / 100) * innerHeight;
    return { x, y };
  };

  const points = data.map((d, i) => getCoordinates(d.value, i));
  const pathData = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
    
  // Area under the curve
  const areaData = `${pathData} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="w-full relative overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="min-w-[500px] w-full" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
          {/* Y Axis Grid Lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = height - paddingY - (val / 100) * innerHeight;
            return (
              <line
                key={`grid-${val}`}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="var(--color-ink)"
                strokeOpacity={0.05}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area */}
          {mounted && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              d={areaData}
              fill={`url(#gradient-${color.replace('#', '')})`}
              opacity={0.3}
            />
          )}

          {/* Line */}
          {mounted && (
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points & Labels */}
          {mounted &&
            points.map((p, i) => (
              <g key={`point-group-${i}`}>
                <motion.circle
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: 4.5, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.05 }}
                  cx={p.x}
                  cy={p.y}
                  fill="#FFF"
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px] sm:text-xs font-medium fill-gray-500"
                >
                  {data[i].label}
                </text>
              </g>
            ))}

          {/* Gradients */}
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
