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
  canon: "/mascot/transparent/doogeun_cat_canon.png",
  simkoong: "/mascot/transparent/expr_1_simkoong.png",
  flame: "/mascot/transparent/expr_2_flame.png",
  flutter: "/mascot/transparent/expr_3_flutter.png",
  cringe: "/mascot/transparent/expr_4_cringe.png",
  hyunta: "/mascot/transparent/expr_5_hyunta.png",
  factattack: "/mascot/transparent/expr_6_factattack.png",
  couple: "/mascot/transparent/couple_red_thread.png",
  canon_white: "/mascot/transparent/doogeun_cat_canon_white.png",
};

export default function KongdakMascot({
  size = 96,
  expression,
  score,
  animate = "heartbeat",
  className = "",
  priority = false,
  alt = "콩닥이",
}: KongdakMascotProps) {
  const shouldReduceMotion = useReducedMotion();

  // expression 지정 우선, score 가 있으면 점수대별 자동 매핑, 없으면 canon
  const resolvedExpr: MascotExpression =
    expression ?? (typeof score === "number" ? getExpressionByScore(score) : "canon");

  const src = EXPRESSION_SRC_MAP[resolvedExpr];

  // 애니메이션 변형 설정
  const getAnimationProps = () => {
    if (shouldReduceMotion || animate === "none") {
      return {};
    }

    if (animate === "heartbeat") {
      return {
        animate: {
          scale: [1, 1.06, 1],
        },
        transition: {
          duration: 1.2,
          ease: "easeInOut" as const,
          repeat: Infinity,
        },
      };
    }

    if (animate === "bounce") {
      return {
        animate: {
          y: [0, -8, 0],
        },
        transition: {
          duration: 1.0,
          ease: "easeInOut" as const,
          repeat: Infinity,
        },
      };
    }

    if (animate === "pulse") {
      return {
        animate: {
          scale: [1, 1.04, 1],
          opacity: [0.95, 1, 0.95],
        },
        transition: {
          duration: 1.5,
          ease: "easeInOut" as const,
          repeat: Infinity,
        },
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
        priority={priority}
        className="w-full h-full object-contain drop-shadow-md"
      />
    </motion.div>
  );
}
