import { Metadata } from "next";
import { redirect } from "next/navigation";
import GlobalCoupleNewClient from "@/components/global/GlobalCoupleNewClient";
import {
  isGlobalCoupleLocale,
  resolveGlobalCoupleGuardRedirect,
} from "@/lib/globalCoupleLocale";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export const metadata: Metadata = {
  title: "Korean Couple Compatibility — kongdak",
  description:
    "Korean birth-date compatibility — how two birthdays click in love.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function GlobalCoupleNewPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { ref } = await searchParams;

  const guardTarget = resolveGlobalCoupleGuardRedirect(locale);
  if (guardTarget || !isGlobalCoupleLocale(locale)) {
    redirect(guardTarget ?? "/ko/compat/new");
  }

  return <GlobalCoupleNewClient locale={locale} refToken={ref} />;
}
