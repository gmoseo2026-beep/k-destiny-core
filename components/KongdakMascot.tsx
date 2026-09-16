"use client";

import React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

export type MascotExpression =
  | "canon"
  | "simkoong"
  | "flame"
  | "flutter"
  | "cringe"
  | "hyunta"
  | "factattack"
  | "couple"
  | "canon_white";

export interface KongdakMascotProps {
  size?: number;
  expression?: MascotExpression;
  score?: number;
  animate?: "bounce" | "heartbeat" | "pulse" | "none";
  className?: string;
  priority?: boolean;
  alt?: string;
}

export function getExpressionByScore(score: number): MascotExpression {
  if (score >= 90) return "simkoong";
  if (score >= 80) return "flame";
  if (score >= 70) return "flutter";
  if (score >= 60) return "cringe";
  return "hyunta";
}

const EXPRESSION_SRC_MAP: Record<MascotExpression, string> = {
  canon: "/mascot/transparent/doogeun_cat_canon.webp",
  simkoong: "/mascot/transparent/expr_1_simkoong.webp",
  flame: "/mascot/transparent/expr_2_flame.webp",
  flutter: "/mascot/transparent/expr_3_flutter.webp",
  cringe: "/mascot/transparent/expr_4_cringe.webp",
  hyunta: "/mascot/transparent/expr_5_hyunta.webp",
  factattack: "/mascot/transparent/expr_6_factattack.webp",
  couple: "/mascot/transparent/couple_red_thread.webp",
  canon_white: "/mascot/transparent/doogeun_cat_canon_white.webp",
};

export default function KongdakMascot({
  size = 96,
  expression,
  score,
  animate = "none",
  className = "",
  priority = false,
  alt = "콩닥이",
}: KongdakMascotProps) {
  const shouldReduceMotion = useReducedMotion();

  // expression 지정 우선, score 가 있으면 점수대별 자동 매핑, 없으면 canon
  const resolvedExpr: MascotExpression =
    expression ?? (typeof score === "number" ? getExpressionByScore(score) : "canon");

  const src = EXPRESSION_SRC_MAP[resolvedExpr] || EXPRESSION_SRC_MAP.canon;

  // 애니메이션 변형 설정 (부드럽고 절제된 효과)
  const getAnimationProps = () => {
    if (shouldReduceMotion || animate === "none") {
      return {};
    }

    if (animate === "heartbeat") {
      return {
        animate: { scale: [1, 1.04, 1] },
        transition: { duration: 1.4, ease: "easeInOut" as const, repeat: Infinity },
      };
    }

    if (animate === "bounce") {
      return {
        animate: { y: [0, -6, 0] },
        transition: { duration: 0.9, ease: "easeInOut" as const, repeat: Infinity },
      };
    }

    if (animate === "pulse") {
      return {
        animate: { opacity: [0.9, 1, 0.9] },
        transition: { duration: 1.2, ease: "easeInOut" as const, repeat: Infinity },
      };
    }

    return {};
  };

  return (
    <motion.div
      {...getAnimationProps()}
      className={`inline-flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        priority={priority}
        className="w-full h-full object-contain drop-shadow-xs"
      />
    </motion.div>
  );
}
