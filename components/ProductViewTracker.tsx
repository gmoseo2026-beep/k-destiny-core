"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/gtag";

interface ProductViewTrackerProps {
  productId: string;
  tier: string;
}

export default function ProductViewTracker({ productId, tier }: ProductViewTrackerProps) {
  useEffect(() => {
    trackEvent("view_item", { productId, tier });
  }, [productId, tier]);

  return null;
}

interface ProductCtaLinkProps {
  href: string;
  productId: string;
  tier: string;
  target: string;
  isFree: boolean;
  location: string;
  className?: string;
  children: React.ReactNode;
}

export function ProductCtaLink({
  href,
  productId,
  tier,
  target,
  isFree,
  location,
  className,
  children,
}: ProductCtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEvent("product_cta_click", {
          productId,
          tier,
          target,
          isFree,
          location,
        })
      }
    >
      {children}
    </Link>
  );
}
