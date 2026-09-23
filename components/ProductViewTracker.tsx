"use client";

import { useEffect } from "react";
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
