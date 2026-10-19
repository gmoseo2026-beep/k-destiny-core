import { Metadata } from "next";
import { Suspense } from "react";
import WelcomeLanguageClient from "@/components/global/WelcomeLanguageClient";

export const metadata: Metadata = {
  title: "Kongdak — Choose Your Language | 콩닥",
  description: "Korean Couple Compatibility · 한국식 사주 커플 궁합",
  robots: {
    index: false,
    follow: false,
  },
};

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#FFF6F1]" />}>
      <WelcomeLanguageClient />
    </Suspense>
  );
}
