"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface RadarChartProps {
  data: {
    label: string;
    value: number; // 0 to 100
  }[];
  color?: string;
  size?: number;
}

export function RadarChart({ data, color = "#FF3E6C", size = 260 }: RadarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const radius = size / 2 - 40; // padding for labels
  const center = size / 2;
  const numPoints = data.length;
  const angleStep = (Math.PI * 2) / numPoints;

  const getCoordinates = (value: number, index: number) => {
    // value is 0 to 100, we scale it to radius
    const r = (value / 100) * radius;
    // -Math.PI / 2 to start at top
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Draw background web (5 levels)
  const levels = [20, 40, 60, 80, 100];
  const webs = levels.map((level) => {
    const points = Array.from({ length: numPoints })
      .map((_, i) => {
        const { x, y } = getCoordinates(level, i);
        return `${x},${y}`;
      })
      .join(" ");
    return points;
  });

  const dataPoints = data.map((d, i) => getCoordinates(d.value, i));
  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative flex justify-center items-center" style={{ width: "100%", maxWidth: size, aspectRatio: "1 / 1" }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
        {/* Web Lines */}
        {webs.map((points, i) => (
          <polygon
            key={`web-${i}`}
            points={points}
            fill="none"
            stroke="var(--color-ink)"
            strokeOpacity={0.06}
            strokeWidth={1}
          />
        ))}

        {/* Spoke Lines */}
        {Array.from({ length: numPoints }).map((_, i) => {
          const { x, y } = getCoordinates(100, i);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="var(--color-ink)"
              strokeOpacity={0.06}
              strokeWidth={1}
            />
          );
        })}

        {/* Data Polygon */}
        {mounted && (
          <motion.polygon
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
            points={dataPolygon}
            fill={color}
            fillOpacity={0.25}
            stroke={color}
            strokeWidth={2.5}
            style={{ transformOrigin: `${center}px ${center}px` }}
          />
        )}

        {/* Data Points */}
        {mounted &&
          dataPoints.map((p, i) => (
            <motion.circle
              key={`point-${i}`}
              initial={{ r: 0 }}
              animate={{ r: 4 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              cx={p.x}
              cy={p.y}
              fill={color}
            />
          ))}

        {/* Labels */}
        {data.map((d, i) => {
          const { x, y } = getCoordinates(120, i); // put label a bit outside
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y + 4} // slight adjustment for vertical centering
              textAnchor="middle"
              className="text-[11px] sm:text-xs font-semibold fill-gray-500"
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
