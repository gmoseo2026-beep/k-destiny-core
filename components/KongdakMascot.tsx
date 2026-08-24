"use client";

import React from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

export interface KongdakMascotProps {
  size?: number;
  animate?: "bounce" | "heartbeat" | "none";
  className?: string;
  priority?: boolean;
}

export default function KongdakMascot({
  size = 96,
  animate = "heartbeat",
  className = "",
  priority = false,
}: KongdakMascotProps) {
  const shouldReduceMotion = useReducedMotion();

  // size에 따라 256px 또는 512px 이미지 선택
  const src = size >= 200 ? "/mascot/kongdak-mascot-512.png" : "/mascot/kongdak-mascot-256.png";

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
        alt="콩닥이"
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-contain drop-shadow-sm"
      />
    </motion.div>
  );
}
